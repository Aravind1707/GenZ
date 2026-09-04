import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {getCustomerByToken} from '../../../../../lib/customer-auth';
import {calculateSessionBilling} from '../../../../../lib/gaming-billing';
import {pool} from '../../../../../lib/mysql';

export async function GET(req:Request){
 try{
  const token=(await cookies()).get('genz_customer')?.value;
  const customer=token?await getCustomerByToken(token):null;
  if(!customer)return NextResponse.json({ok:false,error:'Login required'},{status:401});
  const sessionId=new URL(req.url).searchParams.get('sessionId')||'';
  if(!sessionId||sessionId.length>64)return NextResponse.json({ok:false,error:'Invalid session'},{status:400});
  const[p]=await pool.query<any[]>('SELECT 1 FROM session_participants WHERE session_id=? AND customer_id=? AND active=TRUE LIMIT 1',[sessionId,customer.id]);
  if(!p[0])return NextResponse.json({ok:false,error:'You are not a participant in this session'},{status:403});
  const billing=await calculateSessionBilling(sessionId);
  return NextResponse.json({ok:true,billing},{headers:{'Cache-Control':'private,no-store'}});
 }catch{
  return NextResponse.json({ok:false,error:'Unable to load billing'},{status:500});
 }
}
