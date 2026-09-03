import { NextResponse } from 'next/server';
import { listStations } from '@/lib/store';

export async function GET(){ return NextResponse.json({ok:true,stations:listStations()}); }
