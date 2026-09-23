import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, forbidden } from '@/lib/auth'
import { ItemStatus, RunsheetType } from '@prisma/client'

function parseItemStatus(value: string | null): ItemStatus | undefined {
  if (!value || value === 'ALL') return undefined
  return Object.values(ItemStatus).includes(value as ItemStatus) ? (value as ItemStatus) : undefined
}

function parseRunsheetType(value: string | null): RunsheetType | undefined {
  if (!value || value === 'ALL') return undefined
  return Object.values(RunsheetType).includes(value as RunsheetType) ? (value as RunsheetType) : undefined
}

function dateRange(from: string | null, to: string | null) {
  const where: any = {}
  if (from) where.gte = new Date(`${from}T00:00:00`)
  if (to) where.lte = new Date(`${to}T23:59:59.999`)
  return Object.keys(where).length ? where : undefined
}

export async function GET(req: NextRequest) {
  const a=await requireAuth(req); if(a.error)return a.error; if(a.user.role!=='ADMIN')return forbidden()
  const p = req.nextUrl.searchParams
  const from = p.get('from')
  const to = p.get('to')
  const rider = p.get('rider')
  const typeParam = p.get('type')
  const statusParam = p.get('status')
  const type = parseRunsheetType(typeParam)
  const status = parseItemStatus(statusParam)
  const registeredAt = dateRange(from, to)

  const where: any = {
    registeredAt,
    status,
    runsheet: {
      type,
      rider: rider ? { name: { contains: rider } } : undefined,
    },
  }

  const items = await prisma.runsheetItem.findMany({
    where,
    select: {
      status: true,
      registeredAt: true,
      runsheet: { select: { type: true, rider: { select: { id: true, name: true } } } },
    },
    orderBy: { registeredAt: 'asc' },
  })

  const statusMap: Record<string, number> = { IN_TRANSIT: 0, DELIVERED: 0, RETURNED: 0, NORMAL: 0 }
  const typeMap: Record<string, number> = { NDX: 0, SAPAPOST: 0 }
  const riderMap: Record<string, { name: string; count: number; delivered: number; returned: number; inTransit: number }> = {}
  const dayMap: Record<string, { date: string; count: number; delivered: number; returned: number; inTransit: number }> = {}

  for (const item of items) {
    const s = item.status as string
    statusMap[s] = (statusMap[s] || 0) + 1
    const t = item.runsheet.type as string
    typeMap[t] = (typeMap[t] || 0) + 1
    const riderId = String(item.runsheet.rider.id)
    const riderName = item.runsheet.rider.name
    if (!riderMap[riderId]) riderMap[riderId] = { name: riderName, count: 0, delivered: 0, returned: 0, inTransit: 0 }
    riderMap[riderId].count++
    if (s === 'DELIVERED') riderMap[riderId].delivered++
    else if (s === 'RETURNED') riderMap[riderId].returned++
    else riderMap[riderId].inTransit++

    const d = new Date(item.registeredAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!dayMap[key]) dayMap[key] = { date: key, count: 0, delivered: 0, returned: 0, inTransit: 0 }
    dayMap[key].count++
    if (s === 'DELIVERED') dayMap[key].delivered++
    else if (s === 'RETURNED') dayMap[key].returned++
    else dayMap[key].inTransit++
  }

  const total = items.length
  const delivered = statusMap.DELIVERED
  const returned = statusMap.RETURNED
  const inTransit = statusMap.IN_TRANSIT + statusMap.NORMAL

  const runsheets = await prisma.runsheet.count({ where: {
    createdAt: registeredAt,
    type,
    rider: rider ? { name: { contains: rider } } : undefined,
  } })

  return NextResponse.json({
    filters: { from, to, rider: rider || '', type: typeParam || 'ALL', status: statusParam || 'ALL' },
    totals: { total, delivered, returned, inTransit, runsheets, deliveryRate: total ? Math.round((delivered / total) * 1000) / 10 : 0 },
    status: [
      { key: 'IN_TRANSIT', label: 'درحال ارسال', value: inTransit },
      { key: 'DELIVERED', label: 'تحویل', value: delivered },
      { key: 'RETURNED', label: 'برگشتی', value: returned },
    ],
    types: [
      { key: 'NDX', label: 'NDX', value: typeMap.NDX || 0 },
      { key: 'SAPAPOST', label: 'SAPA Post', value: typeMap.SAPAPOST || 0 },
    ],
    riders: Object.values(riderMap).sort((a, b) => b.count - a.count).slice(0, 12),
    daily: Object.values(dayMap),
  })
}