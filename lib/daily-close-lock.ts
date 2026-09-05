import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
export async function assertDailyCloseOpen(c:PoolConnection){const[rows]=await c.query<(RowDataPacket&{status:string})[]>('SELECT status FROM daily_cash_counts WHERE business_date=CURDATE() LIMIT 1');if(rows[0]?.status==='APPROVED')throw Error('DAILY_CLOSE_PERIOD_LOCKED');}
