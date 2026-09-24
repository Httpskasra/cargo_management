const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function getArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

const isLocal = process.argv.includes('--local');
const isRemote = process.argv.includes('--remote');

if (isLocal === isRemote) {
  console.error('Choose exactly one target: --local or --remote');
  console.error('Example: npm run db:seed:admin -- --remote --phone=09123456789 --password="StrongPassword"');
  process.exit(1);
}

const phone = getArg('phone') || process.env.ADMIN_PHONE;
const password = getArg('password') || process.env.ADMIN_PASSWORD;

if (!phone || !password) {
  console.error('Admin phone/password are required.');
  console.error('Example: npm run db:seed:admin -- --remote --phone=09123456789 --password="StrongPassword"');
  process.exit(1);
}

if (password.length < 10) {
  console.error('Use an admin password with at least 10 characters.');
  process.exit(1);
}

function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(value, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const passwordHash = hashPassword(password);
const sql = `
INSERT INTO "User" ("phone", "passwordHash", "role", "active", "riderId", "createdAt", "updatedAt")
SELECT ${sqlString(phone)}, ${sqlString(passwordHash)}, 'ADMIN', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN');
`;

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = [
  'wrangler',
  'd1',
  'execute',
  'cargo-manager-db',
  isRemote ? '--remote' : '--local',
  '--command',
  sql,
  '--yes',
];

console.log(`Seeding the first admin into ${isRemote ? 'REMOTE' : 'LOCAL'} D1...`);
const result = spawnSync(npx, args, { stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

console.log('Admin seed command completed.');
console.log('If an ADMIN already existed, no account was changed or overwritten.');
console.log(`Admin phone requested: ${phone}`);
