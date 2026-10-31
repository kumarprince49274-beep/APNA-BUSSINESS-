import {uid,now,fail,text,date} from './utils.js';
import {all,one,run,transaction} from './db.js';
// Reconciliation links bank statement evidence to an ALREADY POSTED bank ledger line.
// It never creates payments, vouchers, or moves actual funds.
function assertBankAccount(db,companyId,accountId){
 const account=one(db,'SELECT id,code,name,type FROM accounts WHERE company_id=? AND id=?',companyId,accountId);
 if(!account || account.type!=='ASSET' || (account.code!=='1010'&&!/bank/i.test(account.name)))fail('Select a bank asset ledger for this company');
 return account;
}
export function importBankLines(db,companyId,accountId,rows){
 assertBankAccount(db,companyId,accountId);
 if(!Array.isArray(rows)||!rows.length||rows.length>500)fail('Supply 1 to 500 statement lines');
 return transaction(db,()=>{
  let created=0,duplicates=0;
  for(const row of rows){
   const onDate=date(row.date);
   const amount=row.amount_paise;
   if(!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>9e13)fail('Bank amount must be a nonzero integer in paise');
   const reference=text(String(row.reference||''),'statement reference',120);
   const key=String(row.external_id||`${onDate}:${reference}:${amount}`);
   if(key.length>180)fail('Statement key too long');
   const info=run(db,'INSERT OR IGNORE INTO bank_statement_lines(id,company_id,account_id,external_id,date,description,amount_paise,created_at) VALUES(?,?,?,?,?,?,?,?)',uid(),companyId,accountId,key,onDate,String(row.description||'').slice(0,300),amount,now());
   if(info.changes)created++;else duplicates++;
  }
  return {created,duplicates};
 });
}
export function listBankLines(db,companyId,accountId){
 assertBankAccount(db,companyId,accountId);
 return all(db,'SELECT id,external_id,date,description,amount_paise,matched_journal_line_id FROM bank_statement_lines WHERE company_id=? AND account_id=? ORDER BY date,id',companyId,accountId);
}
export function matchBankLine(db,companyId,statementId,journalLineId,actorId){
 return transaction(db,()=>{
  const st=one(db,'SELECT * FROM bank_statement_lines WHERE id=? AND company_id=?',statementId,companyId);
  if(!st)fail('Bank statement line not found',404);
  if(st.matched_journal_line_id)fail('Already reconciled',409);
  assertBankAccount(db,companyId,st.account_id);
  const j=one(db,`SELECT l.id,l.debit_paise,l.credit_paise,v.date FROM journal_lines l JOIN vouchers v ON v.id=l.voucher_id WHERE l.id=? AND l.account_id=? AND v.company_id=?`,journalLineId,st.account_id,companyId);
  if(!j)fail('Journal line does not belong to this account');
  if(j.debit_paise-j.credit_paise!==st.amount_paise)fail('Statement and journal amounts disagree');
  if(one(db,'SELECT id FROM bank_statement_lines WHERE company_id=? AND matched_journal_line_id=?',companyId,journalLineId))fail('Journal line already matched',409);
  run(db,'UPDATE bank_statement_lines SET matched_journal_line_id=? WHERE id=?',journalLineId,statementId);
  run(db,'INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',uid(),companyId,actorId,'BANK_MATCH',statementId,JSON.stringify({journalLineId}),now());
  return {ok:true,statement_id:statementId,journal_line_id:journalLineId};
 });
}

// Returns unlinked, eligible journal lines, not arbitrary entries from other companies.
export function reconciliationCandidates(db,companyId,accountId){
 assertBankAccount(db,companyId,accountId);
 return all(db,`SELECT l.id,l.debit_paise-l.credit_paise AS amount_paise,
  v.date,v.reference,v.memo,v.kind
  FROM journal_lines l JOIN vouchers v ON v.id=l.voucher_id
  LEFT JOIN bank_statement_lines b ON b.matched_journal_line_id=l.id
  WHERE v.company_id=? AND l.account_id=? AND b.id IS NULL
  ORDER BY v.date DESC,l.id DESC LIMIT 500`,companyId,accountId);
}
export function unmatchBankLine(db,companyId,accountId,statementId,actorId){
 return transaction(db,()=>{
  assertBankAccount(db,companyId,accountId);
  const st=one(db,'SELECT id,matched_journal_line_id FROM bank_statement_lines WHERE id=? AND company_id=? AND account_id=?',statementId,companyId,accountId);
  if(!st)fail('Bank statement not found',404);
  if(!st.matched_journal_line_id)fail('Bank statement is not matched',409);
  run(db,'UPDATE bank_statement_lines SET matched_journal_line_id=NULL WHERE id=?',statementId);
  run(db,'INSERT INTO audit_log VALUES(?,?,?,?,?,?,?)',uid(),companyId,actorId,'BANK_UNMATCH',statementId,JSON.stringify({journal_line_id:st.matched_journal_line_id}),now());
  return {ok:true,statement_id:statementId,unmatched_journal_line_id:st.matched_journal_line_id};
 });
}
