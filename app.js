const STATES = [
  ['01','Jammu and Kashmir'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],['09','Uttar Pradesh'],['10','Bihar'],['11','Sikkim'],['12','Arunachal Pradesh'],['13','Nagaland'],['14','Manipur'],['15','Mizoram'],['16','Tripura'],['17','Meghalaya'],['18','Assam'],['19','West Bengal'],['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],['24','Gujarat'],['26','Dadra and Nagar Haveli and Daman and Diu'],['27','Maharashtra'],['29','Karnataka'],['30','Goa'],['31','Lakshadweep'],['32','Kerala'],['33','Tamil Nadu'],['34','Puducherry'],['35','Andaman and Nicobar Islands'],['36','Telangana'],['37','Andhra Pradesh'],['38','Ladakh']
];

const $ = id => document.getElementById(id);
const state = { 
  user: null, 
  csrf: null, 
  companies: [], 
  companyId: null, 
  page: 'dashboard', 
  chats: {}, 
  chatBusy: false, 
  aiMode: 'chat', 
  sidebarOpen: window.innerWidth > 800, 
  threads: [], threadId: null, threadsCompany: null, threadSearch: '', 
  aiSection: 'home', 
  lang: (() => { try { return localStorage.getItem('apna_lang') || 'hi'; } catch { return 'hi'; } })(), 
  theme: (() => { try { return localStorage.getItem('apna_theme') || 'dark'; } catch { return 'dark'; } })() 
};
// --- Side-by-side AI panel: ERP ke saath chat ek iframe mein khulti hai ---
const _qs = new URLSearchParams(location.search);
state.embed = _qs.get('embed') === 'chat';
state.aiPanel = false;
if (state.embed) {
  state.page = 'chat';
  if (_qs.get('company')) state.companyId = _qs.get('company');
}

// --- App-wide font (Settings mein badal sakte hain) ---
const FONT_SANS_FALLBACK = "'Noto Sans Devanagari','Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif";
const FONT_SERIF_FALLBACK = "'Noto Serif Devanagari',Georgia,'Times New Roman',serif";
const FONT_PRESETS = {
  clean:    { label: 'Clean (Inter) - ChatGPT jaisa', body: "Inter," + FONT_SANS_FALLBACK, head: "Inter," + FONT_SANS_FALLBACK, g: ['Inter:wght@400;500;600;700','Noto+Sans+Devanagari:wght@400;500;600;700'] },
  claude:   { label: 'Claude style (serif headings)', body: "Inter," + FONT_SANS_FALLBACK, head: "Lora," + FONT_SERIF_FALLBACK, g: ['Inter:wght@400;500;600;700','Lora:wght@500;600;700','Noto+Sans+Devanagari:wght@400;500;600;700','Noto+Serif+Devanagari:wght@500;600;700'] },
  friendly: { label: 'Friendly (Nunito)', body: "Nunito," + FONT_SANS_FALLBACK, head: "Nunito," + FONT_SANS_FALLBACK, g: ['Nunito:wght@400;500;600;700;800','Noto+Sans+Devanagari:wght@400;500;600;700'] },
  poppins:  { label: 'Modern (Poppins)', body: "Poppins," + FONT_SANS_FALLBACK, head: "Poppins," + FONT_SANS_FALLBACK, g: ['Poppins:wght@400;500;600;700'] },
  classic:  { label: 'Classic serif (Lora)', body: "Lora," + FONT_SERIF_FALLBACK, head: "Lora," + FONT_SERIF_FALLBACK, g: ['Lora:wght@400;500;600;700','Noto+Serif+Devanagari:wght@400;500;600;700'] },
  system:   { label: 'System default', body: FONT_SANS_FALLBACK, head: FONT_SANS_FALLBACK, g: [] }
};
state.font = (() => { try { const f = localStorage.getItem('apna_font'); return FONT_PRESETS[f] ? f : 'clean'; } catch { return 'clean'; } })();
function applyFont(){
  const p = FONT_PRESETS[state.font] || FONT_PRESETS.clean;
  let link = document.getElementById('font-link');
  if (p.g.length) {
    const href = 'https://fonts.googleapis.com/css2?' + p.g.map(f => 'family=' + f).join('&') + '&display=swap';
    if (!link) { link = document.createElement('link'); link.id = 'font-link'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  } else if (link) { link.remove(); }
  let st = document.getElementById('font-style');
  if (!st) { st = document.createElement('style'); st.id = 'font-style'; document.head.appendChild(st); }
  st.textContent =
    "html,body,button,input,select,textarea{font-family:" + p.body + " !important;}" +
    "h1,h2,h3,h4{font-family:" + p.head + " !important;letter-spacing:-0.02em;line-height:1.25;}" +
    "body{line-height:1.55;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;}";
}
function setFont(k){
  if (!FONT_PRESETS[k]) return;
  state.font = k;
  try { localStorage.setItem('apna_font', k); } catch {}
  applyFont();
}
window.addEventListener('storage', e => {
  if (e.key === 'apna_font' && FONT_PRESETS[e.newValue]) { state.font = e.newValue; applyFont(); }
});
applyFont();
function closeEmbed(){ try { parent.postMessage({ type: 'apna-close-ai' }, location.origin); } catch {} }
function aiPanelLeft(){
  if (window.innerWidth <= 800) return 0;
  const sb = document.querySelector('.workspace .sidebar');
  return sb ? Math.round(sb.getBoundingClientRect().width) : 270;
}
function removeAiPanel(){
  document.getElementById('ai-panel')?.remove();
  state.aiPanel = false;
}
function setAiPanel(open){
  let panel = document.getElementById('ai-panel');
  state.aiPanel = open;
  if (open) {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ai-panel';
      panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;z-index:50;background:var(--bg);clip-path:inset(0 100% 0 0);transition:clip-path .28s ease;';
      const f = document.createElement('iframe');
      f.title = 'AI Accountant';
      f.src = '/?embed=chat&company=' + encodeURIComponent(state.companyId || '');
      f.style.cssText = 'width:100%;height:100%;border:0;display:block;';
      panel.appendChild(f);
      document.body.appendChild(panel);
      panel.getBoundingClientRect();
    }
    panel.style.left = aiPanelLeft() + 'px';
    requestAnimationFrame(() => { panel.style.clipPath = 'inset(0 0 0 0)'; });
  } else if (panel) {
    panel.style.clipPath = 'inset(0 100% 0 0)';
  }
  const b = document.getElementById('ai-panel-toggle');
  if (b) b.style.background = open ? 'rgba(255,255,255,0.14)' : 'none';
}
window.addEventListener('resize', () => {
  const p = document.getElementById('ai-panel');
  if (p) p.style.left = aiPanelLeft() + 'px';
});
function resetAiPanel(){ const was = state.aiPanel; removeAiPanel(); if (was) setAiPanel(true); }
window.addEventListener('message', e => {
  if (e.origin === location.origin && e.data && e.data.type === 'apna-close-ai') setAiPanel(false);
});


// Pure Bilingual Dictionary (English & Hindi)[cite: 5]
const dict = {
  hi: {
    brandSub: 'अकाउंटिंग और ईआरपी',
    mainMenu: 'मुख्य डैशबोर्ड',
    dashboard: 'डैशबोर्ड',
    aiChat: 'एआई अकाउंटेंट',
    vouchersBilling: 'वाउचर और बिलिंग',
    vouchersList: 'वाउचर सूची',
    salesPurchases: 'बिक्री / खरीद (Invoices)',
    accountsSheet: 'खाता और बैलेंस शीट',
    balanceSheet: 'बैलेंस शीट',
    profitLoss: 'लाभ और हानि (P&L)',
    inventoryStock: 'इन्वेंटरी और स्टॉक',
    productsInv: 'स्टॉक / इन्वेंटरी',
    contactsList: 'ग्राहक / सप्लायर',
    gstTax: 'जीएसटी और टैक्स',
    gstBreakdown: 'जीएसटी ब्रेकडाउन',
    companyMgmt: 'कंपनी मैनेजमेंट',
    companyAlter: 'कंपनी ऑल्टर / एडिट',
    appSettings: 'एप सेटिंग्स (भाषा/थीम)',
    createCompanyBtn: '+ नई कंपनी बनाएं',
    alterCompanyBtn: 'Alter Company',
    logout: 'लॉगआउट',
    sales: 'कुल बिक्री (Sales)',
    purchases: 'कुल खरीद (Purchases)',
    profit: 'शुद्ध लाभ (Profit)',
    cash: 'नकद (Cash)',
    bank: 'बैंक (Bank)',
    inventoryVal: 'स्टॉक मूल्य',
    welcomeMsg: 'अपने बिजनेस का पूरा लेखा-जोखा और वित्तीय स्थिति यहाँ देखें।'
  },
  en: {
    brandSub: 'Accounting & ERP',
    mainMenu: 'Main Dashboard',
    dashboard: 'Dashboard',
    aiChat: 'AI Accountant',
    vouchersBilling: 'Vouchers & Billing',
    vouchersList: 'Vouchers List',
    salesPurchases: 'Sales / Purchases',
    accountsSheet: 'Accounts & Sheet',
    balanceSheet: 'Balance Sheet',
    profitLoss: 'Profit & Loss',
    inventoryStock: 'Inventory & Stock',
    productsInv: 'Products / Inventory',
    contactsList: 'Customers / Suppliers',
    gstTax: 'GST & Tax',
    gstBreakdown: 'GST Breakdown',
    companyMgmt: 'Company Management',
    companyAlter: 'Company Alter / Edit',
    appSettings: 'App Settings (Theme/Lang)',
    createCompanyBtn: '+ Create Company',
    alterCompanyBtn: 'Alter Company',
    logout: 'Logout',
    sales: 'Sales',
    purchases: 'Purchases',
    profit: 'Profit',
    cash: 'Cash',
    bank: 'Bank',
    inventoryVal: 'Inventory',
    welcomeMsg: 'View your complete business financial overview here.'
  }
};

const t = (key) => dict[state.lang]?.[key] || dict['hi'][key] || key;

const PULSE_ICON = (size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function money(p){return `₹${(Number(p||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}
function showError(message){$('app').insertAdjacentHTML('afterbegin',`<div class="banner">${esc(message)}</div>`);}

async function api(path,options={}){
  const opts={...options, credentials: 'include', headers:{'Content-Type':'application/json',...(options.headers||{})}};
  if(opts.body && typeof opts.body!=='string') opts.body=JSON.stringify(opts.body);
  if(state.csrf && opts.method && opts.method!=='GET') opts.headers['X-CSRF-Token']=state.csrf;
  const r=await fetch(path,opts);
  let data=null; try{data=await r.json();}catch{}
  if(!r.ok) throw new Error(data?.error||`Request failed (${r.status})`);
  return data;
}

async function refreshSession(){
  try{
    const me=await api('/api/auth/me');
    if(!me || !me.user) return false;
    state.user=me.user; 
    state.csrf=me.csrf || '';
    try {
      state.companies=await api('/api/companies');
    } catch {
      state.companies = [];
    }
    if(!state.companyId || !state.companies.some(c=>c.id===state.companyId)) {
      state.companyId=state.companies[0]?.id||null;
    }
    return true;
  }catch{ return false; }
}

function authView(mode='login'){
  removeAiPanel();
  $('app').innerHTML=`<main class="auth-shell"><section class="auth-card" translate="no">
    <div class="logo">${PULSE_ICON(26)}</div><h1 translate="no">APNA BUSINESS</h1>
    <div class="seg"><button class="${mode==='login'?'active':''}" id="login-tab">${state.lang==='hi'?'लॉगिन':'Login'}</button><button class="${mode==='register'?'active':''}" id="register-tab">${state.lang==='hi'?'अकाउंट बनाएं':'Create account'}</button></div>
    <form id="auth-form"><div id="name-wrap" class="${mode==='register'?'':'hidden'}"><label>${state.lang==='hi'?'नाम':'Name'}<input name="name" placeholder="${state.lang==='hi'?'आपका नाम':'Your name'}"></label></div>
    <label>${state.lang==='hi'?'ईमेल':'Email'}<input name="email" type="email" required placeholder="you@example.com"></label>
    <label>${state.lang==='hi'?'पासवर्ड':'Password'}<input name="password" type="password" required minlength="6" placeholder="${state.lang==='hi'?'कम से कम 6 अक्षर':'At least 6 characters'}"></label>
    <button class="btn primary full" type="submit">${mode==='login'?(state.lang==='hi'?'लॉगिन':'Login'):(state.lang==='hi'?'अकाउंट बनाएं':'Create account')}</button>
    
    <div style="display:flex;align-items:center;justify-content:center;margin:18px auto;width:100%;color:var(--muted);font-size:13px;">
      <div style="flex:1;border-top:1px solid var(--border);margin-right:12px;"></div> 
      <span style="font-weight:600;letter-spacing:1px;">OR</span> 
      <div style="flex:1;border-top:1px solid var(--border);margin-left:12px;"></div>
    </div>

    <button type="button" class="btn full" id="google-login-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#000;border:1px solid #ccc;font-weight:600;">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.16 21.03 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.16 2.97 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
      ${state.lang==='hi'?'गूगल से जारी रखें':'Continue with Google'}
    </button>

    <div id="auth-error" class="error"></div></form>
  </section></main>`;
  
  $('login-tab').onclick=()=>authView('login');
  $('register-tab').onclick=()=>authView('register');
  
  $('google-login-btn').onclick=() => {
    toast(state.lang==='hi'?'Google Sign-In ke liye Google API credentials required hain.':'Google Sign-In requires OAuth client setup.');
  };

  $('auth-form').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    try{
      const email = fd.get('email');
      const password = fd.get('password');
      if(mode==='register') {
        await api('/api/auth/register',{method:'POST',body:{name:fd.get('name'),email,password}});
      }
      const loginRes = await api('/api/auth/login',{method:'POST',body:{email,password}});
      state.user = loginRes.user;
      state.csrf = loginRes.csrf;
      
      try {
        state.companies = await api('/api/companies');
        state.companyId = state.companies[0]?.id || null;
      } catch {
        state.companies = [];
        state.companyId = null;
      }
      render();
    }catch(err){
      $('auth-error').textContent=err.message;
    }
  };
}

function companySelect(){return `<select id="company-select">${state.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function fmtSize(n){n=Number(n||0);return n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?Math.round(n/1024)+' KB':n+' B';}
function fmtDate(v){try{return new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return String(v||'');}}

async function loadPrefsInto(textarea){
  try{const r=await api('/api/auth/preferences');textarea.value=r.custom_instructions||'';}catch{}
}
async function savePrefsFrom(textarea){
  try{await api('/api/auth/preferences',{method:'PATCH',body:{custom_instructions:textarea.value}});toast(state.lang==='hi'?'सहेज लिया गया':'Saved');}
  catch(err){toast(err.message);}
}

function cfgGet(){try{return JSON.parse(localStorage.getItem('apna_cfg_'+state.companyId)||'{}');}catch{return {};}}
function cfgSet(p){try{localStorage.setItem('apna_cfg_'+state.companyId,JSON.stringify({...cfgGet(),...p}));}catch{}}

function openSettingsModal(startTab){
  const hi=state.lang==='hi';
  const tabs=[['general',hi?'सामान्य':'General'],['profile',hi?'बिज़नेस प्रोफ़ाइल':'Business Profile'],['invoice',hi?'इनवॉइस':'Invoice'],['reminders',hi?'रिमाइंडर और सूचनाएँ':'Reminders'],['personal',hi?'AI सेटिंग':'AI'],['account',hi?'अकाउंट और सुरक्षा':'Account & Security'],['data',hi?'बैकअप / डेटा':'Backup & Data'],['help',hi?'मदद':'Help'],['about',hi?'जानकारी':'About']];
  const m=modal(hi?'सेटिंग्स':'Settings',`<div id="settings-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 12px; border-bottom:1px solid var(--border); padding-bottom:10px;">${tabs.map(([k,l])=>`<button type="button" data-tab="${k}" style="border:none; cursor:pointer; padding:7px 14px; border-radius:999px; font-size:13px; color:var(--text); background:transparent;">${l}</button>`).join('')}</div><div id="settings-body" style="max-height:60vh; overflow-y:auto; padding-right:4px; color:var(--text);"></div>`);
  const body=m.querySelector('#settings-body');
  const row='display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);';
  const sel='padding:5px 8px; border-radius:6px; background:rgba(255,255,255,0.1); color:var(--text); border:1px solid var(--border); width:auto; margin:0;';
  const btn='padding:9px 14px; border-radius:8px; cursor:pointer; background:transparent; color:var(--text); border:1px solid var(--border);';
  const name=esc(state.user?.name||''), email=esc(state.user?.email||'');

  const panels={
    general:()=>`<div style="${row}"><span>${hi?'थीम':'Theme'}</span><select id="st-theme" style="${sel}"><option value="dark" ${state.theme==='dark'?'selected':''}>Dark</option><option value="light" ${state.theme==='light'?'selected':''}>Light</option></select></div>
      <div style="${row}"><span>${hi?'भाषा':'Language'}</span><select id="st-lang" style="${sel}"><option value="hi" ${state.lang==='hi'?'selected':''}>हिंदी (Hindi)</option><option value="en" ${state.lang==='en'?'selected':''}>English</option></select></div>
      <div style="${row}"><span>${hi?'फ़ॉन्ट (पूरे ऐप का)':'Font (whole app)'}</span><select id="st-font" style="${sel}">${Object.entries(FONT_PRESETS).map(([k,f])=>`<option value="${k}" ${state.font===k?'selected':''}>${f.label}</option>`).join('')}</select></div>
      <p class="muted" style="font-size:13px; margin:10px 0 0;">Aa Bb Cc - नमस्ते, Apna Business ₹1,25,000</p>
      <button type="button" id="st-save-general" class="btn primary" style="margin-top:14px;">${hi?'सेटिंग्स सहेजें':'Save settings'}</button>`,
    personal:()=>`<p class="muted" style="margin:0 0 8px; font-size:13px;">${hi?'AI को बताइए कि वह आपसे कैसे बात करे (भाषा, लहजा, जवाब कितना छोटा या लंबा)। यह सिर्फ़ जवाब के तरीके को बदलता है; सुरक्षा नियम वही रहते हैं।':'Tell the AI how to talk to you (language, tone, answer length). This changes style only; safety rules stay the same.'}</p>
      <textarea id="st-custom" rows="6" maxlength="1500" placeholder="${hi?'जैसे: हमेशा आसान हिंदी में, छोटे जवाब दो।':'e.g. Always reply in simple Hindi, keep answers short.'}" style="width:100%; padding:10px; border-radius:10px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit; font-size:14px;"></textarea>
      <button type="button" id="st-save-custom" class="btn primary" style="margin-top:10px;">${hi?'सहेजें':'Save'}</button>
      <div style="${row} margin-top:14px;"><span>${hi?'AI के बनाए ड्राफ़्ट पोस्ट करने से पहले हमेशा Confirm माँगना':'Always ask Confirm before posting AI drafts'}</span><input type="checkbox" checked disabled style="width:18px; height:18px; margin:0;"></div>
      <p class="muted" style="font-size:12px;">${hi?'यह सुरक्षा नियम हमेशा चालू रहता है।':'This safety rule is always on.'}</p>`,
    account:()=>`<div style="${row}"><span>${hi?'नाम':'Name'}</span><strong>${name}</strong></div>
      <div style="${row}"><span>Email</span><strong>${email}</strong></div>
      <div style="margin-top:14px; font-weight:600;">${hi?'पासवर्ड बदलें':'Change password'}</div>
      <label style="margin-top:8px;">${hi?'मौजूदा पासवर्ड':'Current password'}<input id="st-cur" type="password" autocomplete="current-password"></label>
      <label>${hi?'नया पासवर्ड (कम से कम 8 अक्षर)':'New password (at least 8 characters)'}<input id="st-new" type="password" autocomplete="new-password"></label>
      <div style="display:flex; gap:10px; flex-wrap:wrap;"><button type="button" id="st-pw" class="btn primary">${hi?'पासवर्ड बदलो':'Update password'}</button><button type="button" id="st-logout" style="${btn} color:#f28b82;">${hi?'लॉगआउट':'Sign out'}</button></div>`,
    data:()=>`${[['invoices',hi?'बिल / इनवॉइस (CSV)':'Invoices (CSV)'],['products',hi?'प्रोडक्ट (CSV)':'Products (CSV)'],['stock',hi?'स्टॉक (CSV)':'Stock (CSV)']].map(([k,l])=>`<div style="${row}"><span>${l}</span><button type="button" data-exp2="${k}" style="${btn}">${hi?'डाउनलोड':'Download'}</button></div>`).join('')}
      <div style="${row}"><span>${hi?'सारी चैट डाउनलोड करें (JSON)':'Export all chats (JSON)'}</span><button type="button" id="st-export-chats" style="${btn}">${hi?'डाउनलोड':'Export'}</button></div>
      <div style="${row}"><span>${hi?'सारी चैट हमेशा के लिए हटाएँ':'Delete all chats'}</span><button type="button" id="st-clear-chats" style="${btn} color:#f28b82;">${hi?'सब हटाओ':'Delete all'}</button></div>
      <p class="muted" style="font-size:12px; margin-top:12px;">${hi?'अकाउंटिंग डेटा (बिल, स्टॉक) का CSV Connectors पेज से डाउनलोड होता है। अकाउंटिंग डेटा यहाँ से नहीं हटता।':'Accounting data (invoices, stock) can be exported as CSV from the Connectors page. Accounting data is never deleted from here.'}</p>`,
    profile:()=>`<p class="muted" style="margin:0 0 8px; font-size:13px;">${hi?'यही जानकारी आपके बिल पर छपेगी।':'This information is printed on your bills.'}</p>
      <label>${hi?'बिज़नेस का नाम':'Business name'}<input id="bp-name"></label>
      <label>${hi?'पता':'Address'}<textarea id="bp-address" rows="2" style="width:100%; padding:8px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit;"></textarea></label>
      <label>${hi?'फ़ोन':'Phone'}<input id="bp-phone" inputmode="tel"></label>
      <label>${hi?'राज्य':'State / UT'}<select id="bp-state">${STATES.map(([code,nm])=>`<option value="${esc(nm)}">${nm} (${code})</option>`).join('')}</select></label>
      <label>${hi?'GST का प्रकार':'GST type'}<select id="bp-gsttype"><option value="UNREGISTERED">${hi?'GST रजिस्ट्रेशन नहीं है':"No GST registration"}</option><option value="REGULAR">GST Regular</option><option value="COMPOSITION">GST Composition</option><option value="OTHER">${hi?'अन्य GST':'Other GST registration'}</option></select></label>
      <label>GSTIN<input id="bp-gstin" placeholder="${hi?'रजिस्टर्ड प्रकार के लिए ज़रूरी':'Required for registered types'}"></label>
      <label>${hi?'लोगो':'Logo'}<input id="bp-logo" type="file" accept="image/*"></label>
      <img id="bp-logo-prev" alt="" style="display:none; max-height:60px; margin-top:6px; border-radius:6px;">
      <button type="button" id="bp-save" class="btn primary" style="margin-top:14px;">${hi?'सहेजें':'Save'}</button>`,
    invoice:()=>{const g=cfgGet().invoice||{};return `<label>${hi?'बिल नंबर का शुरुआती अक्षर':'Invoice number prefix'}<input id="iv-prefix" value="${esc(g.prefix||'INV-')}" maxlength="12"></label>
      <p class="muted" style="font-size:12px; margin:2px 0 8px;">${hi?'जैसे: INV-0001':'e.g. INV-0001'}</p>
      <label>UPI ID<input id="iv-upi" value="${esc(g.upi||'')}" placeholder="name@bank"></label>
      <label>${hi?'डिफ़ॉल्ट GST दर':'Default GST rate'}<select id="iv-gst">${[0,5,12,18,28].map(r=>`<option value="${r}" ${Number(g.gst??18)===r?'selected':''}>${r}%</option>`).join('')}</select></label>
      <label>${hi?'बिल के नीचे की शर्तें':'Terms & conditions'}<textarea id="iv-terms" rows="3" style="width:100%; padding:8px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit;">${esc(g.terms||'')}</textarea></label>
      <label>${hi?'नोट':'Note'}<textarea id="iv-note" rows="2" style="width:100%; padding:8px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit;">${esc(g.note||'')}</textarea></label>
      <label>${hi?'बैंक की जानकारी':'Bank details'}<textarea id="iv-bank" rows="3" style="width:100%; padding:8px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit;">${esc(g.bank||'')}</textarea></label>
      <button type="button" id="iv-save" class="btn primary" style="margin-top:12px;">${hi?'सहेजें':'Save'}</button>`;},
    reminders:()=>{const g=cfgGet().reminders||{};const items=[['overdue',hi?'बकाया पैसे की याद दिलाना':'Overdue payment reminders'],['lowstock',hi?'कम स्टॉक की सूचना':'Low-stock alerts'],['daily',hi?'रोज़ की रिपोर्ट':'Daily report'],['weekly',hi?'हफ़्ते की रिपोर्ट':'Weekly report'],['email',hi?'ईमेल सूचनाएँ':'Email notifications'],['duedate',hi?'भुगतान की तारीख़ की सूचना':'Payment due-date alerts']];
      return items.map(([k,l])=>`<div style="${row}"><span>${l}</span><input type="checkbox" data-rem="${k}" ${g[k]?'checked':''} style="width:18px; height:18px; margin:0;"></div>`).join('')+`<button type="button" id="rem-save" class="btn primary" style="margin-top:14px;">${hi?'सहेजें':'Save'}</button>`;},
    help:()=>`<div style="${row}"><span>${hi?'संपर्क':'Contact'}</span><strong>kumarprince49274@gmail.com</strong></div>
      <div style="margin-top:12px; font-weight:600;">${hi?'अक्सर पूछे जाने वाले सवाल':'FAQ'}</div>
      <p class="muted" style="font-size:13px;">${hi?'• नया बिल कैसे बनाएँ? चैट में लिखें "नया बिल बनाओ"।\n• एंट्री कब होती है? आपके Confirm दबाने के बाद ही।\n• डेटा कैसे निकालें? सेटिंग्स → डेटा में CSV डाउनलोड।':'• New invoice? Type "Create a new invoice" in chat.\n• When is an entry posted? Only after you press Confirm.\n• Export data? Settings → Data → CSV download.'}</p>
      <label style="margin-top:10px;">${hi?'सुझाव / समस्या भेजें':'Send feedback'}<textarea id="hp-text" rows="4" style="width:100%; padding:8px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit;"></textarea></label>
      <button type="button" id="hp-send" class="btn primary" style="margin-top:10px;">${hi?'भेजें':'Send'}</button>`,
    about:()=>`<div style="${row}"><span>${hi?'ऐप':'App'}</span><strong>APNA BUSINESS</strong></div>
      <div style="${row}"><span>${hi?'वर्शन':'Version'}</span><strong>0.9.0</strong></div>
      <p class="muted" style="font-size:12px; margin-top:12px;">${hi?'GST और नॉन-GST दोनों तरह के बिज़नेस के लिए अकाउंटिंग और ऑटोमेशन।':'Accounting and automation for GST and non-GST businesses.'}</p>`
  };

  const binders={
    general:()=>{m.querySelector('#st-font').onchange=e=>setFont(e.target.value);m.querySelector('#st-save-general').onclick=()=>{
      state.lang=m.querySelector('#st-lang').value; state.theme=m.querySelector('#st-theme').value;
      try{localStorage.setItem('apna_lang',state.lang);localStorage.setItem('apna_theme',state.theme);}catch{}
      m.remove(); toast(state.lang==='hi'?'सेटिंग्स सहेज ली गई हैं!':'Settings saved successfully!'); render();
    };},
    personal:()=>{const ta=m.querySelector('#st-custom');loadPrefsInto(ta);m.querySelector('#st-save-custom').onclick=()=>savePrefsFrom(ta);},
    account:()=>{
      m.querySelector('#st-pw').onclick=async()=>{
        const cur=m.querySelector('#st-cur').value, nw=m.querySelector('#st-new').value;
        if(nw.length<8){toast(hi?'नया पासवर्ड कम से कम 8 अक्षर का हो':'New password must be at least 8 characters');return;}
        try{await api('/api/auth/change-password',{method:'POST',body:{current_password:cur,new_password:nw}});
          m.querySelector('#st-cur').value='';m.querySelector('#st-new').value='';toast(hi?'पासवर्ड बदल गया':'Password updated');}
        catch(err){toast(err.message);}
      };
      m.querySelector('#st-logout').onclick=()=>{m.remove();doLogout();};
    },
    data:()=>{
      m.querySelector('#st-export-chats').onclick=async()=>{
        const cid=state.companyId;
        try{
          const list=await api(`/api/companies/${cid}/chats`); const out=[];
          for(const t of list){const r=await api(`/api/companies/${cid}/chats/${t.id}`);out.push({title:t.title,updated_at:t.updated_at,messages:r.messages});}
          downloadBlob(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),'apna-business-chats.json');
        }catch(err){toast(err.message);}
      };
      m.querySelectorAll('[data-exp2]').forEach(b=>b.onclick=async()=>{try{const r=await fetch(`/api/companies/${state.companyId}/export/${b.dataset.exp2}`,{credentials:'include'});if(!r.ok)throw new Error(`Request failed (${r.status})`);downloadBlob(await r.blob(),`apna-business-${b.dataset.exp2}.csv`);}catch(err){toast(err.message);}});
      m.querySelector('#st-clear-chats').onclick=async()=>{
        if(!confirm(hi?'सभी चैट हमेशा के लिए हटा दें?':'Delete all chats permanently?'))return;
        const cid=state.companyId;
        try{
          const list=await api(`/api/companies/${cid}/chats`);
          for(const t of list) await api(`/api/companies/${cid}/chats/${t.id}`,{method:'DELETE',body:{}});
          state.threads=[];state.threadId=null;state.chats[cid]=[];
          toast(hi?'सभी चैट हटा दी गईं':'All chats deleted'); renderRecent(); renderChatLog();
        }catch(err){toast(err.message);}
      };
    },
    profile:async()=>{
      const cid=state.companyId; let cc={};
      try{cc=await api(`/api/companies/${cid}`);}catch(err){toast(err.message);}
      const x=cfgGet().profile||{};
      const set=(id,v)=>{const e=m.querySelector(id);if(e)e.value=v==null?'':v;};
      set('#bp-name',cc.name);set('#bp-address',x.address);set('#bp-phone',x.phone);set('#bp-state',cc.business_state);set('#bp-gsttype',cc.gst_type||'UNREGISTERED');set('#bp-gstin',cc.gstin);
      const prev=m.querySelector('#bp-logo-prev'); let logo=x.logo||'';
      if(logo){prev.src=logo;prev.style.display='block';}
      m.querySelector('#bp-logo').onchange=e=>{const f=e.target.files[0];if(!f)return;
        if(f.size>300*1024){toast(hi?'लोगो 300 KB से छोटा रखें':'Keep the logo under 300 KB');e.target.value='';return;}
        const r=new FileReader();r.onload=()=>{logo=r.result;prev.src=logo;prev.style.display='block';};r.readAsDataURL(f);};
      m.querySelector('#bp-save').onclick=async()=>{
        const gt=m.querySelector('#bp-gsttype').value, gstin=m.querySelector('#bp-gstin').value.trim();
        if(gt!=='UNREGISTERED'&&!gstin){toast(hi?'GSTIN डालें':'Please enter GSTIN');return;}
        try{
          await api(`/api/companies/${cid}`,{method:'PATCH',body:{name:m.querySelector('#bp-name').value.trim(),business_type:cc.business_type||'Other',business_state:m.querySelector('#bp-state').value,gst_type:gt,gstin:gt==='UNREGISTERED'?'':gstin}});
          cfgSet({profile:{address:m.querySelector('#bp-address').value,phone:m.querySelector('#bp-phone').value,logo}});
          await refreshSession(); toast(hi?'बिज़नेस प्रोफ़ाइल सहेज ली':'Business profile saved');
        }catch(err){toast(err.message);}
      };
    },
    invoice:()=>{m.querySelector('#iv-save').onclick=()=>{cfgSet({invoice:{upi:m.querySelector('#iv-upi').value.trim(),prefix:m.querySelector('#iv-prefix').value||'INV-',gst:Number(m.querySelector('#iv-gst').value),terms:m.querySelector('#iv-terms').value,note:m.querySelector('#iv-note').value,bank:m.querySelector('#iv-bank').value}});toast(hi?'सहेज लिया गया':'Saved');};},
    reminders:()=>{m.querySelector('#rem-save').onclick=()=>{const g={};m.querySelectorAll('[data-rem]').forEach(i=>g[i.dataset.rem]=i.checked);cfgSet({reminders:g});toast(hi?'सहेज लिया गया':'Saved');};},
    help:()=>{m.querySelector('#hp-send').onclick=()=>{const t=m.querySelector('#hp-text').value.trim();if(!t){toast(hi?'पहले कुछ लिखें':'Write something first');return;}location.href='mailto:kumarprince49274@gmail.com?subject='+encodeURIComponent('APNA BUSINESS feedback')+'&body='+encodeURIComponent(t);};},
    about:()=>{}
  };

  function show(k){
    m.querySelectorAll('[data-tab]').forEach(b=>{b.style.background=b.dataset.tab===k?'rgba(255,255,255,0.14)':'transparent';});
    body.innerHTML=panels[k](); binders[k]();
  }
  m.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));
  show(startTab&&panels[startTab]?startTab:'general');
}

async function doLogout(){
  try{ await api('/api/auth/logout',{method:'POST',body:{}}); }catch{}
  state.user=null;state.csrf=null;state.companies=[];state.companyId=null;state.chats={};
  state.threads=[];state.threadId=null;state.threadsCompany=null;state.threadSearch='';
  authView('login');
}

function openGeminiStyleAccountPopup(targetEl) {
  const existing = document.getElementById('gemini-account-popup');
  if (existing) { existing.remove(); return; }

  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  const popup = document.createElement('div');
  popup.id = 'gemini-account-popup';
  popup.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: ${state.sidebarOpen?12:64}px;
    width: 320px;
    background: #1e1e1e;
    color: #f1f3f4;
    border: 1px solid #3c4043;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 9999;
    padding: 16px;
    font-family: inherit;
  `;

  popup.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #3c4043; padding-bottom:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="background:#8ab4f8; color:#202124; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${userInitial}</div>
        <div style="overflow:hidden;">
          <div style="font-weight:600; font-size:14px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${esc(userName)}</div>
          <div style="font-size:12px; color:#9aa0a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${esc(userEmail)}</div>
          <div style="font-size:11px; color:#8ab4f8; font-weight:600; margin-top:2px;">Pro</div>
        </div>
      </div>
      <button id="close-popup-x" style="background:transparent; border:none; color:#9aa0a6; font-size:18px; cursor:pointer;">✕</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:4px; font-size:13px;">
      <div class="popup-item" data-action="settings" style="padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:10px;">⚙️ <span>${state.lang==='hi'?'एप सेटिंग्स (भाषा/थीम)':'App Settings (Theme/Lang)'}</span></div>
      <div style="border-top:1px solid #3c4043; margin:6px 0;"></div>
      <div class="popup-item" data-action="logout" style="padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:10px; color:#f28b82; font-weight:600;">🚪 <span>${state.lang==='hi'?'लॉगआउट':'Sign out'}</span></div>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelectorAll('.popup-item').forEach(item => {
    item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.08)';
    item.onmouseout = () => item.style.background = 'transparent';
    
    item.onclick = () => {
      const action = item.dataset.action;
      popup.remove();
      if(action === 'logout') {
        doLogout();
      } else if(action === 'dashboard') {
        if (state.embed) { closeEmbed(); return; }
        state.page = 'dashboard'; render();
      } else if(action === 'settings') {
        openSettingsModal();
      }
    };
  });

  popup.querySelector('#close-popup-x').onclick = () => popup.remove();

  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && !e.target.closest('#ai-sidebar-user-profile')) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 0);
}

function layout(){
  if (state.embed) state.page = 'chat';
  else if (state.page === 'chat') { state.page = 'dashboard'; state.aiPanelPending = true; }
  const c=state.companies.find(x=>x.id===state.companyId);
  
  if (state.page === 'chat') {
    renderChatGPTStyleLayout(c);
    return;
  }

  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  $('app').innerHTML=`<div class="workspace"><aside class="sidebar"><div class="brand" translate="no"><div class="logo small-logo">${PULSE_ICON(22)}</div><div><strong translate="no">APNA BUSINESS</strong><small>${t('brandSub')}</small></div></div>
  
  <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
    <button class="btn primary full" id="top-create-company" style="font-size:13px;padding:8px;">${t('createCompanyBtn')}</button>
    <button class="btn full" id="top-alter-company" style="font-size:13px;padding:8px;background:rgba(255,255,255,0.08);">${t('alterCompanyBtn')}</button>
  </div>

  ${state.companies.length?companySelect():'<p class="muted small">No business yet</p>'}

  <nav style="overflow-y:auto;max-height:calc(100vh - 310px);display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:6px;letter-spacing:.05em;">${t('mainMenu')}</div>
    <button data-page="dashboard" class="${state.page==='dashboard'&&!state.aiPanel?'active':''}">${t('dashboard')}</button>
    <div style="display:flex;align-items:center;gap:6px;">
      <button data-page="chat" class="${state.aiPanel?'active':''}" style="flex:1;text-align:left;">${t('aiChat')}</button>
      <button id="ai-panel-toggle" title="AI Accountant side mein kholo / band karo" style="flex:none;padding:0;margin:0;box-sizing:border-box;min-width:36px;background:${state.aiPanel?'rgba(255,255,255,0.14)':'none'};border:none;color:var(--text);border-radius:8px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg style="width:20px;height:20px;flex:none;" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><line x1="9" y1="4" x2="9" y2="20"/></svg></button>
    </div>
    
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${t('vouchersBilling')}</div>
    <button data-page="vouchers" class="${state.page==='vouchers'?'active':''}">${t('vouchersList')}</button>
    <button data-page="invoices" class="${state.page==='invoices'?'active':''}">${t('salesPurchases')}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${t('accountsSheet')}</div>
    <button data-page="balance-sheet" class="${state.page==='balance-sheet'?'active':''}">${t('balanceSheet')}</button>
    <button data-page="reports" class="${state.page==='reports'?'active':''}">${t('profitLoss')}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${t('inventoryStock')}</div>
    <button data-page="products" class="${state.page==='products'?'active':''}">${t('productsInv')}</button>
    <button data-page="contacts" class="${state.page==='contacts'?'active':''}">${t('contactsList')}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${t('gstTax')}</div>
    <button data-page="gst" class="${state.page==='gst'?'active':''}">${t('gstBreakdown')}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${t('companyMgmt')}</div>
    <button data-page="settings" class="${state.page==='settings'?'active':''}">${t('companyAlter')}</button>
  </nav>

  <div class="nav-bottom" style="margin-top:auto; padding:8px 0; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
    <div id="sidebar-user-profile" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
      <div style="background:var(--primary); color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${userInitial}</div>
      <div style="overflow:hidden; flex:1;">
        <div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div>
        <div style="font-size:11px; color:#4dabf7; font-weight:500;">Pro</div>
      </div>
    </div>
  </div></aside>
  <main><header class="topbar"><div><h2>${c?esc(c.name):'Create your business'}</h2><p>${c?`${esc(c.business_state||'')} · GST: ${esc(c.gst_type||'Tax setup required')}`:'One platform for GST and Non-GST businesses'}</p></div><div class="status" id="logout" style="cursor:pointer;" title="Logout">${state.user?esc(state.user.email):''}</div></header><div id="content" class="content"></div></main></div>`;
  
  $('company-select')?.addEventListener('change',e=>{state.companyId=e.target.value;state.page='dashboard';resetAiPanel();render();});
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(b.dataset.page==='chat'){setAiPanel(true);return;}if(state.aiPanel)setAiPanel(false);state.page=b.dataset.page;renderPage();});
  
  $('ai-panel-toggle')?.addEventListener('click', () => setAiPanel(!state.aiPanel));
  if (state.aiPanelPending) { state.aiPanelPending = false; setAiPanel(true); }
  $('top-create-company')?.addEventListener('click', createCompanyForm);
  $('top-alter-company')?.addEventListener('click', () => { state.page = 'settings'; renderPage(); });
  $('sidebar-user-profile')?.addEventListener('click', (e) => { openGeminiStyleAccountPopup(e.currentTarget); });

  $('logout')?.addEventListener('click', async()=>{try{await api('/api/auth/logout',{method:'POST',body:{}});}finally{state.user=null;state.csrf=null;state.companies=[];state.companyId=null;state.chats={};authView('login');}});
}

function render(){
  if(!state.user){authView();return;}
  document.body.classList.toggle('light', state.theme === 'light');
  layout();
  renderPage();
}

async function renderPage(){
  if(!state.companyId){createCompanyForm();return;}
  layout();
  const p=state.page;
  if(p==='chat') { renderChatGPTStyleLayout(state.companies.find(x => x.id === state.companyId)); return; }
  try{
    if(p==='dashboard') await dashboard(); 
    else if(p==='vouchers') await vouchersPage();
    else if(p==='balance-sheet') await balanceSheetPage();
    else if(p==='gst') await gstReportPage();
    else if(p==='contacts') await contacts(); 
    else if(p==='products') await products(); 
    else if(p==='invoices') await invoices(); 
    else if(p==='reports') await reports(); 
    else await settings();
  }catch(e){showError(e.message);}
}

let pendingFile=null;
let pendingFileType='IMAGE';
let recognition=null;
let listening=false;

function chatLog(){return state.chats[state.companyId]||(state.chats[state.companyId]=[]);}

function chatHistory(msgs){
  return msgs.slice(0,-2).filter(m=>m.text&&!m.typing&&!m.error).slice(-6)
    .map(m=>({role:m.role==='user'?'user':'model',text:String(m.text).slice(0,500)}));
}

function draftCard(m,i){
  const d=m.draft;
  const lines=(d.preview||[]).map(x=>`<div class="d-line">${esc(x)}</div>`).join('');
  let foot='';
  if(d.status==='PENDING') foot=`<div class="d-actions"><button class="btn primary" data-i="${i}" data-act="approve">Confirm</button><button class="btn" data-i="${i}" data-act="reject">Reject</button></div>`;
  else if(d.status==='POSTED') foot='<div class="d-done">✓ Entry ledger mein post ho gayi</div>';
  else foot='<div class="d-done">✕ Draft reject kiya, kuch post nahi hua</div>';
  return `<div class="draft-card"><div class="d-title">Draft entry · abhi post nahi hui</div>${lines}${foot}</div>`;
}

function renderChatLog(){
  const log=$('chat-log');if(!log)return;
  const msgs=chatLog();
  if(!msgs.length){
    log.innerHTML='';
  }else{
    log.innerHTML=msgs.map((m,i)=>m.role==='user'
      ?`<div class="msg user" style="margin:8px 0; text-align:right;"><div class="bubble" style="display:inline-block; background:var(--primary); padding:8px 12px; border-radius:12px;">${m.fileUrl?fileBubble(m):''}${esc(m.text)}</div></div>`
      :`<div class="msg bot" style="margin:8px 0; text-align:left;"><div class="bubble ${m.error?'err':''} ${m.typing?'typing':''}" style="display:inline-block; background:rgba(255,255,255,0.08); padding:8px 12px; border-radius:12px;">${esc(m.text)}${m.draft?draftCard(m,i):''}</div></div>`).join('');
  }
  log.style.flex=msgs.length?'1':'0 0 auto';
  log.scrollTop=log.scrollHeight;
  document.querySelectorAll('.hero-el').forEach(e=>{e.style.display=msgs.length?'none':'';});
  log.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>decideDraft(msgs[Number(b.dataset.i)],b.dataset.act));
  const send=$('chat-send');if(send)send.disabled=state.chatBusy;
  if(window.__composerUpd)window.__composerUpd();
}

async function persistExchange(cid,userText,botText){
  try{
    if(cid!==state.companyId) return;
    if(!state.threadId){
      const t=await api(`/api/companies/${cid}/chats`,{method:'POST',body:{title:String(userText).slice(0,40)}});
      state.threadId=t.id; state.threads.unshift(t);
    }
    await api(`/api/companies/${cid}/chats/${state.threadId}/messages`,{method:'POST',body:{messages:[{role:'user',text:userText},{role:'bot',text:botText}]}});
    const i=state.threads.findIndex(x=>x.id===state.threadId);
    if(i>0){const [t]=state.threads.splice(i,1);state.threads.unshift(t);}
    renderRecent();
  }catch{}
}

async function loadThreads(){
  const cid=state.companyId; if(!cid) return;
  try{
    const list=await api(`/api/companies/${cid}/chats`);
    if(cid!==state.companyId) return;
    state.threads=list; state.threadsCompany=cid;
  }catch{}
  renderRecent();
}

function renderRecent(){
  const box=$('recent-list'); if(!box) return;
  const q=String(state.threadSearch||'').toLowerCase();
  const items=state.threads.filter(t=>!q||String(t.title).toLowerCase().includes(q));
  const btn='background:none; border:none; color:var(--muted); cursor:pointer; padding:2px 4px; font-size:13px; flex:none;';
  box.innerHTML=items.length?items.map(t=>`<div data-id="${esc(t.id)}" style="display:flex; align-items:center; gap:2px; padding:2px 6px 2px 10px; border-radius:8px; background:${t.id===state.threadId?'rgba(255,255,255,0.12)':'transparent'};"><span class="recent-title" style="flex:1; padding:6px 0; font-size:13px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(t.title)}</span><button type="button" data-ren="${esc(t.id)}" title="Rename" style="${btn}">✎</button><button type="button" data-del="${esc(t.id)}" title="Delete" style="${btn}">🗑</button></div>`).join(''):`<div style="padding:4px 10px; font-size:12px; color:var(--muted);">${state.lang==='hi'?'कोई चैट नहीं':'No chats'}</div>`;
  box.querySelectorAll('.recent-title').forEach(el=>el.onclick=()=>openThread(el.parentElement.dataset.id));
  box.querySelectorAll('[data-ren]').forEach(b=>b.onclick=e=>{e.stopPropagation();renameThreadUi(b.dataset.ren);});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteThreadUi(b.dataset.del);});
}

