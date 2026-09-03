import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCustomerByToken } from '../../../../lib/customer-auth';
import { getCustomerPricing } from '../../../../lib/pricing';

export async function GET() {
  try {
    const token=(await cookies()).get('genz_customer')?.value;
    const customer=token?await getCustomerByToken(token):null;
    return NextResponse.json({ok:true,pricing:await getCustomerPricing(customer?.member_id||null)},{headers:{'Cache-Control':'private,no-store'}});
  } catch { return NextResponse.json({ok:false,error:'Unable to load pricing'},{status:500}); }
}
