import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,one} from '../src/db.js';
import {register} from '../src/auth.js';
import {createCompany} from '../src/companies.js';
import {createJournal} from '../src/ledger.js';
import {importBankLines,listBankLines,matchBankLine,unmatchBankLine,reconciliationCandidates} from '../src/banking.js';
import {uid} from '../src/utils.js';
const acct=(db,c,code)=>one(db,'SELECT id FROM accounts WHERE company_id=? AND code=?',c.id,code).id;
function setup(){
 const db=openDatabase(':memory:');
 const user=register(db,{name:'Owner',email:`owner${uid()}@example.com`,password:'strong-test-password'});
 const company=createCompany(db,user.id,{name:'Bank Test',state_code:'27'});
 return {db,user,company};
}
test('bank reconciliation does not post money and matching/unmatching is auditable',()=>{
 const {db,user,company}=setup();
 const bank=acct(db,company,'1010');const capital=acct(db,company,'3000');
 const posted=createJournal(db,company.id,user.id,{date:'2026-10-14',memo:'Funding',lines:[
  {account_id:bank,debit_paise:15000,credit_paise:0},
  {account_id:capital,debit_paise:0,credit_paise:15000}]});
 const bankLine=one(db,'SELECT id FROM journal_lines WHERE voucher_id=? AND account_id=?',posted.id,bank).id;
 assert.equal(reconciliationCandidates(db,company.id,bank).length,1);
 assert.deepEqual(importBankLines(db,company.id,bank,[{external_id:'B-1',reference:'TX-1',date:'2026-10-14',amount_paise:15000}]),{created:1,duplicates:0});
 const stmt=listBankLines(db,company.id,bank)[0];
 const voucherCount=one(db,'SELECT COUNT(*) n FROM vouchers WHERE company_id=?',company.id).n;
 assert.throws(()=>matchBankLine(db,company.id,stmt.id,'incorrect',user.id),/Journal line/);
 const matched=matchBankLine(db,company.id,stmt.id,bankLine,user.id);
 assert.equal(matched.journal_line_id,bankLine);
 assert.equal(reconciliationCandidates(db,company.id,bank).length,0);
 assert.throws(()=>matchBankLine(db,company.id,stmt.id,bankLine,user.id),/Already reconciled/);
 assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers WHERE company_id=?',company.id).n,voucherCount);
 const undone=unmatchBankLine(db,company.id,bank,stmt.id,user.id);
 assert.equal(undone.unmatched_journal_line_id,bankLine);
 assert.equal(reconciliationCandidates(db,company.id,bank).length,1);
 assert.throws(()=>unmatchBankLine(db,company.id,bank,stmt.id,user.id),/not matched/);
 const logs=one(db,"SELECT COUNT(*) n FROM audit_log WHERE company_id=? AND action IN ('BANK_MATCH','BANK_UNMATCH')",company.id).n;
 assert.equal(logs,2);
 db.close();
});
test('bank matching blocks wrong amounts and cross-company records',()=>{
 const {db,user,company}=setup();const other=createCompany(db,user.id,{name:'Other Co',state_code:'27'});
 const bank=acct(db,company,'1010'),otherBank=acct(db,other,'1010');
 assert.throws(()=>importBankLines(db,company.id,acct(db,company,'1000'),[{reference:'X',date:'2026-10-14',amount_paise:100}]),/bank asset ledger/);
 assert.throws(()=>importBankLines(db,company.id,bank,[{reference:'X',date:'2026-02-30',amount_paise:100}]),/Invalid date/);
 const posted=createJournal(db,company.id,user.id,{date:'2026-10-14',memo:'Fund',lines:[
  {account_id:bank,debit_paise:100,credit_paise:0},
  {account_id:acct(db,company,'3000'),debit_paise:0,credit_paise:100}]});
 const bankLine=one(db,'SELECT id FROM journal_lines WHERE voucher_id=? AND account_id=?',posted.id,bank).id;
 importBankLines(db,company.id,bank,[{reference:'Different amount',date:'2026-10-14',amount_paise:200}]);
 const statement=listBankLines(db,company.id,bank)[0];
 assert.throws(()=>matchBankLine(db,company.id,statement.id,bankLine,user.id),/amounts disagree/);
 assert.throws(()=>listBankLines(db,other.id,bank),/bank asset ledger/);
 assert.throws(()=>unmatchBankLine(db,other.id,otherBank,statement.id,user.id),/not found/);
 assert.equal(reconciliationCandidates(db,other.id,otherBank).length,0);
 db.close();
});
test('bank HTTP endpoints enforce login, CSRF, and company ownership',async()=>{
 const {createServer}=await import('../src/server.js');
 const db=openDatabase(':memory:');const server=createServer(db);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 let cookie='',csrf='';
 const request=async(path,method='GET',body,headers={})=>{
  const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json(),headers:res.headers};
 };
 try{
  const email=`bankapi${uid()}@example.com`;
  await request('/api/auth/register','POST',{name:'Testing',email,password:'test-password-is-strong'});
  let r=await request('/api/auth/login','POST',{email,password:'test-password-is-strong'});
  assert.equal(r.status,200);csrf=r.data.csrf;cookie=r.headers.get('set-cookie').split(';')[0];
  r=await request('/api/companies','POST',{name:'Bank API',state_code:'27'});assert.equal(r.status,200);
  const c=r.data.id;
  r=await request(`/api/companies/${c}/accounts`);const bank=r.data.find(x=>x.code==='1010');assert.ok(bank);
  r=await request(`/api/companies/${c}/banking/${bank.id}/candidates`);assert.equal(r.status,200);assert.equal(r.data.length,0);
  r=await request(`/api/companies/${c}/banking/${bank.id}/statement`,'POST',{lines:[{date:'2026-10-14',reference:'API',amount_paise:200}]},{'X-CSRF-Token':'invalid'});
  assert.equal(r.status,403);
  r=await request(`/api/companies/${c}/banking/${bank.id}/statement`,'POST',{lines:[{date:'2026-10-14',reference:'API',amount_paise:200}]});
  assert.equal(r.status,200);assert.equal(r.data.created,1);
  r=await request(`/api/companies/not-mine/banking/${bank.id}/statement`);assert.equal(r.status,403);
  cookie='';csrf='';r=await request(`/api/companies/${c}/banking/${bank.id}/statement`);assert.equal(r.status,401);
 }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
