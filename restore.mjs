// Deliberately requires an explicit confirmation and a separate backup.
import fs from 'node:fs';
import path from 'node:path';
import {verifyBackup} from '../src/backup.js';
const [sourceArg,flag]=process.argv.slice(2);
if(!sourceArg||flag!=='--confirm-server-stopped'){
 console.error('Usage: npm run restore -- <backup.sqlite> --confirm-server-stopped');
 console.error('STOP APNA BUSINESS first. This overwrites the active SQLite database.');
 process.exit(2);
}
const source=path.resolve(sourceArg),target=path.resolve(process.env.DB_PATH||'data/apna-business.sqlite');
if(source===target)throw Error('Backup file must differ from database');
const confirmed=verifyBackup(source);
if(!confirmed.ok)throw Error('Invalid backup');
if(fs.existsSync(target+'-wal')||fs.existsSync(target+'-shm')){
 throw Error('SQLite WAL files exist. Do not restore until the app is fully shut down and WAL checkpointed. Never delete these files manually.');
}
fs.mkdirSync(path.dirname(target),{recursive:true});
if(fs.existsSync(target)){
 const safety=path.resolve(`backups/pre-restore-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
 fs.mkdirSync(path.dirname(safety),{recursive:true});fs.copyFileSync(target,safety,fs.constants.COPYFILE_EXCL);
 console.log('Preserved original database at',safety);
}
const tmp=target+'.restore-'+process.pid;
try{fs.copyFileSync(source,tmp,fs.constants.COPYFILE_EXCL);fs.renameSync(tmp,target);}finally{if(fs.existsSync(tmp))fs.rmSync(tmp,{force:true});}
console.log('Database restored. Restart the application and verify your accounting records.');
