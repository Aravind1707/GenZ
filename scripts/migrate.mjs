import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const env=(name,fallback)=>process.env[name]||fallback||(()=>{throw new Error(`Missing ${name}`)})();
const connection=await mysql.createConnection({host:env('GENZ_DB_HOST','127.0.0.1'),port:Number(env('GENZ_DB_PORT','3306')),user:env('GENZ_DB_USER'),password:env('GENZ_DB_PASSWORD'),database:env('GENZ_DB_NAME'),multipleStatements:true});

function splitSql(sql){
  const statements=[];let start=0;let quote=null;let lineComment=false;let blockComment=false;
  for(let i=0;i<sql.length;i++){
    const ch=sql[i],next=sql[i+1];
    if(lineComment){if(ch==='\n')lineComment=false;continue}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++}continue}
    if(!quote&&ch==='-'&&next==='-'){lineComment=true;i++;continue}
    if(!quote&&ch==='#'){lineComment=true;continue}
    if(!quote&&ch==='/'&&next==='*'){blockComment=true;i++;continue}
    if(quote){if(ch==='\\'){i++;continue}if(ch===quote){if(sql[i+1]===quote)i++;else quote=null}continue}
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue}
    if(ch===';'){const statement=sql.slice(start,i).trim();if(statement)statements.push(statement);start=i+1}
  }
  const tail=sql.slice(start).trim();if(tail)statements.push(tail);return statements;
}

const ignorableDdlErrors=new Set([1050,1060,1061,1826,1831]);
async function applyMigration(file,version){
  const sql=await fs.readFile(path.join(process.cwd(),'db/migrations',file),'utf8');
  for(const statement of splitSql(sql)){
    try{await connection.query(statement)}catch(error){
      if(ignorableDdlErrors.has(Number(error?.errno))){console.warn(`Skipping already-present DDL in ${file}: ${error.sqlMessage}`);continue}
      throw error;
    }
  }
  const[rows]=await connection.query('SELECT version FROM schema_migrations WHERE version=?',[version]);
  if(!rows.length)await connection.query('INSERT INTO schema_migrations(version,applied_at) VALUES(?,NOW(3))',[version]);
}

try{
  await connection.query(await fs.readFile(path.join(process.cwd(),'db/mysql-schema.sql'),'utf8'));
  await connection.query("INSERT INTO schema_migrations(version,applied_at) VALUES(1,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at");
  const dir=path.join(process.cwd(),'db/migrations');
  const files=(await fs.readdir(dir)).filter(f=>/^\d+_.*\.sql$/.test(f)).sort((a,b)=>Number(a.match(/^\d+/)[0])-Number(b.match(/^\d+/)[0])||a.localeCompare(b));
  const versions=new Map();
  for(const file of files){const version=Number(file.match(/^\d+/)[0]);const existing=versions.get(version);if(existing)throw new Error(`Duplicate migration version ${version}: ${existing} and ${file}`);versions.set(version,file)}
  const[appliedRows]=await connection.query('SELECT version FROM schema_migrations');
  const applied=new Set(appliedRows.map(r=>Number(r.version)));
  for(const file of files){const version=Number(file.match(/^\d+/)[0]);if(applied.has(version))continue;console.log(`Applying ${file}`);await applyMigration(file,version);applied.add(version)}
  console.log('GenZ MySQL migrations complete.');
}finally{await connection.end();}
