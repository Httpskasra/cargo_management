'use client'
import {useEffect, useMemo, useState} from 'react'
import {CalendarDays, ChevronLeft, ChevronRight, Clock3} from 'lucide-react'

type Props = { value:string; onChange:(value:string)=>void }

const PERSIAN_WEEKDAYS=['ش','ی','د','س','چ','پ','ج']
const monthNames=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']

// ============ ابزارهای پایه ============
function div(a:number,b:number){return Math.floor(a/b)}
function mod(a:number,b:number){return a-Math.floor(a/b)*b}

// ============ تبدیل میلادی ↔ JDN (روز ژولیَن) ============
// این دو تابع مرجع و تست‌شده‌اند.
function gregorianToJdn(gy:number,gm:number,gd:number){
  const a=Math.floor((14-gm)/12)
  const y=gy+4800-a
  const m=gm+12*a-3
  return gd+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045
}
function jdnToGregorian(jdn:number){
  const a=jdn+32044
  const b=Math.floor((4*a+3)/146097)
  const c=a-Math.floor((146097*b)/4)
  const d=Math.floor((4*c+3)/1461)
  const e=c-Math.floor((1461*d)/4)
  const m=Math.floor((5*e+2)/153)
  return {
    gy:100*b+d-4800+Math.floor(m/10),
    gm:m+3-12*Math.floor(m/10),
    gd:e-Math.floor((153*m+2)/5)+1
  }
}

// ============ تقویم جلالی ============
const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178]

// محاسبه‌ی کبیسه بودن و روز شروع سال جلالی در تقویم میلادی
function jalCal(jy:number){
  const bl=breaks.length, gy=jy+621
  if(jy<breaks[0]||jy>=breaks[bl-1]) throw new Error('Invalid Jalali year '+jy)
  let leapJ=-14, jp=breaks[0], jm=0, jump=0
  for(let i=1;i<bl;i++){
    jm=breaks[i]
    jump=jm-jp
    if(jy<jm) break
    leapJ=leapJ+Math.floor(jump/33)*8+Math.floor((jump%33)/4)
    jp=jm
  }
  let n=jy-jp
  leapJ=leapJ+Math.floor(n/33)*8+Math.floor((mod(n,33)+3)/4)
  if(mod(jump,33)===4&&jump-n===4) leapJ++

  const leapG=Math.floor(gy/4)-Math.floor(((Math.floor(gy/100)+1)*3)/4)-150
  const march=20+leapJ-leapG

  if(jump-n<6) n=n-jump+Math.floor((jump+4)/33)*33
  let leap=mod(mod(n+1,33)-1,4)
  if(leap===-1) leap=4

  return {leap,gy,march}
}

// تبدیل تاریخ جلالی به JDN
function jalaliToJdn(jy:number,jm:number,jd:number){
  const r=jalCal(jy)
  return gregorianToJdn(r.gy,3,r.march)
    + (jm-1)*31 - Math.floor(jm/7)*(jm-7) + jd - 1
}

// تبدیل JDN به تاریخ جلالی
function jdnToJalali(jdn:number){
  const gy=jdnToGregorian(jdn).gy
  let jy=gy-621
  const r=jalCal(jy)
  const jdn1f=gregorianToJdn(gy,3,r.march)
  let jm:number, jd:number
  let k=jdn-jdn1f
  if(k>=0){
    if(k<=185){
      jm=1+Math.floor(k/31)
      jd=mod(k,31)+1
      return {jy,jm,jd}
    }
    k-=186
  }else{
    jy-=1
    k+=179
    if(r.leap===1) k+=1
  }
  jm=7+Math.floor(k/30)
  jd=mod(k,30)+1
  return {jy,jm,jd}
}

// ============ توابع کمکی سطح بالا ============
function toJalali(date:Date){
  const jdn=gregorianToJdn(date.getFullYear(),date.getMonth()+1,date.getDate())
  const j=jdnToJalali(jdn)
  return {jy:j.jy,jm:j.jm,jd:j.jd,h:date.getHours(),m:date.getMinutes()}
}
function toGregorian(jy:number,jm:number,jd:number){
  const g=jdnToGregorian(jalaliToJdn(jy,jm,jd))
  return new Date(g.gy,g.gm-1,g.gd)
}
function pad(n:number){return String(n).padStart(2,'0')}
function toPersianDigits(s:string){return s.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[+d])}

