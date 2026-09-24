# Cloudflare deployment

This project is prepared for **Next.js 15 + OpenNext + Cloudflare Workers + D1 + Prisma**.

## 1. Install dependencies
```bash
npm install
```

## 2. Login to Cloudflare
```bash
npx wrangler login
```

## 3. Create D1
```bash
npx wrangler d1 create cargo-manager-db
```
Copy the returned `database_id` into `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## 4. Create schema
```bash
npx wrangler d1 migrations apply cargo-manager-db --remote
```
For local D1:
```bash
npx wrangler d1 migrations apply cargo-manager-db --local
```

## 5. Import existing data
`d1-data.sql` was generated from the SQLite database included in the original project. Import it once:
```bash
npx wrangler d1 execute cargo-manager-db --remote --file=./d1-data.sql
```
Do not run this repeatedly on a live database unless you intentionally want to replace rows with matching IDs.

## 6. Configure secrets
Create a fresh strong auth secret; do not reuse the secret from the original `.env`.
```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put NEDEX_WS_TOKEN
```
For local Worker preview, copy `.dev.vars.example` to `.dev.vars` and fill the values. Never commit `.dev.vars`.

## 7. Generate Cloudflare types (optional but recommended)
```bash
npm run cf-typegen
```

## 8. Preview in Workers runtime
```bash
npm run preview
```
Test login, dashboard, riders, runsheets, scanning, search, analytics, Excel export and NEDEx before production deployment.

## 9. Deploy
```bash
npm run deploy
```
Cloudflare will output the `*.workers.dev` URL.

## 10. Custom domain
Cloudflare Dashboard → Workers & Pages → `cargo-manager` → Settings → Domains & Routes → Add Custom Domain.

## Backups
File-based SQLite backup/restore was removed because D1 is managed storage. For a SQL export:
```bash
npx wrangler d1 export cargo-manager-db --remote --output=backup.sql
```
Use D1 Time Travel in Cloudflare for point-in-time recovery.

## Important changes from the desktop/local build
- Production DB is D1 through binding `DB`.
- `DATABASE_URL=file:...` is no longer used by the deployed Worker.
- Build no longer runs seed automatically.
- SSE/EventEmitter realtime was replaced with 5-second polling because Worker instances are stateless.
- Local filesystem backup/restore was replaced by D1 status + Cloudflare backup tooling.
- LAN IP discovery is disabled in cloud mode.
- Electron files remain for reference/desktop use but are not part of the Cloudflare runtime.

## Windows: `SQLITE_BUSY / database is locked` during preview

If `npm run preview` fails while `next build` is running with an error similar to:

```text
workerd/util/sqlite.c++ ... database is locked: SQLITE_BUSY
```

this project now starts `initOpenNextCloudflareForDev()` **only during `next dev`**. It is not started during production builds, which avoids competing local workerd/Miniflare processes during OpenNext builds on Windows.

After updating to this version, close any previous `npm run dev` / `npm run preview` terminals and run once:

```bash
npm run clean:cf
npm run preview
```

`clean:cf` removes `.wrangler` and `.open-next` local state. Note that removing `.wrangler` also removes your local-only D1 data; it does not affect the remote Cloudflare D1 database.

If Windows still reports a workerd lock, make sure no old `workerd.exe` / Node preview process is still running. OpenNext itself warns that WSL is the more reliable local environment on Windows, so WSL2 is the fallback for local preview. Deployment to Cloudflare can still be performed independently of local Miniflare state.

## Create the first administrator

The old SQLite Prisma seed is no longer used in production and there is no default production password. The project includes a D1-aware first-admin seed script.

First apply your D1 migrations:

```bash
npm run db:migrate:remote
```

Then create the first production admin:

```bash
npm run db:seed:admin -- --remote --phone=09123456789 --password="YOUR_STRONG_PASSWORD"
```

Or equivalently:

```bash
npm run db:seed:admin:remote -- --phone=09123456789 --password="YOUR_STRONG_PASSWORD"
```

For the local D1 database:

```bash
npm run db:seed:admin:local -- --phone=09123456789 --password="YOUR_STRONG_PASSWORD"
```

The seed uses the same `scrypt` password format as the application login system. It only inserts a user when **no ADMIN exists yet**. If an ADMIN already exists, it does not overwrite the account or password.

If you import `d1-data.sql` and that data already includes an admin account, the first-admin seed intentionally does nothing.