async function openThread(id){
  const cid=state.companyId;
  try{
    const r=await api(`/api/companies/${cid}/chats/${id}`);
    state.threadId=id;
    state.chats[cid]=r.messages.map(m=>({role:m.role,text:m.content}));
    state.aiSection='home'; state.aiMode='chat';
    renderChatGPTStyleLayout(state.companies.find(x=>x.id===cid));
  }catch(err){toast(err.message);}
}

async function renameThreadUi(id){
  const t=state.threads.find(x=>x.id===id); if(!t) return;
  const name=prompt(state.lang==='hi'?'चैट का नया नाम':'New chat name',t.title);
  if(name===null||!name.trim()) return;
  try{
    const r=await api(`/api/companies/${state.companyId}/chats/${id}`,{method:'PATCH',body:{title:name.trim()}});
    t.title=r.title; renderRecent();
  }catch(err){toast(err.message);}
}

async function deleteThreadUi(id){
  if(!confirm(state.lang==='hi'?'यह चैट हटा दें?':'Delete this chat?')) return;
  const cid=state.companyId;
  try{
    await api(`/api/companies/${cid}/chats/${id}`,{method:'DELETE',body:{}});
    state.threads=state.threads.filter(x=>x.id!==id);
    if(state.threadId===id){ state.threadId=null; state.chats[cid]=[]; renderChatLog(); }
    renderRecent();
  }catch(err){toast(err.message);}
}

