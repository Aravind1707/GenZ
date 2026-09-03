import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';

export type GenZEventType='SESSION_CREATED'|'SESSION_UPDATED'|'SESSION_ENDED'|'PARTICIPANT_JOINED'|'PARTICIPANT_LEFT'|'BILLING_UPDATED'|'ORDER_CREATED'|'ORDER_STATUS_CHANGED'|'PAYMENT_CAPTURED'|'BOOKING_CREATED'|'BOOKING_UPDATED'|'STATION_STATUS_CHANGED'|'INVENTORY_CHANGED';
export type GenZEvent={id:string;type:GenZEventType;createdAt:string;data:Record<string,unknown>};
const bus=new EventEmitter();bus.setMaxListeners(1000);
export const publish=(type:GenZEventType,data:Record<string,unknown>={})=>{const event:GenZEvent={id:randomUUID(),type,createdAt:new Date().toISOString(),data};bus.emit('event',event);return event};
export const subscribe=(listener:(event:GenZEvent)=>void)=>{bus.on('event',listener);return()=>bus.off('event',listener)};
