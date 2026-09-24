import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export function getPrisma() {
  const { env } = getCloudflareContext()
  const db = (env as unknown as { DB: any }).DB
  if (!db) throw new Error('Cloudflare D1 binding DB is not configured')
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}
