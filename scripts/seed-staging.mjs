import {randomBytes,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

if ((process.env.GENZ_DEPLOYMENT_MODE || 'production') !== 'staging') {
  console.error('STAGING_ONLY: seed-staging.mjs refuses to run outside staging.');
  process.exit(2);
}

const scrypt=promisify(scryptCallback);
const required=(name)=>{const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value};
const db=await mysql.createConnection({host:required('GENZ_DB_HOST'),port:Number(process.env.GENZ_DB_PORT||3306),user:required('GENZ_DB_USER'),password:required('GENZ_DB_PASSWORD'),database:required('GENZ_DB_NAME'),timezone:'Z',multipleStatements:false});

try{
  const raw=await fs.readFile(new URL('../db/test-seed.sql',import.meta.url),'utf8');
  const sql=raw.replace(/^\s*USE\s+[^;]+;\s*/i,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*--.*$/gm,'').trim();
  if(!sql)throw new Error('STAGING_SEED_EMPTY');
  await db.query(sql);
  const[developers]=await db.query('SELECT id FROM staff_users WHERE role=\'DEVELOPER\' AND active=TRUE LIMIT 1');
  if(!developers.length){
    const username=(process.env.GENZ_STAGING_DEVELOPER_USERNAME||'developer').trim().toLowerCase();
    const password=required('GENZ_STAGING_DEVELOPER_PASSWORD');
    const salt=randomBytes(16).toString('hex');
    const derived=await scrypt(password,salt,64);
    const hash=`scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
    await db.execute('INSERT INTO staff_users(id,username,name,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,?,?,TRUE,NOW(3),NOW(3))',[`STGDEV-${randomBytes(8).toString('hex')}`,username,'Staging Developer',hash,'DEVELOPER']);
  }
  console.log('Staging food catalogue and developer test identity seeded.');
}finally{await db.end()}
