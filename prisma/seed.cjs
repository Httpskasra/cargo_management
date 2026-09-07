process.env.DATABASE_URL ||= 'file:./cargo.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.rider.count();
  if (!count) {
    await prisma.rider.createMany({ data: [
      { name: 'علی رضایی', phone: '09121234567' },
      { name: 'محمد احمدی', phone: '09123334444' },
      { name: 'سارا کریمی', phone: '09125556666' }
    ]});
  }
})().finally(() => prisma.$disconnect());
