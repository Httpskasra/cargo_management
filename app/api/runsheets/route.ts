import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
export async function GET(req:NextRequest){
  const riderId=req.nextUrl.searchParams.get('riderId')
  const data=await prisma.runsheet.findMany({where:riderId?{riderId:Number(riderId)}:undefined,include:{rider:true,items:{orderBy:{registeredAt:'desc'}}},orderBy:{createdAt:'desc'}})
  return NextResponse.json(data)
}
export async function POST(req:NextRequest){
  const b=await req.json();
  const rs=await prisma.runsheet.create({data:{riderId:Number(b.riderId),type:b.type},include:{rider:true,items:true}})
  broadcast('runsheet.created',{id:rs.id})
  return NextResponse.json(rs,{status:201})
}
