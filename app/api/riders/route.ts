import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
export async function GET(req: NextRequest){
  const q=req.nextUrl.searchParams.get('q')||''
  const riders=await prisma.rider.findMany({where:q?{OR:[{name:{contains:q}},{phone:{contains:q}}]}:undefined,include:{_count:{select:{runsheets:true}}},orderBy:{createdAt:'desc'}})
  return NextResponse.json(riders)
}
export async function POST(req:NextRequest){
  const body=await req.json();
  if(!body.name?.trim()) return NextResponse.json({error:'نام راکب الزامی است'},{status:400})
  const rider=await prisma.rider.create({data:{name:body.name.trim(),phone:body.phone?.trim()||null}})
  broadcast('rider.created',{id:rider.id})
  return NextResponse.json(rider,{status:201})
}
export async function PATCH(req:NextRequest){
  const body=await req.json();
  const rider=await prisma.rider.update({where:{id:Number(body.id)},data:{name:body.name,phone:body.phone||null,active:body.active}})
  broadcast('rider.updated',{id:rider.id})
  return NextResponse.json(rider)
}
export async function DELETE(req:NextRequest){
  const id=Number(req.nextUrl.searchParams.get('id'))
  await prisma.rider.delete({where:{id}})
  broadcast('rider.deleted',{id})
  return NextResponse.json({ok:true})
}
