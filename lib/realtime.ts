import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from './mysql';
export type GenZEventType='SESSION_CREATED'|'SESSION_UPDATED'|'SESSION_ENDED'|'PARTICIPANT_JOINED'|'PARTICIPANT_LEFT'|'BILLING_UPDATED'|'ORDER_CREATED'|'ORDER_STATUS_CHANGED'|'PAYMENT_CAPTURED'|'BOOKING_CREATED'|'BOOKING_UPDATED'|'STATION_STATUS_CHANGED'|'INVENTORY_CHANGED';
export type GenZEvent={id:string;type:GenZEventType;createdAt:string;data:Record<string,unknown>};
const bus=new EventEmitter();bus.setMaxListeners(1000);
export const publish=(type:GenZEventType,data:Record<string,unknown>={})=>{const event:GenZEvent={id:randomUUID(),type,createdAt:new Date().toISOString(),data};void pool.execute('INSERT INTO realtime_events(id,type,created_at,data) VALUES(?,?,?,?)',[event.id,event.type,new Date(event.createdAt),JSON.stringify(event.data)]).catch(()=>{});bus.emit('event',event);return event};
export const subscribe=(listener:(event:GenZEvent)=>void)=>{bus.on('event',listener);return()=>bus.off('event',listener)};
export async function replay(since?:string,limit=200){const safe=Math.min(Math.max(Math.floor(limit),1),500);const cursor=since&&Number.isFinite(Date.parse(since))?new Date(since):new Date(Date.now()-5*60*1000);const[rows]=await pool.query<RowDataPacket[]>(`SELECT id,type,created_at,data FROM realtime_events WHERE created_at>=? ORDER BY created_at,id LIMIT ${safe}`,[cursor]);return rows.map(r=>({id:String(r.id),type:String(r.type) as GenZEventType,createdAt:new Date(r.created_at).toISOString(),data:typeof r.data==='string'?JSON.parse(r.data):r.data as Record<string,unknown>}));}
