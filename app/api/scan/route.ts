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

function cleanBarcodes(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map(x => String(x || '').trim()).filter(Boolean))]
}

export async function POST(req: NextRequest) {
  const b = await req.json()
  const runsheetId = Number(b.runsheetId)

  if (!runsheetId) {
    return NextResponse.json({ error: 'رانشیت الزامی است' }, { status: 400 })
  }

  // ثبت گروهی بارکدها؛ مناسب Paste مستقیم از Excel.
  if (Array.isArray(b.barcodes)) {
    const barcodes = cleanBarcodes(b.barcodes)
    if (!barcodes.length) {
      return NextResponse.json({ error: 'حداقل یک بارکد معتبر وارد کنید' }, { status: 400 })
    }

    const existing = await prisma.runsheetItem.findMany({
      where: { barcode: { in: barcodes } },
      select: { barcode: true, runsheetId: true },
    })
    const existingMap = new Map(existing.map(x => [x.barcode, x.runsheetId]))
    const newBarcodes = barcodes.filter(x => !existingMap.has(x))
    const alreadyHere = barcodes.filter(x => existingMap.get(x) === runsheetId)
    const conflicts = barcodes
      .filter(x => existingMap.has(x) && existingMap.get(x) !== runsheetId)
      .map(barcode => ({ barcode, runsheetId: existingMap.get(barcode) }))

    if (newBarcodes.length) {
      await prisma.runsheetItem.createMany({
        data: newBarcodes.map(barcode => ({ runsheetId, barcode, status: 'IN_TRANSIT' as const })),
      })
      broadcast('items.created', { runsheetId, count: newBarcodes.length })
    }

    return NextResponse.json({
      ok: true,
      received: barcodes.length,
      created: newBarcodes.length,
      alreadyHere: alreadyHere.length,
      conflicts,
    }, { status: newBarcodes.length ? 201 : 200 })
  }

  const barcode = String(b.barcode || '').trim()
  if (!barcode) {
    return NextResponse.json({ error: 'بارکد الزامی است' }, { status: 400 })
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
    data: { runsheetId, barcode, status: 'IN_TRANSIT' },
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
  const result = await prisma.runsheetItem.updateMany({
    where: { id: { in: ids } },
    data: statusData(status),
  })

  ids.forEach(id => broadcast('item.updated', { id }))
  return NextResponse.json({ count: result.count, status })
}

export async function DELETE(req: NextRequest) {
  const b = await req.json()
  const ids: number[] = Array.isArray(b.ids)
    ? b.ids.map(Number).filter(Boolean)
    : [Number(b.id)].filter(Boolean)

  if (!ids.length) {
    return NextResponse.json({ error: 'حداقل یک مرسوله را انتخاب کنید' }, { status: 400 })
  }

  const items = await prisma.runsheetItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, runsheetId: true },
  })
  const result = await prisma.runsheetItem.deleteMany({ where: { id: { in: ids } } })
  items.forEach(item => broadcast('item.deleted', item))

  return NextResponse.json({ count: result.count })
}
