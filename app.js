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
  aiSection: 'home', 
  sidebarExpanded: false, 
  lang: (() => { try { return localStorage.getItem('apna_lang') || 'hi'; } catch { return 'hi'; } })(), 
  theme: (() => { try { return localStorage.getItem('apna_theme') || 'dark'; } catch { return 'dark'; } })() 
};

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
    inventoryStock: 'इन्वेंट्री और स्टॉक',
    productsInv: 'स्टॉक / इन्वेंट्री',
    contactsList: 'ग्राहक / आपूर्तिकर्ता',
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
  const opts={...options,headers:{'Content-Type':'application/json',...(options.headers||{})}};
  if(opts.body && typeof opts.body!=='string') opts.body=JSON.stringify(opts.body);
  if(state.csrf && opts.method && opts.method!=='GET') opts.headers['X-CSRF-Token']=state.csrf;
  const r=await fetch(path,opts);
  let data=null; try{data=await r.json();}catch{}
  if(!r.ok) throw Object.assign(new Error(data?.error||`Request failed (${r.status})`), { status: r.status });
  return data;
}

async function refreshSession(){
  try{
    const me=await api('/api/auth/me');
    if (!me || !me.user) return false;
    state.user=me.user; state.csrf=me.csrf;
    state.companies=await api('/api/companies');
    if(!state.companyId || !state.companies.some(c=>c.id===state.companyId)) state.companyId=state.companies[0]?.id||null;
    return true;
  }catch(err){ 
    if (err.status === 401) {
      state.user = null;
      state.csrf = null;
    }
    return false; 
  }
}

function authView(mode='login'){
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
      if(mode==='register') {
        await api('/api/auth/register',{method:'POST',body:{name:fd.get('name'),email:fd.get('email'),password:fd.get('password')}});
      }
      const res = await api('/api/auth/login',{method:'POST',body:{email:fd.get('email'),password:fd.get('password')}});
      state.user = res.user; 
      state.csrf = res.csrf;
      state.companies = await api('/api/companies');
      state.companyId = state.companies[0]?.id || null;
      render();
    }catch(err){
      const errEl = $('auth-error');
      if(errEl) errEl.textContent = err.message;
    }
  };
}

