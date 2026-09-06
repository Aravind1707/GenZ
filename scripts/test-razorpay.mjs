import {randomUUID} from 'node:crypto';

const keyId=process.env.GENZ_RAZORPAY_KEY_ID||'';
const keySecret=process.env.GENZ_RAZORPAY_KEY_SECRET||'';
if(!keyId||!keySecret)throw new Error('GENZ_RAZORPAY_KEY_ID and GENZ_RAZORPAY_KEY_SECRET are required');
if(!keyId.startsWith('rzp_test_'))throw new Error('Refusing to run: this test harness only accepts Razorpay Test Mode keys');

const auth=Buffer.from(`${keyId}:${keySecret}`).toString('base64');
const request=async(path,init={})=>{
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{...init,headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});
  const body=await response.text();
  let data={};try{data=JSON.parse(body)}catch{}
  if(!response.ok)throw new Error(`Razorpay ${response.status}: ${JSON.stringify(data.error||data)}`);
  return data;
};

const receipt=`GENZ-TEST-${Date.now()}-${randomUUID().slice(0,8)}`;
const order=await request('orders',{method:'POST',body:JSON.stringify({amount:100,currency:'INR',receipt,notes:{source:'GenZ developer payment smoke test'}})});
if(typeof order.id!=='string'||order.amount!==100||order.currency!=='INR')throw new Error('Invalid Razorpay order response');
const fetched=await request(`orders/${encodeURIComponent(order.id)}`);
if(fetched.id!==order.id||fetched.amount!==100||fetched.currency!=='INR')throw new Error('Razorpay order read-back failed');
console.log(JSON.stringify({ok:true,mode:'test',orderId:order.id,amountRupees:1,receipt,status:order.status||'created'},null,2));
