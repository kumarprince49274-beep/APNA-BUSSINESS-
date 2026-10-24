import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,one,all} from '../src/db.js';
import {register} from '../src/auth.js';
import {createCompany} from '../src/companies.js';
import {postVoucher,balanceAccount} from '../src/ledger.js';
import {issueInvoice,receivePayment,stockQuantity} from '../src/invoices.js';
import {trialBalance,balanceSheet,profitLoss,stockReport,gstReport,dashboard} from '../src/reports.js';
import {computeWorkbook} from '../src/spreadsheet.js';
import {uid,today,moneyTax} from '../src/utils.js';
function setup(){
 const db=openDatabase(':memory:');
 const user=register(db,{name:'Test Founder',email:`test${uid()}@example.com`,password:'a-very-strong-test-password'});
 const company=createCompany(db,user.id,{name:'Test Store',state_code:'27',gst_registration_type:'REGULAR',gstin:'27ABCDE1234F1Z5'});
 return {db,user,company};
}
const acct=(db,company,code)=>one(db,'SELECT id FROM accounts WHERE company_id=? AND code=?',company.id,code).id;
function addProduct(db,c,name='Mobile'){
 const id=uid();db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,c.id,'SKU'+id.slice(0,8),name,'8517',1800,2000000,1299900,5,1);return id;
}
function addContact(db,c,kind='SUPPLIER',state='27'){
 const id=uid();db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(id,c.id,kind,kind+' Test',state,null,null,null,new Date().toISOString());return id;
}
test('integer GST calculation',()=>{
 assert.equal(moneyTax(1000000,1800),180000);assert.equal(moneyTax(1,1800),0);
});
test('balanced journal and rejection of unbalanced postings',()=>{
 const {db,user,company}=setup();
 assert.throws(()=>postVoucher(db,{companyId:company.id,userId:user.id,kind:'JOURNAL',dateValue:today(),lines:[{account_id:acct(db,company,'1000'),debit_paise:500,credit_paise:0},{account_id:acct(db,company,'3000'),debit_paise:0,credit_paise:400}]}),/Debit and credit/);
 assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers').n,0);
 postVoucher(db,{companyId:company.id,userId:user.id,kind:'JOURNAL',dateValue:today(),lines:[{account_id:acct(db,company,'1000'),debit_paise:1000000,credit_paise:0},{account_id:acct(db,company,'3000'),debit_paise:0,credit_paise:1000000}]});
 assert.equal(balanceAccount(db,company.id,'1000'),1000000);
 assert.equal(balanceSheet(db,company.id).difference_paise,0);
 db.close();
});
test('purchase to inventory, sale FIFO, GST and payments; no duplicate revenue on receipt',()=>{
 const {db,user,company}=setup();const productId=addProduct(db,company);
 const supplier=addContact(db,company);const customer=addContact(db,company,'CUSTOMER');
 const purchased=issueInvoice(db,company.id,user.id,{kind:'PURCHASE',contact_id:supplier,items:[{product_id:productId,qty:20,unit_paise:1299900}],date:today(),idempotency_key:'purchase_1'});
 assert.equal(purchased.subtotal_paise,25998000);
 assert.equal(purchased.gst_paise,4679640);
 assert.equal(stockQuantity(db,company.id,productId),20);
 const duplicated=issueInvoice(db,company.id,user.id,{kind:'PURCHASE',contact_id:supplier,items:[{product_id:productId,qty:20,unit_paise:1299900}],date:today(),idempotency_key:'purchase_1'});
 assert.equal(duplicated.reused,true);assert.equal(stockQuantity(db,company.id,productId),20);
 const sold=issueInvoice(db,company.id,user.id,{kind:'SALE',contact_id:customer,items:[{product_id:productId,qty:5,unit_paise:2000000}],date:today(),paid_paise:5000000,idempotency_key:'sale_1'});
 assert.equal(sold.subtotal_paise,10000000);assert.equal(sold.gst_paise,1800000);
 assert.equal(sold.outstanding_paise,6800000);
 assert.equal(stockQuantity(db,company.id,productId),15);
 assert.equal(stockReport(db,company.id)[0].stock_value_paise,19498500);
 assert.equal(profitLoss(db,company.id).net_profit_paise,3500500);
 assert.equal(balanceSheet(db,company.id).difference_paise,0);
 const gst=gstReport(db,company.id);assert.equal(gst.sales.cgst_paise,900000);assert.equal(gst.sales.sgst_paise,900000);
 const pay=receivePayment(db,company.id,user.id,sold.id,{amount_paise:3000000,method:'BANK',date:today(),idempotency_key:'pay_1'});
 assert.equal(pay.outstanding_paise,3800000);
 assert.equal(profitLoss(db,company.id).net_profit_paise,3500500);
 assert.equal(balanceSheet(db,company.id).difference_paise,0);
 assert.equal(receivePayment(db,company.id,user.id,sold.id,{amount_paise:3000000,method:'BANK',idempotency_key:'pay_1'}).reused,true);
 assert.throws(()=>issueInvoice(db,company.id,user.id,{kind:'SALE',contact_id:customer,items:[{product_id:productId,qty:16,unit_paise:2000000}]}),/Not enough available stock/);
 assert.equal(stockQuantity(db,company.id,productId),15);
 assert.equal(trialBalance(db,company.id).total_debit_paise,trialBalance(db,company.id).total_credit_paise);
 db.close();
});
test('multi-company isolation and wrong-contact checks',()=>{
 const {db,user,company}=setup();const c2=createCompany(db,user.id,{name:'Other Shop',state_code:'27'});
 const p=addProduct(db,company);const party=addContact(db,company,'CUSTOMER');
 assert.throws(()=>issueInvoice(db,c2.id,user.id,{kind:'SALE',contact_id:party,items:[{product_id:p,qty:1,unit_paise:1000}]}),/not found/);
 assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers').n,0);db.close();
});
test('intra vs inter-state GST',()=>{
 const {db,user,company}=setup();const prod=addProduct(db,company);
 const supplier=addContact(db,company,'SUPPLIER','29');
 const x=issueInvoice(db,company.id,user.id,{kind:'PURCHASE',contact_id:supplier,items:[{product_id:prod,qty:1,unit_paise:1000000}]});
 assert.equal(x.gst_paise,180000);
 assert.equal(gstReport(db,company.id).purchases.igst_paise,180000);
 db.close();
});
test('safe spreadsheet arithmetic, formulas and cycle prevention',()=>{
 const x=computeWorkbook({A1:10,A2:20,A3:'=SUM(A1:A2)',B1:'=A3/2',B2:'=AVERAGE(A1,A2)',C1:'=1/0',D1:'=D1+1'});
 assert.equal(x.A3.value,30);assert.equal(x.B1.value,15);assert.equal(x.B2.value,15);
 assert.match(x.C1.error,/Division by zero/);assert.match(x.D1.error,/Circular reference/);
 assert.match(computeWorkbook({A1:'=NOT_SUPPORTED(1)'}).A1.error,/Unsupported/);
});

test('discounted purchase inventory layers exactly match net cost',()=>{
 const {db,user,company}=setup(); const p=addProduct(db,company);const supplier=addContact(db,company);
 issueInvoice(db,company.id,user.id,{kind:'PURCHASE',contact_id:supplier,items:[{product_id:p,qty:3,unit_paise:400,discount_paise:199}]});
 assert.equal(stockReport(db,company.id)[0].stock_value_paise,1001);
 assert.equal(balanceSheet(db,company.id).difference_paise,0);
 db.close();
});
