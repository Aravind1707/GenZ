import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const env=(name, fallback)=>process.env[name]||fallback||(()=>{throw new Error(`Missing ${name}`)})();
const connection=await mysql.createConnection({host:env('GENZ_DB_HOST','127.0.0.1'),port:Number(env('GENZ_DB_PORT','3306')),user:env('GENZ_DB_USER'),password:env('GENZ_DB_PASSWORD'),database:env('GENZ_DB_NAME'),multipleStatements:true});
try{
 await connection.query(await fs.readFile(path.join(process.cwd(),'db/mysql-schema.sql'),'utf8'));
 await connection.query("INSERT INTO schema_migrations(version,applied_at) VALUES(1,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at");
 const dir=path.join(process.cwd(),'db/migrations');
 const files=(await fs.readdir(dir)).filter(f=>/^\d+_.*\.sql$/.test(f)).sort((a,b)=>Number(a)-Number(b));
 const [appliedRows]=await connection.query('SELECT version FROM schema_migrations');
 const applied=new Set(appliedRows.map(r=>Number(r.version)));
 for(const file of files){const version=Number(file.slice(0,3));if(applied.has(version))continue;console.log(`Applying ${file}`);await connection.query(await fs.readFile(path.join(dir,file),'utf8'));}
 console.log('GenZ MySQL migrations complete.');
}finally{await connection.end();}
