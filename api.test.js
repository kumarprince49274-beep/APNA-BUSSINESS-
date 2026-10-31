import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createServer} from '../src/server.js';
import {uid} from '../src/utils.js';
test('HTTP login cookies + CSRF + company membership + reporting',async()=>{
 const db=openDatabase(':memory:');const server=createServer(db);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;let cookie='',csrf='';
 const fetchJSON=async(route,body,method='POST',custom={})=>{
  const r=await fetch(url+route,{method,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...(cookie?{Cookie:cookie}:{}),...custom},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();return {status:r.status,data,headers:r.headers};
 };
 try{
  const email=`api${uid()}@test.example`;let r=await fetchJSON('/api/auth/register',{name:'API Test',email,password:'local-strong-password'});
  assert.equal(r.status,200);
  r=await fetchJSON('/api/auth/login',{email,password:'local-strong-password'});
  assert.equal(r.status,200);csrf=r.data.csrf;cookie=r.headers.get('set-cookie').split(';')[0];
  let unauth=await fetchJSON('/api/companies',{name:'Should fail',state_code:'27'},'POST',{'X-CSRF-Token':'wrong'});
  assert.equal(unauth.status,403);
  r=await fetchJSON('/api/companies',{name:'My Test Company',state_code:'27'});
  assert.equal(r.status,200);const companyId=r.data.id;
  const company=await fetchJSON('/api/companies',undefined,'GET');assert.equal(company.data.length,1);
  r=await fetchJSON(`/api/companies/${companyId}/products`,{sku:'S1',name:'Notebook',hsn:'4820',gst_bps:1200,sale_price_paise:20000,cost_price_paise:12000,reorder_level:3});
  assert.equal(r.status,200);
  r=await fetchJSON(`/api/companies/${companyId}/reports/balance-sheet`,undefined,'GET');assert.equal(r.status,200);assert.equal(r.data.difference_paise,0);
  r=await fetchJSON(`/api/companies/${companyId}/assistant`,{message:'Tell me cash balance'});
  assert.match(r.data.reply,/cash balance/);
  r=await fetch(url+'/app.js');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);
  r=await fetchJSON(`/api/companies/notmycompany/dashboard`,undefined,'GET');assert.equal(r.status,403);
  r=await fetchJSON('/api/auth/logout',{});assert.equal(r.status,200);
  r=await fetchJSON('/api/companies',undefined,'GET');assert.equal(r.status,401);
 }finally{await new Promise(r=>server.close(r));db.close();}
});
