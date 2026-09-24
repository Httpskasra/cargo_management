import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req:NextRequest) {
 const prisma=getPrisma()
  const a=await requireAuth(req); if(a.error)return a.error
  const start = new Date()
  start.setHours(0,0,0,0)

  const [today, totalReturned, delivered, inTransit, activeRiders, runsheets] = await Promise.all([
    prisma.runsheetItem.count({where:{registeredAt:{gte:start},runsheet:a.user.role==='RIDER'?{riderId:a.user.riderId||-1}:undefined}}),
    prisma.runsheetItem.count({where:{status:'RETURNED',registeredAt:{gte:start},runsheet:a.user.role==='RIDER'?{riderId:a.user.riderId||-1}:undefined}}),
    prisma.runsheetItem.count({where:{status:'DELIVERED',registeredAt:{gte:start},runsheet:a.user.role==='RIDER'?{riderId:a.user.riderId||-1}:undefined}}),
    prisma.runsheetItem.count({where:{status:{in:['IN_TRANSIT','NORMAL']},registeredAt:{gte:start},runsheet:a.user.role==='RIDER'?{riderId:a.user.riderId||-1}:undefined}}),
    a.user.role==='RIDER'?1:prisma.rider.count({where:{active:true}}),
    prisma.runsheet.count({where:{createdAt:{gte:start},riderId:a.user.role==='RIDER'?a.user.riderId||-1:undefined}})
  ])

  return NextResponse.json({
    today,totalReturned,delivered,inTransit,
    normal:inTransit,
    activeRiders,runsheets
  })
}
