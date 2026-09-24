const fs = require('node:fs');
const path = require('node:path');

for (const dir of ['.wrangler', '.open-next']) {
  const target = path.resolve(process.cwd(), dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${dir}`);
  }
}
console.log('Cloudflare/OpenNext local state cleaned.');
