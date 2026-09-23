import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
export async function GET(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error
  const p=req.nextUrl.searchParams; const barcode=p.get('barcode')||undefined; const rider=p.get('rider')||undefined; const type=p.get('type')||undefined; const status=p.get('status')||undefined
  const from=p.get('from'), to=p.get('to'); const date:any={}; if(from)date.gte=new Date(from); if(to){const d=new Date(to); d.setHours(23,59,59,999); date.lte=d}
  const data=await prisma.runsheetItem.findMany({where:{barcode:barcode?{contains:barcode}:undefined,status:status&&status!=='ALL'?status as any:undefined,registeredAt:Object.keys(date).length?date:undefined,runsheet:{type:type&&type!=='ALL'?type as any:undefined,rider:a.user.role==='RIDER'?{id:a.user.riderId||-1}:{name:rider?{contains:rider}:undefined}}},include:{runsheet:{include:{rider:true}}},orderBy:{registeredAt:'desc'},take:300})
  return NextResponse.json(data)
}
