import {NextResponse} from 'next/server';
import {authorizeStationAgent} from '../../../../lib/station-challenges';
import {getStationHeartbeat,recordStationHeartbeat} from '../../../../lib/station-agent-heartbeat';

export async function POST(request:Request){
  try{
    const len=Number(request.headers.get('content-length')||0); if(len>4096)return NextResponse.json({ok:false,error:'Request body too large'},{status:413});
    const body=await request.json();
    const stationId=typeof body?.stationId==='string'?body.stationId.trim():'';
    const secret=request.headers.get('x-genz-station-secret')||'';
    if(!stationId||!authorizeStationAgent(stationId,secret))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
    const result=await recordStationHeartbeat({stationId,agentId:String(body.agentId||'').trim(),state:body.state,sessionId:body.sessionId?String(body.sessionId):null,observedAt:String(body.observedAt||''),version:String(body.version||'').trim()});
    return NextResponse.json({ok:true,heartbeat:result},{headers:{'cache-control':'no-store'}});
  }catch(e){const message=e instanceof Error?e.message:'Unable to record heartbeat';const status=message==='Unauthorized'?401:message==='Station not found'?404:400;return NextResponse.json({ok:false,error:message},{status});}
}

export async function GET(request:Request){
  try{
    const url=new URL(request.url);const stationId=(url.searchParams.get('stationId')||'').trim();const secret=request.headers.get('x-genz-station-secret')||'';
    if(!stationId||!authorizeStationAgent(stationId,secret))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
    return NextResponse.json({ok:true,heartbeat:await getStationHeartbeat(stationId)},{headers:{'cache-control':'no-store'}});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to read heartbeat'},{status:400});}
}
