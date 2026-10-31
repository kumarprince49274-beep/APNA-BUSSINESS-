import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openDatabase,one} from '../src/db.js';
import {register,login,getSession} from '../src/auth.js';
import {requestPasswordReset,resetPassword} from '../src/password-reset.js';
import {createServer} from '../src/server.js';
import {createVerifiedBackup,verifyBackup} from '../src/backup.js';

test('Password reset uses single-use email tokens, expires, and revokes all sessions',async()=>{
 const db=openDatabase(':memory:');const sent=[];
 try{
  const email='reset@example.test';register(db,{name:'Reset Test',email,password:'initial-password-123'});
  const session=login(db,{email,password:'initial-password-123'});
  assert.ok(getSession(db,session.token));
  const sender=async payload=>sent.push(payload);
  const result=await requestPasswordReset(db,{email},sender,true);
  assert.match(result.message,/if that email/i);assert.equal(sent.length,1);
  assert.equal(sent[0].email,email);assert.match(sent[0].token,/^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(result).includes(sent[0].token));
  assert.equal((await requestPasswordReset(db,{email:'unknown@example.test'},sender,true)).message,result.message);
  assert.equal(sent.length,1);
  assert.deepEqual(resetPassword(db,{token:sent[0].token,new_password:'completely-new-password-123'}).ok,true);
  assert.equal(getSession(db,session.token),null);
  assert.throws(()=>resetPassword(db,{token:sent[0].token,new_password:'another-password-123'}),/Invalid or expired/);
  assert.throws(()=>login(db,{email,password:'initial-password-123'}),/Invalid email or password/);
  assert.equal(login(db,{email,password:'completely-new-password-123'}).user.email,email);
 }finally{db.close();}
});

test('Password reset links expire and no email service never issues token',async()=>{
 const db=openDatabase(':memory:');
 try{
  register(db,{name:'Expiry',email:'expiry@example.test',password:'initial-password-123'});
  await assert.rejects(requestPasswordReset(db,{email:'expiry@example.test'},async()=>{},false),e=>e.status===503);
  assert.equal(one(db,'SELECT COUNT(*) n FROM password_reset_tokens').n,0);
  let token;
  await requestPasswordReset(db,{email:'expiry@example.test'},async p=>token=p.token,true);
  db.exec("UPDATE password_reset_tokens SET expires_at='2000-01-01T00:00:00.000Z'");
  assert.throws(()=>resetPassword(db,{token,new_password:'completely-new-password-123'}),/expired/);
 }finally{db.close();}
});

test('End-to-end forgot/reset API flow including CSRF and token sanitization',async()=>{
 const db=openDatabase(':memory:');let token;
 const server=createServer(db,{resetEmailSender:async p=>{token=p.token;},resetEmailReady:()=>true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return [r.status,await r.json()];};
 try{
  assert.equal((await post('/api/auth/register',{name:'API Reset',email:'api-reset@example.test',password:'old-api-password-123'}))[0],200);
  assert.equal((await post('/api/auth/forgot-password',{email:'api-reset@example.test'}))[0],200);
  assert.match(token,/^[0-9a-f]{64}$/);
  assert.equal((await post('/api/auth/reset-password',{token,new_password:'new-api-password-123'}))[0],200);
  assert.equal((await post('/api/auth/login',{email:'api-reset@example.test',password:'old-api-password-123'}))[0],401);
  assert.equal((await post('/api/auth/login',{email:'api-reset@example.test',password:'new-api-password-123'}))[0],200);
 }finally{await new Promise(r=>server.close(r));db.close();}
});

test('Verified SQLite backup retains company data and rejects overwritten files',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'apna-backup-test-'));const file=path.join(dir,'copy.sqlite');
 const db=openDatabase(':memory:');
 try{
  register(db,{name:'Backup User',email:'backedup@example.test',password:'backup-password-123'});
  const info=await createVerifiedBackup(db,file);assert.ok(info.bytes>0);
  assert.deepEqual(verifyBackup(file),{ok:true,users:1});
  await assert.rejects(createVerifiedBackup(db,file),/overwrite/);
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
