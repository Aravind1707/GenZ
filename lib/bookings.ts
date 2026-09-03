import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { pool, transaction } from './mysql';

export type BookingStatus='PENDING'|'CONFIRMED'|'PAID'|'CANCELLED'|'NO_SHOW';
export type Booking={id:string;stationId:string;customerName:string;memberId?:string;startsAt:string;endsAt:string;status:BookingStatus;deposit:number;notes?:string;checkedInAt?:string};
type BookingRow=RowDataPacket & {id:string;station_id:string;customer_name:string;member_id:string|null;starts_at:Date;ends_at:Date;status:BookingStatus;deposit:number;notes:string|null;checked_in_at:Date|null};
const map=(b:BookingRow):Booking=>({id:b.id,stationId:b.station_id,customerName:b.customer_name,memberId:b.member_id||undefined,startsAt:new Date(b.starts_at).toISOString(),endsAt:new Date(b.ends_at).toISOString(),status:b.status,deposit:Number(b.deposit),notes:b.notes||undefined,checkedInAt:b.checked_in_at?new Date(b.checked_in_at).toISOString():undefined});

export async function listBookings(){const [rows]=await pool.query<BookingRow[]>('SELECT * FROM bookings ORDER BY starts_at ASC');return rows.map(map);}

export async function createBooking(input:Omit<Booking,'id'|'status'|'checkedInAt'>&{status?:BookingStatus}){
  const start=new Date(input.startsAt),end=new Date(input.endsAt); if(Number.isNaN(start.valueOf())||Number.isNaN(end.valueOf())||end<=start) throw new Error('Invalid booking time range');
  if(start.getTime()-Date.now()<0) throw new Error('Booking must start in the future');
  if(input.deposit<0||!Number.isSafeInteger(input.deposit)) throw new Error('Invalid deposit');
  return transaction(async(connection:PoolConnection)=>{
    const [station]=await connection.query<RowDataPacket[]>('SELECT id,status FROM stations WHERE id=? FOR UPDATE',[input.stationId]); if(!station.length) throw new Error('Station not found');
    if(['MAINTENANCE','BLOCKED'].includes(String(station[0].status))) throw new Error('Station cannot be booked');
    const [conflicts]=await connection.query<RowDataPacket[]>('SELECT id FROM bookings WHERE station_id=? AND status NOT IN (\'CANCELLED\',\'NO_SHOW\') AND starts_at < ? AND ends_at > ? LIMIT 1',[input.stationId,end,start]);
    if(conflicts.length) throw new Error('Station is already booked for this time');
    const booking:Booking={id:`BKG-${randomUUID()}`,stationId:input.stationId,customerName:input.customerName.trim().slice(0,120)||'Walk-in',memberId:input.memberId?.trim().slice(0,64),startsAt:start.toISOString(),endsAt:end.toISOString(),status:input.status==='PENDING'?'PENDING':'CONFIRMED',deposit:input.deposit,notes:input.notes?.trim().slice(0,500)};
    await connection.execute('INSERT INTO bookings(id,station_id,customer_name,member_id,starts_at,ends_at,status,deposit,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[booking.id,booking.stationId,booking.customerName,booking.memberId||null,booking.startsAt,booking.endsAt,booking.status,booking.deposit,booking.notes||null,new Date()]);
    return booking;
  });
}

export async function cancelBooking(bookingId:string){return transaction(async(connection:PoolConnection)=>{const [rows]=await connection.query<BookingRow[]>('SELECT * FROM bookings WHERE id=? FOR UPDATE',[bookingId]);if(!rows.length)throw new Error('Booking not found');if(['CANCELLED','NO_SHOW'].includes(rows[0].status))return map(rows[0]);await connection.execute('UPDATE bookings SET status=\'CANCELLED\' WHERE id=?',[bookingId]);return map({...rows[0],status:'CANCELLED'} as BookingRow);});}

export async function checkInBooking(bookingId:string){return transaction(async(connection:PoolConnection)=>{const [rows]=await connection.query<BookingRow[]>('SELECT * FROM bookings WHERE id=? FOR UPDATE',[bookingId]);const booking=rows[0];if(!booking)throw new Error('Booking not found');if(['CANCELLED','NO_SHOW'].includes(booking.status))throw new Error('Booking is not eligible for check-in');if(booking.checked_in_at)return map(booking);const checkedAt=new Date();await connection.execute('UPDATE bookings SET checked_in_at=? WHERE id=?',[checkedAt,bookingId]);const [fresh]=await connection.query<BookingRow[]>('SELECT * FROM bookings WHERE id=?',[bookingId]);return map(fresh[0]);});}

export async function markNoShow(bookingId:string){return transaction(async(connection:PoolConnection)=>{const [rows]=await connection.query<BookingRow[]>('SELECT * FROM bookings WHERE id=? FOR UPDATE',[bookingId]);const booking=rows[0];if(!booking)throw new Error('Booking not found');if(booking.status==='CANCELLED')throw new Error('Booking is cancelled');if(booking.status==='NO_SHOW')return map(booking);if(booking.checked_in_at)throw new Error('Checked-in booking cannot be marked no-show');if(new Date(booking.ends_at).getTime()>Date.now())throw new Error('Booking has not ended yet');await connection.execute('UPDATE bookings SET status=\'NO_SHOW\' WHERE id=?',[bookingId]);const [fresh]=await connection.query<BookingRow[]>('SELECT * FROM bookings WHERE id=?',[bookingId]);return map(fresh[0]);});}
