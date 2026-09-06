import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import type {RowDataPacket} from 'mysql2/promise';
import {COOKIE,requireStaff} from '../../../lib/staff-auth';
import {listSessions,listOrders,listStations} from '../../../lib/store';
import {financeSummary} from '../../../lib/finance';
import {calculateSessionBilling} from '../../../lib/gaming-billing';
import {pool} from '../../../lib/mysql';

function buildCustomerFlow(sessions: Awaited<ReturnType<typeof listSessions>>) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  return Array.from({length:24},(_,offset)=>{
    const bucketStart = new Date(now - (23 - offset) * hour);
    bucketStart.setMinutes(0,0,0);
    const bucketEnd = new Date(bucketStart.getTime() + hour);
    let checkins = 0;
    let checkouts = 0;
    for (const session of sessions) {
      const started = Date.parse(session.startedAt);
      const ended = session.endedAt ? Date.parse(session.endedAt) : NaN;
      if (started >= bucketStart.getTime() && started < bucketEnd.getTime()) checkins += 1;
      if (Number.isFinite(ended) && ended >= bucketStart.getTime() && ended < bucketEnd.getTime()) checkouts += 1;
    }
    return {hour: bucketStart.toISOString(), label: bucketStart.toLocaleTimeString('en-IN',{hour:'numeric'}), checkins, checkouts};
  });
}

export async function GET(){
  try {
    await requireStaff((await cookies()).get(COOKIE)?.value,'sessions:read');
    const [sessions,stations,orders,finance]=await Promise.all([listSessions(),listStations(),listOrders(),financeSummary()]);
    const liveSessions=await Promise.all(sessions.map(async s=>{
      if(s.status==='ENDED') return s;
      const billing=await calculateSessionBilling(s.id);
      const[foodRows]=await pool.query<RowDataPacket[]>('SELECT food_balance FROM sessions WHERE id=? LIMIT 1',[s.id]);
      return {...s,balance:billing.gamingTotal+Number(foodRows[0]?.food_balance||0)};
    }));
    const active=liveSessions.filter(s=>s.status==='ACTIVE'||s.status==='PAUSED');
    const outstanding=orders.filter(o=>o.paymentStatus!=='PAID'&&o.status!=='CANCELLED').reduce((n,o)=>n+o.total,0);
    const customerFlow=buildCustomerFlow(sessions);
    const peakCheckin=customerFlow.reduce((best,current)=>current.checkins>best.checkins?current:best,customerFlow[0]);
    const peakCheckout=customerFlow.reduce((best,current)=>current.checkouts>best.checkouts?current:best,customerFlow[0]);
    return NextResponse.json({ok:true,dashboard:{stations,sessions:liveSessions,orders,finance,activeCount:active.length,occupancy:stations.length?Math.round(active.length/stations.length*100):0,outstanding,customerFlow,peakCheckin,peakCheckout}},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    const m=e instanceof Error?e.message:'';
    return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});
  }
}
