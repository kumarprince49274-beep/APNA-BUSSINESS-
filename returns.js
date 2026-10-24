// Full-invoice sales credit notes and purchase debit notes (local MVP).
// No payments/refunds or partial returns are supported. Never edit original vouchers.
import {uid,now,today,date,fail} from './utils.js';
import {one,all,run,transaction} from './db.js';
import {postVoucher} from './ledger.js';

function restoredLayers(db,companyId,item,voucherId){
  const base=Math.floor(item.cogs_paise/item.qty);
  const extra=item.cogs_paise-base*item.qty;
  for(const [qty,cost] of [[extra,base+1],[item.qty-extra,base]]){
    if(qty) run(db,'INSERT INTO stock_layers VALUES (?,?,?,?,?,?,?,?)',uid(),companyId,item.product_id,voucherId,qty,qty,cost,now());
  }
}

// An original invoice may be returned once, in full, only while completely unpaid.
// Keeping this narrow ensures that cash refunds, adjustments to earlier payments,
// batch provenance, and partial-tax rounding are not falsely treated as completed.
export function issueFullReturn(db,companyId,userId,invoiceId,input={}){
 return transaction(db,()=>{
  const invoice=one(db,'SELECT * FROM invoices WHERE company_id=? AND id=?',companyId,invoiceId);
  if(!invoice)fail('Invoice not found',404);
  const existing=one(db,'SELECT * FROM invoice_returns WHERE invoice_id=?',invoiceId);
  if(existing)return {...existing,reused:true};
  const paid=one(db,'SELECT COALESCE(SUM(amount_paise),0) n FROM payments WHERE company_id=? AND invoice_id=?',companyId,invoiceId).n;
  if(paid!==0)fail('Paid invoices require a separate refund/adjustment workflow; full returns are available only for unpaid invoices');
  if(input.items!==undefined||input.qty!==undefined||input.partial===true)fail('Partial returns are not implemented. Use a full-invoice return only');
  const onDate=date(input.date||today());
  if(onDate<invoice.date)fail('Return date cannot be before original invoice date');
  const items=all(db,'SELECT * FROM invoice_items WHERE invoice_id=?',invoiceId);
  if(!items.length)fail('Invoice has no items');
  const sale=invoice.kind==='SALE';
  const type=sale?'CREDIT_NOTE':'DEBIT_NOTE';
  if(!sale){
   // Block a purchase return if even one original lot has been used.
   // Do NOT replace original purchase batches with unrelated inventory.
   const layers=all(db,'SELECT * FROM stock_layers WHERE company_id=? AND source_voucher_id=?',companyId,invoice.voucher_id);
   const totalUnits=items.reduce((n,x)=>n+x.qty,0);
   if(layers.reduce((n,x)=>n+x.qty_original,0)!==totalUnits || layers.some(x=>x.qty_remaining!==x.qty_original))
    fail('Cannot return this purchase: original purchased stock has already been used or altered');
  }
  const originalLines=all(db,'SELECT account_id,debit_paise,credit_paise FROM journal_lines WHERE voucher_id=?',invoice.voucher_id);
  const number=`${sale?'CN':'DN'}-${invoice.number}`;
  const voucher=postVoucher(db,{
    companyId,userId,kind:type,reference:number,dateValue:onDate,
    memo:`Full unpaid ${sale?'sales':'purchase'} return against ${invoice.number}`,
    reversalOf:invoice.voucher_id,
    lines:originalLines.map(x=>({account_id:x.account_id,debit_paise:x.credit_paise,credit_paise:x.debit_paise}))
  });
  const id=uid();
  run(db,`INSERT INTO invoice_returns
   (id,company_id,invoice_id,kind,number,date,subtotal_paise,gst_paise,total_paise,voucher_id,created_by,created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
   id,companyId,invoiceId,type,number,onDate,invoice.subtotal_paise,invoice.gst_paise,invoice.total_paise,voucher.id,userId,now());
  if(sale){
    for(const item of items){
      restoredLayers(db,companyId,item,voucher.id);
      run(db,'INSERT INTO stock_moves VALUES (?,?,?,?,?,?,?)',uid(),companyId,item.product_id,voucher.id,item.qty,item.cogs_paise,onDate);
    }
  }else{
    run(db,'UPDATE stock_layers SET qty_remaining=0 WHERE company_id=? AND source_voucher_id=?',companyId,invoice.voucher_id);
    for(const item of items){
      run(db,'INSERT INTO stock_moves VALUES (?,?,?,?,?,?,?)',uid(),companyId,item.product_id,voucher.id,-item.qty,item.taxable_paise,onDate);
    }
  }
  run(db,'INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)',uid(),companyId,userId,type+'_POST',id,JSON.stringify({invoice_id:invoice.id,voucher_id:voucher.id,full_invoice:true,unpaid:true}),now());
  return {id,kind:type,number,invoice_id:invoice.id,total_paise:invoice.total_paise,voucher_id:voucher.id};
 });
}
export function listReturns(db,companyId){
 return all(db,`SELECT r.*,i.number original_invoice_number,i.kind original_invoice_kind
 FROM invoice_returns r JOIN invoices i ON i.id=r.invoice_id
 WHERE r.company_id=? ORDER BY r.date DESC,r.created_at DESC`,companyId);
}
export function returnDetails(db,companyId,id){
 const result=one(db,`SELECT r.*,i.number original_invoice_number,i.kind original_invoice_kind
 FROM invoice_returns r JOIN invoices i ON i.id=r.invoice_id WHERE r.company_id=? AND r.id=?`,companyId,id);
 if(!result)fail('Return note not found',404);
 return {...result,items:all(db,'SELECT * FROM invoice_items WHERE invoice_id=?',result.invoice_id)};
}
