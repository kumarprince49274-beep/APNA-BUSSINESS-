import {uid,now,fail,text} from './utils.js';
import {all,one,run,transaction} from './db.js';

export const MAX_FILE_BYTES=5*1024*1024;
export const MAX_COMPANY_BYTES=50*1024*1024;
const FORMATS={
 '.pdf':{mime:'application/pdf',types:['Document','Invoice','Receipt']},
 '.png':{mime:'image/png',types:['Document','Invoice','Receipt']},
 '.jpg':{mime:'image/jpeg',types:['Document','Invoice','Receipt']},
 '.jpeg':{mime:'image/jpeg',types:['Document','Invoice','Receipt']},
 '.webp':{mime:'image/webp',types:['Document','Invoice','Receipt']},
 '.txt':{mime:'text/plain',types:['Document','Invoice','Receipt']},
 '.doc':{mime:'application/msword',types:['Document','Invoice','Receipt']},
 '.docx':{mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',types:['Document','Invoice','Receipt']},
 '.webm':{mime:'audio/webm',types:['Voice note']},
 '.ogg':{mime:'audio/ogg',types:['Voice note']},
 '.m4a':{mime:'audio/mp4',types:['Voice note']},
 '.mp3':{mime:'audio/mpeg',types:['Voice note']},
 '.wav':{mime:'audio/wav',types:['Voice note']}
};
function validateBytes(extension,bytes){
 const prefix=(s)=>bytes.subarray(0,s.length).toString('latin1')===s;
 if(extension==='.pdf'&&!prefix('%PDF-'))fail('Invalid PDF file');
 if(extension==='.png'&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('Invalid PNG file');
 if(['.jpg','.jpeg'].includes(extension)&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))fail('Invalid JPEG file');
 if(extension==='.webp'&&!(prefix('RIFF')&&bytes.subarray(8,12).toString()==='WEBP'))fail('Invalid WebP file');
 if(extension==='.docx'&&!prefix('PK'))fail('Invalid Word document');
 if(extension==='.doc'&&!bytes.subarray(0,4).equals(Buffer.from([0xD0,0xCF,0x11,0xE0])))fail('Invalid Word document');
 if(extension==='.txt'&&(bytes.includes(0)||!new TextDecoder('utf-8',{fatal:true}).decode(bytes)))fail('Invalid UTF-8 text document');
}
export function saveDocument(db,companyId,userId,{name,kind,content_base64}){
 name=text(name,'file name',180).replace(/[\\/\x00-\x1f]/g,'_').trim();
 const ext=name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
 const spec=FORMATS[ext];if(!spec)fail('Supported files: PDF, PNG/JPEG/WebP, TXT, DOC/DOCX, and audio notes');
 if(!spec.types.includes(kind))fail('Choose a valid document type');
 if(typeof content_base64!=='string'||content_base64.length>Math.ceil(MAX_FILE_BYTES*4/3)+100||
    content_base64.length%4!==0||/[^A-Za-z0-9+/=]/.test(content_base64)||/=[^=]/.test(content_base64)||/={3,}/.test(content_base64))fail('Invalid encoded file',413);
 const bytes=Buffer.from(content_base64,'base64');
 if(bytes.length<1||bytes.length>MAX_FILE_BYTES)fail('File must be between 1 byte and 5 MB',413);
 validateBytes(ext,bytes);
 return transaction(db,()=>{
  const used=one(db,'SELECT COALESCE(SUM(size_bytes),0) n,COUNT(*) files FROM private_documents WHERE company_id=?',companyId);
  if(used.files>=100||used.n+bytes.length>MAX_COMPANY_BYTES)fail('Company file limit reached (100 files or 50 MB)',413);
  const id=uid();run(db,'INSERT INTO private_documents (id,company_id,name,kind,mime_type,size_bytes,content,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  id,companyId,name,kind,spec.mime,bytes.length,bytes,userId,now());
  return {id,name,kind,mime_type:spec.mime,size_bytes:bytes.length};
 });
}
export function listDocuments(db,companyId){return all(db,'SELECT id,name,kind,mime_type,size_bytes,uploaded_by,created_at FROM private_documents WHERE company_id=? ORDER BY created_at DESC',companyId);}
export function getDocument(db,companyId,id){
 const file=one(db,'SELECT name,kind,mime_type,size_bytes,content FROM private_documents WHERE company_id=? AND id=?',companyId,id);
 if(!file)fail('Document not found',404);
 return {name:file.name,kind:file.kind,mime_type:file.mime_type,size_bytes:file.size_bytes,content_base64:Buffer.from(file.content).toString('base64')};
}
export function deleteDocument(db,companyId,id){
 const r=run(db,'DELETE FROM private_documents WHERE company_id=? AND id=?',companyId,id);
 if(r.changes===0)fail('Document not found',404);
 return {ok:true};
}
