'use client'
import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, CheckCircle2, Clock3, Download, RotateCcw, Search, Users } from 'lucide-react'
import { faDate } from '@/lib/format'

const labels: Record<string,string> = { IN_TRANSIT:'درحال ارسال', NORMAL:'درحال ارسال', DELIVERED:'تحویل', RETURNED:'برگشتی' }
function fmt(n:number){ return new Intl.NumberFormat('fa-IR').format(n) }
function queryString(f:any){ const p=new URLSearchParams(); Object.entries(f).forEach(([k,v])=>{if(v&&v!=='ALL')p.set(k,String(v))}); return p.toString() }

function BarChart({data}:{data:{label:string,value:number}[]}){
 const max=Math.max(1,...data.map(x=>x.value))
 return <div className="chart-bars">{data.map(x=><div className="bar-row" key={x.label}><div className="bar-label">{x.label}</div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(2,x.value/max*100)}%`}}/></div><b>{fmt(x.value)}</b></div>)}</div>
}
function LineChart({data}:{data:any[]}){
 if(!data.length)return <div className="empty chart-empty">برای بازه انتخابی داده‌ای وجود ندارد.</div>
 const w=760,h=250,p=30,max=Math.max(1,...data.map(x=>x.count)),step=data.length===1?0:(w-p*2)/(data.length-1)
 const pts=data.map((x,i)=>`${p+i*step},${h-p-(x.count/max)*(h-p*2)}`).join(' ')
 return <div className="line-chart"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="3"/><line x1={p} y1={h-p} x2={w-p} y2={h-p} stroke="currentColor" opacity=".12"/><line x1={p} y1={p} x2={p} y2={h-p} stroke="currentColor" opacity=".12"/>{data.map((x,i)=><circle key={i} cx={p+i*step} cy={h-p-(x.count/max)*(h-p*2)} r="4" fill="currentColor"/> )}</svg><div className="line-labels">{data.map(x=><span key={x.date}>{x.date.slice(5)}</span>)}</div></div>
}

export default function Analytics(){
 const initial={from:'',to:'',rider:'',type:'ALL',status:'ALL'}
 const [f,setF]=useState(initial),[d,setD]=useState<any>(null),[busy,setBusy]=useState(false)
 async function load(){setBusy(true);try{const r=await fetch('/api/analytics?'+queryString(f),{cache:'no-store'});setD(await r.json())}finally{setBusy(false)}}
 useEffect(()=>{load()},[])
 const exportUrl=useMemo(()=>'/api/export?'+queryString(f),[f])
 return <>
  <div className="top"><div><div className="eyebrow"><BarChart3 size={13}/> مرکز گزارش و تحلیل</div><h1>آمار و گزارش‌ها</h1><div className="muted">بررسی وضعیت مرسوله‌ها، عملکرد راکب‌ها و روند ثبت در یک نگاه.</div></div><a className="btn big" href={exportUrl}><Download size={18}/> خروجی اکسل</a></div>
  <div className="card"><div className="row" style={{marginBottom:14}}><Search size={18}/><b>فیلتر گزارش</b></div><div className="form-grid"><div><label className="muted">از تاریخ</label><input className="input" type="date" style={{marginTop:6}} value={f.from} onChange={e=>setF({...f,from:e.target.value})}/></div><div><label className="muted">تا تاریخ</label><input className="input" type="date" style={{marginTop:6}} value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></div><div><label className="muted">نام راکب</label><input className="input" style={{marginTop:6}} placeholder="نام راکب" value={f.rider} onChange={e=>setF({...f,rider:e.target.value})}/></div><div><label className="muted">نوع رانشیت</label><select className="select" style={{marginTop:6}} value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option value="ALL">همه</option><option value="NDX">NDX</option><option value="SAPAPOST">SAPA Post</option></select></div><div><label className="muted">وضعیت</label><select className="select" style={{marginTop:6}} value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="ALL">همه</option><option value="IN_TRANSIT">درحال ارسال</option><option value="DELIVERED">تحویل</option><option value="RETURNED">برگشتی</option></select></div></div><div className="row" style={{marginTop:14}}><button className="btn big" onClick={load} disabled={busy}><Activity size={17}/>{busy?'در حال محاسبه...':'اعمال فیلتر'}</button><button className="btn secondary" onClick={()=>{setF(initial);setTimeout(load,0)}}>پاک کردن فیلتر</button></div></div>
  {!d?<div className="card section"><div className="empty">در حال آماده‌سازی گزارش...</div></div>:<>
   <div className="grid section">
    <div className="card stat-card"><div className="stat-icon"><Activity size={22}/></div><div className="stat-value">{fmt(d.totals.total)}</div><div className="stat-label">کل مرسوله‌ها</div></div>
    <div className="card stat-card green"><div className="stat-icon"><CheckCircle2 size={22}/></div><div className="stat-value">{fmt(d.totals.delivered)}</div><div className="stat-label">تحویل</div></div>
    <div className="card stat-card red"><div className="stat-icon"><RotateCcw size={22}/></div><div className="stat-value">{fmt(d.totals.returned)}</div><div className="stat-label">برگشتی</div></div>
    <div className="card stat-card cyan"><div className="stat-icon"><Clock3 size={22}/></div><div className="stat-value">{fmt(d.totals.inTransit)}</div><div className="stat-label">درحال ارسال</div></div>
   </div>
   <div className="section-grid section"><div className="card"><h3>توزیع وضعیت‌ها</h3><div className="muted">نسبت مرسوله‌ها در وضعیت فعلی</div><BarChart data={d.status.map((x:any)=>({label:x.label,value:x.value}))}/><div className="analytics-rate">نرخ تحویل: <b>{d.totals.deliveryRate}%</b></div></div><div className="card"><h3>روند ثبت مرسوله</h3><div className="muted">تعداد مرسوله‌های ثبت‌شده در هر روز بازه انتخابی</div><LineChart data={d.daily}/></div></div>
   <div className="section-grid section"><div className="card"><h3>تفکیک نوع رانشیت</h3><BarChart data={d.types.map((x:any)=>({label:x.label,value:x.value}))}/></div><div className="card"><div className="row" style={{justifyContent:'space-between'}}><div><h3 style={{margin:0}}>عملکرد راکب‌ها</h3><div className="muted" style={{marginTop:5}}>بر اساس تعداد مرسوله در فیلتر فعلی</div></div><Users size={20}/></div><div className="table-wrap" style={{marginTop:14}}><table className="table"><thead><tr><th>راکب</th><th>کل</th><th>تحویل</th><th>برگشتی</th><th>درحال ارسال</th></tr></thead><tbody>{d.riders.map((r:any)=><tr key={r.name}><td><b>{r.name}</b></td><td>{fmt(r.count)}</td><td>{fmt(r.delivered)}</td><td>{fmt(r.returned)}</td><td>{fmt(r.inTransit)}</td></tr>)}{!d.riders.length&&<tr><td colSpan={5}>داده‌ای وجود ندارد.</td></tr>}</tbody></table></div></div></div>
   <div className="card section"><div className="row" style={{justifyContent:'space-between'}}><div><h3 style={{margin:0}}>خلاصه گزارش</h3><div className="muted" style={{marginTop:5}}>این اعداد دقیقاً بر اساس فیلترهای همین صفحه محاسبه شده‌اند.</div></div><a className="btn secondary" href={exportUrl}><Download size={15}/> دانلود همین نتایج در اکسل</a></div></div>
  </>}
 </>
}
