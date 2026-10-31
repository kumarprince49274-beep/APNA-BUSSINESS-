import {uid,now,fail,text,state} from './utils.js';
import {one,all,run,transaction} from './db.js';
import {getStateCode,getStateName,isValidGSTIN,GST_REG_TYPES,isValidStateCode,isValidStateName} from './states.js';

const masters=[
 ['1000','Cash','ASSET'],['1010','Bank','ASSET'],['1100','Accounts Receivable','ASSET'],
 ['1200','Inventory','ASSET'],['1300','Input CGST','ASSET'],['1310','Input SGST','ASSET'],['1320','Input IGST','ASSET'],
 ['2000','Accounts Payable','LIABILITY'],['2100','Output CGST','LIABILITY'],
 ['2110','Output SGST','LIABILITY'],['2120','Output IGST','LIABILITY'],
 ['3000','Owner Capital','EQUITY'],['4000','Sales Revenue','REVENUE'],
 ['4010','Service Revenue','REVENUE'],['5000','Cost of Goods Sold','EXPENSE'],
 ['6000','Operating Expenses','EXPENSE']
];
export {GST_REG_TYPES};

function normalizeBusinessType(value){
  const allowed=['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'];
  const s=String(value||'').trim();
  if(!allowed.includes(s)) fail('Invalid business type');
  return s;
}

function normalizeState(body){
  const raw=String(body.business_state ?? body.businessState ?? '').trim();
  const codeFromBody=String(body.state_code ?? body.stateCode ?? '').trim();
  let code=getStateCode(raw);
  if(!code && isValidStateCode(raw)) code=raw;
  if(!code && isValidStateCode(codeFromBody)) code=codeFromBody;
  if(!code) fail('Valid Indian Business State is required');
  if(raw && isValidStateName(raw)) code=getStateCode(raw);
  return {code,name:getStateName(code)};
}

export function validateCompanyInput(body){
  const name=text(body.name ?? body.businessName,'business name',120);
  const businessType=normalizeBusinessType(body.business_type ?? body.businessType ?? 'Other');
  const stateInfo=normalizeState(body);
  const gstType=String(body.gst_type ?? body.gst_registration_type ?? body.gstRegistrationType ?? 'UNREGISTERED').toUpperCase();
  if(!GST_REG_TYPES.includes(gstType)) fail('Invalid GST registration type');

  let gstin=null;
  if(gstType!=='UNREGISTERED'){
    gstin=String(body.gstin||'').trim().toUpperCase();
    if(!gstin || !isValidGSTIN(gstin)) fail('Valid GSTIN is required for this GST registration type');
    if(gstin.slice(0,2)!==stateInfo.code) fail('GSTIN first 2 digits must match the Business State code');
  }

  return {name,businessType,stateInfo,gstType,gstin,address:String(body.address||'').slice(0,500)};
}

export function createCompany(db,userId,body) {
  return transaction(db,()=>{
    const input=validateCompanyInput(body);
    const id=uid(),created=now();
    run(db,'INSERT INTO companies VALUES (?,?,?,?,?,?,?)',id,input.name,input.stateInfo.code,input.gstin,input.address,userId,created);
    run(db,'INSERT INTO company_settings(company_id,gst_type,business_type,business_state,tax_setup_confirmed) VALUES (?,?,?,?,1)',id,input.gstType,input.businessType,input.stateInfo.name);
    run(db,'INSERT INTO company_users VALUES (?,?,?)',id,userId,'OWNER');
    for(const [code,aname,type] of masters)run(db,'INSERT INTO accounts VALUES (?,?,?,?,?,1)',uid(),id,code,aname,type);
    run(db,'INSERT INTO subscriptions VALUES (?,?,?,?,?,?)',id,'FREE','FREE',0,created,null);
    run(db,'INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)',uid(),id,userId,'COMPANY_CREATE',id,JSON.stringify({gst_type:input.gstType}),created);
    return {id,name:input.name,business_type:input.businessType,business_state:input.stateInfo.name,state_code:input.stateInfo.code,gstin:input.gstin,gst_type:input.gstType,gst_registration_type:input.gstType};
  });
}

