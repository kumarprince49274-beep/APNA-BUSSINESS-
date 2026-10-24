import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,one,run} from '../src/db.js';
import {createDraft,approveDraft,rejectDraft,listDrafts} from '../src/drafts.js';
import {uid,now} from '../src/utils.js';
function fixture(){
 const db=openDatabase(':memory:');const user=uid(),company=uid(),a=uid(),b=uid();
 run(db,'INSERT INTO users VALUES (?,?,?,?,?)',user,'Owner',`${user}@example.test`,'hash',now());
 run(db,'INSERT INTO companies VALUES (?,?,?,?,?,?,?)',company,'Test','27',null,'',user,now());
 run(db,'INSERT INTO accounts VALUES (?,?,?,?,?,?)',a,company,'1000','Cash','ASSET',1);
 run(db,'INSERT INTO accounts VALUES (?,?,?,?,?,?)',b,company,'3000','Capital','EQUITY',1);
 return {db,user,company,a,b};
}
test('approval queue: no ledger posting until explicit approval; cannot approve twice',()=>{
 const {db,user,company,a,b}=fixture();
 const d=createDraft(db,company,user,{date:'2026-10-14',memo:'Draft capital',lines:[{account_id:a,debit_paise:50000,credit_paise:0},{account_id:b,debit_paise:0,credit_paise:50000}]});
 assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers').n,0);
 assert.equal(listDrafts(db,company).length,1);
 const posted=approveDraft(db,company,user,d.id);assert.equal(posted.status,'POSTED');
 assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers').n,1);
 assert.throws(()=>approveDraft(db,company,user,d.id));
 db.close();
});
test('rejection never posts and cross-company accounts are refused',()=>{
 const {db,user,company,a,b}=fixture();
 assert.throws(()=>createDraft(db,'other-company',user,{date:'2026-10-14',memo:'Wrong company',lines:[{account_id:a,debit_paise:100,credit_paise:0},{account_id:b,debit_paise:0,credit_paise:100}]}));
 const d=createDraft(db,company,user,{date:'2026-10-14',memo:'Rejected',lines:[{account_id:a,debit_paise:100,credit_paise:0},{account_id:b,debit_paise:0,credit_paise:100}]});
 rejectDraft(db,company,user,d.id);assert.equal(one(db,'SELECT COUNT(*) n FROM vouchers').n,0);
 assert.throws(()=>approveDraft(db,company,user,d.id));db.close();
});
