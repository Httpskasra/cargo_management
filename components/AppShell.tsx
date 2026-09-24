'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Bike, ClipboardList, Search, DatabaseBackup, Wifi, WifiOff, PackageCheck, BarChart3 } from 'lucide-react'

const links = [
  { href:'/', label:'داشبورد', hint:'ثبت سریع و آمار امروز', Icon:LayoutDashboard },
  { href:'/riders', label:'راکب‌ها', hint:'مدیریت افراد', Icon:Bike, admin:true },
  { href:'/runsheets', label:'رانشیت‌ها', hint:'NDX و SAPA Post', Icon:ClipboardList },
  { href:'/search', label:'جستجو', hint:'پیدا کردن مرسوله', Icon:Search },
  { href:'/analytics', label:'آمار و گزارش', hint:'نمودار و خروجی اکسل', Icon:BarChart3, admin:true },
  { href:'/backup', label:'پشتیبان‌گیری', hint:'امنیت اطلاعات', Icon:DatabaseBackup, admin:true },
]

export default function AppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(); const router=useRouter(); const [auth,setAuth]=useState<any>(null); const [authLoading,setAuthLoading]=useState(true); const [online,setOnline]=useState(true)
  useEffect(()=>{
    if(pathname==='/login'){setAuthLoading(false);return}
    fetch('/api/auth/me',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('unauthenticated');return r.json()}).then(d=>setAuth(d.user)).catch(()=>router.replace('/login')).finally(()=>setAuthLoading(false))
    const check=()=>fetch('/api/health',{cache:'no-store'}).then(r=>setOnline(r.ok)).catch(()=>setOnline(false))
    check(); const timer=setInterval(check,15000); return()=>clearInterval(timer)
  },[pathname,router])
  if(pathname==='/login') return <>{children}</>
  if(authLoading) return <div className="login-loading">در حال بررسی دسترسی...</div>
  if(!auth) return null
  if(auth.role!=='ADMIN' && ['/riders','/analytics','/backup'].includes(pathname)){ router.replace('/'); return null }
  return <div className="app-bg"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="shell">
    <aside className="sidebar glass">
      <div className="brand"><div className="brand-logo"><PackageCheck size={26}/></div><div><b>Cargo Manager</b><span>مدیریت هوشمند مرسوله</span></div></div>
      <nav className="nav">{links.filter(x=>!x.admin||auth.role==='ADMIN').map(({href,label,hint,Icon})=>{const active=pathname===href; return <Link key={href} href={href} className={active?'active':''}><span className="nav-icon"><Icon size={21}/></span><span><b>{label}</b><small>{hint}</small></span>{active&&<i/>}</Link>})}</nav>
      <div className="account-card"><div><b>{auth.riderName||"مدیر سیستم"}</b><small>{auth.role==='ADMIN'?'مدیر سیستم':'راکب'} · {auth.phone}</small></div><button className="btn secondary" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.replace('/login')}}>خروج</button></div>
      <div className="network-card">
        <div className="network-title"><span className={online?'pulse-dot':'pulse-dot offline'}/>{online?<Wifi size={17}/>:<WifiOff size={17}/>}<b>{online?'Cloudflare آنلاین است':'ارتباط با سرور قطع است'}</b></div>
        <p>نسخه ابری از هر دستگاه دارای اینترنت و آدرس دامنه پروژه قابل استفاده است.</p>
        <small>دیتابیس: Cloudflare D1</small>
      </div>
    </aside>
    <main className="main"><div className="mobile-brand"><PackageCheck size={22}/> Cargo Manager</div>{children}</main>
  </div></div>
}
