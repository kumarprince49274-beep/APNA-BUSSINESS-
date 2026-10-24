import {uid,now,date,fail,text,nonnegative,positive} from './utils.js';
import {one,all,run,transaction} from './db.js';
export function postVoucher(db,{companyId,userId,kind,dateValue,reference='',memo='',lines,idempotencyKey=null,reversalOf=null}) {
  date(dateValue);
  if(!Array.isArray(lines)||lines.length<2||lines.length>100)fail('Voucher needs 2-100 lines');
  if(idempotencyKey) {
    const previous=one(db,'SELECT id FROM vouchers WHERE company_id=? AND idempotency_key=?',companyId,idempotencyKey);
    if(previous)return {id:previous.id,reused:true};
  }
  let debit=0,credit=0;
  for(const line of lines) {
    const account=one(db,'SELECT id FROM accounts WHERE id=? AND company_id=?',line.account_id,companyId);
    if(!account)fail('Voucher account not in selected company');
    nonnegative(line.debit_paise,'debit');nonnegative(line.credit_paise,'credit');
    if((line.debit_paise>0)===(line.credit_paise>0))fail('Each journal line must have only debit or credit');
    debit+=line.debit_paise;credit+=line.credit_paise;
  }
  if(!Number.isSafeInteger(debit)||!Number.isSafeInteger(credit)||debit!==credit||debit<=0)fail('Debit and credit totals must match');
  const id=uid();
  run(db,'INSERT INTO vouchers VALUES (?,?,?,?,?,?,?,?,?,?)',id,companyId,text(kind,'voucher type',40),String(reference).slice(0,80),dateValue,String(memo).slice(0,500),userId,now(),reversalOf,idempotencyKey);
  for(const l of lines)run(db,'INSERT INTO journal_lines VALUES (?,?,?,?,?)',uid(),id,l.account_id,l.debit_paise,l.credit_paise);
  run(db,'INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)',uid(),companyId,userId,'VOUCHER_POST',id,JSON.stringify({kind,debit}),now());
  return {id,debit_paise:debit,credit_paise:credit};
}
export function createJournal(db,companyId,userId,input){
  return transaction(db,()=>postVoucher(db,{companyId,userId,kind:'JOURNAL',dateValue:date(input.date),reference:input.reference,memo:input.memo,lines:input.lines,idempotencyKey:input.idempotency_key||null}));
}
export function reverseVoucher(db,companyId,userId,voucherId){
  return transaction(db,()=>{
    const original=one(db,'SELECT * FROM vouchers WHERE company_id=? AND id=?',companyId,voucherId);
    if(!original)fail('Voucher not found',404);
    if(original.reversal_of)fail('Cannot reverse a reversal');
    if(original.kind!=='JOURNAL')fail('Reverse sales/purchases through a proper credit/debit note workflow (not included in this starter)');
    if(one(db,'SELECT id FROM vouchers WHERE reversal_of=?',voucherId))fail('Voucher has already been reversed',409);
    const originalLines=all(db,'SELECT * FROM journal_lines WHERE voucher_id=?',voucherId);
    return postVoucher(db,{companyId,userId,kind:'REVERSAL',dateValue:date(new Date().toISOString().slice(0,10)),reference:`REV-${original.reference||voucherId.slice(0,8)}`,memo:`Reverses ${voucherId}`,
      lines:originalLines.map(l=>({account_id:l.account_id,debit_paise:l.credit_paise,credit_paise:l.debit_paise})),reversalOf:voucherId});
  });
}
export function voucherDetails(db,companyId,voucherId) {
 const v=one(db,'SELECT * FROM vouchers WHERE company_id=? AND id=?',companyId,voucherId);
 if(!v)fail('Voucher not found',404);
 return {...v,lines:all(db,`SELECT l.*,a.code,a.name,a.type FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.voucher_id=?`,voucherId)};
}
export function balanceAccount(db,companyId,code,upTo) {
 const a=one(db,'SELECT id FROM accounts WHERE company_id=? AND code=?',companyId,code);
 if(!a)fail('Unknown account');
 const filter=upTo?' AND v.date<=?':'';
 const params=upTo?[companyId,a.id,upTo]:[companyId,a.id];
 const row=one(db,`SELECT COALESCE(SUM(l.debit_paise-l.credit_paise),0) amount FROM journal_lines l JOIN vouchers v ON v.id=l.voucher_id WHERE v.company_id=? AND l.account_id=?${filter}`,...params);
 return row.amount;
}
