import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createServer} from '../src/server.js';
import {uid} from '../src/utils.js';

async function withServer(fn) {
 const db=openDatabase(':memory:');
 const server=createServer(db);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{
  await new Promise(resolve=>server.close(resolve)); db.close();
 }
}

test('Successful logins do not accumulate failed login lockout',async()=>withServer(async base=>{
 const email=`success${uid()}@example.test`;
 let r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Tester',email,password:'very-secure-test-password'})});
 assert.equal(r.status,200);
 for(let i=0;i<23;i++){
  r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'very-secure-test-password'})});
  assert.equal(r.status,200,`Login ${i+1} unexpectedly rejected`);
 }
 r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'incorrect-password'})});
 assert.equal(r.status,401);
 r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'very-secure-test-password'})});
 assert.equal(r.status,200);
}));

test('Excess failed logins are limited but site assets still serve',async()=>withServer(async base=>{
 for(const file of ['/', '/app.js', '/style.css', '/favicon.svg']){
  const r=await fetch(base+file);assert.equal(r.status,200,`Missing static asset ${file}`);
 }
 let r;
 for(let i=0;i<20;i++){
  r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'nobody@example.test',password:'wrong'})});
  assert.equal(r.status,401);
 }
 r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'nobody@example.test',password:'wrong'})});
 assert.equal(r.status,429);
}));
