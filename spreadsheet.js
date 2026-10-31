import {fail} from './utils.js';
// Safe, intentionally LIMITED spreadsheet evaluator. No eval(), Function(), JS execution,
// external data fetch, links, or accounting writes. Only references, arithmetic and
// SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND over cells and ranges are supported.
const REF=/^[A-Z]{1,3}[1-9][0-9]{0,3}$/;
function colNum(letters){return [...letters].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);}
function splitRef(ref){const m=/^([A-Z]+)([0-9]+)$/.exec(ref);return {c:colNum(m[1]),r:Number(m[2])};}
function toCol(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
export function computeWorkbook(cells){
 if(!cells||typeof cells!=='object'||Array.isArray(cells))fail('Cells must be a map');
 const keys=Object.keys(cells);
 if(keys.length>2500||keys.some(k=>!REF.test(k)))fail('Invalid sheet or too many cells (max 2500)');
 const cache=new Map(),active=new Set();
 const read=key=>{
  if(!REF.test(key))throw Error(`Invalid cell ${key}`);
  if(cache.has(key))return cache.get(key);
  if(active.has(key))throw Error('Circular reference');
  active.add(key);
  let raw=cells[key],n;
  try{
   if(raw==null||raw==='')n=0;
   else if(typeof raw==='number')n=raw;
   else if(typeof raw==='string'&&raw.trim().startsWith('='))n=evaluate(raw.trim().slice(1));
   else if(!isNaN(Number(raw)))n=Number(raw);
   else throw Error(`Non-numeric cell ${key}`);
   if(!Number.isFinite(n))throw Error('Calculation error');
   cache.set(key,n);return n;
  }finally{active.delete(key);}
 };
 const range=(start,end)=>{
  const a=splitRef(start),b=splitRef(end);
  if(a.r>b.r||a.c>b.c||(b.r-a.r+1)*(b.c-a.c+1)>2500)throw Error('Invalid or large range');
  const out=[];for(let r=a.r;r<=b.r;r++)for(let c=a.c;c<=b.c;c++)out.push(read(`${toCol(c)}${r}`));
  return out;
 };
 function evaluate(expr){
  const matches=expr.toUpperCase().match(/\s*(?:[A-Z]+[0-9]+|[A-Z]+|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/,:])\s*/g)||[];
  const tokens=matches.map(x=>x.trim());
  if(tokens.join('')!==expr.toUpperCase().replace(/\s+/g,'')||tokens.length>500)throw Error('Unsupported formula');
  let i=0;
  const next=()=>tokens[i++],peek=()=>tokens[i];
  function expression(){let x=term();while(peek()==='+'||peek()==='-'){let op=next();let y=term();x=op==='+'?x+y:x-y;}return x;}
  function term(){let x=factor();while(peek()==='*'||peek()==='/'){let op=next();let y=factor();if(op==='/'&&y===0)throw Error('Division by zero');x=op==='*'?x*y:x/y;}return x;}
  function factor(){
   const t=next();if(!t)throw Error('Incomplete formula');
   if(t==='-')return -factor();if(t==='+')return factor();
   if(t==='('){let x=expression();if(next()!==')')throw Error('Missing )');return x;}
   if(/^\d|^\./.test(t))return Number(t);
   if(REF.test(t))return read(t);
   if(/^[A-Z]+$/.test(t)){
    if(next()!=='(')throw Error('Missing function (');
    const args=[];
    if(peek()!==')'){
     while(true){
      if(REF.test(peek()||'')&&tokens[i+1]===':'){
       const a=next();next();const b=next();if(!REF.test(b||''))throw Error('Invalid range');args.push(...range(a,b));
      }else args.push(expression());
      if(peek()!==',')break;next();
     }
    }
    if(next()!==')')throw Error('Missing )');
    if(!args.length&&t!=='COUNT')throw Error('Missing arguments');
    switch(t){
     case 'SUM':return args.reduce((x,y)=>x+y,0);
     case 'COUNT':return args.length;
     case 'AVERAGE':return args.reduce((x,y)=>x+y,0)/args.length;
     case 'MIN':return Math.min(...args);
     case 'MAX':return Math.max(...args);
     case 'ABS':if(args.length!==1)throw Error('ABS takes one argument');return Math.abs(args[0]);
     case 'ROUND':if(args.length<1||args.length>2)throw Error('ROUND takes 1 or 2 arguments');return Number(args[0].toFixed(args[1]??0));
     default:throw Error(`Unsupported function: ${t}`);
    }
   }
   throw Error(`Unexpected ${t}`);
  }
  const answer=expression();if(i!==tokens.length)throw Error('Unexpected tokens');return answer;
 }
 const results={};for(const key of keys){try{results[key]={value:read(key)}}catch(e){results[key]={error:e.message};}}
 return results;
}
