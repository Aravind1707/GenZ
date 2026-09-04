import {NextResponse} from 'next/server';
import {authorizeStationAgent,issueStationChallenge} from '../../../../lib/station-challenges';

export async function POST(request:Request){
  try{
    const len=Number(request.headers.get('content-length')||0);if(len>2048)return NextResponse.json({ok:false,error:'Request body too large'},{status:413});
    const body=await request.json();
    const stationId=typeof body?.stationId==='string'?body.stationId.trim():'';
    const secret=request.headers.get('x-genz-station-secret')||'';
    if(!stationId||stationId.length>64||!authorizeStationAgent(stationId,secret))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
    const challenge=await issueStationChallenge(stationId);
    return NextResponse.json({ok:true,challenge});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error&&e.message==='Station not found'?'Station not found':'Unable to issue station challenge'},{status:400});}
}
