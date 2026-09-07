'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
const tabs=[['/inventory','Overview'],['/inventory/stock','Stock'],['/inventory/suppliers','Suppliers'],['/inventory/receiving','Receive'],['/inventory/stocktakes','Stocktake'],['/inventory/history','History'],['/inventory/cogs','COGS'],['/inventory/materials','Recipes']];
export default function InventoryTabs(){const pathname=usePathname();return <nav className="inventoryTabs" aria-label="Inventory sections">{tabs.map(([href,label])=><Link key={href} href={href} className={pathname===href?'active':''}>{label}</Link>)}</nav>}
