export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'NO_SHOW';
export type Booking = { id:string; stationId:string; customerName:string; memberId?:string; startsAt:string; endsAt:string; status:BookingStatus; deposit:number; notes?:string };

export const bookings:Booking[]=[];
const id=()=>`BKG-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

export function listBookings(){ return bookings; }

export function createBooking(input:Omit<Booking,'id'|'status'> & {status?:BookingStatus}){
  const start=new Date(input.startsAt); const end=new Date(input.endsAt);
  if(Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end<=start) throw new Error('Invalid booking time range');
  const conflict=bookings.some(b=>b.stationId===input.stationId && !['CANCELLED','NO_SHOW'].includes(b.status) && start < new Date(b.endsAt) && end > new Date(b.startsAt));
  if(conflict) throw new Error('Station is already booked for this time');
  const booking:Booking={...input,id:id(),status:input.status||'CONFIRMED'}; bookings.push(booking); return booking;
}

export function cancelBooking(bookingId:string){ const booking=bookings.find(b=>b.id===bookingId); if(!booking) throw new Error('Booking not found'); booking.status='CANCELLED'; return booking; }
