import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';
import {isStationAgentState,type StationAgentHeartbeat} from './station-agent-protocol';

const MAX_CLOCK_SKEW_MS=5*60*1000;

export async function recordStationHeartbeat(input:StationAgentHeartbeat){
  if(!input.stationId||input.stationId.length>64) throw new Error('Invalid station id');
  if(!input.agentId||input.agentId.length>128) throw new Error('Invalid agent id');
  if(!isStationAgentState(input.state)) throw new Error('Invalid station state');
  if(!input.version||input.version.length>64) throw new Error('Invalid agent version');
  const observed=Date.parse(input.observedAt);
  if(Number.isNaN(observed)||Math.abs(Date.now()-observed)>MAX_CLOCK_SKEW_MS) throw new Error('Heartbeat timestamp outside allowed clock skew');
  return transaction(async(c:PoolConnection)=>{
    const [stations]=await c.query<RowDataPacket[]>('SELECT id FROM stations WHERE id=? LIMIT 1',[input.stationId]);
    if(!stations[0]) throw new Error('Station not found');
    if(input.sessionId){
      const [sessions]=await c.query<RowDataPacket[]>("SELECT id,station_id,status FROM sessions WHERE id=? LIMIT 1",[input.sessionId]);
      if(!sessions[0]||String(sessions[0].station_id)!==input.stationId) throw new Error('Session does not belong to station');
    }
    await c.execute(`INSERT INTO station_agent_heartbeats(station_id,agent_id,state,session_id,agent_version,observed_at,received_at)
      VALUES(?,?,?,?,?,FROM_UNIXTIME(?/1000),NOW(3))
      ON DUPLICATE KEY UPDATE agent_id=VALUES(agent_id),state=VALUES(state),session_id=VALUES(session_id),agent_version=VALUES(agent_version),observed_at=VALUES(observed_at),received_at=NOW(3)`,
      [input.stationId,input.agentId,input.state,input.sessionId||null,input.version,observed]);
    return {stationId:input.stationId,receivedAt:new Date().toISOString()};
  });
}

export async function getStationHeartbeat(stationId:string){
  const [rows]=await pool.query<RowDataPacket[]>('SELECT station_id,agent_id,state,session_id,agent_version,observed_at,received_at FROM station_agent_heartbeats WHERE station_id=? LIMIT 1',[stationId]);
  const row=rows[0];
  if(!row)return null;
  return {stationId:String(row.station_id),agentId:String(row.agent_id),state:String(row.state),sessionId:row.session_id?String(row.session_id):null,version:String(row.agent_version),observedAt:new Date(row.observed_at).toISOString(),receivedAt:new Date(row.received_at).toISOString()};
}
