import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,one} from '../src/db.js';
import {register} from '../src/auth.js';
import {createCompany} from '../src/companies.js';
import {issueInvoice,receivePayment,stockQuantity,listInvoices} from '../src/invoices.js';
import {issueFullReturn,listReturns} from '../src/returns.js';
import {balanceSheet,profitLoss,gstReport,outstandingReport,stockReport,dashboard} from '../src/reports.js';
import {businessReminders} from '../src/reminders.js';
import {createServer} from '../src/server.js';
import {uid} from '../src/utils.js';
function setup(){
 const db=openDatabase(':memory:');const user=register(db,{name:'Owner',email:`r${uid()}@example.com`,password:'strong-password-for-test'});
 const c=createCompany(db,user.id,{name:'Returns Demo',state_code:'27'});
 const prod=uid();db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)').run(prod,c.id,'SKU-'+prod,'Article','1001',1800,1500,1001,1,1);
 const supplier=uid(),customer=uid();
 for(const [id,kind] of [[supplier,'SUPPLIER'],[customer,'CUSTOMER']]){
  db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(id,c.id,kind,kind,'27',null,null,null,new Date().toISOString());
 }
 return {db,user,c,prod,supplier,customer};
}
function buy(x,{paid=0,qty=3,discount=0,date='2026-10-01'}={}){
 return issueInvoice(x.db,x.c.id,x.user.id,{kind:'PURCHASE',contact_id:x.supplier,date,items:[{product_id:x.prod,qty,unit_paise:1001,discount_paise:discount}],paid_paise:paid});
}
function sell(x,{paid=0,qty=2,date='2026-10-02'}={}){
 return issueInvoice(x.db,x.c.id,x.user.id,{kind:'SALE',contact_id:x.customer,date,items:[{product_id:x.prod,qty,unit_paise:1500}],paid_paise:paid});
}
test('FULL sales credit note restores stock, reverses ledger/GST, removes customer due',()=>{
 const x=setup();try{
  buy(x);const s=sell(x);assert.equal(stockQuantity(x.db,x.c.id,x.prod),1);
  const before=profitLoss(x.db,x.c.id);assert.ok(before.net_profit_paise>0);
  const credit=issueFullReturn(x.db,x.c.id,x.user.id,s.id,{date:'2026-10-04'});
  assert.equal(credit.kind,'CREDIT_NOTE');assert.equal(stockQuantity(x.db,x.c.id,x.prod),3);
  assert.equal(listInvoices(x.db,x.c.id,'SALE')[0].outstanding_paise,0);
  assert.equal(outstandingReport(x.db,x.c.id).filter(r=>r.kind==='SALE').length,0);
  assert.equal(businessReminders(x.db,x.c.id).unpaid_invoices.some(r=>r.id===s.id),false);
  assert.equal(profitLoss(x.db,x.c.id).revenue_paise,0);
  assert.equal(profitLoss(x.db,x.c.id).net_profit_paise,0);
  assert.equal(gstReport(x.db,x.c.id).sales.cgst_paise,0);
  assert.equal(balanceSheet(x.db,x.c.id).difference_paise,0);
  assert.equal(stockReport(x.db,x.c.id)[0].stock_value_paise,3003);
  assert.equal(listReturns(x.db,x.c.id).length,1);
  assert.equal(issueFullReturn(x.db,x.c.id,x.user.id,s.id,{date:'2026-10-04'}).reused,true);
  assert.throws(()=>receivePayment(x.db,x.c.id,x.user.id,s.id,{amount_paise:1}),/Returned invoice/);
  assert.equal(one(x.db,'SELECT COUNT(*) n FROM invoice_returns').n,1);
 }finally{x.db.close();}
});
test('FULL purchase debit note clears original stock/payable/GST, keeps original invoice',()=>{
 const x=setup();try{
  const p=buy(x,{discount:2});assert.equal(stockReport(x.db,x.c.id)[0].stock_value_paise,3001);
  const note=issueFullReturn(x.db,x.c.id,x.user.id,p.id,{date:'2026-10-03'});
  assert.equal(note.kind,'DEBIT_NOTE');assert.equal(stockQuantity(x.db,x.c.id,x.prod),0);
  assert.equal(outstandingReport(x.db,x.c.id).length,0);
  assert.equal(gstReport(x.db,x.c.id).purchases.taxable_paise,0);
  assert.equal(dashboard(x.db,x.c.id).purchases_paise,0);
  assert.equal(one(x.db,'SELECT COUNT(*) n FROM invoices').n,1);
  assert.equal(balanceSheet(x.db,x.c.id).difference_paise,0);
  assert.equal(one(x.db,'SELECT SUM(qty_remaining) n FROM stock_layers WHERE source_voucher_id=?',one(x.db,'SELECT voucher_id FROM invoices WHERE id=?',p.id).voucher_id).n,0);
 }finally{x.db.close();}
});
test('returns refuse paid invoices, used purchase lots, partial requests, wrong companies, earlier date',()=>{
 const x=setup();try{
  const paidBuy=buy(x,{paid:100,date:'2026-10-01'});
  assert.throws(()=>issueFullReturn(x.db,x.c.id,x.user.id,paidBuy.id,{date:'2026-10-02'}),/Paid invoices/);
  const unpaidBuy=buy(x,{qty:5});const sale=sell(x,{qty:2});
  assert.throws(()=>issueFullReturn(x.db,x.c.id,x.user.id,sale.id,{qty:1,date:'2026-10-04'}),/Partial returns/);
  assert.throws(()=>issueFullReturn(x.db,x.c.id,x.user.id,sale.id,{date:'2026-09-01'}),/before original/);
  // FIFO consumed from paidBuy; a distinct unpaidBuy's lots remain pristine.
  // Once all earlier lots are consumed, another sale will affect unpaidBuy.
  sell(x,{qty:3});
  assert.throws(()=>issueFullReturn(x.db,x.c.id,x.user.id,unpaidBuy.id,{date:'2026-10-04'}),/already been used/);
  const other=createCompany(x.db,x.user.id,{name:'Other',state_code:'27'});
  assert.throws(()=>issueFullReturn(x.db,other.id,x.user.id,sale.id,{date:'2026-10-04'}),/not found/);
  assert.equal(one(x.db,'SELECT COUNT(*) n FROM invoice_returns').n,0);
 }finally{x.db.close();}
});
test('return tax reversal is attributed to return date, not original date',()=>{
 const x=setup();try{
  buy(x);const sale=sell(x);issueFullReturn(x.db,x.c.id,x.user.id,sale.id,{date:'2026-11-01'});
  assert.ok(gstReport(x.db,x.c.id,'2026-10-01','2026-10-31').sales.taxable_paise>0);
  assert.ok(gstReport(x.db,x.c.id,'2026-11-01','2026-11-30').sales.taxable_paise<0);
  assert.equal(gstReport(x.db,x.c.id,'2026-10-01','2026-11-30').sales.taxable_paise,0);
 }finally{x.db.close();}
});
test('return HTTP routes enforce authentication, CSRF and company membership',async()=>{
 const db=openDatabase(':memory:');const server=createServer(db);
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=`http://127.0.0.1:${server.address().port}`;let cookie='',csrf='';
 const call=async(path,method='GET',body,headers={})=>{
  const r=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json(),headers:r.headers};
 };
 try{
  const email=`api${uid()}@example.com`;
  await call('/api/auth/register','POST',{name:'Owner',email,password:'long-test-password-2026'});
  const login=await call('/api/auth/login','POST',{email,password:'long-test-password-2026'});
  assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];csrf=login.data.csrf;
  const c=(await call('/api/companies','POST',{name:'Company',state_code:'27'})).data.id;
  let r=await call(`/api/companies/${c}/returns`);assert.equal(r.status,200);assert.deepEqual(r.data,[]);
  r=await call(`/api/companies/${c}/invoices/nonexistent/full-return`,'POST',{date:'2026-10-14'},{'X-CSRF-Token':'invalid'});assert.equal(r.status,403);
  r=await call(`/api/companies/${c}/invoices/nonexistent/full-return`,'POST',{date:'2026-10-14'});assert.equal(r.status,404);
  r=await call(`/api/companies/not-your-company/returns`);assert.equal(r.status,403);
  cookie='';csrf='';r=await call(`/api/companies/${c}/returns`);assert.equal(r.status,401);
 }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
