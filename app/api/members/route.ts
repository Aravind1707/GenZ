import { NextResponse } from 'next/server';
import { findMember, listMembers } from '../../../lib/members';

export async function GET(request:Request){
  const id=new URL(request.url).searchParams.get('id');
  if(id) return NextResponse.json({ok:true,member:findMember(id)});
  return NextResponse.json({ok:true,members:listMembers()});
}
