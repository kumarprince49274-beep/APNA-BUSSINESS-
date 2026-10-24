import {dashboard,stockReport,outstandingReport,gstReport} from './reports.js';
import {companyGstType} from './companies.js';
import {all} from './db.js';
import {text} from './utils.js';

// Paise -> rupees. Negative amounts print as -₹500.00 (not ₹-500.00). Bad input prints as ₹0.00.
const rs=n=>{
 const v=Number(n);
 const safe=Number.isFinite(v)?v:0;
 const s=(Math.abs(safe)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 return `${safe<0?'-':''}₹${s}`;
};

const qtyFmt=n=>Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:3});

const FALLBACK='Main abhi in sawaalon ka jawab de sakta hoon: profit, sales, GST, stock, kisi product ka stock (jaise "maggy kitna hai"), customer/supplier ka baaki, cash ya bank. Chat se entry post karna is version mein nahi hai: Sales / Purchases page se invoice banao.';

// English words use \b (so "reduce" does not match "due"). Hindi words are matched without \b,
// because JavaScript's \b does not work on Devanagari.
const INTENTS=[
 ['profit',/\b(profit|loss|munafa|nuksan)\b|लाभ|घाटा|मुनाफा|नुकसान/],
 ['stock',/\b(stock|inventory|restock)\b|स्टॉक|सामान/],
 ['outstanding',/\b(outstanding|dues?|receivables?|payables?|udhar|udhaar|baki|baaki)\b|बकाया|उधार/],
 ['gst',/\b(gst|tax)\b|जीएसटी/],
 ['cash',/\b(cash|bank)\b|नकद|बैंक/],
 ['sales',/\b(sales|revenue)\b|बिक्री|कमाई/],
];

// "kitna / how many" jaise sawaal pehchanne ke liye
const QTY_RE=/\b(kitna|kitne|kitni|how many|how much|qty|quantity|available|bacha|bache)\b|कितना|कितने|कितनी/;

// Ye common words product ke naam se match nahi hone chahiye
const STOP=new Set(['mere','meri','mera','paas','kitna','kitne','kitni','hain','hai','abhi','the','how','many','much','stock','have','what','kya','dikhao','batao','bata','ka','ki','ke','maal','sab','all','and','are','you','for','with','available','bacha','bache','quantity','qty']);

// Product ka naam message mein dhundta hai aur uska stock batata hai (sirf padhta hai)
function productRows(db,id){
 return all(db,
  `SELECT p.sku,p.name,p.reorder_level,COALESCE(SUM(l.qty_remaining),0) qty
   FROM products p
   LEFT JOIN stock_layers l ON l.product_id=p.id AND l.company_id=p.company_id
   WHERE p.company_id=? AND p.active=1
   GROUP BY p.id
   ORDER BY p.name`,id);
}

function findProducts(rows,m){
 const words=new Set((m.match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>=3&&!STOP.has(w)));
 return rows.filter(p=>{
  const name=String(p.name||'').toLowerCase().trim();
  if(!name)return false;
  if(m.includes(name))return true;
  return name.split(/[^\p{L}\p{N}]+/u).some(w=>w.length>=3&&words.has(w));
 });
}

function productReply(found){
 return found.slice(0,10).map(p=>{
  const low=Number(p.reorder_level)>0&&Number(p.qty)<=Number(p.reorder_level)?' (low stock)':'';
  return `${p.name}: ${qtyFmt(p.qty)} units stock mein hain${low}.`;
 }).join('\n');
}

// Each handler gets a lazy dashboard getter, so the dashboard query only runs when needed.
const HANDLERS={
 profit:(db,id,dash)=>{
  const d=dash();
  return `Revenue ${rs(d.sales_paise)}, gross profit ${rs(d.gross_profit_paise)}, net profit ${rs(d.net_profit_paise)}. These are ledger-derived values, not AI estimates.`;
 },
 stock:(db,id)=>{
  const low=stockReport(db,id).filter(x=>x.low_stock);
  if(!low.length)return 'No products are currently at or below their saved reorder level.';
  const shown=low.slice(0,12);
  const more=low.length>shown.length?` ...and ${low.length-shown.length} more.`:'';
  return `Low stock (${low.length}): ${shown.map(x=>`${x.name} (${x.qty} units)`).join(', ')}.${more}`;
 },
 outstanding:(db,id)=>{
  const rows=outstandingReport(db,id);
  const sum=k=>rows.filter(x=>x.kind===k).reduce((s,x)=>s+(Number(x.outstanding_paise)||0),0);
  return `Customer due ${rs(sum('SALE'))}. Supplier due ${rs(sum('PURCHASE'))}.`;
 },
 gst:(db,id)=>{
  const taxType=companyGstType(db,id);
  if(!['REGULAR','CASUAL','NON_RESIDENT','SEZ','ECOMMERCE'].includes(taxType))return `This business is configured as ${taxType}. The accounting engine does not invent Regular GST collection for it.`;
  const x=gstReport(db,id);
  const out=x.sales.cgst_paise+x.sales.sgst_paise+x.sales.igst_paise;
  const inp=x.purchases.cgst_paise+x.purchases.sgst_paise+x.purchases.igst_paise;
  return `Draft output GST ${rs(out)}; draft input GST ${rs(inp)}. Estimate: ${rs(x.estimated_net_gst_paise)}. Please check ITC eligibility with your accountant; this is NOT a filed return.`;
 },
 cash:(db,id,dash)=>{
  const d=dash();
  return `Ledger cash balance ${rs(d.cash_paise)} and bank balance ${rs(d.bank_paise)}.`;
 },
 sales:(db,id,dash)=>{
  const d=dash();
  return `Total booked sales revenue ${rs(d.sales_paise)}. Your platform's subscription revenue is tracked separately and is NOT included here.`;
 },
};

// Same signature and return shape as before, so it replaces the old file directly.
// Read-only: this function never writes to the database.
export function localAssistant(db,companyId,message){
 const m=text(message,'message',1500).toLowerCase();
 const hits=INTENTS.filter(([,re])=>re.test(m)).map(([k])=>k);

 // 1) Kisi product ka naam likha hai to uska stock batao
 if(!hits.length||(hits.length===1&&hits[0]==='stock')){
  const found=findProducts(productRows(db,companyId),m);
  if(found.length)return {reply:productReply(found),mode:'LOCAL_RULES'};
  if(QTY_RE.test(m)&&!hits.length)return {reply:'Is naam ka koi product nahi mila. Pehle "Products / Inventory" page mein product add karo, phir stock yahan poochh sakte ho.',mode:'LOCAL_RULES'};
 }

 if(!hits.length)return {reply:FALLBACK,mode:'LOCAL_RULES'};
 let cached;
 const dash=()=>cached??(cached=dashboard(db,companyId));
 const parts=hits.map(k=>HANDLERS[k](db,companyId,dash));
 return {reply:parts.join('\n\n'),mode:'LOCAL_RULES'};
}
