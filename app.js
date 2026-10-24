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
  lang: (() => { try { return localStorage.getItem('apna_lang') || 'hi'; } catch { return 'hi'; } })(), 
  theme: (() => { try { return localStorage.getItem('apna_theme') || 'dark'; } catch { return 'dark'; } })() 
};

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
  if(!r.ok) throw new Error(data?.error||`Request failed (${r.status})`);
  return data;
}

async function refreshSession(){
  try{
    const me=await api('/api/auth/me');
    state.user=me.user; state.csrf=me.csrf;
    state.companies=await api('/api/companies');
    if(!state.companyId || !state.companies.some(c=>c.id===state.companyId)) state.companyId=state.companies[0]?.id||null;
    return true;
  }catch{ return false; }
}

function authView(mode='login'){
  $('app').innerHTML=`<main class="auth-shell"><section class="auth-card" translate="no">
    <div class="logo">${PULSE_ICON(26)}</div><h1 translate="no">APNA BUSINESS</h1>
    <div class="seg"><button class="${mode==='login'?'active':''}" id="login-tab">${state.lang==='hi'?'लॉगिन':'Login'}</button><button class="${mode==='register'?'active':''}" id="register-tab">${state.lang==='hi'?'अकाउंट बनाएं':'Create account'}</button></div>
    <form id="auth-form"><div id="name-wrap" class="${mode==='register'?'':'hidden'}"><label>${state.lang==='hi'?'नाम':'Name'}<input name="name" placeholder="${state.lang==='hi'?'आपका नाम':'Your name'}"></label></div>
    <label>${state.lang==='hi'?'ईमेल':'Email'}<input name="email" type="email" required placeholder="you@example.com"></label>
    <label>${state.lang==='hi'?'पासवर्ड':'Password'}<input name="password" type="password" required minlength="6" placeholder="${state.lang==='hi'?'कम से कम 6 अक्षर':'At least 6 characters'}"></label>
    <button class="btn primary full" type="submit">${mode==='login'?(state.lang==='hi'?'लॉगिन':'Login'):(state.lang==='hi'?'अकाउंट बनाएं':'Create account')}</button>
    
    <div style="display:flex;align-items:center;justify-content:center;margin:16px 0;color:var(--muted);font-size:13px;width:100%;">
      <hr style="flex:1;border:0;border-top:1px solid var(--border);margin:0;"> 
      <span style="padding:0 12px;font-weight:600;">OR</span> 
      <hr style="flex:1;border:0;border-top:1px solid var(--border);margin:0;">
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

  $('auth-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{
    if(mode==='register') await api('/api/auth/register',{method:'POST',body:{name:fd.get('name'),email:fd.get('email'),password:fd.get('password')}});
    await api('/api/auth/login',{method:'POST',body:{email:fd.get('email'),password:fd.get('password')}}).then(x=>{state.user=x.user;state.csrf=x.csrf;});
    state.companies=await api('/api/companies');state.companyId=state.companies[0]?.id||null;render();
  }catch(err){$('auth-error').textContent=err.message;}};
}

function companySelect(){return `<select id="company-select">${state.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===state.companyId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;}

function openSettingsModal(){
  const m = modal(state.lang==='hi' ? 'ऐप सेटिंग्स (App Settings)' : 'App Settings', `
    <div style="display:flex;flex-direction:column;gap:16px;margin-top:10px;">
      <label>${state.lang==='hi' ? 'भाषा चुनें (Language Selection)' : 'Select Language'}
        <select id="settings-lang-select" style="margin-top:6px;">
          <option value="hi" ${state.lang==='hi'?'selected':''}>हिंदी (Hindi)</option>
          <option value="en" ${state.lang==='en'?'selected':''}>English</option>
        </select>
      </label>
      <label>${state.lang==='hi' ? 'थीम चुनें (Theme Selection)' : 'Select Theme'}
        <select id="settings-theme-select" style="margin-top:6px;">
          <option value="dark" ${state.theme==='dark'?'selected':''}>${state.lang==='hi'?'डार्क मोड (Dark)':'Dark Mode'}</option>
          <option value="light" ${state.theme==='light'?'selected':''}>${state.lang==='hi'?'लाइट मोड (Light)':'Light Mode'}</option>
        </select>
      </label>
      <button class="btn primary" id="save-settings-btn">${state.lang==='hi' ? 'सेटिंग्स सहेजें (Save Settings)' : 'Save Settings'}</button>
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

function layout(){
  const c=state.companies.find(x=>x.id===state.companyId);
  $('app').innerHTML=`<div class="workspace"><aside class="sidebar"><div class="brand" translate="no"><div class="logo small-logo">${PULSE_ICON(22)}</div><div><strong translate="no">APNA BUSINESS</strong><small>Accounting & ERP</small></div></div>
  ${state.companies.length?companySelect():'<p class="muted small">No business yet</p>'}
  <nav style="overflow-y:auto;max-height:calc(100vh - 250px);display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:6px;letter-spacing:.05em;">${state.lang==='hi'?'मुख्य डैशबोर्ड':'Main Dashboard'}</div>
    <button data-page="dashboard" class="${state.page==='dashboard'?'active':''}">${state.lang==='hi'?'📊 मुख्य डैशबोर्ड (Dashboard)':'Dashboard'}</button>
    <button data-page="chat" class="${state.page==='chat'?'active':''}">${state.lang==='hi'?'🤖 AI चैट (AI Accountant)':'AI Chat'}</button>
    
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${state.lang==='hi'?'वाउचर और बिलिंग':'Vouchers & Billing'}</div>
    <button data-page="vouchers" class="${state.page==='vouchers'?'active':''}">${state.lang==='hi'?'🧾 वाउचर (Vouchers List)':'Vouchers'}</button>
    <button data-page="invoices" class="${state.page==='invoices'?'active':''}">${state.lang==='hi'?'📝 बिक्री / खरीद (Invoices)':'Sales / Purchases'}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${state.lang==='hi'?'खाता और बैलेंस शीट':'Accounts & Sheet'}</div>
    <button data-page="balance-sheet" class="${state.page==='balance-sheet'?'active':''}">${state.lang==='hi'?'⚖️ बैलेंस शीट (Balance Sheet)':'Balance Sheet'}</button>
    <button data-page="reports" class="${state.page==='reports'?'active':''}">${state.lang==='hi'?'📈 लाभ और हानि (P&L Statement)':'Profit & Loss'}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${state.lang==='hi'?'इन्वेंटरी और स्टॉक':'Inventory & Stock'}</div>
    <button data-page="products" class="${state.page==='products'?'active':''}">${state.lang==='hi'?'📦 स्टॉक / इन्वेंटरी (Inventory)':'Products / Inventory'}</button>
    <button data-page="contacts" class="${state.page==='contacts'?'active':''}">${state.lang==='hi'?'👥 ग्राहक / सप्लायर (Contacts)':'Contacts'}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${state.lang==='hi'?'जीएसटी और टैक्स':'GST & Tax'}</div>
    <button data-page="gst" class="${state.page==='gst'?'active':''}">${state.lang==='hi'?'📊 जीएसटी ब्रेकडाउन (GST Breakdown)':'GST Breakdown'}</button>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-top:10px;letter-spacing:.05em;">${state.lang==='hi'?'कंपनी मैनेजमेंट':'Company'}</div>
    <button data-page="settings" class="${state.page==='settings'?'active':''}">${state.lang==='hi'?'⚙️ कंपनी ऑल्टर / एडिट (Alter)':'Company Alter / Edit'}</button>
  </nav>
  <div class="nav-bottom">
    <button class="btn" id="open-settings-modal" style="display:flex;align-items:center;justify-content:center;gap:8px;">🎨 ${state.lang==='hi'?'एप सेटिंग्स (Theme/Lang)':'App Settings'}</button>
    <button class="btn" id="new-company">${state.lang==='hi'?'+ नया बिज़नेस बनाएं':'+ Create another business'}</button>
    <button class="btn" id="logout">${state.lang==='hi'?'लॉगआउट':'Logout'}</button>
  </div></aside>
  <main><header class="topbar"><div><h2>${c?esc(c.name):(state.lang==='hi'?'अपना बिज़नेस बनाएं':'Create your business')}</h2><p>${c?`${esc(c.business_state||'')} · GST: ${esc(c.gst_type||'Tax setup required')}`:(state.lang==='hi'?'GST और Non-GST बिज़नेस के लिए एक प्लेटफ़ॉर्म':'One platform for GST and Non-GST businesses')}</p></div><div class="status">${state.user?esc(state.user.email):''}</div></header><div id="content" class="content"></div></main></div>`;
  
  $('company-select')?.addEventListener('change',e=>{state.companyId=e.target.value;state.page='dashboard';render();});
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderPage();});
  
  $('open-settings-modal')?.addEventListener('click', () => {
    openSettingsModal();
  });

  $('new-company')?.addEventListener('click',createCompanyForm);
  $('logout').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:{}});}finally{state.user=null;state.csrf=null;state.companies=[];state.companyId=null;state.chats={};authView('login');}};
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
  try{
    if(p==='dashboard') await dashboard(); 
    else if(p==='chat') await chatPage();
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

const CHAT_SUGGESTIONS=['How can I help you?','Profit kitna hai?','Low stock dikhao','Customer ka baaki kitna hai?','Ramesh ko 5000 ka maal becha','500 kharcha hua'];
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
    log.innerHTML=`<div class="chat-hello"><div class="chat-avatar">${PULSE_ICON(26)}</div><h3>How can I help you?</h3><p>${state.lang==='hi'?'अपने बिजनेस का काम आसान भाषा में पूछें।':'Ask about your business in simple language.'}</p><div class="chat-chips">${CHAT_SUGGESTIONS.map(t=>`<button class="chat-chip" data-chip="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
  }else{
    log.innerHTML=msgs.map((m,i)=>m.role==='user'
      ?`<div class="msg user"><div class="bubble">${m.fileUrl?fileBubble(m):''}${esc(m.text)}</div></div>`
      :`<div class="msg bot"><div class="chat-avatar">${PULSE_ICON(16)}</div><div><div class="bubble ${m.error?'err':''} ${m.typing?'typing':''}">${esc(m.text)}${m.draft?draftCard(m,i):''}</div></div></div>`).join('');
  }
  log.scrollTop=log.scrollHeight;
  log.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>sendChat(b.dataset.chip));
  log.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>decideDraft(msgs[Number(b.dataset.i)],b.dataset.act));
  const send=$('chat-send');if(send)send.disabled=state.chatBusy;
}

function fileBubble(m){
  if(m.fileType==='IMAGE') return `<img class="chat-photo" src="${m.fileUrl}" alt="Photo">`;
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
      pending.draft={id:res.draft_id,preview:r.preview||[],status:'PENDING'};
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

async function chatPage(){
  $('content').innerHTML=`<div class="chat-wrap"><div class="chat-log" id="chat-log"></div>
  <div class="file-preview hidden" id="file-preview">
    <img id="file-img" class="hidden" alt="Selected photo">
    <div id="file-doc" class="hidden">📄 <span id="file-name"></span></div>
    <button class="file-remove" id="file-remove" type="button" aria-label="Remove file">×</button>
  </div>
  <form class="chat-form" id="chat-form">
    <input type="file" id="chat-photo" accept="image/*" class="hidden">
    <input type="file" id="chat-document" accept=".pdf,.doc,.docx,.txt" class="hidden">
    <button class="chat-plus" id="chat-plus" type="button" aria-label="Add photo or document">+</button>
    <textarea id="chat-input" rows="1" maxlength="1500" placeholder="${state.lang==='hi'?'Yahan likhiye, jaise: Ramesh ko 5000 ka maal becha':'Type here, e.g. Sold goods worth 5000 to Ramesh'}"></textarea>
    <button class="chat-mic" id="chat-mic" type="button" aria-label="Voice input">🎤</button>
    <button class="chat-send" id="chat-send" type="submit" aria-label="Send">➤</button>
  </form>
  <div class="chat-hint">${state.lang==='hi'?'Photo/Document sirf bill ya saboot ke liye jayega. Entry Confirm karne par hi post hogi.':'Photo/Document is for bills or proof only. Entry is posted only after Confirm.'}</div></div>`;
  const input=$('chat-input'),form=$('chat-form');
  const photoInput=$('chat-photo'),docInput=$('chat-document');
  const plus=$('chat-plus'),mic=$('chat-mic');
  const preview=$('file-preview'),img=$('file-img'),doc=$('file-doc'),fileName=$('file-name');
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  plus.onclick=()=>{
    const old=document.getElementById('attach-menu');
    if(old){old.remove();return;}
    const menu=document.createElement('div');
    menu.className='attach-menu';
    menu.id='attach-menu';
    menu.innerHTML=`
      <button type="button" data-kind="photo">🖼️ Photo / Bill</button>
      <button type="button" data-kind="document">📄 Document</button>
      <button type="button" data-kind="voice">🎤 Bolkar likhiye</button>
    `;
    document.querySelector('.chat-form').appendChild(menu);
    menu.querySelectorAll('button').forEach(b=>{
      b.onclick=()=>{
        const kind=b.dataset.kind;
        menu.remove();
        if(kind==='photo') photoInput.click();
        else if(kind==='document') docInput.click();
        else startVoice(input);
      };
    });
    setTimeout(()=>{
      document.addEventListener('click',function closeMenu(e){
        if(!menu.contains(e.target)&&e.target!==plus){
          menu.remove();
          document.removeEventListener('click',closeMenu);
        }
      });
    },0);
  };
  function setSelectedFile(file,type){
    if(!file)return;
    const max=5*1024*1024;
    if(file.size>max){
      toast(type==='IMAGE'?'Photo 5 MB se chhoti honi chahiye':'Document 5 MB se chhota hona chahiye');
      return;
    }
    pendingFile=file;
    pendingFileType=type;
    if(type==='IMAGE'){
      img.src=URL.createObjectURL(file);
      img.classList.remove('hidden');
      doc.classList.add('hidden');
    }else{
      fileName.textContent=file.name;
      doc.classList.remove('hidden');
      img.classList.add('hidden');
    }
    preview.classList.remove('hidden');
  }
  photoInput.onchange=()=>setSelectedFile(photoInput.files[0],'IMAGE');
  docInput.onchange=()=>setSelectedFile(docInput.files[0],'DOCUMENT');
  $('file-remove').onclick=()=>{
    pendingFile=null;
    pendingFileType='IMAGE';
    photoInput.value='';
    docInput.value='';
    img.src='';
    preview.classList.add('hidden');
  };
  mic.onclick=()=>startVoice(input);
  form.onsubmit=e=>{
    e.preventDefault();
    const text=input.value.trim();
    if(!text&&!pendingFile)return;
    const file=pendingFile;
    const type=pendingFileType;
    input.value='';
    input.style.height='auto';
    pendingFile=null;
    pendingFileType='IMAGE';
    photoInput.value='';
    docInput.value='';
    img.src='';
    preview.classList.add('hidden');
    if(file) sendChatWithFile(text,file,type);
    else sendChat(text);
  };
  renderChatLog();
  input.focus();
}

async function dashboard(){
  const d=await api(`/api/companies/${state.companyId}/dashboard`);
  $('content').innerHTML=`
    <div style="margin-bottom:20px;">
      <h2>📊 मुख्य डैशबोर्ड (Main Dashboard)</h2>
      <p class="muted">अपने बिजनेस का पूरा लेखा-जोखा और वित्तीय स्थिति यहाँ देखें।</p>
    </div>
    <div class="cards">
      ${[['Sales',d.sales_paise],['Purchases',d.purchases_paise],['Profit',d.net_profit_paise],['Cash',d.cash_paise],['Bank',d.bank_paise],['Inventory',d.stock_value_paise]].map(x=>`<div class="card"><div class="k-label">${x[0]}</div><div class="k-value">${money(x[1])}</div></div>`).join('')}
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:20px;">
      <section class="panel" style="margin-bottom:0;">
        <div class="panel-head"><h3>🧾 वाउचर (Vouchers)</h3><button class="btn tiny" onclick="state.page='vouchers';renderPage();">View All</button></div>
        <p class="muted small">सभी वित्तीय प्रविष्टियाँ और वाउचर (Payment, Receipt, Sales, Purchase) यहाँ रिकॉर्ड होते हैं।</p>
      </section>

      <section class="panel" style="margin-bottom:0;">
        <div class="panel-head"><h3>⚖️ बैलेंस शीट (Balance Sheet)</h3><button class="btn tiny" onclick="state.page='balance-sheet';renderPage();">View Sheet</button></div>
        <p class="muted small">आपकी संपत्ति, देनदारियाँ (Liabilities) और कैपिटल का संपूर्ण संतुलन।</p>
      </section>

      <section class="panel" style="margin-bottom:0;">
        <div class="panel-head"><h3>📦 इन्वेंटरी और स्टॉक (Inventory)</h3><button class="btn tiny" onclick="state.page='products';renderPage();">View Stock</button></div>
        <p class="muted small">फिक्स्ड प्राइस और मात्रा के साथ उत्पादों का स्टॉक और लो-स्टॉक अलर्ट।</p>
      </section>

      <section class="panel" style="margin-bottom:0;">
        <div class="panel-head"><h3>📊 जीएसटी ब्रेकडाउन (GST Report)</h3><button class="btn tiny" onclick="state.page='gst';renderPage();">View GST</button></div>
        <p class="muted small">किस वस्तु पर कितना सीजीएसटी, एसजीएसटी या आईजीएसटी लग रहा है उसका पूरा विवरण।</p>
      </section>
    </div>`;
}

async function vouchersPage(){
  const rows=await api(`/api/companies/${state.companyId}/vouchers`);
  $('content').innerHTML=`
    <section class="panel">
      <div class="panel-head">
        <h3>🧾 वाउचर (Vouchers / Daybook)</h3>
        <p class="small muted">गलत एंट्री या मिस्टेक सुधारने के लिए वाउचर को रिवर्स या ऑल्टर करें।</p>
      </div>
      ${table(rows,[['date','Date'],['kind','Type'],['reference','Ref'],['memo','Memo']])}
    </section>`;
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

async function products(){const rows=await api(`/api/companies/${state.companyId}/products`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Products & Inventory (Fixed Price & Stock)</h3><button class="btn primary" id="add-product">+ Add product</button></div>${table(rows,[['sku','SKU'],['name','Product'],['gst_bps','GST %'],['sale_price_paise','Fixed Sale Price'],['cost_price_paise','Cost'],['stock_qty','Stock Qty']])}</section>`;$('add-product').onclick=()=>productForm();}

function table(rows,cols){if(!rows?.length)return '<div class="empty">No records yet.</div>';return `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0].includes('_paise')?money(r[c[0]]):c[0]==='gst_bps'?`${Number(r[c[0]]||0)/100}%`:esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}

async function invoices(){const rows=await api(`/api/companies/${state.companyId}/invoices`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Invoices (Auto GST & Quantity)</h3><div class="actions"><button class="btn primary" id="sale">+ Sales invoice</button><button class="btn" id="purchase">+ Purchase invoice</button></div></div>${table(rows,[['number','Invoice'],['kind','Type'],['date','Date'],['contact_name','Party'],['subtotal_paise','Taxable'],['gst_paise','GST'],['total_paise','Total'],['outstanding_paise','Outstanding']])}</section>`;$('sale').onclick=()=>invoiceForm('SALE');$('purchase').onclick=()=>invoiceForm('PURCHASE');}

async function reports(){const [pl,bs,stock,gst]=await Promise.all([api(`/api/companies/${state.companyId}/reports/profit-loss`),api(`/api/companies/${state.companyId}/reports/balance-sheet`),api(`/api/companies/${state.companyId}/reports/stock`),api(`/api/companies/${state.companyId}/reports/gst`)]);$('content').innerHTML=`<section class="panel"><h3>Profit & Loss</h3><p>Revenue: <strong>${money(pl.revenue_paise)}</strong></p><p>Net profit: <strong>${money(pl.net_profit_paise)}</strong></p></section><section class="panel"><h3>Stock Summary</h3>${table(stock,[['sku','SKU'],['name','Product'],['qty','Qty'],['stock_value_paise','Stock value']])}</section>`;}

async function settings(){const c=await api(`/api/companies/${state.companyId}`);$('content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Company Alter / Edit (कंपनी ऑल्टर / एडिट)</h3></div><form id="tax-form"><label>Business name<input name="name" value="${esc(c.name)}" required></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option ${x===c.business_type?'selected':''}>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${esc(name)}" ${name===c.business_state?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type"><option value="UNREGISTERED" ${c.gst_type==='UNREGISTERED'?'selected':''}>I don't have GST registration</option><option value="REGULAR" ${c.gst_type==='REGULAR'?'selected':''}>GST Regular</option><option value="COMPOSITION" ${c.gst_type==='COMPOSITION'?'selected':''}>GST Composition</option><option value="OTHER" ${c.gst_type==='OTHER'?'selected':''}>Other GST registration</option></select></label><label>GSTIN<input name="gstin" value="${esc(c.gstin||'')}" placeholder="Required for registered types"></label><button class="btn primary" type="submit">Save & Alter Company</button><p class="note">यहाँ से आप अपनी कंपनी की किसी भी गलती या डिटेल्स को सही (Alter/Edit) कर सकते हैं।</p></form></section>`;$('tax-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/companies/${state.companyId}`,{method:'PATCH',body:Object.fromEntries(f)});toast('Company altered successfully');await refreshSession();render();}catch(err){toast(err.message);}};}

function modal(title,html){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal"><div class="modal-head"><h3>${title}</h3><button id="close">×</button></div>${html}</section>`;document.body.appendChild(wrap);wrap.querySelector('#close').onclick=()=>wrap.remove();return wrap;}

function createCompanyForm(){const m=modal('Create Your Business',`<form id="company-form"><label>Business name<input name="name" required placeholder="APNA KIRANA STORE"></label><label>Business type<select name="business_type">${['Retail / Shop','Wholesale','Service','Manufacturing','Professional','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Business state / UT<select name="business_state">${STATES.map(([code,name])=>`<option value="${name}" ${code==='09'?'selected':''}>${name} (${code})</option>`).join('')}</select></label><label>GST registration<select name="gst_type" id="new-gst"><option value="UNREGISTERED">I don't have GST registration</option><option value="REGULAR">GST Regular</option><option value="COMPOSITION">GST Composition</option><option value="OTHER">Other GST registration</option></select></label><label id="new-gstin-wrap" class="hidden">GSTIN<input name="gstin" placeholder="15-character GSTIN"></label><p id="new-gst-help" class="note">GSTIN is not required for an unregistered business.</p><label>Address<input name="address"></label><button class="btn primary" type="submit">Create business</button></form>`);const sel=m.querySelector('#new-gst');const wrap=m.querySelector('#new-gstin-wrap');const help=m.querySelector('#new-gst-help');function update(){const reg=sel.value!=='UNREGISTERED';wrap.classList.toggle('hidden',!reg);help.textContent=sel.value==='REGULAR'?'GSTIN is required. Regular GST supports CGST + SGST or IGST.':sel.value==='COMPOSITION'?'GSTIN is required. Sales use composition-compatible treatment.':sel.value==='OTHER'?'GSTIN is required for this registration type; Regular GST is not assumed.':'GSTIN is not required for an unregistered business.';}sel.onchange=update;update();m.querySelector('#company-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const created=await api('/api/companies',{method:'POST',body:Object.fromEntries(f)});m.remove();await refreshSession();state.companyId=created.id;state.page='dashboard';render();}catch(err){toast(err.message);}};}

function contactForm(){const m=modal('Add contact',`<form id="f"><label>Type<select name="kind"><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option></select></label><label>Name<input name="name" required></label><label>State code<input name="state_code" placeholder="27"></label><label>GSTIN<input name="gstin"></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><button class="btn primary">Save contact</button></form>`);m.querySelector('#f').onsubmit=async e=>{e.preventDefault();try{await api(`/api/companies/${state.companyId}/contacts`,{method:'POST',body:Object.fromEntries(new FormData(e.currentTarget))});m.remove();contacts();}catch(err){toast(err.message);}};}

function productForm(){const m=modal('Add product (Fixed Price)',`<form id="f"><label>SKU<input name="sku" required></label><label>Product name<input name="name" required></label><label>HSN / SAC<input name="hsn"></label><label>GST rate %<input name="gst_rate" type="number" value="18" step="0.01" min="0"></label><label>Fixed Sale Price ₹<input name="sale_rupees" type="number" value="100" step="0.01" min="0"></label><label>Purchase cost ₹<input name="cost_rupees" type="number" value="70" step="0.01" min="0"></label><label>Low-stock level<input name="reorder_level" type="number" value="5" min="0"></label><button class="btn primary">Save Product & Fix Price</button></form>`);m.querySelector('#f').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/companies/${state.companyId}/products`,{method:'POST',body:{sku:f.get('sku'),name:f.get('name'),hsn:f.get('hsn'),gst_bps:Math.round(Number(f.get('gst_rate'))*100),sale_price_paise:Math.round(Number(f.get('sale_rupees'))*100),cost_price_paise:Math.round(Number(f.get('cost_rupees'))*100),reorder_level:Number(f.get('reorder_level'))}});m.remove();products();}catch(err){toast(err.message);}};}

function invoiceForm(kind){
  // invoice creation logic
}

(async()=>{if(await refreshSession()) render(); else authView('login');})();