export function listCompanies(db,userId) {
  return all(db,`SELECT c.id,c.name,COALESCE(s.business_type,NULL) business_type,COALESCE(s.business_state,?) business_state,c.state_code,c.gstin,c.address,
    COALESCE(s.gst_type,'OTHER') gst_type,COALESCE(s.tax_setup_confirmed,0) tax_setup_confirmed,m.role
    FROM companies c LEFT JOIN company_settings s ON s.company_id=c.id
    JOIN company_users m ON m.company_id=c.id WHERE m.user_id=? ORDER BY c.created_at`, 'India', userId);
}

export function getCompanyTaxConfig(db,companyId){
  const c=one(db,'SELECT * FROM companies WHERE id=?',companyId);
  if(!c) fail('Company not found',404);
  const s=one(db,'SELECT * FROM company_settings WHERE company_id=?',companyId);
  const gstType=s?.gst_type||'OTHER';
  return {company_id:companyId,business_type:s?.business_type||null,business_state:s?.business_state||getStateName(c.state_code),state_code:c.state_code,gstin:c.gstin||null,gst_type:gstType,gst_registration_type:gstType,gst_enabled:gstType!=='UNREGISTERED' && Boolean(s?.tax_setup_confirmed),tax_setup_confirmed:Boolean(s?.tax_setup_confirmed)};
}

export function companyGstType(db,companyId){
  const s=one(db,'SELECT gst_type,tax_setup_confirmed FROM company_settings WHERE company_id=?',companyId);
  if(!s || !s.tax_setup_confirmed) return 'OTHER';
  return s.gst_type;
}

export function updateCompanyTaxConfig(db,companyId,userId,body){
  return transaction(db,()=>{
    const current=one(db,'SELECT * FROM companies WHERE id=?',companyId);
    if(!current) fail('Company not found',404);
    // business_type, business_state aur gst_type company_settings table mein rehte hain
    const settings=one(db,'SELECT * FROM company_settings WHERE company_id=?',companyId);
    const input=validateCompanyInput({
      name:body.name===undefined?current.name:body.name,
      business_type:body.business_type===undefined?(settings?.business_type||'Other'):body.business_type,
      business_state:body.business_state===undefined?settings?.business_state:body.business_state,
      state_code:body.state_code===undefined?current.state_code:body.state_code,
      gst_type:body.gst_type===undefined?(settings?.gst_type||'UNREGISTERED'):body.gst_type,
      gstin:body.gstin===undefined?current.gstin:body.gstin,
      address:body.address===undefined?current.address:body.address
    });
    run(db,'UPDATE companies SET name=?,state_code=?,gstin=?,address=? WHERE id=?',input.name,input.stateInfo.code,input.gstin,input.address,companyId);
    run(db,'INSERT INTO company_settings(company_id,gst_type,business_type,business_state,tax_setup_confirmed) VALUES (?,?,?,?,1) ON CONFLICT(company_id) DO UPDATE SET gst_type=excluded.gst_type,business_type=excluded.business_type,business_state=excluded.business_state,tax_setup_confirmed=1',companyId,input.gstType,input.businessType,input.stateInfo.name);
    run(db,'INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)',uid(),companyId,userId,'TAX_CONFIG_UPDATE',companyId,JSON.stringify({gst_type:input.gstType,gstin:input.gstin,state_code:input.stateInfo.code}),now());
    return getCompanyTaxConfig(db,companyId);
  });
}

export function account(db,companyId,code) {
  const a=one(db,'SELECT id FROM accounts WHERE company_id=? AND code=?',companyId,code);
  if(!a) fail(`Account ${code} missing`);
  return a.id;
}
export function checkOwnRecord(db,table,id,companyId) {
  if(!['contacts','products','invoices','accounts','vouchers','workbooks'].includes(table))fail('Invalid table');
  const row=one(db,`SELECT * FROM ${table} WHERE id=? AND company_id=?`,id,companyId);
  if(!row)fail(`${table.slice(0,-1)} not found`,404);
  return row;
}
