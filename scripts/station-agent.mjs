import http from 'node:http';
import {exec} from 'node:child_process';
import QRCode from 'qrcode';

const serverUrl=(process.env.GENZ_SERVER_URL||'http://localhost:3000').replace(/\/$/,'');
const stationId=(process.env.GENZ_STATION_ID||'').trim();
const secret=process.env.GENZ_STATION_AGENT_SECRET||'';
const port=Number(process.env.GENZ_STATION_AGENT_PORT||17800);
const agentId=(process.env.GENZ_STATION_AGENT_ID||`${stationId}-${process.pid}`).slice(0,128);
const version=(process.env.GENZ_STATION_AGENT_VERSION||'0.1.0').slice(0,64);
let agentState='IDLE';
let currentSessionId=null;

if(!stationId||!secret||secret.length<32)throw new Error('Set GENZ_STATION_ID and a 32+ character GENZ_STATION_AGENT_SECRET.');

async function getChallenge(){
  const response=await fetch(`${serverUrl}/api/station-agent/challenge`,{method:'POST',headers:{'content-type':'application/json','x-genz-station-secret':secret},body:JSON.stringify({stationId})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw new Error(data.error||`Challenge request failed (${response.status})`);
  return data.challenge;
}

async function heartbeat(){
  try{
    await fetch(`${serverUrl}/api/station-agent/heartbeat`,{method:'POST',headers:{'content-type':'application/json','x-genz-station-secret':secret},body:JSON.stringify({stationId,agentId,state:agentState,sessionId:currentSessionId,observedAt:new Date().toISOString(),version})});
  }catch(error){console.error('Heartbeat failed:',error instanceof Error?error.message:error);}
}

async function render(res){
  try{
    const challenge=await getChallenge();
    const target=`${serverUrl}/customer?stationId=${encodeURIComponent(stationId)}&challenge=${encodeURIComponent(challenge.challenge)}`;
    const qr=await QRCode.toDataURL(target,{width:520,margin:2,errorCorrectionLevel:'M'});
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="45"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GenZ ${stationId}</title><style>html,body{margin:0;min-height:100%;background:#050505;color:#fff;font-family:Arial,sans-serif}body{display:grid;place-items:center;padding:24px;box-sizing:border-box}.wrap{text-align:center}.label{font-size:42px;font-weight:800;letter-spacing:2px;margin-bottom:8px}.hint{color:#aaa;font-size:18px;margin-bottom:24px}img{width:min(70vw,520px);height:auto;background:#fff;padding:12px;border-radius:18px}.ttl{margin-top:18px;color:#aaa;font-size:16px}</style></head><body><div class="wrap"><div class="label">${stationId}</div><div class="hint">Scan to connect your phone to this station</div><img src="${qr}" alt="Live station QR"><div class="ttl">This QR refreshes automatically</div></div></body></html>`;
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
  }catch(error){res.writeHead(503,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end(error instanceof Error?error.message:'Station agent unavailable');}
}

const server=http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/health'){res.writeHead(404);return res.end('Not found');}if(req.url==='/health'){res.writeHead(200,{'content-type':'text/plain'});return res.end('ok');}return render(res);});
server.listen(port,'127.0.0.1',()=>{console.log(`GenZ station agent: ${stationId} (${agentId})`);console.log(`QR display: http://127.0.0.1:${port}/`);heartbeat();setInterval(heartbeat,15000);if(process.platform==='win32')exec(`start "" "http://127.0.0.1:${port}/"`);else if(process.platform==='darwin')exec(`open "http://127.0.0.1:${port}/"`);else exec(`xdg-open "http://127.0.0.1:${port}/"`);});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
