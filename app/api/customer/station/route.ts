import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {pool} from '../../../../lib/mysql';
import {getCustomerByToken} from '../../../../lib/customer-auth';
import {consumeStationChallenge} from '../../../../lib/station-challenges';

export async function POST(req:Request){
 try{
  const len=Number(req.headers.get('content-length')||0);if(len>4096)return NextResponse.json({ok:false,error:'Request body too large'},{status:413});
  const body=await req.json();
  const stationId=typeof body?.stationId==='string'?body.stationId.trim():'';
  const challenge=typeof body?.challenge==='string'?body.challenge.trim():'';
  if(!stationId||stationId.length>64)return NextResponse.json({ok:false,error:'Invalid station QR'},{status:400});
  if(!challenge)return NextResponse.json({ok:false,code:'STATION_CHALLENGE_REQUIRED',error:'Scan the live QR displayed by the station.'},{status:428});
  const [s]=await pool.query<any[]>('SELECT id,name,type,status FROM stations WHERE id=? LIMIT 1',[stationId]);
  if(!s[0])return NextResponse.json({ok:false,error:'Station not found'},{status:404});
  const customerToken=(await cookies()).get('genz_customer')?.value;
  const customer=customerToken?await getCustomerByToken(customerToken):null;
  if(!customer)return NextResponse.json({ok:false,error:'Customer authentication required'},{status:401});
  const result=await consumeStationChallenge(stationId,challenge,customer.id);
  const [session]=await pool.query<any[]>('SELECT id,scheduled_end_at FROM sessions WHERE id=? LIMIT 1',[result.sessionId]);
  if(!session[0])return NextResponse.json({ok:false,error:'Unable to resolve active session'},{status:409});
  return NextResponse.json({ok:true,authenticated:true,station:{id:s[0].id,name:s[0].name,type:s[0].type},session:{id:session[0].id,stationId:s[0].id,scheduledEndAt:session[0].scheduled_end_at?new Date(session[0].scheduled_end_at).toISOString():null},participantId:result.participantId});
 }catch(e){
  const message=e instanceof Error?e.message:'';
  const status=message==='Station not found'?404:message==='Station challenge already used'?409:message.includes('challenge invalid')?409:message==='No active session is available for this station'?409:400;
  const error=message==='Station challenge already used'||message.includes('challenge invalid')?'This station QR has expired or was already used. Scan the current QR again.':message==='No active session is available for this station'?'There is no active session for this station.':'Unable to resolve station QR';
  return NextResponse.json({ok:false,error},{status});
 }
}
