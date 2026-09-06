'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';

type Role='OWNER'|'MANAGER';
type Staff={name:string;username:string;role:Role};

type NavItem={href:string;label:string;permission?:string;ownerOnly?:boolean};
const nav:NavItem[]=[
  {href:'/',label:'Dashboard',permission:'sessions:read'},
  {href:'/sessions',label:'Sessions',permission:'sessions:read'},
  {href:'/settlements',label:'Settlements',permission:'finance:read'},
  {href:'/receipts',label:'Receipts',permission:'finance:read'},
  {href:'/daily-close',label:'Daily Close',permission:'daily_close:count'},
  {href:'/reconciliation',label:'Reconciliation',permission:'finance:read'},
  {href:'/provider-reconciliation',label:'Provider Reconciliation',permission:'finance:read'},
  {href:'/bookings',label:'Bookings',permission:'bookings:read'},
  {href:'/orders',label:'Food Orders',permission:'orders:read'},
  {href:'/kitchen',label:'Kitchen',permission:'orders:read'},
  {href:'/inventory',label:'Inventory',permission:'inventory:read'},
  {href:'/finance',label:'Finance',permission:'finance:read'},
  {href:'/members',label:'Members',permission:'members:read'},
  {href:'/stations',label:'Stations',permission:'sessions:read'},
  {href:'/staff',label:'Staff',ownerOnly:true},
  {href:'/admin',label:'Admin',ownerOnly:true},
];
const permissions:Record<Role,Set<string>>={
  OWNER:new Set(['*']),
  MANAGER:new Set(['sessions:read','sessions:write','orders:read','orders:write','bookings:read','bookings:write','members:read','finance:read','daily_close:count','inventory:read','inventory:write','payments:read','payments:write','credit:read','credit:write'])
};

function canSee(item:NavItem,role:Role){return !!(role==='OWNER'||(!item.ownerOnly&&(!item.permission||permissions[role].has(item.permission))));}

export default function StaffShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const [staff,setStaff]=useState<Staff|null>(null);
  const publicSurface=pathname.startsWith('/customer')||pathname.startsWith('/staff-login');
  useEffect(()=>{
    if(publicSurface){setStaff(null);return;}
    let cancelled=false;
    fetch('/api/staff/me',{cache:'no-store'}).then(async r=>r.ok?(await r.json()).staff:null).then(s=>{if(!cancelled)setStaff(s||null)}).catch(()=>{if(!cancelled)setStaff(null)});
    return()=>{cancelled=true};
  },[publicSurface]);
  const visible=useMemo(()=>staff?nav.filter(item=>canSee(item,staff.role)):nav.filter(item=>!item.ownerOnly),[staff]);

  if(publicSurface)return <>{children}</>;
  return <div className="app"><aside className="side">
    <div className="brand">GENZ <span>OS</span></div>
    <nav className="nav">{visible.map(item=><Link className={pathname===item.href||pathname.startsWith(`${item.href}/`)?'active':''} key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <div className="sideBottom">
      {staff&&<><b>{staff.name}</b><br/><span className="muted">{staff.role} · {staff.username}</span><br/><br/></>}
      <b className="yellow">● LAN MODE</b><br/>Core operations are designed to keep working locally when the internet is unavailable.<br/><br/><span className="badge green">SYSTEM ONLINE</span>
    </div>
  </aside><main className="main">{children}</main></div>;
}
