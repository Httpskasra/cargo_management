import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcast } from '@/lib/realtime'

type Status = 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED'

function normalizeStatus(status: string): Status {
  if (status === 'RETURNED') return 'RETURNED'
  if (status === 'DELIVERED') return 'DELIVERED'
  return 'IN_TRANSIT'
}

function toggleStatus(status: string): Status {
  const current = normalizeStatus(status)
  if (current === 'IN_TRANSIT') return 'DELIVERED'
  return current === 'DELIVERED' ? 'RETURNED' : 'DELIVERED'
}

function statusData(status: Status) {
  return {
    status,
    deliveredAt: status === 'DELIVERED' ? new Date() : null,
    returnedAt: status === 'RETURNED' ? new Date() : null,
  }
}

export async function POST(req: NextRequest) {
  const b = await req.json()
  const barcode = String(b.barcode || '').trim()
  const runsheetId = Number(b.runsheetId)

  if (!barcode || !runsheetId) {
    return NextResponse.json({ error: 'بارکد و رانشیت الزامی است' }, { status: 400 })
  }

  // اسکن اول: ایجاد مرسوله با وضعیت «درحال ارسال».
  // اسکن مجدد: همان مرسوله پیدا شده و وضعیت آن بین «تحویل» و «برگشتی» جابه‌جا می‌شود.
  const existing = await prisma.runsheetItem.findUnique({
    where: { barcode },
    include: { runsheet: { include: { rider: true } } },
  })

  if (existing) {
    if (existing.runsheetId !== runsheetId) {
      return NextResponse.json(
        { error: `این بارکد قبلاً در رانشیت #${existing.runsheetId} ثبت شده است`, item: existing },
        { status: 409 }
      )
    }

    const nextStatus = toggleStatus(existing.status)
    const item = await prisma.runsheetItem.update({
      where: { id: existing.id },
      data: statusData(nextStatus),
      include: { runsheet: { include: { rider: true } } },
    })

    broadcast('item.updated', { id: item.id, runsheetId })
    return NextResponse.json({
      ...item,
      action: 'toggled',
      message: nextStatus === 'DELIVERED' ? 'وضعیت به «تحویل» تغییر کرد' : 'وضعیت به «برگشتی» تغییر کرد',
    })
  }

  const item = await prisma.runsheetItem.create({
    data: {
      runsheetId,
      barcode,
      status: 'IN_TRANSIT',
    },
    include: { runsheet: { include: { rider: true } } },
  })

  broadcast('item.created', { id: item.id, runsheetId })
  return NextResponse.json({
    ...item,
    action: 'created',
    message: 'مرسوله با وضعیت «درحال ارسال» ثبت شد',
  }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json()
  const ids: number[] = Array.isArray(b.ids)
    ? b.ids.map(Number).filter(Boolean)
    : [Number(b.id)].filter(Boolean)

  if (!ids.length) {
    return NextResponse.json({ error: 'حداقل یک مرسوله را انتخاب کنید' }, { status: 400 })
  }

  const status = normalizeStatus(String(b.status || ''))
  if (status === 'IN_TRANSIT') {
    return NextResponse.json({ error: 'برای تغییر دستی فقط «تحویل» یا «برگشتی» قابل انتخاب است' }, { status: 400 })
  }

  const result = await prisma.runsheetItem.updateMany({
    where: { id: { in: ids } },
    data: statusData(status),
  })

  ids.forEach(id => broadcast('item.updated', { id }))
  return NextResponse.json({ count: result.count, status })
}
