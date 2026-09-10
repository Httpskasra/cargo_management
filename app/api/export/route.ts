import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

function esc(v: unknown) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function dateRange(from: string | null, to: string | null) {
  const x: any = {}
  if (from) x.gte = new Date(`${from}T00:00:00`)
  if (to) x.lte = new Date(`${to}T23:59:59.999`)
  return Object.keys(x).length ? x : undefined
}
function statusLabel(s: string) {
  if (s === 'DELIVERED') return 'تحویل'
  if (s === 'RETURNED') return 'برگشتی'
  return 'درحال ارسال'
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const barcode = p.get('barcode') || undefined
  const rider = p.get('rider') || undefined
  const type = p.get('type') || undefined
  const status = p.get('status') || undefined
  const from = p.get('from')
  const to = p.get('to')
  const registeredAt = dateRange(from, to)

  const rows = await prisma.runsheetItem.findMany({
    where: {
      barcode: barcode ? { contains: barcode } : undefined,
      status: status && status !== 'ALL' ? status : undefined,
      registeredAt,
      runsheet: {
        type: type && type !== 'ALL' ? type : undefined,
        rider: rider ? { name: { contains: rider } } : undefined,
      },
    },
    include: { runsheet: { include: { rider: true } } },
    orderBy: { registeredAt: 'desc' },
  })

  const body = rows.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.barcode)}</td><td>${esc(i.runsheet.rider.name)}</td><td>${esc(i.runsheet.type)}</td><td>#${i.runsheet.id}</td><td>${esc(new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(i.registeredAt)))}</td><td>${esc(new Intl.DateTimeFormat('fa-IR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(new Date(i.registeredAt)))}</td><td>${statusLabel(i.status)}</td></tr>`).join('')
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Tahoma,Arial}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:7px;text-align:right}th{background:#eee}</style></head><body><h2>گزارش مرسوله‌ها</h2><p>تعداد نتایج: ${rows.length}</p><table><thead><tr><th>ردیف</th><th>بارکد</th><th>راکب</th><th>نوع رانشیت</th><th>رانشیت</th><th>تاریخ ثبت</th><th>ساعت ثبت</th><th>وضعیت</th></tr></thead><tbody>${body}</tbody></table></body></html>`
  const filename = `cargo-report-${new Date().toISOString().slice(0,10)}.xls`
  return new Response('\ufeff' + html, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
