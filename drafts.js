import {uid,now,date,fail,text} from './utils.js';
import {one,all,run,transaction} from './db.js';
import {postVoucher} from './ledger.js';

// Human-review draft queue. This is NOT an AI/OCR engine. No ledger entries are
// created until an authorized user explicitly approves and posts a draft.
export function createDraft(db,companyId,userId,input){
 const memo=text(input.memo,'memo',500);
 const when=date(input.date);
 if(!Array.isArray(input.lines)||input.lines.length<2||input.lines.length>100)fail('Two or more lines required');
 let debit=0,credit=0;
 const lines=input.lines.map(l=>{
  const a=one(db,'SELECT id FROM accounts WHERE company_id=? AND id=?',companyId,l.account_id);
  if(!a)fail('Account is not in this company');
  const d=l.debit_paise,c=l.credit_paise;
  if(!Number.isSafeInteger(d)||!Number.isSafeInteger(c)||d<0||c<0||((d>0)===(c>0)))fail('Invalid debit or credit');
  debit+=d;credit+=c;return {account_id:a.id,debit_paise:d,credit_paise:c};
 });
 if(!Number.isSafeInteger(debit)||debit!==credit||debit===0)fail('Unbalanced draft');
 const id=uid();
 run(db,'INSERT INTO posting_drafts (id,company_id,created_by,date,memo,lines_json,status,created_at) VALUES (?,?,?,?,?,?,?,?)',id,companyId,userId,when,memo,JSON.stringify(lines),'PENDING',now());
 return {id,status:'PENDING',debit_paise:debit};
}
export function listDrafts(db,companyId){return all(db,'SELECT id,date,memo,status,created_at,posted_voucher_id FROM posting_drafts WHERE company_id=? ORDER BY created_at DESC',companyId);}
export function approveDraft(db,companyId,userId,draftId){
 return transaction(db,()=>{
  const d=one(db,'SELECT * FROM posting_drafts WHERE id=? AND company_id=?',draftId,companyId);
  if(!d)fail('Draft not found',404);
  if(d.status!=='PENDING')fail('Draft already handled',409);
  const posted=postVoucher(db,{companyId,userId,kind:'JOURNAL',dateValue:d.date,memo:d.memo,reference:`DRAFT-${d.id.slice(0,12)}`,idempotencyKey:`draft:${d.id}`,lines:JSON.parse(d.lines_json)});
  run(db,"UPDATE posting_drafts SET status='POSTED',posted_voucher_id=?,reviewed_by=?,reviewed_at=? WHERE id=?",posted.id,userId,now(),d.id);
  return {id:d.id,status:'POSTED',voucher_id:posted.id};
 });
}
export function rejectDraft(db,companyId,userId,draftId){
 const result=run(db,"UPDATE posting_drafts SET status='REJECTED',reviewed_by=?,reviewed_at=? WHERE id=? AND company_id=? AND status='PENDING'",userId,now(),draftId,companyId);
 if(!result.changes)fail('Draft not found or already handled',409);
 return {id:draftId,status:'REJECTED'};
}
