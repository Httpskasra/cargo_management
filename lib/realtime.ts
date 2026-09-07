import { EventEmitter } from 'events'

type GlobalRealtime = typeof globalThis & { __cargoRealtime?: EventEmitter }
const g = globalThis as GlobalRealtime

export const realtime = g.__cargoRealtime ?? new EventEmitter()
realtime.setMaxListeners(100)
if (!g.__cargoRealtime) g.__cargoRealtime = realtime

export function broadcast(type: string, payload: Record<string, unknown> = {}) {
  realtime.emit('change', { type, payload, at: new Date().toISOString() })
}
