import { NextRequest } from 'next/server'
import { realtime } from '@/lib/realtime'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user=await getCurrentUser(req as NextRequest); if(!user)return new Response('Unauthorized',{status:401})
  const encoder = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }
      const onChange = (event: unknown) => send(event)
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch {}
      }, 20000)
      realtime.on('change', onChange)
      send({ type: 'connected', at: new Date().toISOString() })
      cleanup = () => { clearInterval(ping); realtime.off('change', onChange) }
      req.signal.addEventListener('abort', cleanup, { once: true })
    },
    cancel() { cleanup() }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
