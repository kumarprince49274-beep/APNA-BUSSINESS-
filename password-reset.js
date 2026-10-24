import crypto from 'node:crypto';
import {one,run,transaction} from './db.js';
import {now,fail} from './utils.js';

const sha256 = value=>crypto.createHash('sha256').update(value).digest('hex');
const generic = {message:'If that email is registered, a reset link will be sent.'};
function newHash(password){
 if(typeof password!=='string'||password.length<12||password.length>256)fail('Password must be 12–256 characters');
 const salt=crypto.randomBytes(24).toString('hex');
 return `${salt}:${crypto.scryptSync(password,salt,64).toString('hex')}`;
}
export async function requestPasswordReset(db,{email},sendEmail,configured){
 if(!configured)fail('Password recovery email service is not configured yet',503);
 const address=String(email??'').trim().toLowerCase();
 // Never reveal whether the address is registered.
 if(address.length>254||!(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)))return generic;
 const user=one(db,'SELECT id,email FROM users WHERE email=?',address);
 if(!user)return generic;
 const token=crypto.randomBytes(32).toString('hex');
 const tokenHash=sha256(token);
 const expires=new Date(Date.now()+20*60*1000).toISOString();
 transaction(db,()=>{
  run(db,'DELETE FROM password_reset_tokens WHERE user_id=?',user.id);
  run(db,'INSERT INTO password_reset_tokens(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',tokenHash,user.id,expires,now());
 });
 try{await sendEmail({email:user.email,token});}
 catch(error){
  run(db,'DELETE FROM password_reset_tokens WHERE token_hash=?',tokenHash);
  fail('Unable to deliver reset email; try again later',503);
 }
 return generic;
}
export function resetPassword(db,{token,new_password}){
 // Reject bad/expired tokens before running expensive password hashing.
 if(typeof token!=='string'||!(/^[a-f0-9]{64}$/.test(token)))fail('Invalid or expired reset link',400);
 const candidate=one(db,'SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>?',sha256(token),now());
 if(!candidate)fail('Invalid or expired reset link',400);
 const hash=newHash(new_password);
 return transaction(db,()=>{
  const row=one(db,'SELECT * FROM password_reset_tokens WHERE token_hash=? AND expires_at>?',sha256(token),now());
  if(!row)fail('Invalid or expired reset link',400);
  run(db,'UPDATE users SET password_hash=? WHERE id=?',hash,row.user_id);
  run(db,'DELETE FROM sessions WHERE user_id=?',row.user_id);
  run(db,'DELETE FROM password_reset_tokens WHERE user_id=?',row.user_id);
  return {ok:true,message:'Password changed. Sign in again on all devices.'};
 });
}