function companySelect(){return `<select id="company-select">${state.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;}

function openSettingsModal(){
  const m = modal(state.lang==='hi' ? 'एप सेटिंग्स (App Settings)' : 'App Settings', `
    <div style="display:flex;flex-direction:column;gap:16px;margin-top:10px; max-height: 70vh; overflow-y: auto; padding-right:4px;">
      <div style="font-size:13px; color:var(--muted); font-weight:600; text-transform:uppercase;">Subscription & Limits</div>
      <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toast('Usage limits opened')">
        <div><strong>Usage limits</strong><div style="font-size:12px; color:var(--muted);">Check your current usage & API limits</div></div>
        <span>›</span>
      </div>
      <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toast('Manage subscription opened')">
        <div><strong>Manage subscription</strong><div style="font-size:12px; color:var(--muted);">View billing & plan details</div></div>
        <span>›</span>
      </div>
      <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toast('Upgrade to Google AI Ultra opened')">
        <div><strong>Upgrade to Google AI Ultra</strong><div style="font-size:12px; color:var(--muted);">Unlock advanced capabilities</div></div>
        <span>⭐</span>
      </div>

      <div style="font-size:13px; color:var(--muted); font-weight:600; text-transform:uppercase; margin-top:6px;">Preferences</div>
      
      <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
        <span>Theme / थीम</span>
        <select id="settings-theme-select" style="padding:4px 8px; border-radius:6px; background:rgba(255,255,255,0.1); color:var(--text); border:1px solid var(--border);">
          <option value="dark" ${state.theme==='dark'?'selected':''}>Dark</option>
          <option value="light" ${state.theme==='light'?'selected':''}>Light</option>
        </select>
      </label>

      <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
        <span>Language / भाषा</span>
        <select id="settings-lang-select" style="padding:4px 8px; border-radius:6px; background:rgba(255,255,255,0.1); color:var(--text); border:1px solid var(--border);">
          <option value="hi" ${state.lang==='hi'?'selected':''}>हिंदी (Hindi)</option>
          <option value="en" ${state.lang==='en'?'selected':''}>English</option>
        </select>
      </label>

      <button class="btn primary" id="save-settings-btn" style="margin-top:10px; padding:10px; border-radius:8px; cursor:pointer;">Save Settings</button>
    </div>
  `);

  m.querySelector('#save-settings-btn').onclick = () => {
    const newLang = m.querySelector('#settings-lang-select').value;
    const newTheme = m.querySelector('#settings-theme-select').value;
    state.lang = newLang;
    state.theme = newTheme;
    try {
      localStorage.setItem('apna_lang', newLang);
      localStorage.setItem('apna_theme', newTheme);
    } catch {}
    document.body.classList.toggle('light', state.theme === 'light');
    m.remove();
    toast(state.lang==='hi' ? 'सेटिंग्स सफलतापूर्वक सहेज ली गई हैं!' : 'Settings saved successfully!');
    render();
  };
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
    left: 12px;
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
      <div class="popup-item" data-action="google-account" style="padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:10px;">👤 <span>Manage your Google Account</span></div>
      <div class="popup-item" data-action="add-account" style="padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:10px;">➕ <span>Add another account</span></div>
      <div style="border-top:1px solid #3c4043; margin:6px 0;"></div>
      <div class="popup-item" data-action="logout" style="padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:10px; color:#f28b82; font-weight:600;">🚪 <span>Sign out</span></div>
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
        $('logout').click();
      } else {
        toast(`Selected: ${action}`);
      }
    };
  });

  popup.querySelector('#close-popup-x').onclick = () => popup.remove();

  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && e.target.id !== 'sidebar-user-profile' && !e.target.closest('#sidebar-user-profile')) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 0);
}

function layout(){
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
    <button data-page="dashboard" class="${state.page==='dashboard'?'active':''}">${t('dashboard')}</button>
    <button data-page="chat" class="${state.page==='chat'?'active':''}">${t('aiChat')}</button>
    
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
  <main><header class="topbar"><div><h2>${c?esc(c.name):'Create your business'}</h2><p>${c?`${esc(c.business_state||'')} · GST: ${esc(c.gst_type||'Tax setup required')}`:'One platform for GST and Non-GST businesses'}</p></div><div class="status">${state.user?esc(state.user.email):''}</div></header><div id="content" class="content"></div></main></div>`;
  
  $('company-select')?.addEventListener('change',e=>{state.companyId=e.target.value;state.page='dashboard';render();});
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderPage();});
  
  $('top-create-company')?.addEventListener('click', createCompanyForm);
  $('top-alter-company')?.addEventListener('click', () => { state.page = 'settings'; renderPage(); });
  $('sidebar-user-profile')?.addEventListener('click', (e) => { openGeminiStyleAccountPopup(e.currentTarget); });

  $('logout')?.addEventListener('click', async()=>{try{await api('/api/auth/logout',{method:'POST',body:{}});}finally{state.user=null;state.csrf=null;state.companies=[];state.companyId=null;state.chats={};authView('login');}};
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
  if(p==='chat') { chatPage(); return; }
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
    log.innerHTML=`<div class="chat-hello" style="text-align:center; padding:10px;"><div class="chat-avatar">${PULSE_ICON(26)}</div><h3 style="font-size: 38px; font-weight: 600; margin-top: 12px; letter-spacing: -0.5px;">How can I help you?</h3><p style="font-size: 16px; color: var(--muted); margin-top: 4px;">${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p></div>`;
  }else{
    log.innerHTML=msgs.map((m,i)=>m.role==='user'
      ?`<div class="msg user" style="margin:8px 0; text-align:right;"><div class="bubble" style="display:inline-block; background:var(--primary); padding:8px 12px; border-radius:12px;">${m.fileUrl?fileBubble(m):''}${esc(m.text)}</div></div>`
      :`<div class="msg bot" style="margin:8px 0; text-align:left;"><div class="bubble ${m.error?'err':''} ${m.typing?'typing':''}" style="display:inline-block; background:rgba(255,255,255,0.08); padding:8px 12px; border-radius:12px;">${esc(m.text)}${m.draft?draftCard(m,i):''}</div></div>`).join('');
  }
  log.scrollTop=log.scrollHeight;
  log.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>decideDraft(msgs[Number(b.dataset.i)],b.dataset.act));
  const send=$('chat-send');if(send)send.disabled=state.chatBusy;
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

function chatPage() {
  const c = state.companies.find(x => x.id === state.companyId);
  renderChatGPTStyleLayout(c);
}

