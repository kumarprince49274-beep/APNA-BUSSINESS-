import fs from 'node:fs';
import path from 'node:path';
import {backup,DatabaseSync} from 'node:sqlite';

// SQLite's online backup API writes a consistent copy even if WAL is in use.
export async function createVerifiedBackup(db,output){
 const file=path.resolve(output);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file))throw new Error(`Refusing to overwrite existing backup: ${file}`);
 await backup(db,file);
 const result=verifyBackup(file);
 if(!result.ok){fs.rmSync(file,{force:true});throw new Error('SQLite backup integrity check failed');}
 return {file,bytes:fs.statSync(file).size};
}
export function verifyBackup(file){
 const db=new DatabaseSync(file,{readOnly:true});
 try{return {ok:db.prepare('PRAGMA integrity_check').all().every(x=>x.integrity_check==='ok'),users:db.prepare('SELECT COUNT(*) n FROM users').get().n};}
 finally{db.close();}
}
