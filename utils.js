import {randomUUID} from 'node:crypto';
export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0,10);
export function fail(message,status=400) { const e=new Error(message); e.status=status; throw e; }
export function text(value,label='value',max=200) {
  const s=String(value??'').trim();
  if(!s || s.length>max) fail(`Invalid ${label}`);
  return s;
}
export function nonnegative(value,label='amount',max=9e13) {
  if(!Number.isSafeInteger(value)||value<0||value>max) fail(`Invalid ${label}: integer required`);
  return value;
}
export function positive(value,label='amount',max=9e13) {
  nonnegative(value,label,max); if(value===0) fail(`${label} must be positive`); return value;
}
export function date(value) {
  if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value)||Number.isNaN(Date.parse(`${value}T00:00:00Z`))||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value) fail('Invalid date YYYY-MM-DD');
  return value;
}
export function state(value) {const s=String(value??'');if(!/^(0[1-9]|[12]\d|3[0-8]|9[789])$/.test(s)) fail('Indian GST state code required (e.g. 27)');return s;}
export function moneyTax(amountPaise,rateBps) {
  if(!Number.isSafeInteger(amountPaise*rateBps)) fail('Amount too large');
  return Math.floor((amountPaise*rateBps+5000)/10000);
}
export function csvValue(value) {
  let str=String(value??'');
  if(/^[\s]*[=+\-@\t\r]/.test(str)) str="'"+str; // spreadsheet injection protection
  return `"${str.replaceAll('"','""')}"`;
}
export function csv(rows,headers) {
  return [headers.map(csvValue).join(','),...rows.map(r=>headers.map(h=>csvValue(r[h])).join(','))].join('\r\n');
}
