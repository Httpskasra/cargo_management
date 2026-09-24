import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'
import { requireAuth, forbidden } from '@/lib/auth'
type Status='IN_TRANSIT'|'DELIVERED'|'RETURNED'
function normalizeStatus(s:string):Status{return s==='RETURNED'?'RETURNED':s==='DELIVERED'?'DELIVERED':'IN_TRANSIT'}
function statusData(status:Status){return {status,deliveredAt:status==='DELIVERED'?new Date():null,returnedAt:status==='RETURNED'?new Date():null}}
function cleanBarcodes(input:unknown){if(!Array.isArray(input))return [];return [...new Set(input.map(x=>String(x||'').trim()).filter(Boolean))]}
export async function POST(req:NextRequest){
 const prisma=getPrisma()
 const a=await requireAuth(req); if(a.error)return a.error
 const b=await req.json(),runsheetId=Number(b.runsheetId),selectedStatus=normalizeStatus(String(b.status||'IN_TRANSIT'))
 if(!runsheetId)return NextResponse.json({error:'رانشیت الزامی است'},{status:400})
 const run=await prisma.runsheet.findUnique({where:{id:runsheetId},select:{id:true,riderId:true}}); if(!run)return NextResponse.json({error:'رانشیت پیدا نشد'},{status:404}); if(a.user.role==='RIDER'&&run.riderId!==a.user.riderId)return forbidden();
 if(Array.isArray(b.barcodes)){
  const barcodes=cleanBarcodes(b.barcodes);if(!barcodes.length)return NextResponse.json({error:'حداقل یک بارکد معتبر وارد کنید'},{status:400})
  const existing=await prisma.runsheetItem.findMany({where:{barcode:{in:barcodes}},select:{id:true,barcode:true,runsheetId:true}})
  const map=new Map(existing.map(x=>[x.barcode,x])),newBarcodes=barcodes.filter(x=>!map.has(x)),alreadyHere=barcodes.filter(x=>map.get(x)?.runsheetId===runsheetId)
  const conflicts=barcodes.filter(x=>map.has(x)&&map.get(x)?.runsheetId!==runsheetId).map(barcode=>({barcode,runsheetId:map.get(barcode)?.runsheetId}))
  if(newBarcodes.length){await prisma.runsheetItem.createMany({data:newBarcodes.map(barcode=>({runsheetId,barcode,...statusData(selectedStatus)}))});broadcast('items.created',{runsheetId,count:newBarcodes.length})}
  const ids=alreadyHere.map(x=>map.get(x)?.id).filter((id):id is number=>Boolean(id))
  if(ids.length){await prisma.runsheetItem.updateMany({where:{id:{in:ids}},data:statusData(selectedStatus)});ids.forEach(id=>broadcast('item.updated',{id,runsheetId}))}
  return NextResponse.json({ok:true,received:barcodes.length,created:newBarcodes.length,alreadyHere:alreadyHere.length,updated:ids.length,conflicts,status:selectedStatus},{status:newBarcodes.length||ids.length?201:200})
 }
 const barcode=String(b.barcode||'').trim();if(!barcode)return NextResponse.json({error:'بارکد الزامی است'},{status:400})
 const existing=await prisma.runsheetItem.findUnique({where:{barcode},include:{runsheet:{include:{rider:true}}}})
 if(existing){if(existing.runsheetId!==runsheetId)return NextResponse.json({error:`این بارکد قبلاً در رانشیت #${existing.runsheetId} ثبت شده است`,item:existing},{status:409})
  const item=await prisma.runsheetItem.update({where:{id:existing.id},data:statusData(selectedStatus),include:{runsheet:{include:{rider:true}}}});broadcast('item.updated',{id:item.id,runsheetId})
  return NextResponse.json({...item,action:'updated',message:`وضعیت به «${selectedStatus}» تغییر کرد`})}
const item = await prisma.runsheetItem.create({
  data: {
    runsheetId,
    barcode,
    status: 'IN_TRANSIT',
  },
  include: {
    runsheet: {
      include: {
        rider: true,
      },
    },
  },
});broadcast('item.created',{id:item.id,runsheetId});return NextResponse.json({...item,action:'created',message:'مرسوله ثبت شد'},{status:201})
}
export async function PATCH(req:NextRequest){
 const prisma=getPrisma()
 const a=await requireAuth(req); if(a.error)return a.error
 const b=await req.json(),ids:number[]=Array.isArray(b.ids)?b.ids.map(Number).filter(Boolean):[Number(b.id)].filter(Boolean);if(!ids.length)return NextResponse.json({error:'حداقل یک مرسوله را انتخاب کنید'},{status:400})
 const owned=await prisma.runsheetItem.findMany({where:{id:{in:ids}},select:{id:true,runsheet:{select:{riderId:true}}}}); if(a.user.role==='RIDER' && owned.some(x=>x.runsheet.riderId!==a.user.riderId))return forbidden(); const status=normalizeStatus(String(b.status||'')),result=await prisma.runsheetItem.updateMany({where:{id:{in:ids}},data:statusData(status)});ids.forEach(id=>broadcast('item.updated',{id}));return NextResponse.json({count:result.count,status})
}
export async function DELETE(req:NextRequest){
 const prisma=getPrisma()
 const a=await requireAuth(req); if(a.error)return a.error
 const b=await req.json(),ids:number[]=Array.isArray(b.ids)?b.ids.map(Number).filter(Boolean):[Number(b.id)].filter(Boolean);if(!ids.length)return NextResponse.json({error:'حداقل یک مرسوله را انتخاب کنید'},{status:400})
 const items=await prisma.runsheetItem.findMany({where:{id:{in:ids}},select:{id:true,runsheetId:true}});if(a.user.role==='RIDER'){const owned=await prisma.runsheet.findMany({where:{id:{in:items.map(x=>x.runsheetId)},riderId:a.user.riderId!}});const idsOwned=new Set(owned.map(x=>x.id));if(items.some(x=>!idsOwned.has(x.runsheetId)))return forbidden()} const result=await prisma.runsheetItem.deleteMany({where:{id:{in:ids}}});items.forEach(item=>broadcast('item.deleted',item));return NextResponse.json({count:result.count})
}
