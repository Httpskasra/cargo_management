import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
export async function POST(req:NextRequest){
  const b=await req.json(); const barcode=String(b.barcode||'').trim(); const runsheetId=Number(b.runsheetId)
  if(!barcode||!runsheetId) return NextResponse.json({error:'بارکد و رانشیت الزامی است'},{status:400})
  const dup=await prisma.runsheetItem.findUnique({where:{barcode},include:{runsheet:{include:{rider:true}}}})
  if(dup) return NextResponse.json({error:'این بارکد قبلاً ثبت شده است',item:dup},{status:409})
  const status=b.status==='RETURNED'?'RETURNED':'NORMAL'
  const item=await prisma.runsheetItem.create({data:{runsheetId,barcode,status,returnedAt:status==='RETURNED'?new Date():null},include:{runsheet:{include:{rider:true}}}})
  broadcast('item.created',{id:item.id,runsheetId})
  return NextResponse.json(item,{status:201})
}
export async function PATCH(req:NextRequest){
  const b=await req.json(); const status=b.status==='RETURNED'?'RETURNED':'NORMAL'
  const item=await prisma.runsheetItem.update({where:{id:Number(b.id)},data:{status,returnedAt:status==='RETURNED'?new Date():null}})
  broadcast('item.updated',{id:item.id})
  return NextResponse.json(item)
}
