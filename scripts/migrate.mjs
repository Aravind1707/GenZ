import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const env=(name,fallback)=>process.env[name]||fallback||(()=>{throw new Error(`Missing ${name}`)})();
const connection=await mysql.createConnection({host:env('GENZ_DB_HOST','127.0.0.1'),port:Number(env('GENZ_DB_PORT','3306')),user:env('GENZ_DB_USER'),password:env('GENZ_DB_PASSWORD'),database:env('GENZ_DB_NAME'),multipleStatements:true});
try{
  await connection.query(await fs.readFile(path.join(process.cwd(),'db/mysql-schema.sql'),'utf8'));
  const dir=path.join(process.cwd(),'db/migrations');
  const files=(await fs.readdir(dir)).filter(f=>/^\d+_.*\.sql$/.test(f)).sort((a,b)=>Number(a)-Number(b));
  const versions=files.map(file=>Number(file.match(/^\d+/)?.[0]||0)).filter(Boolean);
  const latestMigration=versions.length?Math.max(...versions):1;
  const [historyRows]=await connection.query('SELECT MAX(version) AS version FROM schema_migrations');
  const currentVersion=historyRows[0]?.version==null?null:Number(historyRows[0].version);

  // mysql-schema.sql is the complete current baseline. On a genuinely new
  // database there is no migration history, so do not replay historical ALTERs
  // against tables that the baseline already created in their final shape.
  if(currentVersion===null){
    await connection.query('INSERT INTO schema_migrations(version,applied_at) VALUES(?,NOW(3))',[latestMigration]);
    console.log(`Fresh GenZ database initialized at schema version ${latestMigration}.`);
  }else{
    const [appliedRows]=await connection.query('SELECT version FROM schema_migrations');
    const applied=new Set(appliedRows.map(r=>Number(r.version)));
    for(const file of files){
      const version=Number(file.match(/^\d+/)?.[0]||0);
      if(!version || applied.has(version)) continue;
      console.log(`Applying ${file}`);
      await connection.beginTransaction();
      try{
        await connection.query(await fs.readFile(path.join(dir,file),'utf8'));
        await connection.query('INSERT INTO schema_migrations(version,applied_at) VALUES(?,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at',[version]);
        await connection.commit();
      }catch(error){
        await connection.rollback();
        throw error;
      }
      applied.add(version);
    }
  }
  console.log('GenZ MySQL migrations complete.');
}finally{await connection.end();}