function fileBubble(m){
  if(m.fileType==='IMAGE') return `<img class="chat-photo" src="${m.fileUrl}" alt="Photo" style="max-width:200px; border-radius:8px; display:block; margin-bottom:6px;">`;
  return `<a class="chat-file" href="${m.fileUrl}" target="_blank" rel="noopener">📄 ${esc(m.fileName||'Document')}</a>`;
}

async function sendChat(raw){
  const textValue=String(raw||'').trim();
  if(!textValue||state.chatBusy)return;
  const cid=state.companyId,msgs=chatLog();
  msgs.push({role:'user',text:textValue});
  const pending={role:'bot',text:'Soch raha hoon…',typing:true};
  msgs.push(pending);state.chatBusy=true;renderChatLog();
  try{
    const history=chatHistory(msgs);
    const r=await api(`/api/companies/${cid}/chat`,{method:'POST',body:{message:textValue,history}});
    pending.text=r.reply||'Samajh nahi aaya, dobara likhiye.';pending.typing=false;
    if(r.mode==='DRAFT_CREATED'&&r.draft_id) pending.draft={id:r.draft_id,preview:r.preview||[],status:'PENDING'};
    persistExchange(cid,textValue,pending.text);
  }catch(err){pending.text=err.message;pending.typing=false;pending.error=true;}
  finally{state.chatBusy=false;if(state.page==='chat'&&state.companyId===cid)renderChatLog();}
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('File padhi nahi ja saki'));
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file,type){
  const cid=state.companyId;
  const content_base64=await fileToBase64(file);
  const kind = type==='IMAGE' ? 'Receipt' : 'Document';
  const r=await api(`/api/companies/${cid}/documents`,{method:'POST',body:{name:file.name,kind,content_base64}});
  return { id:r.id, url:URL.createObjectURL(file), name:file.name };
}

