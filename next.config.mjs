/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma publishes a workerd-specific entrypoint. OpenNext recommends
  // leaving these packages external so the Worker runtime can select it.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
};

export default nextConfig;

// This integration is only required for `next dev` so local Cloudflare
// bindings are available. Running it during `next build` can start an extra
// workerd/Miniflare process and, especially on Windows, may contend for the
// same local SQLite state used by D1/Miniflare (SQLITE_BUSY).
if (process.env.NODE_ENV === 'development') {
  const { initOpenNextCloudflareForDev } = await import('@opennextjs/cloudflare');
  initOpenNextCloudflareForDev();
}