// ============ کامپوننت ============
export default function PersianDateTimePicker({value,onChange}:Props){
  const initial=useMemo(()=>{
    const d=value?new Date(value):new Date()
    return toJalali(d)
  },[value])
  const [open,setOpen]=useState(false)
  const [viewY,setViewY]=useState(initial.jy)
  const [viewM,setViewM]=useState(initial.jm)
  const [jy,setJy]=useState(initial.jy),[jm,setJm]=useState(initial.jm),[jd,setJd]=useState(initial.jd)
  const [hour,setHour]=useState(initial.h),[minute,setMinute]=useState(initial.m)

  useEffect(()=>{
    setJy(initial.jy);setJm(initial.jm);setJd(initial.jd)
    setHour(initial.h);setMinute(initial.m)
    setViewY(initial.jy);setViewM(initial.jm)
  },[initial])

  const days=useMemo(()=>{
    const first=toGregorian(viewY,viewM,1)
    const next=toGregorian(viewM===12?viewY+1:viewY,viewM===12?1:viewM+1,1)
    const count=Math.round((next.getTime()-first.getTime())/86400000)
    const offset=(first.getDay()+1)%7 // شنبه = 0
    return Array.from({length:offset+count},(_,i)=>i<offset?null:i-offset+1)
  },[viewY,viewM])

  function selectDay(day:number){
    setJy(viewY);setJm(viewM);setJd(day)
    const g=toGregorian(viewY,viewM,day)
    const d=new Date(g.getFullYear(),g.getMonth(),g.getDate(),hour,minute,0,0)
    onChange(d.toISOString()); setOpen(false)
  }
  function changeTime(h:number,m:number){
    setHour(h);setMinute(m)
    const g=toGregorian(jy,jm,jd)
    onChange(new Date(g.getFullYear(),g.getMonth(),g.getDate(),h,m,0,0).toISOString())
  }
  function prev(){if(viewM===1){setViewM(12);setViewY(viewY-1)}else setViewM(viewM-1)}
  function next(){if(viewM===12){setViewM(1);setViewY(viewY+1)}else setViewM(viewM+1)}

  return <div className="jalali-picker">
    <button type="button" className="input picker-trigger" onClick={()=>setOpen(!open)}>
      <CalendarDays size={17}/><span>{toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`)}</span><span className="picker-time"><Clock3 size={15}/>{toPersianDigits(`${pad(hour)}:${pad(minute)}`)}</span>
    </button>
    {open&&<div className="jalali-popover">
      <div className="picker-head"><button type="button" className="icon-btn" onClick={prev}><ChevronRight size={18}/></button><b>{monthNames[viewM-1]} {toPersianDigits(String(viewY))}</b><button type="button" className="icon-btn" onClick={next}><ChevronLeft size={18}/></button></div>
      <div className="picker-week">{PERSIAN_WEEKDAYS.map((x,i)=><span key={i}>{x}</span>)}</div>
      <div className="picker-grid">{days.map((day,i)=>day===null?<span key={i}/>:<button type="button" key={i} className={day===jd&&viewM===jm&&viewY===jy?'selected-day':''} onClick={()=>selectDay(day)}>{toPersianDigits(String(day))}</button>)}</div>
      <div className="picker-time-row"><Clock3 size={16}/><span>ساعت</span><select className="select" value={hour} onChange={e=>changeTime(+e.target.value,minute)}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{pad(i)}</option>)}</select><span>:</span><select className="select" value={minute} onChange={e=>changeTime(hour,+e.target.value)}>{Array.from({length:60},(_,i)=><option key={i} value={i}>{pad(i)}</option>)}</select></div>
      <button type="button" className="btn secondary today-btn" onClick={()=>{const n=new Date();const j=toJalali(n);setJy(j.jy);setJm(j.jm);setJd(j.jd);setHour(n.getHours());setMinute(n.getMinutes());setViewY(j.jy);setViewM(j.jm);onChange(n.toISOString())}}>امروز و همین ساعت</button>
    </div>}
  </div>
}