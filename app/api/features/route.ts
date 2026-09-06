import {NextResponse} from 'next/server';
import {listFeatures} from '../../../lib/features';
export async function GET(){try{return NextResponse.json({ok:true,features:await listFeatures().then(rows=>Object.fromEntries(rows.map(r=>[r.feature_key,r.enabled])) )},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({ok:false,error:'FEATURE_STATUS_UNAVAILABLE'},{status:503})}}
