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
function showError(message){$('app').insertAdjacentHTML('afterbegin',`<div class="banner">${esc(message)}</div>`);}

async function api(path, options = {}) {
  const opts = {
    ...options,
    credentials: 'include',
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
  $('app').innerHTML = `<main class="auth-shell"><section class="auth-card" translate="no">
    <div style="display:flex; justify-content:center; margin-bottom:12px;"><div class="logo">${PULSE_ICON(18)}</div></div>
    <h1 translate="no">APNA BUSINESS</h1>
    <div class="seg"><button class="${mode==='login'?'active':''}" id="login-tab">${state.lang==='hi'?'लॉगिन':'Login'}</button><button class="${mode==='register'?'active':''}" id="register-tab">${state.lang==='hi'?'अकाउंट बनाएं':'Create account'}</button></div>
    <form id="auth-form"><div id="name-wrap" class="${mode==='register'?'':'hidden'}"><label>${state.lang==='hi'?'नाम':'Name'}<input name="name" placeholder="${state.lang==='hi'?'आपका नाम':'Your name'}"></label></div>
    <label>${state.lang==='hi'?'ईमेल':'Email'}<input name="email" type="email" required placeholder="you@example.com"></label>
    <label>${state.lang==='hi'?'पासवर्ड':'Password'}<input name="password" type="password" required minlength="6" placeholder="${state.lang==='hi'?'कम से कम 6 अक्षर':'At least 6 characters'}"></label>
    <button class="btn primary full" type="submit" style="margin-top:8px;">${mode==='login'?(state.lang==='hi'?'लॉगिन':'Login'):(state.lang==='hi'?'अकाउंट बनाएं':'Create account')}</button>
    <div id="auth-error" class="error"></div></form>
  </section></main>`;
  
  $('login-tab').onclick = () => authView('login');
  $('register-tab').onclick = () => authView('register');
  
  $('auth-form').onsubmit = async e => {
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
      $('auth-error').textContent = err.message;
    }
  };
}

function companySelect(){ return `<select id="company-select">${state.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`; }

