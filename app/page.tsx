'use client'
import {useEffect,useState} from 'react'
import Scanner from '@/components/Scanner'
import {useRealtime} from '@/hooks/useRealtime'
import {PackageCheck, RotateCcw, Bike, ClipboardList, Activity, ArrowLeft} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard(){
 const [s,setS]=useState<any>({}); const [runs,setRuns]=useState<any[]>([]); const [id,setId]=useState<number|null>(null); const [loading,setLoading]=useState(true)
 async function load(){try{const [a,b]=await Promise.all([fetch('/api/dashboard',{cache:'no-store'}),fetch('/api/runsheets',{cache:'no-store'})]);setS(await a.json());const r=await b.json();setRuns(r);setId(prev=>prev??r[0]?.id??null)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]); useRealtime(load)
 const stats=[
  {label:'مرسوله امروز',value:s.today??0,Icon:PackageCheck,cls:''},
  {label:'برگشتی امروز',value:s.totalReturned??0,Icon:RotateCcw,cls:'red'},
  {label:'عادی امروز',value:s.normal??0,Icon:Activity,cls:'green'},
  {label:'راکب فعال',value:s.activeRiders??0,Icon:Bike,cls:'cyan'}
 ]
 return <>
  <div className="top"><div><div className="eyebrow"><Activity size={13}/> مرکز عملیات امروز</div><h1>داشبورد</h1><div className="muted">همه‌چیز برای ثبت سریع مرسوله در یک صفحه.</div></div><Link href="/runsheets" className="btn secondary"><ClipboardList size={17}/> مدیریت رانشیت‌ها</Link></div>
  <div className="network-banner"><div><strong>اطلاعات به‌صورت زنده بین دستگاه‌های شبکه همگام است.</strong><br/><span>هر تغییری روی یک کامپیوتر، روی بقیه سیستم‌ها هم خودکار دیده می‌شود.</span></div><div className="badge"><span className="pulse-dot"/> آنلاین</div></div>
  <div className="grid">{stats.map(({label,value,Icon,cls})=><div className={`card stat-card ${cls}`} key={label}><div className="stat-icon"><Icon size={22}/></div><div className="stat-value">{loading?'…':value}</div><div className="stat-label">{label}</div></div>)}</div>
  <div className="section-grid section"><div className="card hero-card"><div className="eyebrow">مرحله ۱</div><h2>رانشیت فعال را انتخاب کنید</h2><div className="muted">بعد از انتخاب، بارکدخوان همیشه آماده دریافت است.</div><div style={{marginTop:16}}><select className="select" value={id??''} onChange={e=>setId(Number(e.target.value))}><option value="">انتخاب رانشیت</option>{runs.map(x=><option key={x.id} value={x.id}>{x.rider.name} — {x.type} #{x.id}</option>)}</select></div><div className="hero-help"><ArrowLeft size={17}/><span>اگر رانشیت هنوز ساخته نشده، از صفحه <b>رانشیت‌ها</b> یک مورد جدید بسازید.</span></div></div><Scanner runsheetId={id} onScanned={load}/></div>
 </>
}
