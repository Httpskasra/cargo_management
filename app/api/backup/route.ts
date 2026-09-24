import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { requireAuth, forbidden } from '@/lib/auth'

export async function GET(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  const prisma=getPrisma()
  const [users,riders,runsheets,items]=await Promise.all([prisma.user.count(),prisma.rider.count(),prisma.runsheet.count(),prisma.runsheetItem.count()])
  return NextResponse.json({provider:'Cloudflare D1',status:'online',counts:{users,riders,runsheets,items},checkedAt:new Date().toISOString()})
}

export async function POST(req:NextRequest){
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  return NextResponse.json({error:'Backup/restore فایل‌محور در نسخه Cloudflare غیرفعال است. از D1 Time Travel و wrangler d1 export استفاده کنید.'},{status:410})
}