function openSettingsModal(){
  const m = modal(state.lang==='hi' ? 'सेटिंग्स (Settings)' : 'Settings', `
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:10px; max-height: 70vh; overflow-y: auto; padding-right:4px; color:var(--text);">
      <div style="font-size:13px; color:var(--muted); font-weight:600; text-transform:uppercase;">${state.lang==='hi'?'प्राथमिकताएं (Preferences)':'Preferences'}</div>
      
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

      <button class="btn primary" id="save-settings-btn" style="margin-top:10px; padding:10px; border-radius:8px; cursor:pointer;">${state.lang==='hi'?'सेटिंग्स सहेजें':'Save Settings'}</button>
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
    position: fixed; bottom: 70px; left: 12px; width: 320px;
    background: #1e1e1e; color: #f1f3f4; border: 1px solid #3c4043;
    border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 9999; padding: 16px;
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
      if(action === 'logout') { $('logout').click(); }
      else if(action === 'settings') { openSettingsModal(); }
    };
  });
  popup.querySelector('#close-popup-x').onclick = () => popup.remove();
}

function layout(){
  const c = state.companies.find(x => x.id === state.companyId);
  if (state.page === 'chat') { renderChatGPTStyleLayout(c); return; }

  const userName = state.user?.name || 'Prince Kumar';
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  $('app').innerHTML = `<div class="workspace"><aside class="sidebar"><div class="brand" translate="no"><div class="logo small-logo">${PULSE_ICON(22)}</div><div><strong translate="no">APNA BUSINESS</strong><small>${t('brandSub')}</small></div></div>
  
  <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
    <button class="btn primary full" id="top-create-company" style="font-size:13px;padding:8px;">${t('createCompanyBtn')}</button>
    <button class="btn full" id="top-alter-company" style="font-size:13px;padding:8px;background:rgba(255,255,255,0.08);">${t('alterCompanyBtn')}</button>
  </div>

  ${state.companies.length ? companySelect() : '<p class="muted small">No business yet</p>'}

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
  <main><header class="topbar"><div><h2>${c?esc(c.name):'Create your business'}</h2><p>${c?`${esc(c.business_state||'')} · GST: ${esc(c.gst_type||'Tax setup required')}`:'One platform for GST and Non-GST businesses'}</p></div><div class="status" id="logout" style="cursor:pointer;" title="Logout">${state.user?esc(state.user.email):''}</div></header><div id="content" class="content"></div></main></div>`;
  
  $('company-select')?.addEventListener('change', e => { state.companyId = e.target.value; state.page = 'dashboard'; render(); });
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.page = b.dataset.page; renderPage(); });
  $('top-create-company')?.addEventListener('click', createCompanyForm);
  $('top-alter-company')?.addEventListener('click', () => { state.page = 'settings'; renderPage(); });
  $('sidebar-user-profile')?.addEventListener('click', e => openGeminiStyleAccountPopup(e.currentTarget));
  $('logout')?.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } finally {
      state.user = null; state.csrf = null; state.companies = []; state.companyId = null; state.chats = {}; authView('login');
    }
  });
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
  if(p === 'chat') { renderChatGPTStyleLayout(state.companies.find(x => x.id === state.companyId)); return; }
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

let pendingFile = null;
let pendingFileType = 'IMAGE';
let recognition = null;
let listening = false;

function chatLog(){ return state.chats[state.companyId] || (state.chats[state.companyId] = []); }

function chatHistory(msgs){
  return msgs.slice(0, -2).filter(m => m.text && !m.typing && !m.error).slice(-6)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: String(m.text).slice(0, 500) }));
}

function draftCard(m, i){
  const d = m.draft;
  const lines = (d.preview || []).map(x => `<div class="d-line">${esc(x)}</div>`).join('');
  let foot = '';
  if(d.status === 'PENDING') foot = `<div class="d-actions"><button class="btn primary" data-i="${i}" data-act="approve">Confirm</button><button class="btn" data-i="${i}" data-act="reject">Reject</button></div>`;
  else if(d.status === 'POSTED') foot = '<div class="d-done">✓ Entry ledger mein post ho gayi</div>';
  else foot = '<div class="d-done">✕ Draft reject kiya, kuch post nahi hua</div>';
  return `<div class="draft-card"><div class="d-title">Draft entry · abhi post nahi hui</div>${lines}${foot}</div>`;
}

function renderChatLog(){
  const log = $('chat-log'); if(!log) return;
  const msgs = chatLog();
  if(!msgs.length){
    log.innerHTML = `<div class="chat-hello" style="text-align:center; padding:10px;"><div class="chat-avatar">${PULSE_ICON(26)}</div><h3 style="font-size: 38px; font-weight: 600; margin-top: 12px; letter-spacing: -0.5px;">How can I help you?</h3><p style="font-size: 16px; color: var(--muted); margin-top: 4px;">${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p></div>`;
  } else {
    log.innerHTML = msgs.map((m, i) => m.role === 'user'
      ? `<div class="msg user" style="margin:8px 0; text-align:right;"><div class="bubble" style="display:inline-block; background:var(--primary); padding:8px 12px; border-radius:12px;">${m.fileUrl ? fileBubble(m) : ''}${esc(m.text)}</div></div>`
      : `<div class="msg bot" style="margin:8px 0; text-align:left;"><div class="bubble ${m.error?'err':''} ${m.typing?'typing':''}" style="display:inline-block; background:rgba(255,255,255,0.08); padding:8px 12px; border-radius:12px;">${esc(m.text)}${m.draft ? draftCard(m, i) : ''}</div></div>`).join('');
  }
  log.scrollTop = log.scrollHeight;
  log.querySelectorAll('[data-act]').forEach(b => b.onclick = () => decideDraft(msgs[Number(b.dataset.i)], b.dataset.act));
  const send = $('chat-send'); if(send) send.disabled = state.chatBusy;
}

function fileBubble(m){
  if(m.fileType === 'IMAGE') return `<img class="chat-photo" src="${m.fileUrl}" alt="Photo" style="max-width:200px; border-radius:8px; display:block; margin-bottom:6px;">`;
  return `<a class="chat-file" href="${m.fileUrl}" target="_blank" rel="noopener">📄 ${esc(m.fileName||'Document')}</a>`;
}

async function sendChat(raw){
  const textValue = String(raw || '').trim();
  if(!textValue || state.chatBusy) return;
  const cid = state.companyId, msgs = chatLog();
  msgs.push({ role: 'user', text: textValue });
  const pending = { role: 'bot', text: 'Soch raha hoon…', typing: true };
  msgs.push(pending); state.chatBusy = true; renderChatLog();
  try{
    const history = chatHistory(msgs);
    const r = await api(`/api/companies/${cid}/chat`, { method: 'POST', body: { message: textValue, history } });
    pending.text = r.reply || 'Samajh nahi aaya, dobara likhiye.'; pending.typing = false;
    if(r.mode === 'DRAFT_CREATED' && r.draft_id) pending.draft = { id: r.draft_id, preview: r.preview || [], status: 'PENDING' };
  }catch(err){ pending.text = err.message; pending.typing = false; pending.error = true; }
  finally{ state.chatBusy = false; if(state.page === 'chat' && state.companyId === cid) renderChatLog(); }
}

function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('File padhi nahi ja saki'));
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file, type){
  const cid = state.companyId;
  const content_base64 = await fileToBase64(file);
  const kind = type === 'IMAGE' ? 'Receipt' : 'Document';
  const r = await api(`/api/companies/${cid}/documents`, { method: 'POST', body: { name: file.name, kind, content_base64 } });
  return { id: r.id, url: URL.createObjectURL(file), name: file.name };
}

async function sendChatWithFile(text, file, type){
  const cid = state.companyId, msgs = chatLog();
  msgs.push({ role: 'user', text: text || 'File bheji', fileUrl: file ? URL.createObjectURL(file) : null, fileName: file?.name, fileType: type });
  const pending = { role: 'bot', text: 'File check kar raha hoon…', typing: true };
  msgs.push(pending); state.chatBusy = true; renderChatLog();
  try{
    let fileUrl = null, documentId = null;
    if(file){
      const up = await uploadFile(file, type);
      fileUrl = up.url; documentId = up.id;
    }
    const history = chatHistory(msgs);
    const res = await api(`/api/companies/${cid}/chat`, { method: 'POST', body: { message: text || 'File attach ki hai', file_url: fileUrl, file_type: type, document_id: documentId, history } });
    pending.text = res.reply || 'File mil gayi. Amount ya party ka naam likh do, phir draft banega.';
    pending.typing = false;
    if(res.mode === 'DRAFT_CREATED' && res.draft_id){
      pending.draft = { id: res.draft_id, preview: res.preview || [], status: 'PENDING' };
    }
  }catch(err){
    pending.text = err.message; pending.typing = false; pending.error = true;
  }finally{
    state.chatBusy = false;
    if(state.page === 'chat' && state.companyId === cid) renderChatLog();
  }
}

async function decideDraft(msg, act){
  if(!msg?.draft || msg.draft.status !== 'PENDING' || state.chatBusy) return;
  const cid = state.companyId; state.chatBusy = true; renderChatLog();
  try{
    await api(`/api/companies/${cid}/drafts/${msg.draft.id}/${act}`, { method: 'POST', body: {} });
    msg.draft.status = act === 'approve' ? 'POSTED' : 'REJECTED';
    toast(act === 'approve' ? 'Entry post ho gayi' : 'Draft reject kiya');
  }catch(err){ toast(err.message); }
  finally{ state.chatBusy = false; if(state.page === 'chat' && state.companyId === cid) renderChatLog(); }
}

function startVoice(input){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ toast('Mic is browser mein support nahi karta. Chrome try karo.'); return; }
  if(listening){ recognition?.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = state.lang === 'en' ? 'en-IN' : 'hi-IN';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => { listening = true; $('chat-mic')?.classList.add('listening'); toast('Boliye…'); };
  recognition.onresult = e => {
    let text = '';
    for(let i = 0; i < e.results.length; i++){ text += e.results[i][0].transcript; }
    input.value = text;
  };
  recognition.onerror = e => {
    listening = false; $('chat-mic')?.classList.remove('listening');
    if(e.error === 'not-allowed') toast('Mic permission Allow karo');
    else if(e.error === 'no-speech') toast('Awaaz sunai nahi di');
    else toast('Mic error: ' + e.error);
  };
  recognition.onend = () => { listening = false; $('chat-mic')?.classList.remove('listening'); };
  recognition.start();
}

function renderChatGPTStyleLayout(c) {
  const sec = state.aiSection;
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
            <input type="file" id="chat-photo" accept="image/*" style="display:none;">
            <input type="file" id="chat-document" accept=".pdf,.doc,.docx,.txt" style="display:none;">
            <button type="button" id="chat-plus" style="background:none; border:none; color:var(--text); cursor:pointer; font-size:18px;" title="Attach">+</button>
            <textarea id="chat-input" rows="1" maxlength="1500" placeholder="Ask" style="flex:1; background:none; border:none; color:var(--text); resize:none; outline:none; font-size:15px; max-height:120px;"></textarea>
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
  const userEmail = state.user?.email || 'kumarprince49274@gmail.com';
  const userInitial = userName[0].toUpperCase();

  $('app').innerHTML = `
    <div style="display:flex; height:100vh; width:100vw; background:var(--bg); overflow:hidden; position:fixed; top:0; left:0; margin:0; padding:0; box-sizing:border-box;">
      <div style="width:260px; min-width:260px; border-right:1px solid var(--border); padding:16px 12px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.4); height:100vh; box-sizing:border-box; overflow-y:auto;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <div style="background:var(--primary); width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff;">🏠</div>
          <span style="font-weight:bold; font-size:14px; color:var(--text);">APNA BUSINESS</span>
        </div>

        <button id="new-chat-btn" style="display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; background:var(--text); color:var(--bg); border:none; width:100%;">
          <span>+ New chat</span>
        </button>

        <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:600; letter-spacing:0.05em; padding:4px 8px;">Workspace</div>
          <button id="ai-nav-home" style="background:${state.aiSection==='home'?'rgba(255,255,255,0.15)':'none'}; border:none; color:var(--text); text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px;">💬 Projects / Home</button>
          <button id="ai-nav-schedules" style="background:${state.aiSection==='schedules'?'rgba(255,255,255,0.15)':'none'}; border:none; color:var(--text); text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px;">📅 Schedules</button>
          <button id="ai-nav-connectors" style="background:${state.aiSection==='connectors'?'rgba(255,255,255,0.15)':'none'}; border:none; color:var(--text); text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px;">🔗 Connectors</button>
          <button id="ai-nav-images" style="background:${state.aiSection==='images'?'rgba(255,255,255,0.15)':'none'}; border:none; color:var(--text); text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px;">🖼️ Images & Files</button>
          <button id="ai-nav-customize" style="background:${state.aiSection==='customize'?'rgba(255,255,255,0.15)':'none'}; border:none; color:var(--text); text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px;">⚙️ Customize</button>
        </div>

        <div style="margin-top:auto; display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border); padding-top:12px;">
          <button id="back-to-dashboard-btn" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:8px; text-align:left;">📊 Dashboard & ERP</button>
          
          <div id="ai-sidebar-user-profile" style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; background:rgba(255,255,255,0.04);">
            <div style="background:var(--primary); color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px;">${userInitial}</div>
            <div style="overflow:hidden; flex:1;">
              <div style="font-weight:600; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(userName)}</div>
              <div style="font-size:11px; color:#4dabf7; font-weight:500;">Pro</div>
            </div>
          </div>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; position:relative; overflow:hidden; background:var(--bg); height:100vh;">
        <header style="padding:12px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; width:100%; box-sizing:border-box;">
          <div><h2 style="font-size:16px; margin:0; color:var(--text);">${c?esc(c.name):'Create your business'}</h2></div>
          <div style="font-size:13px; color:var(--muted);">${state.user?esc(state.user.email):''}</div>
        </header>
        <div style="flex:1; display:flex; flex-direction:column; width:100%; height:calc(100vh - 53px); overflow:hidden; box-sizing:border-box; justify-content:center; align-items:center;">
          ${mainAreaContent}
        </div>
      </div>
    </div>`;

  $('back-to-dashboard-btn').onclick = () => { state.page = 'dashboard'; render(); };
  $('new-chat-btn').onclick = () => { state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('ai-nav-home').onclick = () => { state.aiSection = 'home'; renderChatGPTStyleLayout(c); };
  $('ai-nav-schedules').onclick = () => { state.aiSection = 'schedules'; renderChatGPTStyleLayout(c); };
  $('ai-nav-connectors').onclick = () => { state.aiSection = 'connectors'; renderChatGPTStyleLayout(c); };
  $('ai-nav-images').onclick = () => { state.aiSection = 'images'; renderChatGPTStyleLayout(c); };
  $('ai-nav-customize').onclick = () => { state.aiSection = 'customize'; renderChatGPTStyleLayout(c); };
  $('ai-sidebar-user-profile').onclick = e => openGeminiStyleAccountPopup(e.currentTarget);

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
      input.value = ''; pendingFile = null; preview.classList.add('hidden');
      if(f) sendChatWithFile(text, f, t); else sendChat(text);
    }
  });
  
  $('chat-send').onclick = () => {
    const text = input.value.trim();
    if(!text && !pendingFile) return;
    const f = pendingFile, t = pendingFileType;
    input.value = ''; pendingFile = null; preview.classList.add('hidden');
    if(f) sendChatWithFile(text, f, t); else sendChat(text);
  };

  plus.onclick = () => {
    const old = document.getElementById('attach-menu');
    if(old){ old.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'attach-menu'; menu.id = 'attach-menu';
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
        const kind = b.dataset.kind; menu.remove();
        if(kind === 'photo') photoInput.click(); else docInput.click();
      };
    });
  };

  photoInput.onchange = () => {
    const file = photoInput.files[0]; if(!file) return;
    pendingFile = file; pendingFileType = 'IMAGE';
    img.src = URL.createObjectURL(file); img.classList.remove('hidden');
    doc.classList.add('hidden'); preview.classList.add('hidden');
  };

  docInput.onchange = () => {
    const file = docInput.files[0]; if(!file) return;
    pendingFile = file; pendingFileType = 'DOCUMENT';
    fileName.textContent = file.name;
    doc.classList.add('hidden'); img.classList.add('hidden'); preview.classList.add('hidden');
  };

  $('file-remove').onclick = () => {
    pendingFile = null; photoInput.value = ''; docInput.value = '';
    preview.classList.add('hidden');
  };

  mic.onclick = () => startVoice(input);

  renderChatLog();
  input.focus();
}

async function dashboard(){
  const d = await api(`/api/companies/${state.companyId}/dashboard`);
  $('content').innerHTML = `<div class="cards">
    ${[['Sales',d.sales_paise],['Purchases',d.purchases_paise],['Profit',d.net_profit_paise],['Cash',d.cash_paise],['Bank',d.bank_paise],['Inventory',d.stock_value_paise]].map(x=>`<div class="card"><div class="k-label">${x[0]}</div><div class="k-value">${money(x[1])}</div></div>`).join('')}
  </div>
  <section class="panel">
    <div class="panel-head"><h3>Dashboard Overview</h3></div>
    <p class="note">Welcome to Apna Business. Use the sidebar sections to access Vouchers, Balance Sheet, Inventory, and GST Breakdown.</p>
  </section>`;
}

async function vouchersPage(){
  const rows = await api(`/api/companies/${state.companyId}/vouchers`);
  $('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Vouchers (Daybook / Entries)</h3></div>${table(rows,[['date','Date'],['kind','Type'],['reference','Ref'],['memo','Memo']])}</section>`;
}

async function balanceSheetPage(){
  const bs = await api(`/api/companies/${state.companyId}/reports/balance-sheet`);
  $('content').innerHTML = `<section class="panel"><h3>Balance Sheet</h3><p>Difference: <strong>${money(bs.difference_paise)}</strong></p><p class="muted small">Assets: ${money(bs.total_assets_paise)} | Liabilities: ${money(bs.total_liabilities_paise)} | Equity: ${money(bs.total_equity_paise)}</p></section>`;
}

async function gstReportPage(){
  const gst = await api(`/api/companies/${state.companyId}/reports/gst`);
  $('content').innerHTML = `<section class="panel"><h3>GST Breakdown & Reports</h3><p>Output GST: <strong>${money(gst.sales.cgst_paise+gst.sales.sgst_paise+gst.sales.igst_paise)}</strong></p><p>Input GST: <strong>${money(gst.purchases.cgst_paise+gst.purchases.sgst_paise+gst.purchases.igst_paise)}</strong></p><p class="muted small">${esc(gst.warning)}</p></section>`;
}

async function contacts(){
  const rows = await api(`/api/companies/${state.companyId}/contacts`);
  $('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Customers & Suppliers</h3><button class="btn primary" id="add-contact">+ Add contact</button></div>${table(rows,[['kind','Type'],['name','Name'],['state_code','State'],['gstin','GSTIN'],['phone','Phone']])}</section>`;
  $('add-contact').onclick = () => contactForm();
}

async function products(){
  const rows = await api(`/api/companies/${state.companyId}/products`);
  $('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Products & Inventory</h3><button class="btn primary" id="add-product">+ Add product</button></div>${table(rows,[['sku','SKU'],['name','Product'],['gst_bps','GST %'],['sale_price_paise','Sale price'],['cost_price_paise','Cost'],['stock_qty','Stock']])}</section>`;
  $('add-product').onclick = () => productForm();
}

function table(rows, cols){
  if(!rows?.length) return '<div class="empty">No records yet.</div>';
  return `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0].includes('_paise')?money(r[c[0]]):c[0]==='gst_bps'?`${Number(r[c[0]]||0)/100}%`:esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

async function invoices(){
  const rows = await api(`/api/companies/${state.companyId}/invoices`);
  $('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Invoices (Sales / Purchases)</h3><div class="actions"><button class="btn primary" id="sale">+ Sales invoice</button><button class="btn" id="purchase">+ Purchase invoice</button></div></div>${table(rows,[['number','Invoice'],['kind','Type'],['date','Date'],['contact_name','Party'],['subtotal_paise','Taxable'],['gst_paise','GST'],['total_paise','Total'],['outstanding_paise','Outstanding']])}</section>`;
  $('sale').onclick = () => invoiceForm('SALE');
  $('purchase').onclick = () => invoiceForm('PURCHASE');
}

async function reports(){
  const [pl, bs, stock, gst] = await Promise.all([
    api(`/api/companies/${state.companyId}/reports/profit-loss`),
    api(`/api/companies/${state.companyId}/reports/balance-sheet`),
    api(`/api/companies/${state.companyId}/reports/stock`),
    api(`/api/companies/${state.companyId}/reports/gst`)
  ]);
  $('content').innerHTML = `<section class="panel"><h3>Profit & Loss</h3><p>Revenue: <strong>${money(pl.revenue_paise)}</strong></p><p>Net profit: <strong>${money(pl.net_profit_paise)}</strong></p></section><section class="panel"><h3>Stock Summary</h3>${table(stock,[['sku','SKU'],['name','Product'],['qty','Qty'],['stock_value_paise','Stock value']])}</section>`;
}

async function settings(){
  const c = await api(`/api/companies/${state.companyId}`);
  $('content').innerHTML = `<section class="panel"><div class="panel-head"><h3>Company Alter / Tax Setup</h3></div><form id="tax-form"><label>Business name<input name="name" value="${esc(c.name)}" required></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option ${x===c.business_type?'selected':''}>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${esc(name)}" ${name===c.business_state?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type"><option value="UNREGISTERED" ${c.gst_type==='UNREGISTERED'?'selected':''}>I don't have GST registration</option><option value="REGULAR" ${c.gst_type==='REGULAR'?'selected':''}>GST Regular</option><option value="COMPOSITION" ${c.gst_type==='COMPOSITION'?'selected':''}>GST Composition</option><option value="OTHER" ${c.gst_type==='OTHER'?'selected':''}>Other GST registration</option></select></label><label>GSTIN<input name="gstin" value="${esc(c.gstin||'')}" placeholder="Required for registered types"></label><button class="btn primary" type="submit">Save Changes (Alter)</button><p class="note">Alter company details here. Changes are saved to company settings and audit logs.</p></form></section>`;
  $('tax-form').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api(`/api/companies/${state.companyId}`,{method:'PATCH',body:Object.fromEntries(f)}); toast('Company details updated successfully'); await refreshSession(); render(); } catch(err){ toast(err.message); }
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
  const m = modal('Create Your Business', `<form id="company-form"><label>Business name<input name="name" required placeholder="APNA KIRANA STORE"></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${name}" ${code==='09'?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type" id="new-gst"><option value="UNREGISTERED">I don't have GST registration</option><option value="REGULAR">GST Regular</option><option value="COMPOSITION">GST Composition</option><option value="OTHER">Other GST registration</option></select></label><label id="new-gstin-wrap" class="hidden">GSTIN<input name="gstin" placeholder="15-character GSTIN"></label><p id="new-gst-help" class="note">GSTIN is not required for an unregistered business.</p><label>Address<input name="address"></label><button class="btn primary" type="submit">Create business</button></form>`);
  const sel = m.querySelector('#new-gst'), wrap = m.querySelector('#new-gstin-wrap'), help = m.querySelector('#new-gst-help');
  function update(){
    const reg = sel.value !== 'UNREGISTERED';
    wrap.classList.toggle('hidden', !reg);
    help.textContent = sel.value === 'REGULAR' ? 'GSTIN is required. Regular GST supports CGST + SGST or IGST.' : sel.value === 'COMPOSITION' ? 'GSTIN is required. Sales use composition-compatible treatment.' : sel.value === 'OTHER' ? 'GSTIN is required for this registration type; Regular GST is not assumed.' : 'GSTIN is not required for an unregistered business.';
  }
  sel.onchange = update; update();
  m.querySelector('#company-form').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const created = await api('/api/companies', { method: 'POST', body: Object.fromEntries(f) });
      m.remove(); await refreshSession(); state.companyId = created.id; state.page = 'dashboard'; render();
    } catch(err){ toast(err.message); }
  };
}

function contactForm(){
  const m = modal('Add contact', `<form id="f"><label>Type<select name="kind"><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option></select></label><label>Name<input name="name" required></label><label>State code<input name="state_code" placeholder="27"></label><label>GSTIN<input name="gstin"></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><button class="btn primary">Save contact</button></form>`);
  m.querySelector('#f').onsubmit = async e => {
    e.preventDefault();
    try { await api(`/api/companies/${state.companyId}/contacts`, { method: 'POST', body: Object.fromEntries(new FormData(e.currentTarget)) }); m.remove(); contacts(); } catch(err){ toast(err.message); }
  };
}

function productForm(){
  const m = modal('Add product', `<form id="f"><label>SKU<input name="sku" required></label><label>Product name<input name="name" required></label><label>HSN / SAC<input name="hsn"></label><label>GST rate %<input name="gst_rate" type="number" value="18" step="0.01" min="0"></label><label>Sale price ₹<input name="sale_rupees" type="number" value="100" step="0.01" min="0"></label><label>Purchase cost ₹<input name="cost_rupees" type="number" value="70" step="0.01" min="0"></label><label>Low-stock level<input name="reorder_level" type="number" value="5" min="0"></label><button class="btn primary">Save product</button></form>`);
  m.querySelector('#f').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/companies/${state.companyId}/products`, { method: 'POST', body: { sku: f.get('sku'), name: f.get('name'), hsn: f.get('hsn'), gst_bps: Math.round(Number(f.get('gst_rate')) * 100), sale_price_paise: Math.round(Number(f.get('sale_rupees')) * 100), cost_price_paise: Math.round(Number(f.get('cost_rupees')) * 100), reorder_level: Number(f.get('reorder_level')) } });
      m.remove(); products();
    } catch(err){ toast(err.message); }
  };
}

function invoiceForm(kind){}

(async () => {
  if (await refreshSession()) render();
  else authView('login');
})();
</script>
</body>
</html>
