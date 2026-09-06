'use client';
import {useEffect,useMemo,useState} from 'react';

type FlowPoint={hour:string;label:string;checkins:number;checkouts:number};
type Data={stations:any[];sessions:any[];orders:any[];finance:any;activeCount:number;occupancy:number;outstanding:number;customerFlow:FlowPoint[];peakCheckin:FlowPoint;peakCheckout:FlowPoint};

const money=(n:number)=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const statusClass=(s:string)=>s==='ACTIVE'||s==='PAID'||s==='DELIVERED'?'green':s==='MAINTENANCE'||s==='CANCELLED'?'red':s==='BOOKED'||s==='PREPARING'?'amber':'cyan';

function FlowChart({data}:{data:FlowPoint[]}){
  const max=Math.max(1,...data.flatMap(x=>[x.checkins,x.checkouts]));
  const width=900,height=270,padX=36,padTop=28,padBottom=42,plotH=height-padTop-padBottom,plotW=width-padX*2;
  const points=(key:'checkins'|'checkouts')=>data.map((x,i)=>`${padX+(i/(Math.max(1,data.length-1)))*plotW},${padTop+plotH-(x[key]/max)*plotH}`).join(' ');
  const grid=[0,.25,.5,.75,1];
  return <div className="chartWrap">
    <div className="chartLegend"><span><i className="legendDot checkin"/>Check-ins</span><span><i className="legendDot checkout"/>Check-outs</span><span className="muted">Last 24 hours</span></div>
    <svg className="flowChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Customer check-ins and check-outs over the last 24 hours">
      {grid.map((g)=><line key={g} x1={padX} x2={width-padX} y1={padTop+plotH-g*plotH} y2={padTop+plotH-g*plotH} className="chartGrid"/>)}
      <polyline points={points('checkins')} className="chartLine checkinLine"/>
      <polyline points={points('checkouts')} className="chartLine checkoutLine"/>
      {data.map((x,i)=>{const cx=padX+(i/(Math.max(1,data.length-1)))*plotW;const y1=padTop+plotH-(x.checkins/max)*plotH;const y2=padTop+plotH-(x.checkouts/max)*plotH;return <g key={x.hour}><circle cx={cx} cy={y1} r="4" className="chartPoint checkinPoint"/><circle cx={cx} cy={y2} r="4" className="chartPoint checkoutPoint"/>{i%3===0&&<text x={cx} y={height-14} textAnchor="middle" className="chartAxis">{x.label}</text>}</g>})}
    </svg>
  </div>;
}

