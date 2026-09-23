import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'

export type Role = 'ADMIN' | 'RIDER'
export type SessionUser = { id:number; phone:string; role:Role; riderId:number|null; riderName:string|null }
const COOKIE='cargo_session'
const SECRET=process.env.AUTH_SECRET || 'CHANGE_THIS_LOCAL_SECRET_2026'

function sign(value:string){return crypto.createHmac('sha256',SECRET).update(value).digest('base64url')}
function encode(data:object){const value=Buffer.from(JSON.stringify(data)).toString('base64url');return `${value}.${sign(value)}`}
function decode(token:string){try{const [value,signature]=token.split('.');if(!value||!signature||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(sign(value))))return null;const data=JSON.parse(Buffer.from(value,'base64url').toString());if(!data.exp||Date.now()>data.exp)return null;return data}catch{return null}}

export async function hashPassword(password:string){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,salt,64).toString('hex');return `scrypt:${salt}:${hash}`}
export async function verifyPassword(password:string,stored:string){try{const [scheme,salt,hash]=stored.split(':');if(scheme!=='scrypt')return false;const actual=crypto.scryptSync(password,salt,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(hash,'hex'))}catch{return false}}

export async function loginUser(phone:string,password:string){
 const user=await prisma.user.findUnique({where:{phone},include:{rider:true}})
 if(!user || !user.active || !(await verifyPassword(password,user.passwordHash))) return null
 return user
}
export function setSession(res:NextResponse,user:any){
 const payload={uid:user.id,phone:user.phone,role:user.role,riderId:user.riderId??null,exp:Date.now()+7*24*60*60*1000}
 res.cookies.set(COOKIE,encode(payload),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:7*24*60*60})
}
export function clearSession(res:NextResponse){res.cookies.set(COOKIE,'',{httpOnly:true,path:'/',maxAge:0})}
export function sessionFromRequest(req:NextRequest){const token=req.cookies.get(COOKIE)?.value;return token?decode(token):null}
export async function getCurrentUser(req:NextRequest):Promise<SessionUser|null>{
 const s=sessionFromRequest(req);if(!s)return null
 const user=await prisma.user.findUnique({where:{id:Number(s.uid)},include:{rider:true}});if(!user||!user.active)return null
 return {id:user.id,phone:user.phone,role:user.role as Role,riderId:user.riderId,riderName:user.rider?.name||null}
}
export async function requireAuth(req:NextRequest){const user=await getCurrentUser(req);if(!user)return {error:NextResponse.json({error:'نیاز به ورود به حساب کاربری دارید'},{status:401}),user:null as any};return {error:null,user}}
export function forbidden(){return NextResponse.json({error:'شما دسترسی لازم برای این عملیات را ندارید'},{status:403})}
