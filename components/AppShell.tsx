'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Bike, ClipboardList, Search, DatabaseBackup, Wifi, WifiOff, Copy, Check, PackageCheck } from 'lucide-react'

const links = [
  { href:'/', label:'داشبورد', hint:'ثبت سریع و آمار امروز', Icon:LayoutDashboard },
  { href:'/riders', label:'راکب‌ها', hint:'مدیریت افراد', Icon:Bike },
  { href:'/runsheets', label:'رانشیت‌ها', hint:'NDX و SAPA Post', Icon:ClipboardList },
  { href:'/search', label:'جستجو', hint:'پیدا کردن مرسوله', Icon:Search },
  { href:'/backup', label:'پشتیبان‌گیری', hint:'امنیت اطلاعات', Icon:DatabaseBackup },
]

export default function AppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(); const [network,setNetwork]=useState<any>(null); const [copied,setCopied]=useState(false); const [online,setOnline]=useState(true)
  useEffect(()=>{
    fetch('/api/network',{cache:'no-store'}).then(r=>r.json()).then(setNetwork).catch(()=>setOnline(false))
    const es=new EventSource('/api/events'); es.onopen=()=>setOnline(true); es.onerror=()=>setOnline(false); return()=>es.close()
  },[])
  const url=network?.primaryUrl||network?.urls?.[0]
  async function copy(){if(!url)return; await navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  return <div className="app-bg"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="shell">
    <aside className="sidebar glass">
      <div className="brand"><div className="brand-logo"><PackageCheck size={26}/></div><div><b>Cargo Manager</b><span>مدیریت هوشمند مرسوله</span></div></div>
      <nav className="nav">{links.map(({href,label,hint,Icon})=>{const active=pathname===href; return <Link key={href} href={href} className={active?'active':''}><span className="nav-icon"><Icon size={21}/></span><span><b>{label}</b><small>{hint}</small></span>{active&&<i/>}</Link>})}</nav>
      <div className="network-card">
        <div className="network-title"><span className={online?'pulse-dot':'pulse-dot offline'}/>{online?<Wifi size={17}/>:<WifiOff size={17}/>}<b>{online?'شبکه آماده است':'ارتباط قطع است'}</b></div>
        <p>برای کامپیوترهای دیگر همین آدرس را در مرورگر وارد کنید:</p>
        <button className="network-url" onClick={copy} disabled={!url}><span dir="ltr">{url||'در حال شناسایی IP...'}</span>{copied?<Check size={17}/>:<Copy size={17}/>}</button>
        <small>همه دستگاه‌ها باید روی یک شبکه باشند.</small>
      </div>
    </aside>
    <main className="main"><div className="mobile-brand"><PackageCheck size={22}/> Cargo Manager</div>{children}</main>
  </div></div>
}