async function sendChatWithFile(text,file,type){
  const cid=state.companyId,msgs=chatLog();
  msgs.push({role:'user',text:text||'File bheji',fileUrl:file?URL.createObjectURL(file):null,fileName:file?.name,fileType:type});
  const pending={role:'bot',text:'File check kar raha hoon…',typing:true};
  msgs.push(pending);state.chatBusy=true;renderChatLog();
  try{
    let fileUrl=null;
    let documentId=null;
    if(file){
      const up=await uploadFile(file,type);
      fileUrl=up.url;
      documentId=up.id;
    }
    const history=chatHistory(msgs);
    const res=await api(`/api/companies/${cid}/chat`,{method:'POST',body:{message:text||'File attach ki hai',file_url:fileUrl,file_type:type,document_id:documentId,history}});
    pending.text=res.reply||'File mil gayi. Amount ya party ka naam likh do, phir draft banega.';
    pending.typing=false;
    if(res.mode==='DRAFT_CREATED'&&res.draft_id){
      pending.draft={id:res.draft_id,preview:res.preview||[],status:'PENDING'};
    }
    persistExchange(cid,text||'File bheji',pending.text);
  }catch(err){
    pending.text=err.message;pending.typing=false;pending.error=true;
  }finally{
    state.chatBusy=false;
    if(state.page==='chat'&&state.companyId===cid)renderChatLog();
  }
}