function renderChatGPTStyleLayout(c) {
  const sec = state.aiSection;
  const isExpanded = state.sidebarExpanded;
  let mainAreaContent = '';

  if(sec === 'home') {
    if(state.aiMode === 'task') {
      mainAreaContent = `
        <div style="padding:40px; max-width:800px; margin:0 auto; width:100%;">
          <h2>📋 Pending Business Tasks & Reminders</h2>
          <p class="muted">AI tracks pending invoices, low stock items, and customer payments here.</p>
          <div class="panel" style="background:rgba(255,255,255,0.03); padding:20px; border-radius:12px; margin-top:20px;">
            <strong>1. Check Low Stock Items</strong><br><small class="muted">Review reorder levels for inventory items.</small>
          </div>
          <div class="panel" style="background:rgba(255,255,255,0.03); padding:20px; border-radius:12px; margin-top:15px;">
            <strong>2. Follow up on Pending Invoices</strong><br><small class="muted">Check customer outstanding balances.</small>
          </div>
        </div>`;
    } else {
      mainAreaContent = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; width:100%; height:100%; box-sizing:border-box; text-align:center;">
          <div class="chat-avatar" style="margin-bottom:12px;">${PULSE_ICON(44)}</div>
          <h1 style="font-size:42px; margin-bottom:8px; font-weight:600; letter-spacing:-0.5px;">How can I help you?</h1>
          <p style="color:var(--muted); margin-bottom:28px; font-size:16px;">${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p>
          
          <div style="width:100%; max-width:700px; position:relative; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:24px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
            <input type="file" id="chat-photo" accept="image/*" class="hidden">
            <input type="file" id="chat-document" accept=".pdf,.doc,.docx,.txt" class="hidden">
            <button type="button" id="chat-plus" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:18px;" title="Attach">+</button>
            <textarea id="chat-input" rows="1" maxlength="1500" placeholder="${state.lang==='hi'?'Yahan likhiye, jaise: Ramesh ko 5000 ka maal becha':'Type here, e.g. Sold goods worth 5000 to Ramesh'}" style="flex:1; background:none; border:none; color:var(--text); resize:none; outline:none; font-size:15px; max-height:120px;"></textarea>
            <button type="button" id="chat-mic" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:20px;" title="Voice input">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
            <button type="button" id="chat-send" style="background:var(--text); color:var(--bg); border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Send">➤</button>
          </div>

          <div class="file-preview hidden" id="file-preview" style="margin-top:10px; width:100%; max-width:700px;">
            <img id="file-img" class="hidden" alt="Selected photo" style="max-height:80px; border-radius:6px;">
            <div id="file-doc" class="hidden">📄 <span id="file-name"></span></div>
            <button class="file-remove" id="file-remove" type="button" aria-label="Remove file">×</button>
          </div>

          <div id="chat-log" style="width:100%; max-width:700px; margin-top:20px; max-height:300px; overflow-y:auto;"></div>
        </div>`;
    }
  } else if(sec === 'schedules') {
    mainAreaContent = `<div style="padding:40px; max-width:800px; margin:0 auto; width:100%;"><h2>📅 Schedules & Reminders</h2><p class="muted">No pending schedules configured yet.</p></div>`;
  } else if(sec === 'connectors') {
    mainAreaContent = `<div style="padding:40px; max-width:800px; margin:0 auto; width:100%;"><h2>🔗 Connectors & Integrations</h2><p class="muted">Connect external APIs, bank feeds, or tax portals here.</p></div>`;
  } else if(sec === 'images') {
    mainAreaContent = `<div style="padding:40px; max-width:800px; margin:0 auto; width:100%;"><h2>🖼️ Uploaded Images / Documents</h2><p class="muted">All uploaded receipts and documents will appear here.</p></div>`;
  } else if(sec === 'customize') {
    mainAreaContent = `<div style="padding:40px; max-width:800px; margin:0 auto; width:100%;"><h2>⚙️ Customize AI Assistant</h2><p class="muted">Tailor your AI accountant prompt rules and behavior.</p></div>`;
  }

  const userName = state.user?.name || 'Prince Kumar';
  const userInitial = userName[0].toUpperCase();

  const sidebarWidth = isExpanded ? '260px' : '68px';

  $('app').innerHTML = `
    <div style="display:flex; height:100vh; width:100vw; background:var(--bg); overflow:hidden;">
      <!-- Gemini/ChatGPT Style Collapsible Vertical Sidebar -->
      <div id="chatgpt-sidebar" style="width:${sidebarWidth}; min-width:${sidebarWidth}; border-right:1px solid var(--border); padding:16px 10px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.3); overflow-y:auto; transition: width 0.2s ease;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button id="toggle-sidebar-btn" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:18px; padding:6px; border-radius:8px;" title="Open / Close sidebar">☰</button>
          ${isExpanded ? `<span style="font-weight:600; font-size:14px;">Apna Business</span>` : ''}
          <button id="open-settings-cog" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:16px; padding:6px;" title="Settings">⚙️</button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
          <button class="btn" id="ai-nav-home" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiSection==='home'?'rgba(255,255,255,0.15)':'none'}; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Home / Chat">💬 ${isExpanded?'<span>Chat</span>':''}</button>
          <button class="btn" id="ai-nav-schedules" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiSection==='schedules'?'rgba(255,255,255,0.15)':'none'}; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Schedules">📅 ${isExpanded?'<span>Schedules</span>':''}</button>
          <button class="btn" id="ai-nav-connectors" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiSection==='connectors'?'rgba(255,255,255,0.15)':'none'}; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Connectors">🔗 ${isExpanded?'<span>Connectors</span>':''}</button>
          <button class="btn" id="ai-nav-images" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiSection==='images'?'rgba(255,255,255,0.15)':'none'}; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Images">🖼️ ${isExpanded?'<span>Images</span>':''}</button>
          <button class="btn" id="ai-nav-customize" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiSection==='customize'?'rgba(255,255,255,0.15)':'none'}; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Customize">⚙️ ${isExpanded?'<span>Customize</span>':''}</button>
        </div>

        <div style="border-top:1px solid var(--border); margin:6px 0;"></div>

        <div style="display:flex; flex-direction:column; gap:4px;">
          <button class="btn" id="ai-mode-chat-btn" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiMode==='chat'?'rgba(255,255,255,0.1)':'none'}; border:none; padding:8px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Chat Mode">🗨️ ${isExpanded?'<span>Chat Mode</span>':''}</button>
          <button class="btn" id="ai-mode-task-btn" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:${state.aiMode==='task'?'rgba(255,255,255,0.1)':'none'}; border:none; padding:8px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Task Mode">📋 ${isExpanded?'<span>Task Mode</span>':''}</button>
        </div>

        <div style="margin-top:auto; display:flex; flex-direction:column; gap:8px; width:100%; border-top:1px solid var(--border); padding-top:12px;">
          <button class="btn" id="back-to-dashboard-btn" style="justify-content:${isExpanded?'flex-start':'center'}; gap:10px; text-align:left; background:none; border:none; padding:10px 12px; border-radius:8px; color:var(--text); cursor:pointer;" title="Dashboard">📊 ${isExpanded?'<span>Dashboard</span>':''}</button>
          <div id="ai-sidebar-user-profile" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
            <div style="background:var(--primary); color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${userInitial}</div>
            ${isExpanded ? `
            <div style="overflow:hidden; flex:1;">
              <div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div>
              <div style="font-size:11px; color:#4dabf7; font-weight:500;">Pro</div>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Main AI Workspace -->
      <div style="flex:1; display:flex; flex-direction:column; position:relative; overflow-y:auto; background:var(--bg); height:100vh;">
        <header class="topbar" style="padding:12px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div><h2 style="font-size:16px; margin:0;">${c?esc(c.name):'Create your business'}</h2></div>
          <div class="status" style="font-size:13px; color:var(--muted);">${state.user?esc(state.user.email):''}</div>
        </header>
        <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
          ${mainAreaContent}
        </div>
      </div>
    </div>`;

  $('toggle-sidebar-btn').onclick = () => {
    state.sidebarExpanded = !state.sidebarExpanded;
    renderChatGPTStyleLayout(c);
  };

  $('open-settings-cog').onclick = openSettingsModal;
  $('back-to-dashboard-btn').onclick = () => {
    state.page = 'dashboard';
    render();
  };

  $('ai-nav-home').onclick = () => { state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('ai-nav-schedules').onclick = () => { state.aiSection = 'schedules'; renderChatGPTStyleLayout(c); };
  $('ai-nav-connectors').onclick = () => { state.aiSection = 'connectors'; renderChatGPTStyleLayout(c); };
  $('ai-nav-images').onclick = () => { state.aiSection = 'images'; renderChatGPTStyleLayout(c); };
  $('ai-nav-customize').onclick = () => { state.aiSection = 'customize'; renderChatGPTStyleLayout(c); };

  $('ai-mode-chat-btn').onclick = () => { state.aiMode = 'chat'; state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('ai-mode-task-btn').onclick = () => { state.aiMode = 'task'; state.aiSection = 'home'; renderChatGPTStyleLayout(c); };

  $('ai-sidebar-user-profile').onclick = (e) => { openGeminiStyleAccountPopup(e.currentTarget); };

  if(sec !== 'home' || state.aiMode === 'task') return;

  const input = $('chat-input'), mic = $('chat-mic'), plus = $('chat-plus');
  const photoInput = $('chat-photo'), docInput = $('chat-document');
  const preview = $('file-preview'), img = $('file-img'), doc = $('file-doc'), fileName = $('file-name');
  if (!input) return;

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
    ${[['Sales',d.sales_paise],['Purchases',d.purchases_paise],['Profit',d.net_profit_paise],['Cash',d.cash_paise],['Bank',d.bank_paise],['Inventory',d.stock_value_paise']].map(x=>`<div class="card"><div class="k-label">${x[0]}</div><div class="k-value">${money(x[1])}</div></div>`).join('')}
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

(async()=>{
  const loggedIn = await refreshSession();
  if (loggedIn) {
    render();
  } else {
    authView('login');
  }
})();
