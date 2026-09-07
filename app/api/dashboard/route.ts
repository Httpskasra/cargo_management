import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
export async function GET() {
  const start = new Date(); start.setHours(0,0,0,0)
  const [today,totalReturned,activeRiders,runsheets] = await Promise.all([
    prisma.runsheetItem.count({where:{registeredAt:{gte:start}}}),
    prisma.runsheetItem.count({where:{status:'RETURNED',registeredAt:{gte:start}}}),
    prisma.rider.count({where:{active:true}}),
    prisma.runsheet.count({where:{createdAt:{gte:start}}})
  ])
  return NextResponse.json({today,totalReturned,normal:today-totalReturned,activeRiders,runsheets})
}