async function decideDraft(msg,act){
  if(!msg?.draft||msg.draft.status!=='PENDING'||state.chatBusy)return;
  const cid=state.companyId;state.chatBusy=true;renderChatLog();
  try{
    await api(`/api/companies/${cid}/drafts/${msg.draft.id}/${act}`,{method:'POST',body:{}});
    msg.draft.status=act==='approve'?'POSTED':'REJECTED';
    toast(act==='approve'?'Entry post ho gayi':'Draft reject kiya');
  }catch(err){toast(err.message);}
  finally{state.chatBusy=false;if(state.page==='chat'&&state.companyId===cid)renderChatLog();}
}

function startVoice(input){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    toast('Mic is browser mein support nahi karta. Chrome try karo.');
    return;
  }
  if(listening){
    recognition?.stop();
    return;
  }
  recognition=new SpeechRecognition();
  recognition.lang = state.lang==='en' ? 'en-IN' : 'hi-IN';
  recognition.interimResults=true;
  recognition.continuous=false;
  recognition.onstart=()=>{
    listening=true;
    $('chat-mic')?.classList.add('listening');
    toast('Boliye…');
  };
  recognition.onresult=e=>{
    let text='';
    for(let i=0;i<e.results.length;i++){
      text+=e.results[i][0].transcript;
    }
    input.value=text;
  };
  recognition.onerror=e=>{
    listening=false;
    $('chat-mic')?.classList.remove('listening');
    if(e.error==='not-allowed') toast('Mic permission Allow karo');
    else if(e.error==='no-speech') toast('Awaaz sunai nahi di');
    else toast('Mic error: '+e.error);
  };
  recognition.onend=()=>{
    listening=false;
    $('chat-mic')?.classList.remove('listening');
  };
  recognition.start();
}


