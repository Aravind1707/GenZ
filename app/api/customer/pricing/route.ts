import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCustomerByToken } from '../../../../lib/customer-auth';
import { getCustomerPricing } from '../../../../lib/pricing';

export async function GET(){
 try{
  const token=(await cookies()).get('genz_customer')?.value;
  const customer=token?await getCustomerByToken(token):null;
  const pricing=await getCustomerPricing(customer?.member_id||null);
  return NextResponse.json({
   ok:true,
   authenticated:!!customer,
   customer:customer?{
    id:customer.id,
    mobile:customer.mobile,
    name:customer.name,
    memberId:customer.member_id,
    memberExpires:null,
   }:null,
   pricing,
  },{headers:{'Cache-Control':'private,no-store'}});
 }catch{
  return NextResponse.json({ok:false,error:'Unable to load pricing'},{status:500});
 }
}
