<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Accountant - APNA BUSINESS</title>
    <style>
        :root {
            --bg: #121212;
            --panel-bg: #171717;
            --text: #ffffff;
            --muted: #9b9b9b;
            --border: #282828;
            --primary: #4dabf7;
        }

        body.light {
            --bg: #f4f6f8;
            --panel-bg: #ffffff;
            --text: #1a1a1a;
            --muted: #666666;
            --border: #e0e0e0;
            --primary: #1976d2;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        .hidden { display: none !important; }

        /* Auth Shell */
        .auth-shell {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            background: var(--bg);
        }
        .auth-card {
            background: var(--panel-bg);
            border: 1px solid var(--border);
            padding: 30px;
            border-radius: 16px;
            width: 380px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .auth-card h1 {
            font-size: 22px;
            margin-bottom: 16px;
            text-align: center;
        }
        .auth-card label {
            display: flex;
            flex-direction: column;
            font-size: 13px;
            color: var(--muted);
            margin-bottom: 12px;
            gap: 4px;
        }
        .auth-card input {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            padding: 10px;
            border-radius: 8px;
            color: var(--text);
            font-size: 14px;
            outline: none;
        }
        .btn {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn.primary {
            background: var(--text);
            color: var(--bg);
            border: none;
            font-weight: 600;
        }
        .btn.full { width: 100%; }
        .seg {
            display: flex;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 3px;
            margin-bottom: 16px;
        }
        .seg button {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--muted);
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        }
        .seg button.active {
            background: var(--panel-bg);
            color: var(--text);
            font-weight: 600;
        }
        .error { color: #f28b82; font-size: 12px; margin-top: 8px; text-align: center; }

        /* Toast notifications */
        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        /* Workspace Grid & Table */
        .workspace { display: flex; width: 100vw; height: 100vh; }
        .sidebar {
            width: 260px;
            background-color: var(--panel-bg);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-right: 1px solid var(--border);
            padding: 12px;
        }
        .brand { display: flex; align-items: center; gap: 10px; padding: 4px; }
        .logo { width: 28px; height: 28px; background: var(--primary); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        
        main { flex: 1; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; }
        .topbar { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .content { flex: 1; overflow-y: auto; padding: 20px; }

        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .card { background: var(--panel-bg); border: 1px solid var(--border); padding: 16px; border-radius: 12px; }
        .k-label { font-size: 12px; color: var(--muted); }
        .k-value { font-size: 20px; font-weight: 600; margin-top: 4px; }

        .panel { background: var(--panel-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }

        .table-wrap { overflow-x: auto; }
        .table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
        .table th { color: var(--muted); font-weight: 600; }

        /* Modal */
        .modal-backdrop {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal {
            background: var(--panel-bg); border: 1px solid var(--border);
            width: 450px; max-width: 90%; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-head button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }
    </style>
</head>
<body translate="no">
<div id="app"></div>

<script>
const STATES = [
  ['01','Jammu and Kashmir'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],['09','Uttar Pradesh'],['10','Bihar'],['11','Sikkim'],['12','Arunachal Pradesh'],['13','Nagaland'],['14','Manipur'],['15','Mizoram'],['16','Tripura'],['17','Meghalaya'],['18','Assam'],['19','West Bengal'],['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],['24','Gujarat'],['26','Dadra and Nagar Haveli and Daman and Diu'],['27','Maharashtra'],['29','Karnataka'],['30','Goa'],['31','Lakshadweep'],['32','Kerala'],['33','Tamil Nadu'],['34','Puducherry'],['35','Andaman and Nicobar Islands'],['36','Telangana'],['37','Andhra Pradesh'],['38','Ladakh']
];

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
function showError(message){document.getElementById('app').insertAdjacentHTML('afterbegin',`<div class="banner">${esc(message)}</div>`);}

async function api(path, options = {}) {
  const opts = {
    ...options,
    credentials: 'include', // <--- YE LOGIN FIX KAREGA (Cookies send karne ke liye)
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  if (state.csrf && opts.method && opts.method !== 'GET') opts.headers['X-CSRF-Token'] = state.csrf;
  
  const r = await fetch(path, opts);
  let data = null; 
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`);
  return data;
}

async function refreshSession(){
  try{
    const me = await api('/api/auth/me');
    if(!me || !me.user) return false;
    state.user = me.user; 
    state.csrf = me.csrf || '';
    try { state.companies = await api('/api/companies'); } catch { state.companies = []; }
    if(!state.companyId || !state.companies.some(c => c.id === state.companyId)) {
      state.companyId = state.companies[0]?.id || null;
    }
    return true;
  } catch { return false; }
}

function authView(mode='login'){
  document.getElementById('app').innerHTML=`<main class="auth-shell"><section class="auth-card" translate="no">
    <div style="display:flex; justify-content:center; margin-bottom:12px;"><div class="logo">${PULSE_ICON(18)}</div></div>
    <h1 translate="no">APNA BUSINESS</h1>
    <div class="seg"><button class="${mode==='login'?'active':''}" id="login-tab">${state.lang==='hi'?'लॉगिन':'Login'}</button><button class="${mode==='register'?'active':''}" id="register-tab">${state.lang==='hi'?'अकाउंट बनाएं':'Create account'}</button></div>
    <form id="auth-form"><div id="name-wrap" class="${mode==='register'?'':'hidden'}"><label>${state.lang==='hi'?'नाम':'Name'}<input name="name" placeholder="${state.lang==='hi'?'आपका नाम':'Your name'}"></label></div>
    <label>${state.lang==='hi'?'ईमेल':'Email'}<input name="email" type="email" required placeholder="you@example.com"></label>
    <label>${state.lang==='hi'?'पासवर्ड':'Password'}<input name="password" type="password" required minlength="6" placeholder="${state.lang==='hi'?'कम से कम 6 अक्षर':'At least 6 characters'}"></label>
    <button class="btn primary full" type="submit" style="margin-top:8px;">${mode==='login'?(state.lang==='hi'?'लॉगिन':'Login'):(state.lang==='hi'?'अकाउंट बनाएं':'Create account')}</button>
    <div id="auth-error" class="error"></div></form>
  </section></main>`;
  
  document.getElementById('login-tab').onclick = () => authView('login');
  document.getElementById('register-tab').onclick = () => authView('register');
  
  document.getElementById('auth-form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const email = fd.get('email');
      const password = fd.get('password');
      if(mode === 'register') {
        await api('/api/auth/register', { method: 'POST', body: { name: fd.get('name'), email, password } });
      }
      const loginRes = await api('/api/auth/login', { method: 'POST', body: { email, password } });
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
    } catch(err) {
      document.getElementById('auth-error').textContent = err.message;
    }
  };
}

function companySelect(){return `<select id="company-select" style="padding:6px; border-radius:6px; background:rgba(255,255,255,0.05); color:var(--text); border:1px solid var(--border); width:100%;">${state.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;}

function openSettingsModal(){
  const m = modal(state.lang==='hi' ? 'सेटिंग्स (Settings)' : 'Settings', `
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:10px;">
      <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
        <span>${state.lang==='hi'?'थीम (Theme)':'Theme'}</span>
        <select id="settings-theme-select" style="padding:4px 8px; border-radius:6px; background:rgba(255,255,255,0.1); color:var(--text); border:1px solid var(--border);">
          <option value="dark" ${state.theme==='dark'?'selected':''}>Dark</option>
          <option value="light" ${state.theme==='light'?'selected':''}>Light</option>
        </select>
      </label>
      <label style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
        <span>${state.lang==='hi'?'भाषा (Language)':'Language'}</span>
        <select id="settings-lang-select" style="padding:4px 8px; border-radius:6px; background:rgba(255,255,255,0.1); color:var(--text); border:1px solid var(--border);">
          <option value="hi" ${state.lang==='hi'?'selected':''}>हिंदी (Hindi)</option>
          <option value="en" ${state.lang==='en'?'selected':''}>English</option>
        </select>
      </label>
      <button class="btn primary full" id="save-settings-btn" style="margin-top:10px; padding:10px;">${state.lang==='hi'?'सेटिंग्स सहेजें':'Save Settings'}</button>
    </div>
  `);

  m.querySelector('#save-settings-btn').onclick = () => {
    state.lang = m.querySelector('#settings-lang-select').value;
    state.theme = m.querySelector('#settings-theme-select').value;
    try {
      localStorage.setItem('apna_lang', state.lang);
      localStorage.setItem('apna_theme', state.theme);
    } catch {}
    document.body.classList.toggle('light', state.theme === 'light');
    m.remove();
    toast(state.lang==='hi' ? 'सेटिंग्स सहेज ली गई हैं!' : 'Settings saved successfully!');
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
    position: fixed; bottom: 70px; left: 12px; width: 300px;
    background: var(--panel-bg); color: var(--text); border: 1px solid var(--border);
    border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 9999; padding: 14px;
  `;

  popup.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="background:var(--primary); color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">${userInitial}</div>
        <div style="overflow:hidden;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${esc(userName)}</div>
          <div style="font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${esc(userEmail)}</div>
        </div>
      </div>
      <button id="close-popup-x" style="background:transparent; border:none; color:var(--muted); font-size:16px; cursor:pointer;">✕</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:4px; font-size:13px;">
      <div class="popup-item" data-action="settings" style="padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px;">⚙️ <span>${state.lang==='hi'?'एप सेटिंग्स':'App Settings'}</span></div>
      <div style="border-top:1px solid var(--border); margin:4px 0;"></div>
      <div class="popup-item" data-action="logout" style="padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px; color:#f28b82; font-weight:600;">🚪 <span>${state.lang==='hi'?'लॉगआउट':'Sign out'}</span></div>
    </div>
  `;

  document.body.appendChild(popup);
  popup.querySelectorAll('.popup-item').forEach(item => {
    item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.08)';
    item.onmouseout = () => item.style.background = 'transparent';
    item.onclick = () => {
      const action = item.dataset.action;
      popup.remove();
      if(action === 'logout') logoutUser();
      else if(action === 'settings') openSettingsModal();
    };
  });
  popup.querySelector('#close-popup-x').onclick = () => popup.remove();
}

async function logoutUser() {
  try { await api('/api/auth/logout', { method: 'POST', body: {} }); } finally {
    state.user = null; state.csrf = null; state.companies = []; state.companyId = null; state.chats = {}; authView('login');
  }
}

function layout(){
  const c = state.companies.find(x => x.id === state.companyId);
  if (state.page === 'chat') { renderChatGPTStyleLayout(c); return; }

  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  document.getElementById('app').innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <div>
          <div class="brand" translate="no">
            <div class="logo">${PULSE_ICON(16)}</div>
            <div><strong style="font-size:13px;" translate="no">APNA BUSINESS</strong><br><small style="font-size:10px; color:var(--muted);">${t('brandSub')}</small></div>
          </div>
          <div style="margin:12px 0 8px 0; display:flex; flex-direction:column; gap:6px;">
            <button class="btn primary full" id="top-create-company" style="font-size:12px; padding:6px;">${t('createCompanyBtn')}</button>
          </div>
          ${state.companies.length ? companySelect() : ''}
          <nav style="display:flex; flex-direction:column; gap:2px; margin-top:12px; max-height:calc(100vh - 280px); overflow-y:auto;">
            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:4px; letter-spacing:.05em;">${t('mainMenu')}</div>
            <button class="btn full" data-page="dashboard" style="text-align:left; border:none; ${state.page==='dashboard'?'background:rgba(255,255,255,0.1);':''}">${t('dashboard')}</button>
            <button class="btn full" data-page="chat" style="text-align:left; border:none; ${state.page==='chat'?'background:rgba(255,255,255,0.1);':''}">${t('aiChat')}</button>
            
            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:10px; letter-spacing:.05em;">${t('vouchersBilling')}</div>
            <button class="btn full" data-page="vouchers" style="text-align:left; border:none; ${state.page==='vouchers'?'background:rgba(255,255,255,0.1);':''}">${t('vouchersList')}</button>
            <button class="btn full" data-page="invoices" style="text-align:left; border:none; ${state.page==='invoices'?'background:rgba(255,255,255,0.1);':''}">${t('salesPurchases')}</button>

            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:10px; letter-spacing:.05em;">${t('accountsSheet')}</div>
            <button class="btn full" data-page="balance-sheet" style="text-align:left; border:none; ${state.page==='balance-sheet'?'background:rgba(255,255,255,0.1);':''}">${t('balanceSheet')}</button>
            <button class="btn full" data-page="reports" style="text-align:left; border:none; ${state.page==='reports'?'background:rgba(255,255,255,0.1);':''}">${t('profitLoss')}</button>

            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:10px; letter-spacing:.05em;">${t('inventoryStock')}</div>
            <button class="btn full" data-page="products" style="text-align:left; border:none; ${state.page==='products'?'background:rgba(255,255,255,0.1);':''}">${t('productsInv')}</button>
            <button class="btn full" data-page="contacts" style="text-align:left; border:none; ${state.page==='contacts'?'background:rgba(255,255,255,0.1);':''}">${t('contactsList')}</button>

            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:10px; letter-spacing:.05em;">${t('gstTax')}</div>
            <button class="btn full" data-page="gst" style="text-align:left; border:none; ${state.page==='gst'?'background:rgba(255,255,255,0.1);':''}">${t('gstBreakdown')}</button>

            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-top:10px; letter-spacing:.05em;">${t('companyMgmt')}</div>
            <button class="btn full" data-page="settings" style="text-align:left; border:none; ${state.page==='settings'?'background:rgba(255,255,255,0.1);':''}">${t('companyAlter')}</button>
          </nav>
        </div>
        <div style="border-top:1px solid var(--border); padding-top:10px;">
          <div id="sidebar-user-profile" style="display:flex; align-items:center; gap:10px; padding:6px; border-radius:8px; cursor:pointer;">
            <div style="background:var(--primary); color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${userInitial}</div>
            <div style="overflow:hidden; flex:1;">
              <div style="font-weight:600; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div>
              <div style="font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userEmail)}</div>
            </div>
            <div>⚙️</div>
          </div>
        </div>
      </aside>
      <main>
        <header class="topbar">
          <div><h2>${c?esc(c.name):'Select Business'}</h2><small style="color:var(--muted);">${c?`${esc(c.business_state||'')} · GST: ${esc(c.gst_type||'')}`:''}</small></div>
          <div>${state.user?esc(state.user.email):''}</div>
        </header>
        <div id="content" class="content"></div>
      </main>
    </div>`;

  document.getElementById('company-select')?.addEventListener('change', e => { state.companyId = e.target.value; state.page = 'dashboard'; render(); });
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.page = b.dataset.page; renderPage(); });
  document.getElementById('top-create-company')?.addEventListener('click', createCompanyForm);
  document.getElementById('sidebar-user-profile')?.addEventListener('click', e => openGeminiStyleAccountPopup(e.currentTarget));
}

function render(){
  if(!state.user){ authView(); return; }
  document.body.classList.toggle('light', state.theme === 'light');
  layout();
  renderPage();
}

async function renderPage(){
  if(!state.companyId){ createCompanyForm(); return; }
  layout();
  const p = state.page;
  if(p === 'chat') return;
  try{
    if(p === 'dashboard') await dashboard(); 
    else if(p === 'vouchers') await vouchersPage();
    else if(p === 'balance-sheet') await balanceSheetPage();
    else if(p === 'gst') await gstReportPage();
    else if(p === 'contacts') await contacts(); 
    else if(p === 'products') await products(); 
    else if(p === 'invoices') await invoices(); 
    else if(p === 'reports') await reports(); 
    else await settings();
  }catch(e){ showError(e.message); }
}

function renderChatGPTStyleLayout(c) {
  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  document.getElementById('app').innerHTML = `
    <div style="display:flex; height:100vh; width:100vw; background:var(--bg); position:fixed; top:0; left:0;">
      <div style="width:260px; background:var(--panel-bg); border-right:1px solid var(--border); padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="back-to-dash" class="btn full" style="text-align:left; border:none; background:rgba(255,255,255,0.05);">🏠 Dashboard & ERP</button>
          <button class="btn primary full" style="text-align:left;">+ New chat</button>
          <div style="margin-top:10px; font-size:11px; color:var(--muted); text-transform:uppercase;">AI Accountant</div>
          <a href="#" style="color:var(--text); text-decoration:none; padding:8px; border-radius:6px; background:rgba(255,255,255,0.08); font-size:13px;">📊 Active Chat Dashboard</a>
        </div>
        <div id="ai-user-profile" style="display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; cursor:pointer; border-top:1px solid var(--border);">
          <div style="background:var(--primary); color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${userInitial}</div>
          <div style="overflow:hidden; flex:1;">
            <div style="font-weight:600; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div>
            <div style="font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userEmail)}</div>
          </div>
          <div>⚙️</div>
        </div>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center;">
        <div style="margin-bottom:12px;">${PULSE_ICON(36)}</div>
        <h1 style="font-size:32px; margin-bottom:6px; font-weight:600;">How can I help you?</h1>
        <p style="color:var(--muted); margin-bottom:20px; font-size:14px;">${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p>
        <div style="width:100%; max-width:650px; background:var(--panel-bg); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; gap:10px;">
          <input type="text" placeholder="Ask about your business..." style="flex:1; background:transparent; border:none; color:var(--text); outline:none; font-size:14px;">
          <button class="btn primary" style="border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;">➔</button>
        </div>
      </div>
    </div>`;

  document.getElementById('back-to-dash').onclick = () => { state.page = 'dashboard'; render(); };
  document.getElementById('ai-user-profile').onclick = e => openGeminiStyleAccountPopup(e.currentTarget);
}

async function dashboard(){
  const d = await api(`/api/companies/${state.companyId}/dashboard`);
  document.getElementById('content').innerHTML = `
    <div class="cards">
      ${[['Sales',d.sales_paise],['Purchases',d.purchases_paise],['Profit',d.net_profit_paise],['Cash',d.cash_paise],['Bank',d.bank_paise],['Inventory',d.stock_value_paise]].map(x=>`<div class="card"><div class="k-label">${x[0]}</div><div class="k-value">${money(x[1])}</div></div>`).join('')}
    </div>
    <section class="panel">
      <div class="panel-head"><h3>Dashboard Overview</h3></div>
      <p style="color:var(--muted); font-size:14px;">${t('welcomeMsg')}</p>
    </section>`;
}

async function vouchersPage(){
  const rows = await api(`/api/companies/${state.companyId}/vouchers`);
  document.getElementById('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Vouchers</h3></div>${table(rows,[['date','Date'],['kind','Type'],['reference','Ref'],['memo','Memo']])}</section>`;
}

async function balanceSheetPage(){
  const bs = await api(`/api/companies/${state.companyId}/reports/balance-sheet`);
  document.getElementById('content').innerHTML = `<section class="panel"><h3>Balance Sheet</h3><p>Difference: <strong>${money(bs.difference_paise)}</strong></p></section>`;
}

async function gstReportPage(){
  const gst = await api(`/api/companies/${state.companyId}/reports/gst`);
  document.getElementById('content').innerHTML = `<section class="panel"><h3>GST Breakdown</h3><p>Output GST: <strong>${money(gst.sales.cgst_paise+gst.sales.sgst_paise+gst.sales.igst_paise)}</strong></p></section>`;
}

async function contacts(){
  const rows = await api(`/api/companies/${state.companyId}/contacts`);
  document.getElementById('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Contacts</h3><button class="btn primary" id="add-contact">+ Add</button></div>${table(rows,[['kind','Type'],['name','Name'],['gstin','GSTIN'],['phone','Phone']])}</section>`;
  document.getElementById('add-contact').onclick = () => contactForm();
}

async function products(){
  const rows = await api(`/api/companies/${state.companyId}/products`);
  document.getElementById('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Products</h3><button class="btn primary" id="add-product">+ Add</button></div>${table(rows,[['sku','SKU'],['name','Product'],['sale_price_paise','Price'],['stock_qty','Stock']])}</section>`;
  document.getElementById('add-product').onclick = () => productForm();
}

function table(rows, cols){
  if(!rows?.length) return '<div style="color:var(--muted); padding:10px;">No records found.</div>';
  return `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0].includes('_paise')?money(r[c[0]]):esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

async function invoices(){
  const rows = await api(`/api/companies/${state.companyId}/invoices`);
  document.getElementById('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Invoices</h3></div>${table(rows,[['number','Invoice'],['kind','Type'],['date','Date'],['contact_name','Party'],['total_paise','Total']])}</section>`;
}

async function reports(){
  const pl = await api(`/api/companies/${state.companyId}/reports/profit-loss`);
  document.getElementById('content').innerHTML = `<section class="panel"><h3>Profit & Loss</h3><p>Net profit: <strong>${money(pl.net_profit_paise)}</strong></p></section>`;
}

async function settings(){
  const c = await api(`/api/companies/${state.companyId}`);
  document.getElementById('content').innerHTML = `<section class="panel"><h3>Company Settings</h3><form id="tax-form"><label style="margin-bottom:10px;display:block;">Name<input name="name" value="${esc(c.name)}" style="width:100%;padding:8px;margin-top:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);border-radius:6px;"></label><button class="btn primary">Save Changes</button></form></section>`;
  document.getElementById('tax-form').onsubmit = async e => {
    e.preventDefault();
    try { await api(`/api/companies/${state.companyId}`,{method:'PATCH',body:Object.fromEntries(new FormData(e.currentTarget))}); toast('Saved!'); render(); } catch(err){ toast(err.message); }
  };
}

function modal(title, html){
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="modal"><div class="modal-head"><h3>${title}</h3><button id="close">×</button></div>${html}</section>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#close').onclick = () => wrap.remove();
  return wrap;
}

function createCompanyForm(){
  const m = modal('Create Business', `<form id="company-form"><label style="margin-bottom:10px;display:block;">Name<input name="name" required style="width:100%;padding:8px;margin-top:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);border-radius:6px;"></label><button class="btn primary full">Create</button></form>`);
  m.querySelector('#company-form').onsubmit = async e => {
    e.preventDefault();
    try {
      const created = await api('/api/companies',{method:'POST',body:Object.fromEntries(new FormData(e.currentTarget))});
      m.remove(); await refreshSession(); state.companyId = created.id; state.page = 'dashboard'; render();
    } catch(err){ toast(err.message); }
  };
}

function contactForm(){
  const m = modal('Add Contact', `<form id="f"><label style="margin-bottom:10px;display:block;">Name<input name="name" required style="width:100%;padding:8px;margin-top:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);border-radius:6px;"></label><button class="btn primary full">Save</button></form>`);
  m.querySelector('#f').onsubmit = async e => {
    e.preventDefault();
    try { await api(`/api/companies/${state.companyId}/contacts`,{method:'POST',body:Object.fromEntries(new FormData(e.currentTarget))}); m.remove(); contacts(); } catch(err){ toast(err.message); }
  };
}

function productForm(){
  const m = modal('Add Product', `<form id="f"><label style="margin-bottom:10px;display:block;">Name<input name="name" required style="width:100%;padding:8px;margin-top:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text);border-radius:6px;"></label><button class="btn primary full">Save</button></form>`);
  m.querySelector('#f').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/companies/${state.companyId}/products`,{method:'POST',body:{sku:'SKU'+Date.now(),name:f.get('name'),gst_bps:1800,sale_price_paise:10000,cost_price_paise:5000,reorder_level:5}});
      m.remove(); products();
    } catch(err){ toast(err.message); }
  };
}

(async()=>{ if(await refreshSession()) render(); else authView('login'); })();
</script>
</body>
</html>
