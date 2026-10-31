import {one,all} from './db.js';
import {date,today,fail} from './utils.js';
export function trialBalance(db,companyId,upTo=today()){
 date(upTo);
 const rows=all(db,`SELECT a.id,a.code,a.name,a.type,
 COALESCE(SUM(CASE WHEN v.date<=? THEN l.debit_paise ELSE 0 END),0) debit_total,
 COALESCE(SUM(CASE WHEN v.date<=? THEN l.credit_paise ELSE 0 END),0) credit_total
 FROM accounts a LEFT JOIN journal_lines l ON l.account_id=a.id
 LEFT JOIN vouchers v ON v.id=l.voucher_id AND v.company_id=a.company_id
 WHERE a.company_id=? GROUP BY a.id ORDER BY a.code`,upTo,upTo,companyId);
 return {as_of:upTo,rows:rows.map(r=>({...r,debit_balance:Math.max(r.debit_total-r.credit_total,0),credit_balance:Math.max(r.credit_total-r.debit_total,0)})),
 total_debit_paise:rows.reduce((x,r)=>x+Math.max(r.debit_total-r.credit_total,0),0),
 total_credit_paise:rows.reduce((x,r)=>x+Math.max(r.credit_total-r.debit_total,0),0)};
}
export function profitLoss(db,companyId,from='2000-01-01',to=today()){
 date(from);date(to);if(from>to)fail('Invalid period');
 // Restrict journal aggregation by period; no ledger data is modified.
 const periodRows=all(db,`SELECT a.code,a.name,a.type,
 COALESCE(SUM(CASE WHEN v.date BETWEEN ? AND ? THEN l.credit_paise-l.debit_paise ELSE 0 END),0) net_credit_paise
 FROM accounts a LEFT JOIN journal_lines l ON l.account_id=a.id
 LEFT JOIN vouchers v ON v.id=l.voucher_id AND v.company_id=a.company_id
 WHERE a.company_id=? AND a.type IN ('REVENUE','EXPENSE') GROUP BY a.id ORDER BY a.code`,from,to,companyId);
 const entries=periodRows.map(x=>({code:x.code,name:x.name,type:x.type,amount_paise:x.type==='REVENUE'?x.net_credit_paise:-x.net_credit_paise}));
 const revenue=entries.filter(x=>x.type==='REVENUE').reduce((s,r)=>s+r.amount_paise,0);
 const expenses=entries.filter(x=>x.type==='EXPENSE').reduce((s,r)=>s+r.amount_paise,0);
 return {from,to,rows:entries,revenue_paise:revenue,expenses_paise:expenses,net_profit_paise:revenue-expenses,
 gross_profit_paise:revenue-(entries.find(x=>x.code==='5000')?.amount_paise||0)};
}
export function balanceSheet(db,companyId,upTo=today()){
 const t=trialBalance(db,companyId,upTo);
 const norm=r=>({code:r.code,name:r.name,amount_paise:r.type==='ASSET'?r.debit_total-r.credit_total:r.credit_total-r.debit_total});
 const assets=t.rows.filter(r=>r.type==='ASSET').map(norm);
 const liabilities=t.rows.filter(r=>r.type==='LIABILITY').map(norm);
 const equity=t.rows.filter(r=>r.type==='EQUITY').map(norm);
 const earnings=profitLoss(db,companyId,'2000-01-01',upTo).net_profit_paise;
 const total=rows=>rows.reduce((s,r)=>s+r.amount_paise,0);
 const assetTotal=total(assets),liabTotal=total(liabilities),eqTotal=total(equity)+earnings;
 return {as_of:upTo,assets,liabilities,equity,current_earnings_paise:earnings,total_assets_paise:assetTotal,
 total_liabilities_paise:liabTotal,total_equity_paise:eqTotal,difference_paise:assetTotal-liabTotal-eqTotal};
}
export function stockReport(db,companyId){
 return all(db,`SELECT p.id,p.sku,p.name,p.reorder_level,
 COALESCE(SUM(l.qty_remaining),0) qty,
 COALESCE(SUM(l.qty_remaining*l.unit_cost_paise),0) stock_value_paise
 FROM products p LEFT JOIN stock_layers l ON l.product_id=p.id AND l.company_id=p.company_id
 WHERE p.company_id=? GROUP BY p.id ORDER BY p.name`,companyId).map(p=>({...p,low_stock:p.qty<=p.reorder_level}));
}
export function gstReport(db,companyId,from='2000-01-01',to=today()){
 date(from);date(to);
 const rows=all(db,`SELECT i.kind,
 COALESCE(SUM(it.taxable_paise),0) taxable_paise,
 COALESCE(SUM(it.cgst_paise),0) cgst_paise,
 COALESCE(SUM(it.sgst_paise),0) sgst_paise,
 COALESCE(SUM(it.igst_paise),0) igst_paise
 FROM invoices i JOIN invoice_items it ON it.invoice_id=i.id
 WHERE i.company_id=? AND i.date BETWEEN ? AND ? GROUP BY i.kind`,companyId,from,to);
 const reversed=all(db,`SELECT i.kind,
 COALESCE(SUM(it.taxable_paise),0) taxable_paise,
 COALESCE(SUM(it.cgst_paise),0) cgst_paise,
 COALESCE(SUM(it.sgst_paise),0) sgst_paise,
 COALESCE(SUM(it.igst_paise),0) igst_paise
 FROM invoice_returns r JOIN invoices i ON i.id=r.invoice_id JOIN invoice_items it ON it.invoice_id=i.id
 WHERE r.company_id=? AND r.date BETWEEN ? AND ? GROUP BY i.kind`,companyId,from,to);
 const subtract=(kind)=>{
  const orig=rows.find(x=>x.kind===kind)||{taxable_paise:0,cgst_paise:0,sgst_paise:0,igst_paise:0};
  const ret=reversed.find(x=>x.kind===kind)||{taxable_paise:0,cgst_paise:0,sgst_paise:0,igst_paise:0};
  return Object.fromEntries(['taxable_paise','cgst_paise','sgst_paise','igst_paise'].map(k=>[k,orig[k]-ret[k]]));
 };
 const sales=subtract('SALE');
 const purchases=subtract('PURCHASE');
 return {from,to,sales,purchases,estimated_net_gst_paise:
  (sales.cgst_paise+sales.sgst_paise+sales.igst_paise)-(purchases.cgst_paise+purchases.sgst_paise+purchases.igst_paise),
  warning:'Draft totals only. Full invoice credit/debit notes are offset by return date; tax treatment, ITC eligibility, refunds, credit notes and filing require accountant review.'};
}
export function outstandingReport(db,companyId,kind){
 const where=kind?' AND i.kind=?':'';
 return all(db,`SELECT i.id,i.kind,i.number,i.date,c.name contact_name,i.total_paise,
 COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.invoice_id=i.id),0) paid_paise,
 i.total_paise-COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.invoice_id=i.id),0)-COALESCE((SELECT SUM(r.total_paise) FROM invoice_returns r WHERE r.invoice_id=i.id),0) outstanding_paise
 FROM invoices i JOIN contacts c ON c.id=i.contact_id
 WHERE i.company_id=?${where} ORDER BY i.date DESC`,...(where?[companyId,kind]:[companyId])).filter(x=>x.outstanding_paise>0);
}
export function dashboard(db,companyId){
 const pl=profitLoss(db,companyId);
 const outstanding=outstandingReport(db,companyId);
 const stock=stockReport(db,companyId);
 const t=trialBalance(db,companyId);
 const byCode=code=>t.rows.find(x=>x.code===code);
 const bal=code=>{const r=byCode(code);return r?r.debit_total-r.credit_total:0;};
 const gst=gstReport(db,companyId);
 return {sales_paise:pl.revenue_paise,purchases_paise:one(db,`SELECT COALESCE(SUM(i.subtotal_paise),0) - COALESCE((SELECT SUM(r.subtotal_paise) FROM invoice_returns r JOIN invoices j ON j.id=r.invoice_id WHERE r.company_id=? AND j.kind='PURCHASE'),0) n FROM invoices i WHERE i.company_id=? AND i.kind='PURCHASE'`,companyId,companyId).n,
 gross_profit_paise:pl.gross_profit_paise,net_profit_paise:pl.net_profit_paise,
 cash_paise:bal('1000'),bank_paise:bal('1010'),receivables_paise:outstanding.filter(x=>x.kind==='SALE').reduce((s,x)=>s+x.outstanding_paise,0),
 payables_paise:outstanding.filter(x=>x.kind==='PURCHASE').reduce((s,x)=>s+x.outstanding_paise,0),
 stock_value_paise:stock.reduce((s,x)=>s+x.stock_value_paise,0),low_stock_count:stock.filter(x=>x.low_stock).length,
 provisional_gst_paise:gst.estimated_net_gst_paise,invoice_count:one(db,'SELECT COUNT(*) n FROM invoices WHERE company_id=?',companyId).n,
 latest_invoices:all(db,'SELECT id,number,kind,date,total_paise FROM invoices WHERE company_id=? ORDER BY created_at DESC LIMIT 6',companyId)};
}
export function daybook(db,companyId,from='2000-01-01',to=today()){
 return all(db,'SELECT * FROM vouchers WHERE company_id=? AND date BETWEEN ? AND ? ORDER BY date DESC,created_at DESC LIMIT 1000',companyId,date(from),date(to));
}
export function ledgerReport(db,companyId,accountId,from='2000-01-01',to=today()){
 const a=one(db,'SELECT * FROM accounts WHERE company_id=? AND id=?',companyId,accountId);
 if(!a)fail('Account not found',404);
 const rows=all(db,`SELECT v.date,v.kind,v.reference,v.memo,l.debit_paise,l.credit_paise
 FROM journal_lines l JOIN vouchers v ON v.id=l.voucher_id
 WHERE v.company_id=? AND l.account_id=? AND v.date BETWEEN ? AND ? ORDER BY v.date,v.created_at`,companyId,accountId,date(from),date(to));
 let running=one(db,`SELECT COALESCE(SUM(l.debit_paise-l.credit_paise),0) n FROM journal_lines l JOIN vouchers v ON v.id=l.voucher_id WHERE v.company_id=? AND l.account_id=? AND v.date<?`,companyId,accountId,from).n;
 return {account:a,opening_debit_minus_credit_paise:running,rows:rows.map(r=>({...r,balance_debit_minus_credit_paise:(running+=r.debit_paise-r.credit_paise)}))};
}
