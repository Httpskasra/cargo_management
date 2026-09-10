'use client'
import { useEffect, useRef, useState } from 'react'
import { ScanLine, CheckCircle2, AlertTriangle, Keyboard, PackageCheck, RotateCcw } from 'lucide-react'

export default function Scanner({runsheetId,onScanned}:{runsheetId:number|null,onScanned?:()=>void}){
 const [barcode,setBarcode]=useState('')
 const [msg,setMsg]=useState<any>(null)
 const [busy,setBusy]=useState(false)
 const ref=useRef<HTMLInputElement>(null)

 useEffect(()=>{ref.current?.focus()},[runsheetId,msg])

 async function submit(e:React.FormEvent){
   e.preventDefault()
   if(busy)return
   if(!runsheetId){setMsg({err:true,text:'ابتدا یک رانشیت را انتخاب کنید'});return}
   if(!barcode.trim())return

   setBusy(true)
   try{
     const r=await fetch('/api/scan',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({barcode,runsheetId})
     })
     const d=await r.json()

     if(!r.ok){
       setMsg({err:true,text:d.error||'خطا در ثبت بارکد'})
     }else{
       setMsg({
         err:false,
         text:d.action==='created'
           ? `${d.barcode} ثبت شد — وضعیت: درحال ارسال`
           : `${d.barcode} — ${d.status==='DELIVERED'?'تحویل شد':'برگشتی شد'}`
       })
       setBarcode('')
       onScanned?.()

       try{
         const ctx=new AudioContext()
         const o=ctx.createOscillator(),g=ctx.createGain()
         o.frequency.value=d.action==='created'?880:660
         g.gain.value=.04;o.connect(g);g.connect(ctx.destination)
         o.start();o.stop(ctx.currentTime+.09)
       }catch{}
     }
   }catch{
     setMsg({err:true,text:'ارتباط با سرور برقرار نشد'})
   }finally{
     setBusy(false)
     ref.current?.focus()
   }
 }

 return <div className="card scan-card section">
   <div className="row" style={{justifyContent:'space-between',marginBottom:14}}>
     <div>
       <div className="eyebrow" style={{background:'#312e81',color:'#c7d2fe',borderColor:'#4338ca'}}>
         <ScanLine size={13}/> حالت اسکن سریع
       </div>
       <h3 style={{margin:'0 0 5px'}}>بارکد را اسکن کنید</h3>
       <div className="muted"><Keyboard size={13} style={{verticalAlign:'middle'}}/> اسکن اول: درحال ارسال — اسکن مجدد: تغییر وضعیت</div>
     </div>
     <ScanLine size={36} color="#818cf8"/>
   </div>

   <form onSubmit={submit}>
     <div className="row responsive">
       <input ref={ref} className="input scanner-input" style={{flex:1,minWidth:220}} value={barcode}
         onChange={e=>setBarcode(e.target.value)} placeholder="SCAN BARCODE..." autoComplete="off"/>
       <button className="btn big" disabled={busy}>
         {busy?'در حال ثبت...':'ثبت / تغییر وضعیت'}
       </button>
     </div>
   </form>

   <div className="scan-legend">
     <span><i className="status-dot transit"/>درحال ارسال</span>
     <span><i className="status-dot delivered"/>تحویل</span>
     <span><i className="status-dot returned"/>برگشتی</span>
   </div>

   {msg&&<div className={`scan-status ${msg.err?'error':'success'}`}>
     {msg.err?<AlertTriangle size={16} style={{verticalAlign:'middle',marginLeft:6}}/>:<CheckCircle2 size={16} style={{verticalAlign:'middle',marginLeft:6}}/>}
     {msg.text}
   </div>}
 </div>
}
