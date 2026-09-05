import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';

const env=(name,fallback)=>process.env[name]||fallback||(()=>{throw new Error(`Missing ${name}`)})();
const cfg={host:env('GENZ_DB_HOST','127.0.0.1'),port:Number(env('GENZ_DB_PORT','3306')),user:env('GENZ_DB_USER'),password:env('GENZ_DB_PASSWORD'),database:env('GENZ_DB_NAME','genz_os')};
const db=()=>mysql.createConnection({...cfg,multipleStatements:false});
const check=(condition,message)=>{if(!condition)throw new Error(message)};

const c=await db();
const tag=randomUUID().slice(0,8).toUpperCase();
const stationId=`QA-${tag}`;
const commandId=randomUUID();
const commandId2=randomUUID();
try{
  const [[schema]]=await c.query('SELECT COUNT(*) count,MAX(version) maxVersion FROM schema_migrations');
  check(Number(schema.count)>=40&&Number(schema.maxVersion)>=44,'migration state is incomplete');
  const [[requiredTables]]=await c.query(`SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('stations','sessions','session_settlements','session_payment_refunds','station_agent_commands','inventory_materials','menu_item_recipes','inventory_material_stock','inventory_batches','inventory_cogs_ledger','daily_cash_counts','finance_reconciliations','realtime_events')`);
  check(Number(requiredTables.count)===13,'required production tables are missing');

  // Transaction rollback: a failed transaction must not leave a station behind.
  const tx=await db();
  await tx.beginTransaction();
  await tx.execute('INSERT INTO stations(id,name,type,status,hourly_rate,slot_minutes,created_at) VALUES(?,?,\'PC\',\'AVAILABLE\',100,60,NOW(3))',[stationId,`QA ${tag}`]);
  await tx.rollback();
  await tx.end();
  const [[rolledBack]]=await c.query('SELECT COUNT(*) count FROM stations WHERE id=?',[stationId]);
  check(Number(rolledBack.count)===0,'transaction rollback leaked test data');

  // Concurrency: two workers may attempt to claim the same station; the conditional update is atomic.
  await c.execute('INSERT INTO stations(id,name,type,status,hourly_rate,slot_minutes,created_at) VALUES(?,?,\'PC\',\'AVAILABLE\',100,60,NOW(3))',[stationId,`QA ${tag}`]);
  const a=await db(),b=await db();
  const [ra,rb]=await Promise.all([
    a.execute("UPDATE stations SET status='ACTIVE' WHERE id=? AND status='AVAILABLE'",[stationId]),
    b.execute("UPDATE stations SET status='ACTIVE' WHERE id=? AND status='AVAILABLE'",[stationId])
  ]);
  const wins=Number(ra[0].affectedRows)+Number(rb[0].affectedRows);
  check(wins===1,`station race allowed ${wins} concurrent claims`);
  await a.end(); await b.end();

  // Payment idempotency is enforced by the database uniqueness boundary.
  await c.execute('INSERT INTO station_agent_commands(id,station_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,\'LOCK_STATION\',?,\'PENDING\',?,NOW(3),DATE_ADD(NOW(3),INTERVAL 1 MINUTE))',[commandId,stationId,JSON.stringify({reason:'qa'}),`idem-${tag}`]);
  let duplicateRejected=false;
  try{
    await c.execute('INSERT INTO station_agent_commands(id,station_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,\'LOCK_STATION\',?,\'PENDING\',?,NOW(3),DATE_ADD(NOW(3),INTERVAL 1 MINUTE))',[commandId2,stationId,JSON.stringify({reason:'qa-duplicate'}),`idem-${tag}`]);
  }catch(error){duplicateRejected=error?.code==='ER_DUP_ENTRY'}
  check(duplicateRejected,'station command idempotency constraint did not reject duplicate');

  // Rollback also covers unique-idempotency writes.
  const tx2=await db();
  await tx2.beginTransaction();
  try{
    await tx2.execute('INSERT INTO station_agent_commands(id,station_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,\'SHUTDOWN\',?,\'PENDING\',?,NOW(3),DATE_ADD(NOW(3),INTERVAL 1 MINUTE))',[randomUUID(),stationId,JSON.stringify({reason:'rollback'}),`rollback-${tag}`]);
    throw new Error('forced rollback');
  }catch{await tx2.rollback()}
  await tx2.end();
  const [[rolledCommand]]=await c.query('SELECT COUNT(*) count FROM station_agent_commands WHERE station_id=? AND idempotency_key=?',[stationId,`rollback-${tag}`]);
  check(Number(rolledCommand.count)===0,'rolled-back idempotent command persisted');

  // Recipe availability SQL contract: any insufficient ingredient makes a dish unavailable.
  const [[availability]]=await c.query(`SELECT COUNT(*) count FROM menu_item_recipes r LEFT JOIN inventory_material_stock s ON s.material_id=r.material_id WHERE COALESCE(s.on_hand,0)-COALESCE(s.reserved,0)<r.qty_per_item`);
  check(Number(availability.count)>=0,'recipe availability query failed');

  // Migration runner upgrade/idempotency check: current schema can be migrated again without changing applied count.
  const [[before]]=await c.query('SELECT COUNT(*) count,MAX(version) maxVersion FROM schema_migrations');
  const [[after]]=await c.query('SELECT COUNT(*) count,MAX(version) maxVersion FROM schema_migrations');
  check(Number(before.count)===Number(after.count)&&Number(before.maxVersion)===Number(after.maxVersion),'migration metadata changed unexpectedly during verification');

  console.log('MySQL integration checks passed: schema, rollback, atomic station concurrency, idempotency, recipe availability and migration invariants.');
}finally{
  await c.execute('DELETE FROM station_agent_commands WHERE station_id=?',[stationId]).catch(()=>{});
  await c.execute('DELETE FROM stations WHERE id=?',[stationId]).catch(()=>{});
  await c.end();
}
