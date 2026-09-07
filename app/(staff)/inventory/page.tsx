'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import InventoryTabs from './InventoryTabs';

type Item={id:string;name:string;category:string;onHand:number;reserved:number;available:number;reorderLevel:number;unit:string;lowStock:boolean;active:boolean};
type Reports={valuation:any[];cogs:any[]};
const money=(n:number)=>`₹${Number(n||0).toLocaleString('en-IN')}`;

export default function Inventory(){
 const[data,setData]=useState<Item[]>([]),[reports,setReports]=useState<Reports>({valuation:[],cogs:[]}),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{const [a,b]=await Promise.all([fetch('/api/inventory/materials?action=materials',{cache:'no-store'}),fetch('/api/inventory/materials?action=reports',{cache:'no-store'})]);const [d,r]=await Promise.all([a.json(),b.json()]);if(!a.ok)throw Error(d.error||'Unable to load stock');if(!b.ok)throw Error(r.error||'Unable to load inventory reports');setData((d.materials||[]).filter((x:Item)=>x.active!==false));setReports(r.reports||{valuation:[],cogs:[]});setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load inventory')}finally{setLoading(false)}},[]);
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[load]);
 const low=data.filter(x=>x.lowStock);const totalValue=reports.valuation.reduce((n,x)=>n+Number(x.value||0),0);const latestCogs=Number(reports.cogs[0]?.totalCogs||0);
 const topItems=useMemo(()=>[...data].sort((a,b)=>Number(b.onHand)-Number(a.onHand)).slice(0,8),[data]);
 return <main>
  <div className="pageHeader"><div><div className="eyebrow">Operations / Inventory</div><div className="title">Inventory</div><div className="muted">See stock health first. Open a dedicated section when you need to act.</div></div><div className="headerActions"><Link className="btn primary" href="/inventory/receiving">Receive stock</Link><Link className="btn" href="/inventory/stocktakes">Stocktake</Link></div></div>
  <InventoryTabs/>
  {error&&<div className="card loginError">{error}</div>}
  <section className="inventoryHero">
   <div className="card lead"><span className="label">Inventory value</span><strong>{money(totalValue)}</strong><span className="sub">Current on-hand valuation</span></div>
   <div className="card"><span className="label">Materials tracked</span><strong>{data.length}</strong><span className="sub">Active materials</span></div>
   <div className="card"><span className="label">Low stock</span><strong className={low.length?'danger':''}>{low.length}</strong><span className="sub">Needs attention</span></div>
   <div className="card"><span className="label">Latest COGS</span><strong>{money(latestCogs)}</strong><span className="sub">Most recent business day</span></div>
  </section>
  <section className="actionTileGrid section" style={{marginTop:0}}>
   <div className="card actionTile"><div><h3>Stock</h3><p>Review quantities, reservations and reorder levels.</p></div><Link className="btn" href="/inventory/stock">Open →</Link></div>
   <div className="card actionTile"><div><h3>Suppliers</h3><p>Manage supplier contacts and purchase relationships.</p></div><Link className="btn" href="/inventory/suppliers">Open →</Link></div>
   <div className="card actionTile"><div><h3>History</h3><p>Audit every receive, waste, adjustment and purchase.</p></div><Link className="btn" href="/inventory/history">Open →</Link></div>
  </section>
  <section className="card section"><div className="sectionHead"><div><div className="sectionTitle">Low stock</div><div className="muted">Prioritize items that are below their reorder level.</div></div><Link className="textLink" href="/inventory/stock">View all stock →</Link></div>{loading&&!data.length?<div className="emptyState">Loading stock…</div>:low.length?<div className="tableScroll"><table className="table"><thead><tr><th>Material</th><th>Available</th><th>Reorder level</th><th>Unit</th><th>Status</th></tr></thead><tbody>{low.slice(0,10).map(i=><tr key={i.id}><td><b>{i.name}</b><div className="muted">{i.category}</div></td><td className="danger"><b>{i.available}</b></td><td>{i.reorderLevel}</td><td>{i.unit}</td><td><span className="badge red">LOW STOCK</span></td></tr>)}</tbody></table></div>:<div className="emptyState">Stock levels look healthy.</div>}</section>
  <section className="card section"><div className="sectionHead"><div><div className="sectionTitle">Stock snapshot</div><div className="muted">Highest on-hand quantities right now.</div></div><span className="badge cyan">LIVE</span></div><div className="tableScroll"><table className="table"><thead><tr><th>Material</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Unit</th></tr></thead><tbody>{topItems.map(i=><tr key={i.id}><td><b>{i.name}</b><div className="muted">{i.category}</div></td><td>{i.onHand}</td><td>{i.reserved}</td><td>{i.available}</td><td>{i.unit}</td></tr>)}</tbody></table></div></section>
 </main>;
}
