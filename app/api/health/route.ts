import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'

export async function GET(){
  try {
    const prisma=getPrisma(); await prisma.user.count()
    return NextResponse.json({ok:true,database:'connected',provider:'Cloudflare D1',timestamp:new Date().toISOString()})
  } catch (error) {
    console.error('health check failed',error)
    return NextResponse.json({ok:false,database:'disconnected',timestamp:new Date().toISOString()},{status:503})
  }
}
