import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {transaction} from './mysql';

const METHODS=['CASH','UPI','CARD','RAZORPAY','OTHER'] as const;
type Method=typeof METHODS[number];
const money=(v:unknown)=>Number(v||0);
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export type DailyCloseReport={date:string;status:'OPEN'|'BALANCED'|'TIMING_DIFFERENCE';tenders:Record<Method,number>;tenderGross:number;refunds:Record<Method,number>;refundTotal:number;tenderNet:number;operatingExpenses:Record<Method,number>;operatingExpenseTotal:number;cashDrawerNet:number;actualCash:number|null;cashVariance:number|null;earnedRevenue:number;creditSales:number;creditRepayments:number;bookingDeposits:number;reconciliationDifference:number;categoryBreakdown:Array<{category:string;method:string;amount:number}>};

export async function getDailyCloseReport(date:string):Promise<DailyCloseReport>{
  if(!validDate(date))throw Error('INVALID_CLOSE_DATE');
  return transaction(async(c)=>{
    const start=`${date} 00:00:00`,end=`${date} 23:59:59.999`;
    const[rows]=await c.query<RowDataPacket[]>(`SELECT type,category,method,amount FROM finance_transactions WHERE created_at>=? AND created_at<=? ORDER BY created_at,id`,[start,end]);
    const[counts]=await c.query<RowDataPacket[]>('SELECT counted_cash,notes,counted_by,counted_at FROM daily_cash_counts WHERE business_date=? LIMIT 1',[date]);
    const tenders=Object.fromEntries(METHODS.map(m=>[m,0])) as Record<Method,number>;
    const refunds=Object.fromEntries(METHODS.map(m=>[m,0])) as Record<Method,number>;
    const operatingExpenses=Object.fromEntries(METHODS.map(m=>[m,0])) as Record<Method,number>;
    let earnedRevenue=0,creditSales=0,creditRepayments=0,bookingDeposits=0;
    const categoryMap=new Map<string,{category:string;method:string;amount:number}>();
    for(const row of rows){
      const type=String(row.type),category=String(row.category),method=String(row.method) as Method,amount=money(row.amount);
      if(!METHODS.includes(method)||amount<=0)continue;
      if(type==='REVENUE'){
        if(category==='CREDIT_SALE'){creditSales+=amount;earnedRevenue+=amount;continue;}
        if(category==='CREDIT_REPAYMENT'){creditRepayments+=amount;tenders[method]+=amount;continue;}
        if(category==='BOOKING_DEPOSIT_ADVANCE'){bookingDeposits+=amount;tenders[method]+=amount;continue;}
        tenders[method]+=amount;earnedRevenue+=amount;
        const key=`${category}:${method}`;const item=categoryMap.get(key)||{category,method,amount:0};item.amount+=amount;categoryMap.set(key,item);
      }else if(type==='EXPENSE'){
        if(['PAYMENT_REFUND','PAYMENT_REVERSAL','BOOKING_DEPOSIT_REFUND'].includes(category))refunds[method]+=amount;
        else operatingExpenses[method]+=amount;
      }
    }
    const tenderGross=METHODS.reduce((n,m)=>n+tenders[m],0),refundTotal=METHODS.reduce((n,m)=>n+refunds[m],0),tenderNet=tenderGross-refundTotal;
    const operatingExpenseTotal=METHODS.reduce((n,m)=>n+operatingExpenses[m],0);
    const cashDrawerNet=tenders.CASH-refunds.CASH-operatingExpenses.CASH;
    const actualCash=counts[0]?money(counts[0].counted_cash):null;
    const cashVariance=actualCash===null?null:actualCash-cashDrawerNet;
    const reconciliationDifference=tenderNet-earnedRevenue;
    const status=actualCash===null?'OPEN':(reconciliationDifference===0&&cashVariance===0?'BALANCED':'TIMING_DIFFERENCE');
    return{date,status,tenders,tenderGross,refunds,refundTotal,tenderNet,operatingExpenses,operatingExpenseTotal,cashDrawerNet,actualCash,cashVariance,earnedRevenue,creditSales,creditRepayments,bookingDeposits,reconciliationDifference,categoryBreakdown:Array.from(categoryMap.values()).sort((a,b)=>b.amount-a.amount).slice(0,50)};
  });
}

export async function recordDailyCashCount(input:{date:string;countedCash:number;notes?:string;staffId:string}){
  const date=input.date.trim(),countedCash=Number(input.countedCash);
  if(!validDate(date)||!Number.isSafeInteger(countedCash)||countedCash<0)throw Error('INVALID_CASH_COUNT');
  return transaction(async(c:PoolConnection)=>{
    await c.execute(`INSERT INTO daily_cash_counts(business_date,counted_cash,notes,counted_by,counted_at,updated_at) VALUES(?,?,?,?,NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE counted_cash=VALUES(counted_cash),notes=VALUES(notes),counted_by=VALUES(counted_by),updated_at=NOW(3)`,[date,countedCash,input.notes?.trim().slice(0,255)||null,input.staffId]);
    const[rows]=await c.query<RowDataPacket[]>('SELECT business_date,counted_cash,notes,counted_by,counted_at,updated_at FROM daily_cash_counts WHERE business_date=? LIMIT 1',[date]);
    return rows[0];
  });
}
