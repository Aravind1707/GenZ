import {notFound,redirect} from 'next/navigation';
const routes:Record<string,string>={sessions:'/sessions',bookings:'/bookings',orders:'/orders',kitchen:'/kitchen',finance:'/finance',members:'/members',stations:'/stations',staff:'/staff',inventory:'/inventory'};
export default async function Module({params}:{params:Promise<{module:string}>}){const {module}=await params;const target=routes[module];if(target)redirect(target);notFound();}
