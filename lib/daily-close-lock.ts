import type {PoolConnection} from 'mysql2/promise';
export async function assertDailyCloseOpen(c:PoolConnection,date:string){const[rows]=await c.query<{status:string}[]>('SELECT status FROM daily_cash_counts WHERE business_date=? LIMIT 1',[date]);if(rows[0]?.status==='APPROVED')throw Error('DAILY_CLOSE_PERIOD_LOCKED');}
