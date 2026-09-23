
process.env.DATABASE_URL ||= 'file:./cargo.db';

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString('hex');

  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const adminPhone = process.env.ADMIN_PHONE || '09000000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  await prisma.user.upsert({
    where: {
      phone: adminPhone
    },
    update: {
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
      active: true,
      riderId: null
    },
    create: {
      phone: adminPhone,
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
      active: true
    }
  });

  console.log('================================');
  console.log('Admin user created successfully');
  console.log(`Phone: ${adminPhone}`);
  console.log(`Password: ${adminPassword}`);
  console.log('================================');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

