'use client'
import {useEffect,useState} from 'react'
import {DatabaseBackup, ShieldCheck, Cloud, CheckCircle2, RefreshCw} from 'lucide-react'
export default function Backup(){
 const [info,setInfo]=useState<any>(null),[busy,setBusy]=useState(false)
 async function load(){setBusy(true);try{const r=await fetch('/api/backup',{cache:'no-store'});setInfo(await r.json())}finally{setBusy(false)}}
 useEffect(()=>{load()},[])
 const c=info?.counts||{}
 return <><div className="top"><div><div className="eyebrow"><ShieldCheck size={13}/> امنیت داده‌ها</div><h1>دیتابیس و بازیابی</h1><div className="muted">اطلاعات سامانه روی Cloudflare D1 نگهداری می‌شود.</div></div><button className="btn big" disabled={busy} onClick={load}><RefreshCw size={18}/>{busy?'در حال بررسی...':'بررسی وضعیت'}</button></div>
 <div className="grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}><div className="card hero-card"><div className="stat-icon"><Cloud size={22}/></div><h3>Cloudflare D1</h3><div className="muted" style={{lineHeight:1.9}}>دیتابیس دیگر به فایل SQLite روی یک کامپیوتر وابسته نیست و از طریق binding امن Worker در دسترس است.</div></div><div className="card hero-card"><div className="stat-icon" style={{background:'#ecfdf5',color:'#059669'}}><ShieldCheck size={22}/></div><h3>Backup و Restore</h3><div className="muted" style={{lineHeight:1.9}}>برای بازیابی از D1 Time Travel استفاده کنید. برای نسخه SQL نیز دستور <span dir="ltr">wrangler d1 export</span> در راهنمای Deploy قرار داده شده است.</div></div></div>
 {info&&<div className="section success"><CheckCircle2 size={16} style={{verticalAlign:'middle',marginLeft:6}}/>وضعیت دیتابیس: {info.status==='online'?'آنلاین':'نامشخص'} · {info.provider}</div>}
 <div className="card section"><h3>آمار فعلی دیتابیس</h3><div className="grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}><div className="stat"><b>{c.users??'-'}</b><span>کاربر</span></div><div className="stat"><b>{c.riders??'-'}</b><span>راکب</span></div><div className="stat"><b>{c.runsheets??'-'}</b><span>رانشیت</span></div><div className="stat"><b>{c.items??'-'}</b><span>مرسوله</span></div></div></div></>
}
