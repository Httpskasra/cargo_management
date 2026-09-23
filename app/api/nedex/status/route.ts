import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, forbidden } from '@/lib/auth'

const ORDER_URL = 'https://nedex.ir/nedexService/appApi/loadUserOrder'
const COMMENTS_URL = 'https://nedex.ir/nedexService/appApi/loadOrderComments'
const REQUEST_TIMEOUT_MS = 15000
const CONCURRENCY = 4

type NedexColor = 'green' | 'blue' | 'red' | 'neutral' | 'error'

type NedexResult = {
  itemId: number
  barcode: string
  ok: boolean
  found: boolean
  state: string
  stateCode: number | null
  color: NedexColor
  commentCount: number
  latestComment: string | null
  orderSerial: number | null
  checkedAt: string
  error?: string
}

function normalizePersianText(value: unknown) {
  return String(value || '')
    .replace(/\u200c/g, ' ')
    .replace(/[–—−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function isDeliveredState(state: string) {
  return normalizePersianText(state) === 'تحویل به مشتری'
}

function isDoorstepState(state: string) {
  const normalized = normalizePersianText(state)
  return normalized === 'ارسال به درب منزل-نماینده' ||
    (normalized.includes('ارسال به درب منزل') && normalized.includes('نماینده'))
}

async function postNedex(url: string, body: Record<string, unknown>, token: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        referer: 'https://app.nedex.ir/',
      },
      body: JSON.stringify({ ...body, wstoken: token }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`NEDEx HTTP ${response.status}`)
    }

    const json = await response.json()
    if (String(json?.success) !== '1') {
      throw new Error(json?.errorText || 'پاسخ نامعتبر از NEDEx')
    }
    return json
  } finally {
    clearTimeout(timeout)
  }
}

async function checkItem(item: { id: number; barcode: string }, token: string): Promise<NedexResult> {
  const checkedAt = new Date().toISOString()
  try {
    const orderResponse = await postNedex(ORDER_URL, {
      first: 0,
      size: 20,
      state: null,
      searchQuery: item.barcode,
      showDeliverToCustomer: true,
    }, token)

    const rows = Array.isArray(orderResponse?.data) ? orderResponse.data : []
    const order = rows.find((row: any) => String(row?.supplierOrderCode || '').trim() === item.barcode) || rows[0]

    if (!order) {
      return {
        itemId: item.id,
        barcode: item.barcode,
        ok: true,
        found: false,
        state: 'در NEDEx پیدا نشد',
        stateCode: null,
        color: 'neutral',
        commentCount: 0,
        latestComment: null,
        orderSerial: null,
        checkedAt,
      }
    }

    const state = normalizePersianText(order.state)
    const stateCode = Number.isFinite(Number(order.stateCode)) ? Number(order.stateCode) : null
    const orderSerial = Number.isFinite(Number(order.orderSerial)) ? Number(order.orderSerial) : null

    if (isDeliveredState(state)) {
      return {
        itemId: item.id,
        barcode: item.barcode,
        ok: true,
        found: true,
        state,
        stateCode,
        color: 'green',
        commentCount: Number(order.commentsCount || 0),
        latestComment: null,
        orderSerial,
        checkedAt,
      }
    }

    if (isDoorstepState(state)) {
      if (!orderSerial) {
        return {
          itemId: item.id,
          barcode: item.barcode,
          ok: false,
          found: true,
          state,
          stateCode,
          color: 'error',
          commentCount: 0,
          latestComment: null,
          orderSerial: null,
          checkedAt,
          error: 'شماره سفارش NEDEx برای دریافت کامنت موجود نیست',
        }
      }

      const commentsResponse = await postNedex(COMMENTS_URL, { orderCode: orderSerial }, token)
      const comments = (Array.isArray(commentsResponse?.data) ? commentsResponse.data : [])
        .filter((comment: any) => Number(comment?.deleted || 0) === 0 && comment?.visible !== false)
      const latest = comments.length ? comments[comments.length - 1] : null

      return {
        itemId: item.id,
        barcode: item.barcode,
        ok: true,
        found: true,
        state,
        stateCode,
        color: comments.length ? 'blue' : 'red',
        commentCount: comments.length,
        latestComment: latest?.comment ? String(latest.comment) : null,
        orderSerial,
        checkedAt,
      }
    }

    return {
      itemId: item.id,
      barcode: item.barcode,
      ok: true,
      found: true,
      state: state || 'بدون وضعیت',
      stateCode,
      color: 'neutral',
      commentCount: Number(order.commentsCount || 0),
      latestComment: null,
      orderSerial,
      checkedAt,
    }
  } catch (error: any) {
    return {
      itemId: item.id,
      barcode: item.barcode,
      ok: false,
      found: false,
      state: 'خطا در بروزرسانی',
      stateCode: null,
      color: 'error',
      commentCount: 0,
      latestComment: null,
      orderSerial: null,
      checkedAt,
      error: error?.name === 'AbortError' ? 'مهلت پاسخ NEDEx تمام شد' : (error?.message || 'خطای نامشخص'),
    }
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      results[index] = await worker(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()))
  return results
}

export async function POST(req: NextRequest) {
  const a=await requireAuth(req); if(a.error)return a.error
  const token = process.env.NEDEX_WS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json({ error: 'توکن NEDEx تنظیم نشده است. مقدار NEDEX_WS_TOKEN را در فایل .env قرار دهید.' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const runsheetId = Number(body?.runsheetId)
  if (!runsheetId) {
    return NextResponse.json({ error: 'شناسه رانشیت معتبر نیست' }, { status: 400 })
  }

  const runsheet = await prisma.runsheet.findUnique({
    where: { id: runsheetId },
    include: { items: { select: { id: true, barcode: true }, orderBy: { registeredAt: 'asc' } } },
  })

  if (!runsheet) {
    return NextResponse.json({ error: 'رانشیت پیدا نشد' }, { status: 404 })
  }
  if (a.user.role==='RIDER' && runsheet.riderId!==a.user.riderId)return forbidden()
  if (runsheet.type !== 'NDX') {
    return NextResponse.json({ error: 'بروزرسانی NEDEx فقط برای رانشیت‌های NDX فعال است' }, { status: 400 })
  }
  if (!runsheet.items.length) {
    return NextResponse.json({ results: [], summary: { total: 0, delivered: 0, withComment: 0, withoutComment: 0, other: 0, errors: 0 } })
  }

  const results = await mapWithConcurrency(runsheet.items, CONCURRENCY, item => checkItem(item, token))
  const summary = {
    total: results.length,
    delivered: results.filter(x => x.color === 'green').length,
    withComment: results.filter(x => x.color === 'blue').length,
    withoutComment: results.filter(x => x.color === 'red').length,
    other: results.filter(x => x.color === 'neutral').length,
    errors: results.filter(x => x.color === 'error').length,
  }

  return NextResponse.json({ results, summary, checkedAt: new Date().toISOString() })
}
