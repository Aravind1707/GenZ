import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = { title: 'GenZ Gaming Cafe OS', description: 'LAN-first gaming cafe management system' };
const nav=[['/','Dashboard'],['/sessions','Sessions'],['/settlements','Settlements'],['/bookings','Bookings'],['/orders','Food Orders'],['/kitchen','Kitchen'],['/finance','Finance'],['/members','Members'],['/stations','Stations']];
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><div className="app"><aside className="side"><div className="brand">GENZ <span>OS</span></div><nav className="nav">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><div className="sideBottom"><b className="yellow">● LAN MODE</b><br/>Core operations are designed to keep working locally when the internet is unavailable.<br/><br/><span className="badge green">SYSTEM ONLINE</span></div></aside><main className="main">{children}</main></div></body></html>; }
