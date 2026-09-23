import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
import { requireAuth, forbidden, hashPassword } from '@/lib/auth'
export async function GET(req: NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error
  if(a.user.role!=='ADMIN'){ const rider=a.user.riderId?await prisma.rider.findUnique({where:{id:a.user.riderId},include:{_count:{select:{runsheets:true}}}}):null; return NextResponse.json(rider?[rider]:[]) }
  const q=req.nextUrl.searchParams.get('q')||''
  const riders=await prisma.rider.findMany({where:q?{OR:[{name:{contains:q}},{phone:{contains:q}}]}:undefined,include:{_count:{select:{runsheets:true}}},orderBy:{createdAt:'desc'}})
  return NextResponse.json(riders)
}
export async function POST(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  const body=await req.json();
  if(!body.name?.trim()) return NextResponse.json({error:'نام راکب الزامی است'},{status:400})
  const phone=body.phone?.trim()||null; if(!phone)return NextResponse.json({error:'شماره موبایل الزامی است'},{status:400}); if(!body.password?.trim())return NextResponse.json({error:'رمز عبور راکب الزامی است'},{status:400}); const rider=await prisma.rider.create({data:{name:body.name.trim(),phone,user:{create:{phone,passwordHash:await hashPassword(body.password.trim()),role:'RIDER'}}}})
  broadcast('rider.created',{id:rider.id})
  return NextResponse.json(rider,{status:201})
}
export async function PATCH(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  const body=await req.json();
  const id=Number(body.id); const rider=await prisma.rider.update({where:{id},data:{name:body.name,phone:body.phone||null,active:body.active}}); if(body.password?.trim()){await prisma.user.updateMany({where:{riderId:id},data:{passwordHash:await hashPassword(body.password.trim()),phone:body.phone||rider.phone||''}})}
  broadcast('rider.updated',{id:rider.id})
  return NextResponse.json(rider)
}
export async function DELETE(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  const id=Number(req.nextUrl.searchParams.get('id'))
  await prisma.rider.delete({where:{id}})
  broadcast('rider.deleted',{id})
  return NextResponse.json({ok:true})
}
