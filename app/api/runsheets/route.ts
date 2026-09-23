import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
import { requireAuth, forbidden } from '@/lib/auth'
export async function GET(req:NextRequest){
 const a=await requireAuth(req); if(a.error)return a.error
 const p=req.nextUrl.searchParams,riderId=p.get('riderId'),q=(p.get('q')||'').trim(),where:any={}
 if(a.user.role==='RIDER'){where.riderId=a.user.riderId||-1}else if(riderId)where.riderId=Number(riderId)
 if(q){const n=Number(q);const OR:any[]=[{rider:{name:{contains:q}}},{type:{equals:q.toUpperCase()}}];if(Number.isInteger(n)&&n>0)OR.push({id:n});where.OR=OR}
 return NextResponse.json(await prisma.runsheet.findMany({where,include:{rider:true,items:{orderBy:{registeredAt:'desc'}}},orderBy:{createdAt:'desc'}}))
}
export async function POST(req:NextRequest){
 const a=await requireAuth(req); if(a.error)return a.error
 const b=await req.json(),createdAt=b.createdAt?new Date(b.createdAt):new Date();if(Number.isNaN(createdAt.getTime()))return NextResponse.json({error:'تاریخ و ساعت واردشده معتبر نیست'},{status:400})
 const targetRider=Number(b.riderId); if(a.user.role==='RIDER' && targetRider!==a.user.riderId)return forbidden(); const rs=await prisma.runsheet.create({data:{riderId:targetRider,type:b.type,createdAt},include:{rider:true,items:true}});broadcast('runsheet.created',{id:rs.id});return NextResponse.json(rs,{status:201})
}
