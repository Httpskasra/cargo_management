'use client'
import {useEffect,useState} from 'react'
import Scanner from '@/components/Scanner'
import {faDate,faTime} from '@/lib/format'
import {useRealtime} from '@/hooks/useRealtime'
import {ClipboardList, Plus, Package, RotateCcw, CheckCircle2, Clock3, UserRound, CalendarClock, CheckSquare, Square} from 'lucide-react'

const statusLabel=(status:string)=>{
 if(status==='DELIVERED') return 'تحویل'
 if(status==='RETURNED') return 'برگشتی'
 return 'درحال ارسال'
}
const statusClass=(status:string)=>{
 if(status==='DELIVERED') return 'badge delivered'
 if(status==='RETURNED') return 'badge returned'
 return 'badge transit'
}

export default function Runsheets(){
 const [riders,setRiders]=useState<any[]>([])
 const [runs,setRuns]=useState<any[]>([])
 const [riderId,setRiderId]=useState('')
 const [type,setType]=useState('NDX')
 const [selected,setSelected]=useState<any>(null)
 const [creating,setCreating]=useState(false)
 const [selectedItems,setSelectedItems]=useState<number[]>([])
 const [bulkStatus,setBulkStatus]=useState<'DELIVERED'|'RETURNED'>('DELIVERED')
 const [bulkBusy,setBulkBusy]=useState(false)

 async function load(){
   const [a,b]=await Promise.all([
     fetch('/api/riders',{cache:'no-store'}),
     fetch('/api/runsheets',{cache:'no-store'})
   ])
   setRiders(await a.json())
   const x=await b.json()
   setRuns(x)
   setSelected((prev:any)=>prev?x.find((z:any)=>z.id===prev.id)||prev:prev)
 }
 useEffect(()=>{load()},[])
 useRealtime(load)

 useEffect(()=>{
   setSelectedItems([])
 },[selected?.id])

 async function create(){
   if(!riderId)return
   setCreating(true)
   const r=await fetch('/api/runsheets',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({riderId,type})
   })
   const d=await r.json()
   setSelected(d)
   setCreating(false)
   load()
 }

 function toggleItem(id:number){
   setSelectedItems(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
 }

 function toggleAll(){
   if(!selected?.items?.length)return
   setSelectedItems(prev=>prev.length===selected.items.length?[]:selected.items.map((i:any)=>i.id))
 }

 async function applyBulk(){
   if(!selectedItems.length)return
   setBulkBusy(true)
   try{
     const r=await fetch('/api/scan',{
       method:'PATCH',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({ids:selectedItems,status:bulkStatus})
     })
     const d=await r.json()
     if(!r.ok){alert(d.error||'خطا در تغییر وضعیت');return}
     setSelectedItems([])
     await load()
   }finally{setBulkBusy(false)}
 }

 async function status(item:any){
   const next=item.status==='RETURNED'?'DELIVERED':'RETURNED'
   await fetch('/api/scan',{
     method:'PATCH',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({id:item.id,status:next})
   })
   load()
 }

 return <>
   <div className="top">
     <div>
       <div className="eyebrow"><ClipboardList size={13}/> مرکز رانشیت</div>
       <h1>رانشیت‌ها</h1>
       <div className="muted">ساخت رانشیت، اسکن و مدیریت وضعیت مرسوله‌ها.</div>
     </div>
   </div>

   <div className="card">
     <div className="row responsive">
       <select className="select" style={{flex:2}} value={riderId} onChange={e=>setRiderId(e.target.value)}>
         <option value="">۱) راکب را انتخاب کنید</option>
         {riders.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
       </select>
       <select className="select" style={{flex:1}} value={type} onChange={e=>setType(e.target.value)}>
         <option value="NDX">۲) NDX</option>
         <option value="SAPAPOST">۲) SAPA Post</option>
       </select>
       <button className="btn big" disabled={!riderId||creating} onClick={create}>
         <Plus size={18}/>{creating?'در حال ساخت...':'۳) ساخت رانشیت'}
       </button>
     </div>
   </div>

   <div className="section-grid section">
     <div className="card">
       <div className="row" style={{justifyContent:'space-between',marginBottom:12}}>
         <h3 style={{margin:0}}>رانشیت‌های اخیر</h3><span className="chip">{runs.length} مورد</span>
       </div>
       <div className="runs-list">
         {runs.map(r=><div key={r.id} onClick={()=>setSelected(r)} className={`runs-item ${selected?.id===r.id?'active':''}`}>
           <div className="runs-item-top">
             <div className="row"><div className="nav-icon"><UserRound size={17}/></div><b>{r.rider.name}</b></div>
             <span className="chip">{r.type}</span>
           </div>
           <div className="muted" style={{margin:'8px 0 5px'}}>
             <Package size={13} style={{verticalAlign:'middle'}}/> {r.items.length} مرسوله — #{r.id}
           </div>
           <small className="muted">
             <CalendarClock size={12} style={{verticalAlign:'middle'}}/> {faDate(r.createdAt)}، {faTime(r.createdAt)}
           </small>
         </div>)}
         {!runs.length&&<div className="empty"><div className="empty-icon"><ClipboardList size={28}/></div><h3>هنوز رانشیتی ساخته نشده</h3><div>از فرم بالا اولین رانشیت را بسازید.</div></div>}
       </div>
     </div>

     <div>
       {selected?<>

         <div className="card hero-card">
           <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}>
             <div>
               <div className="eyebrow">رانشیت انتخاب‌شده</div>
               <h2>{selected.rider.name}</h2>
               <div className="muted">{selected.type} #{selected.id} — ساخته شده {faDate(selected.createdAt)} ساعت {faTime(selected.createdAt)}</div>
             </div>
             <span className="badge">{selected.items.length} مرسوله</span>
           </div>
         </div>

         <Scanner runsheetId={selected.id} onScanned={load}/>

         <div className="card section">
           <div className="row" style={{justifyContent:'space-between',marginBottom:12}}>
             <div>
               <h3 style={{margin:0}}>مرسوله‌های این رانشیت</h3>
               <div className="muted" style={{marginTop:5}}>اسکن اول = درحال ارسال | اسکن مجدد = تحویل ↔ برگشتی</div>
             </div>
             <span className="muted">{selected.items.length} مورد</span>
           </div>

           {selected.items.length>0&&<div className="bulk-bar">
             <label className="select-all">
               <input type="checkbox" checked={selectedItems.length===selected.items.length} onChange={toggleAll}/>
               {selectedItems.length?`${selectedItems.length} مورد انتخاب شده`:'انتخاب همه'}
             </label>
             <select className="select bulk-select" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as any)}>
               <option value="DELIVERED">تحویل</option>
               <option value="RETURNED">برگشتی</option>
             </select>
             <button className="btn big" disabled={!selectedItems.length||bulkBusy} onClick={applyBulk}>
               <CheckSquare size={17}/>{bulkBusy?'در حال اعمال...':`تایید و تغییر به ${statusLabel(bulkStatus)}`}
             </button>
           </div>}

           <div className="table-wrap">
             <table className="table">
               <thead><tr>
                 <th><input type="checkbox" checked={selectedItems.length===selected.items.length&&selected.items.length>0} onChange={toggleAll}/></th>
                 <th>#</th><th>بارکد</th><th>تاریخ</th><th>ساعت</th><th>وضعیت</th><th>عملیات</th>
               </tr></thead>
               <tbody>
                 {selected.items.map((i:any,n:number)=><tr key={i.id} className={selectedItems.includes(i.id)?'row-selected':''}>
                   <td><input type="checkbox" checked={selectedItems.includes(i.id)} onChange={()=>toggleItem(i.id)}/></td>
                   <td>{n+1}</td>
                   <td dir="ltr" style={{textAlign:'right',fontWeight:800}}>{i.barcode}</td>
                   <td>{faDate(i.registeredAt)}</td><td>{faTime(i.registeredAt)}</td>
                   <td><span className={statusClass(i.status)}>
                     {i.status==='RETURNED'?<RotateCcw size={12}/>:i.status==='DELIVERED'?<CheckCircle2 size={12}/>:<Clock3 size={12}/>}
                     {statusLabel(i.status)}
                   </span></td>
                   <td>
                     <button className="btn secondary" onClick={()=>status(i)}>
                       {i.status==='DELIVERED'?'برگشتی کردن':i.status==='RETURNED'?'تحویل کردن':'تحویل کردن'}
                     </button>
                   </td>
                 </tr>)}
               </tbody>
             </table>
           </div>

           {!selected.items.length&&<div className="empty">
             <div className="empty-icon"><Package size={28}/></div>
             <h3>رانشیت آماده اسکن است</h3>
             <div>اولین اسکن با وضعیت «درحال ارسال» ثبت می‌شود.</div>
           </div>}
         </div>
       </>:<div className="card empty"><div className="empty-icon"><ClipboardList size={28}/></div><h3>یک رانشیت را انتخاب کنید</h3><div>از سمت راست یک رانشیت قبلی را باز کنید یا یک رانشیت جدید بسازید.</div></div>}
     </div>
   </div>
 </>
}
