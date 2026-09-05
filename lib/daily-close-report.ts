import type {RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';
import {netTenderTotal} from './daily-close';

const METHODS=['CASH','UPI','CARD','RAZORPAY','OTHER'] as const;
type Method=typeof METHODS[number];
const money=(v:unknown)=>Number(v||0);
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export type DailyCloseReport={date:string;status:'OPEN'|'BALANCED'|'TIMING_DIFFERENCE';tenders:Record<Method,number>;tenderGross:number;refunds:Record<Method,number>;refundTotal:number;tenderNet:number;operatingExpenses:Record<Method,number>;operatingExpenseTotal:number;cashDrawerNet:number;earnedRevenue:number;creditSales:number;creditRepayments:number;bookingDeposits:number;reconciliationDifference:number;categoryBreakdown:Array<{category:string;method:string;amount:number}>};

export async function getDailyCloseReport(date:string):Promise<DailyCloseReport>{
  if(!validDate(date))throw Error('INVALID_CLOSE_DATE');
  return transaction(async(c)=>{
    const start=`${date} 00:00:00`,end=`${date} 23:59:59.999`;
    const[rows]=await c.query<RowDataPacket[]>(`SELECT type,category,method,amount FROM finance_transactions WHERE created_at>=? AND created_at<=? ORDER BY created_at,id`,[start,end]);
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
    const tenderGross=METHODS.reduce((n,m)=>n+tenders[m],0),refundTotal=METHODS.reduce((n,m)=>n+refunds[m],0),tenderNet=netTenderTotal({cash:BigInt(tenders.CASH),upi:BigInt(tenders.UPI),card:BigInt(tenders.CARD),other:BigInt(tenders.RAZORPAY+tenders.OTHER),refunds:BigInt(refundTotal)});
    const operatingExpenseTotal=METHODS.reduce((n,m)=>n+operatingExpenses[m],0);
    const cashDrawerNet=tenders.CASH-refunds.CASH-operatingExpenses.CASH;
    const reconciliationDifference=Number(tenderNet)-earnedRevenue;
    return{date,status:reconciliationDifference===0?'BALANCED':'TIMING_DIFFERENCE',tenders,tenderGross,refunds,refundTotal,tenderNet:Number(tenderNet),operatingExpenses,operatingExpenseTotal,cashDrawerNet,earnedRevenue,creditSales,creditRepayments,bookingDeposits,reconciliationDifference,categoryBreakdown:Array.from(categoryMap.values()).sort((a,b)=>b.amount-a.amount).slice(0,50)};
  });
}
