import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if(!await getCurrentUser(req))return NextResponse.json({error:'Unauthorized'},{status:401})
  const interfaces: {name:string,address:string,score:number}[] = []
  const virtualRx = /(wsl|vethernet|virtualbox|vmware|docker|loopback|tailscale|hyper-v|bluetooth)/i
  for (const [name,list] of Object.entries(os.networkInterfaces())) {
    for (const item of list ?? []) {
      if (item.family !== 'IPv4' || item.internal || item.address.startsWith('169.254.')) continue
      let score = 10
      if (virtualRx.test(name)) score -= 20
      if (/wi-?fi|wireless|wlan|ethernet|lan/i.test(name)) score += 20
      if (/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(item.address)) score += 10
      interfaces.push({name,address:item.address,score})
    }
  }
  interfaces.sort((a,b)=>b.score-a.score)
  const hostHeader = req.headers.get('host') || ''
  const headerPort = hostHeader.includes(':') ? hostHeader.split(':').pop() : undefined
  const port = Number(process.env.CARGO_PORT || process.env.PORT || headerPort || 3090)
  const preferred = interfaces.filter(x=>x.score>=0)
  const picked = preferred.length ? preferred : interfaces
  return NextResponse.json({
    hostname: os.hostname(), port,
    interfaces:picked.map(({name,address})=>({name,address})),
    ips:picked.map(x=>x.address),
    urls:picked.map(x=>`http://${x.address}:${port}`),
    primaryUrl:picked[0]?`http://${picked[0].address}:${port}`:`http://localhost:${port}`,
    localUrl:`http://localhost:${port}`
  })
}
