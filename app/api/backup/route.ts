import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'; import path from 'path'
import { broadcast } from '@/lib/realtime'
import { prisma } from '@/lib/db'
function dbPath(){ const url=process.env.DATABASE_URL||'file:./cargo.db'; const raw=url.replace('file:',''); if(path.isAbsolute(raw)) return raw; return path.resolve(process.cwd(),'prisma',raw.replace(/^\.\//,'')) }
export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({})); const src=dbPath(); const dir=process.env.CARGO_DATA_DIR?path.join(process.env.CARGO_DATA_DIR,'backups'):path.resolve(process.cwd(),'backups'); fs.mkdirSync(dir,{recursive:true});
  if(body.action==='restore') { if(!body.file) return NextResponse.json({error:'فایل مشخص نشده'},{status:400}); await prisma.$disconnect(); fs.copyFileSync(path.join(dir,path.basename(body.file)),src); broadcast('database.restored',{file:body.file}); return NextResponse.json({ok:true}) }
  const name=`backup_${new Date().toISOString().replace(/[:.]/g,'-')}.db`; fs.copyFileSync(src,path.join(dir,name)); return NextResponse.json({ok:true,file:name})
}
export async function GET(){const dir=process.env.CARGO_DATA_DIR?path.join(process.env.CARGO_DATA_DIR,'backups'):path.resolve(process.cwd(),'backups'); fs.mkdirSync(dir,{recursive:true}); return NextResponse.json(fs.readdirSync(dir).filter(x=>x.endsWith('.db')).sort().reverse())}
