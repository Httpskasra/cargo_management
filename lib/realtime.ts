// Cloudflare Workers are stateless across requests.
// UI refresh is handled by polling in hooks/useRealtime.ts.
export function broadcast(_type: string, _payload: Record<string, unknown> = {}) {}
