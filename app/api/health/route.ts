import {NextResponse} from 'next/server';
import {pool} from '../../../../lib/mysql';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){
  const started=Date.now();
  try{
    const[[db]] = await pool.query<any[]>('SELECT 1 AS ok');
    const[[migration]] = await pool.query<any[]>('SELECT MAX(version) AS version FROM schema_migrations');
    return NextResponse.json({ok:true,status:'ready',database:Number(db.ok)===1,latestMigration:Number(migration.version||0),latencyMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({ok:false,status:'not_ready',database:false,latencyMs:Date.now()-started},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