// ===== Automation hub (Work tab): dues reminders, UPI QR, morning report, reorder draft, receipt expense =====
async function fillAutomation(hub, r){
  const hi=state.lang==='hi', cid=state.companyId;
  const panel='background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:16px; margin-top:14px;';
  const btn='background:transparent; color:var(--text); border:1px solid var(--border); border-radius:8px; padding:6px 12px; cursor:pointer; font-size:13px; text-decoration:none; display:inline-block;';
  const rowS='display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 0; border-top:1px solid var(--border); font-size:14px; flex-wrap:wrap;';
  const inp='padding:7px 10px; border-radius:8px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-size:13px; margin:0; width:auto;';
  let d={}, inv=[], cts=[];
  try{ [d,inv,cts]=await Promise.all([api(`/api/companies/${cid}/dashboard`),api(`/api/companies/${cid}/invoices`),api(`/api/companies/${cid}/contacts`)]); }
  catch(err){ hub.textContent=err.message; return; }
  const company=state.companies.find(x=>x.id===cid)||{};
  const iv=(cfgGet().invoice)||{};
  const biz=company.name||'APNA BUSINESS';
  const low=r.low_stock||[], unpaid=r.unpaid_invoices||[];
  const rs=p=>money(p);
  const digits=v=>String(v||'').replace(/\D/g,'');
  const intl=p=>{p=digits(p).replace(/^0+/,'');return p.length===10?'91'+p:p;};
  const contactOf=n=>cts.find(c=>String(c.name||'').trim().toLowerCase()===String(n||'').trim().toLowerCase());
  const waUrl=(phone,text)=>`https://wa.me/${intl(phone)}?text=${encodeURIComponent(text)}`;
  const smsUrl=(phone,text)=>`sms:${digits(phone)}?body=${encodeURIComponent(text)}`;
  const upiLink=(paise,note)=>iv.upi?`upi://pay?pa=${encodeURIComponent(iv.upi)}&pn=${encodeURIComponent(biz)}&am=${(Number(paise)/100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note||'')}`:'';
  const copy=async t=>{try{await navigator.clipboard.writeText(t);toast(hi?'कॉपी हो गया':'Copied');}catch{toast(hi?'कॉपी नहीं हो सका':'Copy failed');}};

  // ---- dues grouped by party ----
  const dues={};
  inv.filter(i=>String(i.kind||'').toUpperCase()!=='PURCHASE' && Number(i.outstanding_paise)>0).forEach(i=>{
    const n=i.contact_name||'—'; (dues[n]=dues[n]||{name:n,total:0,nums:[]});
    dues[n].total+=Number(i.outstanding_paise); dues[n].nums.push(i.number);
  });
  const dueList=Object.values(dues).sort((a,b)=>b.total-a.total);
  const dueMsg=x=>hi
    ?`नमस्ते ${x.name} जी, ${biz} की ओर से याद दिलाना: आपका ${rs(x.total)} बकाया है (बिल: ${x.nums.join(', ')}). कृपया भुगतान कर दें.${iv.upi?` UPI ID: ${iv.upi}`:''} धन्यवाद।`
    :`Hello ${x.name}, a gentle reminder from ${biz}: ${rs(x.total)} is pending (invoices: ${x.nums.join(', ')}). Please pay at your earliest.${iv.upi?` UPI ID: ${iv.upi}`:''} Thank you.`;

  // ---- morning report ----
  const today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const unpaidTotal=dueList.reduce((a,x)=>a+x.total,0);
  const report=[`📊 ${biz} — ${hi?'सुबह की रिपोर्ट':'Morning report'} (${today})`,
    `${hi?'बिक्री':'Sales'}: ${rs(d.sales_paise)} | ${hi?'खरीद':'Purchases'}: ${rs(d.purchases_paise)} | ${hi?'मुनाफ़ा':'Profit'}: ${rs(d.net_profit_paise)}`,
    `${hi?'कैश':'Cash'}: ${rs(d.cash_paise)} | ${hi?'बैंक':'Bank'}: ${rs(d.bank_paise)} | ${hi?'स्टॉक वैल्यू':'Stock value'}: ${rs(d.stock_value_paise)}`,
    `${hi?'बकाया':'Outstanding'}: ${dueList.length} ${hi?'पार्टी':'parties'} · ${rs(unpaidTotal)}${dueList.length?' ('+dueList.slice(0,3).map(x=>x.name+' '+rs(x.total)).join(', ')+')':''}`,
    `${hi?'कम स्टॉक':'Low stock'}: ${low.length}${low.length?' — '+low.slice(0,5).map(p=>p.name).join(', '):''}`].join('\n');

  const suppliers=cts.filter(c=>String(c.kind||'').toUpperCase()==='SUPPLIER');

  hub.innerHTML=`
  <div style="${panel}"><div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;"><strong>☀️ ${hi?'सुबह की रिपोर्ट':'Morning report'}</strong><span style="display:flex; gap:8px;"><a id="mr-wa" style="${btn}" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(report)}">WhatsApp</a><button type="button" id="mr-copy" style="${btn}">${hi?'कॉपी':'Copy'}</button></span></div>
    <pre style="white-space:pre-wrap; font-family:inherit; font-size:14px; margin:10px 0 0; color:var(--text);">${esc(report)}</pre></div>

  <div style="${panel}"><strong>💬 ${hi?'बकाया की याद (WhatsApp / SMS)':'Dues reminders (WhatsApp / SMS)'}</strong>
    <p class="muted" style="font-size:12px; margin:4px 0 6px;">${hi?'बटन दबाते ही संदेश तैयार खुलता है; आप भेज दें। ग्राहक का फ़ोन नंबर Contacts में होना चाहिए।':'Tap a button and the message opens ready to send. The customer needs a phone number in Contacts.'}</p>
    ${dueList.length?dueList.map((x,k)=>{const c=contactOf(x.name), ph=c&&c.phone?c.phone:'';return `<div style="${rowS}"><span>${esc(x.name)} <span class="muted">${x.nums.length} ${hi?'बिल':'bill(s)'}${ph?'':' · '+(hi?'फ़ोन नहीं':'no phone')}</span></span><span style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;"><strong>${rs(x.total)}</strong><a style="${btn}" target="_blank" rel="noopener" href="${waUrl(ph,dueMsg(x))}">WhatsApp</a>${ph?`<a style="${btn}" href="${smsUrl(ph,dueMsg(x))}">SMS</a>`:''}<button type="button" data-qr="${k}" style="${btn}">UPI QR</button></span></div>`;}).join(''):`<div class="muted" style="font-size:14px; margin-top:8px;">✓ ${hi?'कोई बकाया नहीं':'Nothing outstanding'}</div>`}</div>

  <div style="${panel}"><strong>📦 ${hi?'कम स्टॉक — ख़रीद ऑर्डर का ड्राफ़्ट':'Low stock — purchase order draft'}</strong>
    ${low.length?`<div style="margin-top:8px;">${low.map((p,k)=>`<div style="${rowS}"><span>${esc(p.name)} <span class="muted">${Number(p.quantity)} / ${Number(p.reorder_level)}</span></span><span>${hi?'मंगाना':'Order'} <input type="number" min="0" data-poq="${k}" value="${Math.max(Number(p.reorder_level)*2-Number(p.quantity),1)}" style="${inp} width:80px;"></span></div>`).join('')}</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px;"><select id="po-sup" style="${inp}"><option value="">${hi?'सप्लायर चुनें (वैकल्पिक)':'Pick supplier (optional)'}</option>${suppliers.map((s,k)=>`<option value="${k}">${esc(s.name)}</option>`).join('')}</select><button type="button" id="po-wa" style="${btn}">WhatsApp</button><button type="button" id="po-copy" style="${btn}">${hi?'कॉपी':'Copy'}</button><button type="button" id="po-print" style="${btn}">${hi?'प्रिंट':'Print'}</button></div>
    <p class="muted" style="font-size:12px; margin:8px 0 0;">${hi?'यह सिर्फ़ ड्राफ़्ट है; इससे कोई अकाउंटिंग एंट्री नहीं होती।':'This is only a draft; it posts no accounting entry.'}</p>`:`<div class="muted" style="font-size:14px; margin-top:8px;">✓ ${hi?'सब ठीक है':'All good'}</div>`}</div>

  <div style="${panel}"><strong>🧾 ${hi?'रसीद की फ़ोटो से खर्च':'Expense from a receipt photo'}</strong>
    <p class="muted" style="font-size:12px; margin:4px 0 8px;">${hi?'फ़ोटो चुनें, रकम और विवरण लिखें। फ़ोटो रसीद के रूप में सेव होगी और चैट में खर्च का ड्राफ़्ट बनेगा; Confirm दबाने पर ही एंट्री होगी।':'Pick the photo, enter amount and note. The photo is saved as a receipt and a draft appears in chat; nothing posts until you Confirm.'}</p>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;"><input type="file" id="rc-file" accept="image/*" style="${inp}"><input id="rc-amt" type="number" min="0" step="0.01" placeholder="₹" style="${inp} width:110px;"><input id="rc-note" placeholder="${hi?'किस चीज़ का खर्च':'What was it for'}" style="${inp} flex:1; min-width:140px;"><button type="button" id="rc-go" style="${btn}">${hi?'ड्राफ़्ट बनाओ':'Create draft'}</button></div></div>`;

  // ---- wiring ----
  $('mr-copy').onclick=()=>copy(report);
  hub.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>{
    const x=dueList[Number(b.dataset.qr)];
    const m=modal(`UPI — ${esc(x.name)}`,`<div id="qr-body" style="text-align:center; color:var(--text);"></div>`);
    const body=m.querySelector('#qr-body');
    const draw=()=>{
      const link=upiLink(x.total,x.nums.join(','));
      if(!link){
        body.innerHTML=`<p class="muted" style="font-size:13px;">${hi?'पहले अपनी UPI ID डालें (जैसे name@bank):':'Enter your UPI ID first (e.g. name@bank):'}</p><input id="qr-upi" placeholder="name@bank" style="${inp} width:80%;"><br><button type="button" id="qr-save" class="btn primary" style="margin-top:10px;">${hi?'सहेजें':'Save'}</button>`;
        m.querySelector('#qr-save').onclick=()=>{const v=m.querySelector('#qr-upi').value.trim();if(!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(v)){toast(hi?'सही UPI ID लिखें':'Enter a valid UPI ID');return;}iv.upi=v;cfgSet({invoice:{...iv}});draw();};
        return;
      }
      body.innerHTML=`<div style="font-size:15px; margin-bottom:8px;"><strong>${rs(x.total)}</strong> · ${esc(iv.upi)}</div>
        <div style="background:#fff; display:inline-block; padding:10px; border-radius:10px;"><img alt="UPI QR" width="220" height="220" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}"></div>
        <p class="muted" style="font-size:12px;">${hi?'ग्राहक अपने UPI ऐप से यह QR स्कैन करे।':'Customer scans this with any UPI app.'}</p>
        <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;"><button type="button" id="qr-copy" style="${btn}">${hi?'UPI लिंक कॉपी':'Copy UPI link'}</button><a style="${btn}" target="_blank" rel="noopener" href="${waUrl((contactOf(x.name)||{}).phone,dueMsg(x))}">WhatsApp</a></div>`;
      m.querySelector('#qr-copy').onclick=()=>copy(link);
    };
    draw();
  });
  const poText=()=>{
    const sup=suppliers[Number($('po-sup').value)]; 
    const lines=[...hub.querySelectorAll('[data-poq]')].map(i=>({p:low[Number(i.dataset.poq)],q:Number(i.value)})).filter(x=>x.q>0).map((x,n)=>`${n+1}. ${x.p.name}${x.p.sku?' ('+x.p.sku+')':''} — ${x.q}`);
    return [`${hi?'ख़रीद ऑर्डर':'Purchase order'} — ${biz}`,`${hi?'तारीख़':'Date'}: ${today}`,sup?`${hi?'सप्लायर':'Supplier'}: ${sup.name}`:'',...lines,hi?'कृपया जल्द भेजें। धन्यवाद।':'Please dispatch soon. Thank you.'].filter(Boolean).join('\n');
  };
  if(low.length){
    $('po-copy').onclick=()=>copy(poText());
    $('po-wa').onclick=()=>{const sup=suppliers[Number($('po-sup').value)];window.open(waUrl(sup&&sup.phone?sup.phone:'',poText()),'_blank','noopener');};
    $('po-print').onclick=()=>{const w=window.open('','_blank');if(!w)return;w.document.write(`<pre style="font:16px/1.6 sans-serif; white-space:pre-wrap; padding:24px;">${esc(poText())}</pre>`);w.document.close();w.focus();w.print();};
  }
  $('rc-go').onclick=()=>{
    const f=$('rc-file').files[0], amt=Number($('rc-amt').value), note=$('rc-note').value.trim();
    if(!f){toast(hi?'पहले रसीद की फ़ोटो चुनें':'Pick the receipt photo first');return;}
    if(!(amt>0)){toast(hi?'रकम लिखें':'Enter the amount');return;}
    const text=hi?`खर्च की एंट्री: ₹${amt}${note?' — '+note:''}. रसीद की फ़ोटो साथ में है।`:`Expense entry: ₹${amt}${note?' — '+note:''}. Receipt photo attached.`;
    state.aiMode='chat'; state.aiSection='home'; renderChatGPTStyleLayout(company);
    sendChatWithFile(text,f,'IMAGE');
  };
}

async function fillWorkBox(){
  const box=$('work-box'); if(!box) return;
  const hi=state.lang==='hi';
  try{
    const r=await api(`/api/companies/${state.companyId}/reminders`);
    const low=r.low_stock||[], unpaid=r.unpaid_invoices||[];
    const panel='background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:16px; margin-top:14px;';
    const rowS='display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-top:1px solid var(--border); font-size:14px;';
    const goBtn='background:transparent; color:var(--text); border:1px solid var(--border); border-radius:8px; padding:6px 12px; cursor:pointer; font-size:13px;';
    const total=unpaid.reduce((a,i)=>a+(Number(i.total_paise)-Number(i.paid_paise)),0);
    box.innerHTML=`<h2 style="margin-bottom:4px;">${hi?'पेंडिंग काम और रिमाइंडर':'Pending work & reminders'}</h2>
      <p class="muted" style="font-size:13px;">${hi?'आपके असली डेटा से बना है।':'Built from your live business data.'}</p>
      <div id="auto-hub"></div>
      <div style="${panel}"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><strong>${hi?'कम स्टॉक':'Low stock'} (${low.length})</strong><button type="button" data-go="products" style="${goBtn}">${hi?'स्टॉक खोलें':'Open stock'}</button></div>
        ${low.length?low.map(p=>`<div style="${rowS}"><span>${esc(p.name)} <span class="muted">${esc(p.sku||'')}</span></span><span>${Number(p.quantity)} / ${Number(p.reorder_level)}</span></div>`).join(''):`<div class="muted" style="font-size:14px;">✓ ${hi?'सब ठीक है':'All good'}</div>`}</div>
      <div style="${panel}"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><strong>${hi?'बकाया बिल':'Unpaid invoices'} (${unpaid.length}) · ${money(total)}</strong><button type="button" data-go="invoices" style="${goBtn}">${hi?'बिल खोलें':'Open invoices'}</button></div>
        ${unpaid.length?unpaid.slice(0,30).map(i=>`<div style="${rowS}"><span>${esc(i.number)} <span class="muted">${esc(fmtDate(i.date))}</span></span><span>${money(Number(i.total_paise)-Number(i.paid_paise))}</span></div>`).join(''):`<div class="muted" style="font-size:14px;">✓ ${hi?'कोई बकाया नहीं':'Nothing outstanding'}</div>`}</div>`;
    box.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.page=b.dataset.go;render();});
    const hubEl=$('auto-hub'); if(hubEl) fillAutomation(hubEl,r);
  }catch(err){box.textContent=err.message;}
}

async function fillFilesBox(){
  const box=$('files-box'); if(!box) return;
  const hi=state.lang==='hi', cid=state.companyId;
  const bt='background:transparent; color:var(--text); border:1px solid var(--border); border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px;';
  async function draw(){
    let list=[];
    try{list=await api(`/api/companies/${cid}/documents`);}catch(err){box.textContent=err.message;return;}
    box.innerHTML=`<h2 style="margin-bottom:4px;">${hi?'फ़ोटो और फ़ाइलें':'Images & Files'}</h2>
      <p class="muted" style="font-size:13px;">${hi?'बिल, रसीद और दस्तावेज़ यहाँ सुरक्षित रहते हैं (हर फ़ाइल 5 MB तक)।':'Bills, receipts and documents are kept here (up to 5 MB each).'}</p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:14px 0;">
        <select id="up-kind" style="width:auto; margin:0;"><option value="Receipt">${hi?'रसीद':'Receipt'}</option><option value="Invoice">${hi?'बिल':'Invoice'}</option><option value="Document">${hi?'दस्तावेज़':'Document'}</option></select>
        <input type="file" id="up-file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx" style="display:none;">
        <button type="button" id="up-btn" class="btn primary">+ ${hi?'फ़ाइल जोड़ें':'Add file'}</button>
      </div>
      ${list.length?list.map(d=>`<div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--border);"><div style="flex:1; min-width:0;"><div style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(d.name)}</div><div class="muted" style="font-size:12px;">${esc(d.kind)} · ${fmtSize(d.size_bytes)} · ${esc(fmtDate(d.created_at))}</div></div><button type="button" data-view="${esc(d.id)}" style="${bt}">${hi?'देखें':'View'}</button><button type="button" data-dl="${esc(d.id)}" style="${bt}">${hi?'डाउनलोड':'Download'}</button><button type="button" data-rm="${esc(d.id)}" style="${bt} color:#f28b82;">🗑</button></div>`).join(''):`<div class="muted" style="padding:14px 0;">${hi?'अभी कोई फ़ाइल नहीं है।':'No files yet.'}</div>`}`;
    const up=$('up-file');
    $('up-btn').onclick=()=>up.click();
    up.onchange=async()=>{
      const f=up.files[0]; if(!f) return;
      try{
        const content_base64=await fileToBase64(f);
        await api(`/api/companies/${cid}/documents`,{method:'POST',body:{name:f.name,kind:$('up-kind').value,content_base64}});
        toast(hi?'फ़ाइल जुड़ गई':'File added'); draw();
      }catch(err){toast(err.message);}
    };
    async function fetchBlob(id){
      const r=await api(`/api/companies/${cid}/documents/${id}`);
      const bin=atob(r.content_base64); const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      return {blob:new Blob([bytes],{type:r.mime_type}),name:r.name};
    }
    box.querySelectorAll('[data-view]').forEach(b=>b.onclick=async()=>{try{const {blob}=await fetchBlob(b.dataset.view);window.open(URL.createObjectURL(blob),'_blank');}catch(err){toast(err.message);}});
    box.querySelectorAll('[data-dl]').forEach(b=>b.onclick=async()=>{try{const {blob,name}=await fetchBlob(b.dataset.dl);downloadBlob(blob,name);}catch(err){toast(err.message);}});
    box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{
      if(!confirm(hi?'यह फ़ाइल हटा दें?':'Delete this file?')) return;
      try{await api(`/api/companies/${cid}/documents/${b.dataset.rm}`,{method:'DELETE',body:{}});draw();}catch(err){toast(err.message);}
    });
  }
  draw();
}

function fillConnectorsBox(){
  const box=$('connectors-box'); if(!box) return;
  const hi=state.lang==='hi', cid=state.companyId;
  const card='background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-top:12px; display:flex; align-items:center; gap:12px;';
  const bt='background:transparent; color:var(--text); border:1px solid var(--border); border-radius:8px; padding:7px 12px; cursor:pointer; font-size:13px; flex:none;';
  const exp=[['invoices',hi?'बिल / इनवॉइस':'Invoices'],['products',hi?'प्रोडक्ट':'Products'],['stock',hi?'स्टॉक':'Stock']];
  const soon=[[hi?'बैंक फ़ीड':'Bank feeds',hi?'बैंक स्टेटमेंट अपने आप जुड़ना':'Automatic bank statement sync'],[hi?'WhatsApp / SMS रिमाइंडर':'WhatsApp / SMS reminders',hi?'ग्राहकों को बकाया का संदेश':'Payment reminders to customers'],[hi?'Google से साइन-इन':'Google sign-in',hi?'Google अकाउंट से लॉगिन':'Log in with a Google account'],[hi?'GST पोर्टल':'GST portal',hi?'रिटर्न फ़ाइलिंग की तैयारी':'Return filing preparation']];
  box.innerHTML=`<h2 style="margin-bottom:4px;">${hi?'कनेक्टर और एक्सपोर्ट':'Connectors & export'}</h2>
    <p class="muted" style="font-size:13px;">${hi?'अपना डेटा CSV में डाउनलोड करें (Excel में खुलता है)।':'Download your data as CSV (opens in Excel).'}</p>
    ${exp.map(([k,l])=>`<div style="${card}"><div style="flex:1;"><strong>${l}</strong><div class="muted" style="font-size:12px;">CSV</div></div><button type="button" data-exp="${k}" style="${bt}">${hi?'डाउनलोड':'Download'}</button></div>`).join('')}
    <h3 style="margin-top:22px; font-size:15px;">${hi?'जल्द आ रहे हैं':'Coming soon'}</h3>
    ${soon.map(([t,d])=>`<div style="${card} opacity:0.7;"><div style="flex:1;"><strong>${t}</strong><div class="muted" style="font-size:12px;">${d}</div></div><span class="muted" style="font-size:12px;">${hi?'जल्द':'Soon'}</span></div>`).join('')}`;
  box.querySelectorAll('[data-exp]').forEach(b=>b.onclick=async()=>{
    try{
      const r=await fetch(`/api/companies/${cid}/export/${b.dataset.exp}`,{credentials:'include'});
      if(!r.ok) throw new Error(`Request failed (${r.status})`);
      downloadBlob(await r.blob(),`apna-business-${b.dataset.exp}.csv`);
    }catch(err){toast(err.message);}
  });
}

function fillCustomizeBox(){
  const box=$('customize-box'); if(!box) return;
  const hi=state.lang==='hi';
  box.innerHTML=`<h2 style="margin-bottom:4px;">${hi?'AI को अपने हिसाब से ढालें':'Customize your AI'}</h2>
    <p class="muted" style="font-size:13px; margin-bottom:12px;">${hi?'बताइए AI आपसे कैसे बात करे: भाषा, लहजा, जवाब की लंबाई। यह सिर्फ़ जवाब का तरीका बदलता है; बिना आपके Confirm के कोई एंट्री नहीं होती।':'Tell the AI how to talk to you: language, tone, answer length. It only changes style; no entry is ever posted without your Confirm.'}</p>
    <textarea id="cz-text" rows="8" maxlength="1500" placeholder="${hi?'जैसे: हमेशा आसान हिंदी में, छोटे जवाब दो।':'e.g. Always reply in simple Hindi, keep answers short.'}" style="width:100%; padding:12px; border-radius:12px; background:#0A0A0A; color:var(--text); border:1px solid var(--border); font-family:inherit; font-size:14px;"></textarea>
    <button type="button" id="cz-save" class="btn primary" style="margin-top:12px;">${hi?'सहेजें':'Save'}</button>`;
  const ta=$('cz-text'); loadPrefsInto(ta); $('cz-save').onclick=()=>savePrefsFrom(ta);
}

function renderChatGPTStyleLayout(c) {
  if (state.threadsCompany && state.threadsCompany !== state.companyId) { state.threads = []; state.threadId = null; state.threadsCompany = null; }
  const sec = state.aiSection;
  let mainAreaContent = '';

  if(sec === 'home') {
    if(state.aiMode === 'task') {
      mainAreaContent = `<div id="work-box" style="padding:30px 24px; max-width:800px; width:100%; height:100%; overflow-y:auto; box-sizing:border-box;">…</div>`;
    } else {
      mainAreaContent = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; width:100%; height:100%; box-sizing:border-box; text-align:center;">
          <div class="hero-el" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:56px;">
          <h1 style="font-size:42px; margin-bottom:8px; font-weight:600; letter-spacing:-0.5px;">How can I help you?</h1>
          <p style="color:var(--muted); margin-bottom:28px; font-size:16px;">${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p>
          </div>
          
          <div id="chat-log" style="width:100%; max-width:820px; margin-bottom:16px; flex:1; min-height:0; max-height:62vh; overflow-y:auto;"></div>

          <div id="composer" style="width:100%; max-width:820px; margin-bottom:7vh;">
          <div style="width:100%; position:relative; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:36px; padding:26px 30px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 14px rgba(0,0,0,0.35);">
            <input type="file" id="chat-photo" accept="image/*" style="display:none;">
            <input type="file" id="chat-document" accept=".pdf,.doc,.docx,.txt" style="display:none;">
            <button type="button" id="chat-plus" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:18px;" title="Attach">+</button>
            <textarea id="chat-input" rows="1" maxlength="1500" placeholder="${state.lang==='hi'?'अपने बिज़नेस के बारे में पूछें…':'Ask anything about your business'}" style="flex:1; background:none; border:none; color:var(--text); resize:none; outline:none; font-size:18px; max-height:140px;"></textarea>
            <button type="button" id="chat-mic" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:20px;" title="Voice input">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
            <button type="button" id="chat-send" style="background:var(--text); color:var(--bg); border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Send">➤</button>
          </div>

          <div class="hero-el" style="width:100%; margin-top:14px; display:flex; flex-direction:column; align-items:flex-start;">
            ${(state.lang==='hi'
              ? ['आज की बिक्री बताओ','नया बिल बनाओ','कम स्टॉक वाला सामान दिखाओ','किस ग्राहक का पैसा बाकी है?']
              : ["Show today's sales",'Create a new invoice','Show low-stock items','Which customers owe me money?']
            ).map(t=>`<button type="button" data-suggest="${esc(t)}" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:9px 12px; font-size:14px; text-align:left; border-radius:8px; width:100%;">${esc(t)}</button>`).join('')}
          </div>

          </div>
          <div class="file-preview hidden" id="file-preview" style="margin-top:10px; width:100%; max-width:820px;">
            <img id="file-img" class="hidden" alt="Selected photo" style="max-height:80px; border-radius:6px;">
            <div id="file-doc" class="hidden">📄 <span id="file-name"></span></div>
            <button class="file-remove" id="file-remove" type="button" aria-label="Remove file">×</button>
          </div>


        </div>`;
    }
  } else if(sec === 'schedules') {
    mainAreaContent = `<div id="work-box" style="padding:30px 24px; max-width:800px; width:100%; height:100%; overflow-y:auto; box-sizing:border-box;">…</div>`;
  } else if(sec === 'connectors') {
    mainAreaContent = `<div id="connectors-box" style="padding:30px 24px; max-width:800px; width:100%; height:100%; overflow-y:auto; box-sizing:border-box;"></div>`;
  } else if(sec === 'images') {
    mainAreaContent = `<div id="files-box" style="padding:30px 24px; max-width:800px; width:100%; height:100%; overflow-y:auto; box-sizing:border-box;">…</div>`;
  } else if(sec === 'customize') {
    mainAreaContent = `<div id="customize-box" style="padding:30px 24px; max-width:800px; width:100%; height:100%; overflow-y:auto; box-sizing:border-box;"></div>`;
  }

  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  const open = state.sidebarOpen;
  const ico = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex:none;">${d}</svg>`;
  const I = {
    chat: ico('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    cal: ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'),
    link: ico('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    img: ico('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>'),
    cust: ico('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--bg)"/><circle cx="15" cy="17" r="2.2" fill="var(--bg)"/>'),
    dash: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    newc: ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')
  };
  const navBtn = (id, key, icon, label) => `<button id="${id}" title="${label}" style="background:${state.aiSection===key?'rgba(255,255,255,0.12)':'none'}; border:none; color:var(--text); padding:9px ${open?'10px':'0'}; border-radius:8px; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:${open?'flex-start':'center'}; gap:10px; width:100%; white-space:nowrap;">${icon}${open?`<span>${label}</span>`:''}</button>`;
  const recentHtml = open ? `<div style="display:flex; flex-direction:column; gap:4px; margin-top:8px; min-height:0;">
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:600; letter-spacing:0.05em; padding:4px 8px;">${state.lang==='hi'?'हाल की चैट':'Recent'}</div>
          <input id="thread-search" type="search" value="${esc(state.threadSearch||'')}" placeholder="${state.lang==='hi'?'चैट खोजें…':'Search chats'}" style="margin:0 0 4px; padding:7px 10px; font-size:13px; border-radius:8px;">
          <div id="recent-list" style="display:flex; flex-direction:column; gap:2px;"></div>
        </div>` : '';
  const sbIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><line x1="9" y1="4" x2="9" y2="20"/></svg>`;
  const backIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
  const iconBtn = 'background:none; border:none; color:var(--text); border-radius:8px; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:none;';

  $('app').innerHTML = `
    <div style="display:flex; height:100vh; width:100vw; background:var(--bg); overflow:hidden; position:fixed; top:0; left:0; margin:0; padding:0; box-sizing:border-box;">
      
      <!-- Left Fixed Sidebar -->
      <div style="${open?'':'display:none; '}width:${open?260:56}px; min-width:${open?260:56}px; border-right:1px solid var(--border); padding:${open?'16px 12px':'12px 6px'}; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.4); height:100vh; box-sizing:border-box; overflow-y:auto; overflow-x:hidden;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; justify-content:${open?'flex-start':'center'};">
          ${open?`<button id="sidebar-toggle" title="Toggle sidebar" style="${iconBtn} margin-left:auto;">${sbIcon}</button>`:''}
        </div>

        ${navBtn('ai-nav-home','home',I.chat,'Projects / Home')}

        <button id="new-chat-btn" title="New chat" style="display:flex; align-items:center; justify-content:${open?'flex-start':'center'}; gap:10px; padding:9px ${open?'12px':'0'}; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; background:${open?'var(--text)':'none'}; color:${open?'var(--bg)':'var(--text)'}; border:none; width:100%;">${I.newc}${open?'<span>New chat</span>':''}</button>

        <div style="display:flex; flex-direction:column; gap:3px; margin-top:6px;">
          ${open?'<div style="font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:600; letter-spacing:0.05em; padding:4px 8px;">Workspace</div>':''}
          ${navBtn('ai-nav-schedules','schedules',I.cal,'Schedules')}
          ${navBtn('ai-nav-connectors','connectors',I.link,'Connectors')}
          ${navBtn('ai-nav-images','images',I.img,'Images & Files')}
          ${navBtn('ai-nav-customize','customize',I.cust,'Customize')}
        </div>

        ${recentHtml}

        <div style="margin-top:auto; display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border); padding-top:12px;">

          ${state.embed?'':`<div id="ai-sidebar-user-profile" style="display:flex; align-items:center; justify-content:${open?'flex-start':'center'}; gap:10px; padding:${open?'8px 10px':'6px 0'}; border-radius:8px; cursor:pointer; background:rgba(255,255,255,0.04);">
            <div style="background:#3b4a63; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; flex:none;">${userInitial}</div>
            ${open?`<div style="overflow:hidden; flex:1;"><div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div><div style="font-size:11px; color:#4dabf7; font-weight:500;">Pro</div></div>`:''}
          </div>`}
        </div>
      </div>

      <!-- Right Main Workspace Area -->
      <div style="flex:1; display:flex; flex-direction:column; position:relative; overflow:hidden; background:var(--bg); height:100vh;">
        <header style="padding:10px 16px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; width:100%; box-sizing:border-box; gap:8px;">
          <div style="display:flex; align-items:center; gap:6px; min-width:0;">
            ${open?'':`<button id="sidebar-toggle" title="Toggle sidebar" style="${iconBtn}">${sbIcon}</button>`}
            <button id="ai-back" title="Back" style="${iconBtn}${state.embed?' display:none;':''}">${backIcon}</button>
            <span style="font-size:14px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-left:4px;">${c?esc(c.name):''}</span>
          </div>
          <div style="display:flex; background:rgba(255,255,255,0.08); border-radius:999px; padding:5px;">
            <button id="mode-chat" style="border:none; cursor:pointer; padding:11px 38px; border-radius:999px; font-size:16px; font-weight:600; background:${state.aiMode!=='task'?'rgba(255,255,255,0.18)':'transparent'}; color:var(--text);">Chat</button>
            <button id="mode-work" style="border:none; cursor:pointer; padding:11px 38px; border-radius:999px; font-size:16px; font-weight:600; background:${state.aiMode==='task'?'rgba(255,255,255,0.18)':'transparent'}; color:var(--text);">Work</button>
          </div>
          <div></div>
        </header>
        <div style="flex:1; display:flex; flex-direction:column; width:100%; height:calc(100vh - 53px); overflow:hidden; box-sizing:border-box; justify-content:center; align-items:center;">
          ${mainAreaContent}
        </div>
      </div>
    </div>`;

  if (sec === 'schedules' || (sec === 'home' && state.aiMode === 'task')) fillWorkBox();
  if (sec === 'images') fillFilesBox();
  if (sec === 'connectors') fillConnectorsBox();
  if (sec === 'customize') fillCustomizeBox();

  $('thread-search')?.addEventListener('input', e => { state.threadSearch = e.target.value; renderRecent(); });
  renderRecent();
  if (state.threadsCompany !== state.companyId) loadThreads();

  $('ai-back').onclick = () => {
    if (state.aiSection !== 'home') { state.aiSection = 'home'; renderChatGPTStyleLayout(c); }
    else { if (state.embed) { closeEmbed(); return; } state.page = 'dashboard'; render(); }
  };
  $('sidebar-toggle').onclick = () => { state.sidebarOpen = !state.sidebarOpen; renderChatGPTStyleLayout(c); };
  $('mode-chat').onclick = () => { state.aiMode = 'chat'; state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('mode-work').onclick = () => { state.aiMode = 'task'; state.aiSection = 'home'; renderChatGPTStyleLayout(c); };

  const _bd = $('back-to-dashboard-btn'); if (_bd) _bd.onclick = () => {
    if (state.embed) { closeEmbed(); return; }
    state.page = 'dashboard';
    render();
  };

  $('new-chat-btn').onclick = () => {
    state.threadId = null; state.chats[state.companyId] = []; state.aiMode = 'chat';
    state.aiSection = 'home';
    renderChatGPTStyleLayout(c);
  };

  $('ai-nav-home').onclick = () => { state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('ai-nav-schedules').onclick = () => { state.aiSection = 'schedules'; renderChatGPTStyleLayout(c); };
  $('ai-nav-connectors').onclick = () => { state.aiSection = 'connectors'; renderChatGPTStyleLayout(c); };
  $('ai-nav-images').onclick = () => { state.aiSection = 'images'; renderChatGPTStyleLayout(c); };
  $('ai-nav-customize').onclick = () => { state.aiSection = 'customize'; renderChatGPTStyleLayout(c); };

  const _up = $('ai-sidebar-user-profile'); if (_up) _up.onclick = (e) => { openGeminiStyleAccountPopup(e.currentTarget); };

  if(sec !== 'home' || state.aiMode === 'task') return;

  const input = $('chat-input'), mic = $('chat-mic'), plus = $('chat-plus');
  const photoInput = $('chat-photo'), docInput = $('chat-document');
  const preview = $('file-preview'), img = $('file-img'), doc = $('file-doc'), fileName = $('file-name');
  if (!input) return;
  document.querySelectorAll('[data-suggest]').forEach(b => b.onclick = () => sendChat(b.dataset.suggest));
  {
    const cp = $('composer');
    const upd = (raise) => {
      if (!cp || !cp.isConnected) return;
      const chatting = chatLog().length > 0;
      cp.style.transform = 'none'; cp.style.marginBottom = chatting ? '0' : '7vh';
    };
    window.__composerUpd = () => upd(false);
    cp?.addEventListener('pointerdown', () => upd(true));
    input.addEventListener('input', () => upd(true));
    input.addEventListener('blur', () => setTimeout(() => upd(false), 150));
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if(!text && !pendingFile) return;
      const f = pendingFile, t = pendingFileType;
      input.value = '';
      pendingFile = null;
      preview.classList.add('hidden');
      if(f) sendChatWithFile(text, f, t);
      else sendChat(text);
    }
  });
  
  $('chat-send').onclick = () => {
    const text = input.value.trim();
    if(!text && !pendingFile) return;
    const f = pendingFile, t = pendingFileType;
    input.value = '';
    pendingFile = null;
    preview.classList.add('hidden');
    if(f) sendChatWithFile(text, f, t);
    else sendChat(text);
  };

  plus.onclick = () => {
    const old = document.getElementById('attach-menu');
    if(old){ old.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'attach-menu';
    menu.id = 'attach-menu';
    menu.innerHTML = `<button type="button" data-kind="photo" style="display:block; width:100%; padding:8px; background:none; border:none; color:var(--text); text-align:left; cursor:pointer;">🖼️ Photo / Bill</button><button type="button" data-kind="document" style="display:block; width:100%; padding:8px; background:none; border:none; color:var(--text); text-align:left; cursor:pointer;">📄 Document</button>`;
    document.body.appendChild(menu);
    const rect = plus.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    menu.style.left = rect.left + 'px';
    menu.style.background = 'var(--panel-bg, #222)';
    menu.style.border = '1px solid var(--border)';
    menu.style.borderRadius = '8px';
    menu.style.zIndex = '1000';

    menu.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        const kind = b.dataset.kind;
        menu.remove();
        if(kind === 'photo') photoInput.click();
        else docInput.click();
      };
    });
  };

  photoInput.onchange = () => {
    const file = photoInput.files[0];
    if(!file) return;
    pendingFile = file; pendingFileType = 'IMAGE';
    img.src = URL.createObjectURL(file);
    img.classList.remove('hidden');
    doc.classList.add('hidden');
    preview.classList.add('hidden');
  };

  docInput.onchange = () => {
    const file = docInput.files[0];
    if(!file) return;
    pendingFile = file; pendingFileType = 'DOCUMENT';
    fileName.textContent = file.name;
    doc.classList.add('hidden');
    img.classList.add('hidden');
    preview.classList.add('hidden');
  };

  $('file-remove').onclick = () => {
    pendingFile = null;
    photoInput.value = ''; docInput.value = '';
    preview.classList.add('hidden');
  };

  mic.onclick = () => {
    startVoice(input);
  };

  renderChatLog();
  input.focus();
}

async function dashboard(){
  const d=await api(`/api/companies/${state.companyId}/dashboard`);
  $('content').innerHTML=`<div class="cards">
    ${[['Sales',d.sales_paise],['Purchases',d.purchases_paise],['Profit',d.net_profit_paise],['Cash',d.cash_paise],['Bank',d.bank_paise],['Inventory',d.stock_value_paise]].map(x=>`<div class="card"><div class="k-label">${x[0]}</div><div class="k-value">${money(x[1])}</div></div>`).join('')}
  </div>
  <section class="panel">
    <div class="panel-head"><h3>Dashboard Overview</h3></div>
    <p class="note">Welcome to Apna Business. Use the sidebar sections to access Vouchers, Balance Sheet, Inventory, and GST Breakdown.</p>
  </section>`;
}

async function vouchersPage(){
  const rows=await api(`/api/companies/${state.companyId}/vouchers`);
  $('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Vouchers (Daybook / Entries)</h3></div>${table(rows,[['date','Date'],['kind','Type'],['reference','Ref'],['memo','Memo']])}</section>`;
}

async function balanceSheetPage(){
  const bs=await api(`/api/companies/${state.companyId}/reports/balance-sheet`);
  $('content').innerHTML=`<section class="panel"><h3>Balance Sheet</h3><p>Difference: <strong>${money(bs.difference_paise)}</strong></p><p class="muted small">Assets: ${money(bs.total_assets_paise)} | Liabilities: ${money(bs.total_liabilities_paise)} | Equity: ${money(bs.total_equity_paise)}</p></section>`;
}

async function gstReportPage(){
  const gst=await api(`/api/companies/${state.companyId}/reports/gst`);
  $('content').innerHTML=`<section class="panel"><h3>GST Breakdown & Reports</h3><p>Output GST: <strong>${money(gst.sales.cgst_paise+gst.sales.sgst_paise+gst.sales.igst_paise)}</strong></p><p>Input GST: <strong>${money(gst.purchases.cgst_paise+gst.purchases.sgst_paise+gst.purchases.igst_paise)}</strong></p><p class="muted small">${esc(gst.warning)}</p></section>`;
}

async function contacts(){const rows=await api(`/api/companies/${state.companyId}/contacts`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Customers & Suppliers</h3><button class="btn primary" id="add-contact">+ Add contact</button></div>${table(rows,[['kind','Type'],['name','Name'],['state_code','State'],['gstin','GSTIN'],['phone','Phone']])}</section>`;$('add-contact').onclick=()=>contactForm();}

async function products(){const rows=await api(`/api/companies/${state.companyId}/products`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Products & Inventory</h3><button class="btn primary" id="add-product">+ Add product</button></div>${table(rows,[['sku','SKU'],['name','Product'],['gst_bps','GST %'],['sale_price_paise','Sale price'],['cost_price_paise','Cost'],['stock_qty','Stock']])}</section>`;$('add-product').onclick=()=>productForm();}

function table(rows,cols){if(!rows?.length)return '<div class="empty">No records yet.</div>';return `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0].includes('_paise')?money(r[c[0]]):c[0]==='gst_bps'?`${Number(r[c[0]]||0)/100}%`:esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}

async function invoices(){const rows=await api(`/api/companies/${state.companyId}/invoices`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Invoices (Sales / Purchases)</h3><div class="actions"><button class="btn primary" id="sale">+ Sales invoice</button><button class="btn" id="purchase">+ Purchase invoice</button></div></div>${table(rows,[['number','Invoice'],['kind','Type'],['date','Date'],['contact_name','Party'],['subtotal_paise','Taxable'],['gst_paise','GST'],['total_paise','Total'],['outstanding_paise','Outstanding']])}</section>`;$('sale').onclick=()=>invoiceForm('SALE');$('purchase').onclick=()=>invoiceForm('PURCHASE');}

async function reports(){const [pl,bs,stock,gst]=await Promise.all([api(`/api/companies/${state.companyId}/reports/profit-loss`),api(`/api/companies/${state.companyId}/reports/balance-sheet`),api(`/api/companies/${state.companyId}/reports/stock`),api(`/api/companies/${state.companyId}/reports/gst`)]);$('content').innerHTML=`<section class="panel"><h3>Profit & Loss</h3><p>Revenue: <strong>${money(pl.revenue_paise)}</strong></p><p>Net profit: <strong>${money(pl.net_profit_paise)}</strong></p></section><section class="panel"><h3>Stock Summary</h3>${table(stock,[['sku','SKU'],['name','Product'],['qty','Qty'],['stock_value_paise','Stock value']])}</section>`;}

async function settings(){const c=await api(`/api/companies/${state.companyId}`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Company Alter / Tax Setup</h3></div><form id="tax-form"><label>Business name<input name="name" value="${esc(c.name)}" required></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option ${x===c.business_type?'selected':''}>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${esc(name)}" ${name===c.business_state?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type"><option value="UNREGISTERED" ${c.gst_type==='UNREGISTERED'?'selected':''}>I don't have GST registration</option><option value="REGULAR" ${c.gst_type==='REGULAR'?'selected':''}>GST Regular</option><option value="COMPOSITION" ${c.gst_type==='COMPOSITION'?'selected':''}>GST Composition</option><option value="OTHER" ${c.gst_type==='OTHER'?'selected':''}>Other GST registration</option></select></label><label>GSTIN<input name="gstin" value="${esc(c.gstin||'')}" placeholder="Required for registered types"></label><button class="btn primary" type="submit">Save Changes (Alter)</button><p class="note">Alter company details here. Changes are saved to company settings and audit logs.</p></form></section>`;$('tax-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/companies/${state.companyId}`,{method:'PATCH',body:Object.fromEntries(f)});toast('Company details updated successfully');await refreshSession();render();}catch(err){toast(err.message);}};}

function modal(title,html){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal"><div class="modal-head"><h3>${title}</h3><button id="close">×</button></div>${html}</section>`;document.body.appendChild(wrap);wrap.querySelector('#close').onclick=()=>wrap.remove();return wrap;}

function createCompanyForm(){const m=modal('Create Your Business',`<form id="company-form"><label>Business name<input name="name" required placeholder="APNA KIRANA STORE"></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${name}" ${code==='09'?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type" id="new-gst"><option value="UNREGISTERED">I don't have GST registration</option><option value="REGULAR">GST Regular</option><option value="COMPOSITION">GST Composition</option><option value="OTHER">Other GST registration</option></select></label><label id="new-gstin-wrap" class="hidden">GSTIN<input name="gstin" placeholder="15-character GSTIN"></label><p id="new-gst-help" class="note">GSTIN is not required for an unregistered business.</p><label>Address<input name="address"></label><button class="btn primary" type="submit">Create business</button></form>`);const sel=m.querySelector('#new-gst');const wrap=m.querySelector('#new-gstin-wrap');const help=m.querySelector('#new-gst-help');function update(){const reg=sel.value!=='UNREGISTERED';wrap.classList.toggle('hidden',!reg);help.textContent=sel.value==='REGULAR'?'GSTIN is required. Regular GST supports CGST + SGST or IGST.':sel.value==='COMPOSITION'?'GSTIN is required. Sales use composition-compatible treatment.':sel.value==='OTHER'?'GSTIN is required for this registration type; Regular GST is not assumed.':'GSTIN is not required for an unregistered business.';}sel.onchange=update;update();m.querySelector('#company-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const created=await api('/api/companies',{method:'POST',body:Object.fromEntries(f)});m.remove();await refreshSession();state.companyId=created.id;state.page='dashboard';render();}catch(err){toast(err.message);}};}

function contactForm(){const m=modal('Add contact',`<form id="f"><label>Type<select name="kind"><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option></select></label><label>Name<input name="name" required></label><label>State code<input name="state_code" placeholder="27"></label><label>GSTIN<input name="gstin"></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><button class="btn primary">Save contact</button></form>`);m.querySelector('#f').onsubmit=async e=>{e.preventDefault();try{await api(`/api/companies/${state.companyId}/contacts`,{method:'POST',body:Object.fromEntries(new FormData(e.currentTarget))});m.remove();contacts();}catch(err){toast(err.message);}};}

function productForm(){const m=modal('Add product',`<form id="f"><label>SKU<input name="sku" required></label><label>Product name<input name="name" required></label><label>HSN / SAC<input name="hsn"></label><label>GST rate %<input name="gst_rate" type="number" value="18" step="0.01" min="0"></label><label>Sale price ₹<input name="sale_rupees" type="number" value="100" step="0.01" min="0"></label><label>Purchase cost ₹<input name="cost_rupees" type="number" value="70" step="0.01" min="0"></label><label>Low-stock level<input name="reorder_level" type="number" value="5" min="0"></label><button class="btn primary">Save product</button></form>`);m.querySelector('#f').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/companies/${state.companyId}/products`,{method:'POST',body:{sku:f.get('sku'),name:f.get('name'),hsn:f.get('hsn'),gst_bps:Math.round(Number(f.get('gst_rate'))*100),sale_price_paise:Math.round(Number(f.get('sale_rupees'))*100),cost_price_paise:Math.round(Number(f.get('cost_rupees'))*100),reorder_level:Number(f.get('reorder_level'))}});m.remove();products();}catch(err){toast(err.message);}};}

function invoiceForm(kind){
  // invoice creation/landings
}

(function splashAndIcon(){
  const a = document.getElementById('app');
  if (a && !state.user) {
    a.innerHTML = '<style>@keyframes apna-pulse{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.06)}}</style><div id="splash" style="position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center;z-index:99999;"><div style="animation:apna-pulse 1.4s ease-in-out infinite;">' + PULSE_ICON(72) + '</div></div>';
  }
  try {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#000"/><g transform="translate(4 4)"><path d="M22 12h-4l-3 9L9 3l-3 9H2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
    let l = document.querySelector('link[rel~="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.type = 'image/svg+xml'; l.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  } catch {}
})();

(async()=>{if(await refreshSession()) render(); else authView('login');})();
