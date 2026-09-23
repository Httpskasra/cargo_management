process.env.DATABASE_URL ||= 'file:./cargo.db';
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,salt,64).toString('hex');return `scrypt:${salt}:${hash}`}
(async()=>{
 const adminPhone=process.env.ADMIN_PHONE || '09000000000';
 const adminPassword=process.env.ADMIN_PASSWORD || 'Admin@12345';
 const riders=[
  {name:'علی رضایی',phone:'09121234567',password:'123456'},
  {name:'محمد احمدی',phone:'09123334444',password:'123456'},
  {name:'سارا کریمی',phone:'09125556666',password:'123456'}
 ];
 for(const r of riders){
  const rider=await prisma.rider.upsert({where:{phone:r.phone},update:{name:r.name},create:{name:r.name,phone:r.phone}});
  await prisma.user.upsert({where:{phone:r.phone},update:{riderId:rider.id,active:true},create:{phone:r.phone,passwordHash:hashPassword(r.password),role:'RIDER',riderId:rider.id}})
 }
 await prisma.user.upsert({where:{phone:adminPhone},update:{passwordHash:hashPassword(adminPassword),role:'ADMIN',active:true,riderId:null},create:{phone:adminPhone,passwordHash:hashPassword(adminPassword),role:'ADMIN',active:true}})
 console.log(`Admin: ${adminPhone} / ${adminPassword}`)
})().finally(()=>prisma.$disconnect());
