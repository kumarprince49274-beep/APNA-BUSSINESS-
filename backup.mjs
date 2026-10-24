import fs from 'node:fs';
import path from 'node:path';
import {openDatabase} from '../src/db.js';
import {createVerifiedBackup} from '../src/backup.js';
const source=path.resolve(process.env.DB_PATH||'data/apna-business.sqlite');
if(!fs.existsSync(source)){console.error('No existing database at',source);process.exitCode=1;}
else{
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const dest=path.resolve(process.argv[2]||`backups/apna-business-${stamp}.sqlite`);
 if(dest===source)throw Error('Backup destination must differ from the database');
 const db=openDatabase(source);
 try{
  const result=await createVerifiedBackup(db,dest);
  console.log('Verified backup created:',result.file,'(',result.bytes,'bytes )');
  console.log('Keep it private; it contains account information, files and financial records.');
 }finally{db.close();}
}