export default function Home(){
  const[data,setData]=useState<Data|null>(null);const[error,setError]=useState('');
  useEffect(()=>{let alive=true;const load=async()=>{const r=await fetch('/api/dashboard',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load dashboard');if(alive)setData(d.dashboard)};load().catch(e=>alive&&setError(e.message));const t=setInterval(()=>load().catch(()=>{}),10000);return()=>{alive=false;clearInterval(t)}},[]);
  const flowSummary=useMemo(()=>{if(!data)return null;const arrivals=data.customerFlow.reduce((n,x)=>n+x.checkins,0);const departures=data.customerFlow.reduce((n,x)=>n+x.checkouts,0);return{arrivals,departures,net:arrivals-departures}},[data]);
  if(!data)return <main><div className="pageHeader"><div><div className="eyebrow">GenZ OS / Overview</div><div className="title">Cafe dashboard</div><div className="muted">{error||'Loading live operations…'}</div></div></div></main>;
  const activeOrders=data.orders.filter(o=>!['DELIVERED','CANCELLED'].includes(o.status));
  const activeSessions=data.sessions.filter(s=>s.status!=='ENDED').slice(0,10);
  return <main>
    <div className="pageHeader"><div><div className="eyebrow">GenZ OS / Overview</div><div className="title">Cafe dashboard</div><div className="muted">A live view of the floor, customer traffic, food queue and money.</div></div><div className="headerActions"><span className="liveIndicator"><i/> Live</span><span className="muted">Updates every 10s</span></div></div>
    <section className="kpiGrid">
      <div className="metricCard"><span className="metricLabel">Revenue today</span><strong>{money(data.finance.revenue)}</strong><span className="metricHint">Gaming + food paid</span></div>
      <div className="metricCard"><span className="metricLabel">Active players</span><strong>{data.activeCount}<small> / {data.stations.length}</small></strong><span className="metricHint">{data.occupancy}% floor occupancy</span></div>
      <div className="metricCard"><span className="metricLabel">Food queue</span><strong>{activeOrders.length}</strong><span className="metricHint">Orders needing action</span></div>
      <div className="metricCard warning"><span className="metricLabel">Outstanding</span><strong>{money(data.outstanding)}</strong><span className="metricHint">Unpaid food orders</span></div>
    </section>

    <section className="sectionGrid dashboardMain">
      <div className="card chartCard"><div className="sectionHead"><div><div className="sectionTitle">Customer flow</div><div className="muted">When customers enter and leave the café</div></div><span className="badge cyan">24H</span></div><FlowChart data={data.customerFlow}/><div className="flowInsights"><div><span>Arrivals</span><b>{flowSummary?.arrivals||0}</b></div><div><span>Departures</span><b>{flowSummary?.departures||0}</b></div><div><span>Peak entry</span><b>{data.peakCheckin?.label||'—'} <small>{data.peakCheckin?.checkins||0}</small></b></div><div><span>Peak exit</span><b>{data.peakCheckout?.label||'—'} <small>{data.peakCheckout?.checkouts||0}</small></b></div></div></div>
      <div className="card insightCard"><div className="sectionHead"><div><div className="sectionTitle">Traffic insight</div><div className="muted">Use this to plan staffing and promotions</div></div></div><div className="insightHero"><span className="eyebrow">Busiest entry window</span><strong>{data.peakCheckin?.label||'—'}</strong><span>{data.peakCheckin?.checkins||0} customer check-ins in that hour</span></div><div className="insightRows"><div><span>Net change, 24h</span><b className={(flowSummary?.net||0)>=0?'green':'danger'}>{(flowSummary?.net||0)>=0?'+':''}{flowSummary?.net||0}</b></div><div><span>Peak exit</span><b>{data.peakCheckout?.label||'—'}</b></div><div><span>Current occupancy</span><b>{data.occupancy}%</b></div></div></div>
    </section>

    <section className="sectionGrid dashboardLower">
      <div className="card"><div className="sectionHead"><div><div className="sectionTitle">Live floor</div><div className="muted">Every station at a glance</div></div><a className="textLink" href="/stations">Open stations →</a></div><div className="stationGrid compact">{data.stations.map(s=><div className="stationCard" key={s.id}><div className="stationTop"><b>{s.name}</b><span className={`badge ${statusClass(s.status)}`}>{s.status}</span></div><div className="stationRate">{money(s.hourlyRate)}<small>/hr</small></div><span className="muted">{s.type} · {s.slotMinutes} min slots</span></div>)}</div></div>
      <div className="card"><div className="sectionHead"><div><div className="sectionTitle">Kitchen queue</div><div className="muted">Orders requiring attention</div></div><a className="textLink" href="/kitchen">Open kitchen →</a></div>{activeOrders.slice(0,6).map(o=><div className="queueRow" key={o.id}><div><b>{o.items.map((i:any)=>`${i.qty}× ${i.name}`).join(', ')}</b><span>{o.id.slice(-8)} · {o.stationId}</span></div><span className={`badge ${statusClass(o.status)}`}>{o.status}</span></div>)}{!activeOrders.length&&<div className="emptyState">Kitchen queue is clear.</div>}</div>
    </section>

    <section className="card"><div className="sectionHead"><div><div className="sectionTitle">Active sessions</div><div className="muted">Current players and running tabs</div></div><a className="textLink" href="/sessions">Manage sessions →</a></div><div className="tableScroll"><table className="table"><thead><tr><th>Station</th><th>Customer</th><th>Started</th><th>Session total</th><th>Status</th></tr></thead><tbody>{activeSessions.map(s=><tr key={s.id}><td><b>{s.stationId}</b></td><td>{s.customerName}</td><td>{new Date(s.startedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td><td>{money(s.balance)}</td><td><span className={`badge ${statusClass(s.status)}`}>{s.status}</span></td></tr>)}</tbody></table></div>{!activeSessions.length&&<div className="emptyState">No active sessions right now.</div>}</section>
  </main>;
}
