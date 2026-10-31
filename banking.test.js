import test from 'node:test';import assert from 'node:assert/strict';
import {openDatabase,one,run} from '../src/db.js';
import {importBankLines,listBankLines,matchBankLine} from '../src/banking.js';
import {businessReminders} from '../src/reminders.js';
import {uid,now} from '../src/utils.js';
test('Bank import is company-scoped and rejects duplicate external entries',()=>{
 const db=openDatabase(':memory:');const u=uid(),c=uid(),a=uid();
 run(db,'INSERT INTO users(id,name,email,password_hash,created_at) VALUES(?,?,?,?,?)',u,'Tester',u+'@example.com','test',now());
 run(db,'INSERT INTO companies(id,name,state_code,gstin,address,owner_id,created_at) VALUES(?,?,?,?,?,?,?)',c,'Test Co','27','','',u,now());
 run(db,'INSERT INTO accounts VALUES(?,?,?,?,?,?)',a,c,'1010','Bank','ASSET',0);
 const line={date:'2026-10-14',reference:'REF123',external_id:'bank-ref-1',description:'Deposit',amount_paise:5000};
 assert.deepEqual(importBankLines(db,c,a,[line,line]),{created:1,duplicates:1});
 assert.equal(listBankLines(db,c,a).length,1);
 assert.equal(businessReminders(db,c).unpaid_invoices.length,0);
 assert.throws(()=>importBankLines(db,c,a,[{...line,external_id:'invalid',amount_paise:1.2}]),/integer/);
 assert.throws(()=>matchBankLine(db,c,listBankLines(db,c,a)[0].id,'missing',u),/Journal line/);
 db.close();
});
