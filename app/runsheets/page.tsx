'use client'
import {useEffect,useMemo,useState} from 'react'
import Scanner from '@/components/Scanner'
import PersianDateTimePicker from '@/components/PersianDateTimePicker'
import {faDate,faTime} from '@/lib/format'
import {useRealtime} from '@/hooks/useRealtime'
import {ClipboardList, Plus, Package, RotateCcw, CheckCircle2, Clock3, UserRound, CalendarClock, CheckSquare, Trash2, ClipboardPaste, Send, RefreshCw, MessageSquareText} from 'lucide-react'

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

function parseBarcodes(text:string){
 return [...new Set(
   text
    .split(/[\r\n\t,;]+/)
    .map(x=>x.trim())
    .filter(Boolean)
 )]
}

export default function Runsheets(){
 const [riders,setRiders]=useState<any[]>([])
 const [runs,setRuns]=useState<any[]>([])
 const [riderId,setRiderId]=useState('')
 const [riderSearch,setRiderSearch]=useState('')
 const [runsheetSearch,setRunsheetSearch]=useState('')
 const [addStatus,setAddStatus]=useState<'IN_TRANSIT'|'DELIVERED'|'RETURNED'>('IN_TRANSIT')
 const [type,setType]=useState('NDX')
 const [createdAt,setCreatedAt]=useState(()=>new Date().toISOString())
 const [selected,setSelected]=useState<any>(null)
 const [creating,setCreating]=useState(false)
 const [selectedItems,setSelectedItems]=useState<number[]>([])
 const [bulkStatus,setBulkStatus]=useState<'IN_TRANSIT'|'DELIVERED'|'RETURNED'>('DELIVERED')
 const [bulkBusy,setBulkBusy]=useState(false)
 const [pasteText,setPasteText]=useState('')
 const [importBusy,setImportBusy]=useState(false)
 const [importMsg,setImportMsg]=useState<any>(null)
 const [nedexBusy,setNedexBusy]=useState(false)
 const [nedexResults,setNedexResults]=useState<Record<number,any>>({})
 const [nedexSummary,setNedexSummary]=useState<any>(null)
 const [nedexError,setNedexError]=useState('')
 const parsedBarcodes=useMemo(()=>parseBarcodes(pasteText),[pasteText])

 async function load(q=runsheetSearch){
   const [a,b]=await Promise.all([
     fetch('/api/riders',{cache:'no-store'}),
     fetch('/api/runsheets'+(q.trim()?`?q=${encodeURIComponent(q.trim())}`:''),{cache:'no-store'})
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
   setPasteText('')
   setImportMsg(null)
   setNedexResults({})
   setNedexSummary(null)
   setNedexError('')
 },[selected?.id])

 async function create(){
   if(!riderId)return
   setCreating(true)
   try{
     const r=await fetch('/api/runsheets',{
       method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({riderId,type,createdAt})
     })
     const d=await r.json()
     setSelected(d)
     await load()
   }finally{setCreating(false)}
 }

 function toggleItem(id:number){
   setSelectedItems(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
 }

 function toggleAll(){
   if(!selected?.items?.length)return
   setSelectedItems(prev=>prev.length===selected.items.length?[]:selected.items.map((i:any)=>i.id))
 }

 async function setStatus(ids:number[],status:'IN_TRANSIT'|'DELIVERED'|'RETURNED'){
   if(!ids.length)return
   const r=await fetch('/api/scan',{
     method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,status})
   })
   const d=await r.json()
   if(!r.ok){alert(d.error||'خطا در تغییر وضعیت');return false}
   await load()
   return true
 }

 async function applyBulk(){
   if(!selectedItems.length)return
   setBulkBusy(true)
   try{
     if(await setStatus(selectedItems,bulkStatus))setSelectedItems([])
   }finally{setBulkBusy(false)}
 }

 async function removeItems(ids:number[]){
   if(!ids.length)return
   if(!confirm(ids.length===1?'این مرسوله از رانشیت حذف شود؟':`${ids.length} مرسوله انتخاب‌شده از رانشیت حذف شوند؟`))return
   const r=await fetch('/api/scan',{
     method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})
   })
   const d=await r.json()
   if(!r.ok){alert(d.error||'خطا در حذف مرسوله');return}
   setSelectedItems(prev=>prev.filter(id=>!ids.includes(id)))
   await load()
 }

 async function updateNedexStatuses(){
   if(!selected?.id||selected.type!=='NDX'||nedexBusy)return
   setNedexBusy(true)
   setNedexError('')
   try{
     const r=await fetch('/api/nedex/status',{
       method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runsheetId:selected.id})
     })
     const d=await r.json()
     if(!r.ok){setNedexError(d.error||'خطا در دریافت وضعیت از NEDEx');return}
     const map:Record<number,any>={}
     for(const result of d.results||[]) map[result.itemId]=result
     setNedexResults(map)
     setNedexSummary(d.summary||null)
   }catch{
     setNedexError('ارتباط با سرویس NEDEx برقرار نشد')
   }finally{
     setNedexBusy(false)
   }
 }

 async function importBarcodes(){
   if(!selected?.id||!parsedBarcodes.length)return
   setImportBusy(true);setImportMsg(null)
   try{
     const r=await fetch('/api/scan',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({runsheetId:selected.id,barcodes:parsedBarcodes,status:addStatus})
     })
     const d=await r.json()
     if(!r.ok){setImportMsg({err:true,text:d.error||'خطا در ثبت گروهی'});return}
     const conflictText=d.conflicts?.length?`، ${d.conflicts.length} مورد در رانشیت دیگر بود`:''
     setImportMsg({err:false,text:`${d.created} بارکد ثبت شد${d.alreadyHere?`، ${d.alreadyHere} مورد از قبل در همین رانشیت بود`:''}${conflictText}`})
     if(d.created) setPasteText('')
     await load()
   }catch{setImportMsg({err:true,text:'ارتباط با سرور برقرار نشد'})}
   finally{setImportBusy(false)}
 }

 return <>
   <div className="top"><div><div className="eyebrow"><ClipboardList size={13}/> مرکز رانشیت</div><h1>رانشیت‌ها</h1><div className="muted">ساخت رانشیت، ثبت گروهی بارکد و مدیریت وضعیت مرسوله‌ها.</div></div></div>

   <div className="card runsheet-create-card"><div className="row responsive">
     <div style={{flex:1,minWidth:240}}><label className="muted" style={{display:'block',marginBottom:6}}>۱) جستجوی راکب</label><input className="input" value={riderSearch} onChange={e=>setRiderSearch(e.target.value)} placeholder="نام راکب را جستجو کنید..."/><select className="select" style={{marginTop:7,width:'100%'}} value={riderId} onChange={e=>setRiderId(e.target.value)}><option value="">راکب را انتخاب کنید</option>{riders.filter(r=>r.active&&r.name.toLowerCase().includes(riderSearch.trim().toLowerCase())).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
     <select className="select" style={{flex:1}} value={type} onChange={e=>setType(e.target.value)}><option value="NDX">۲) NDX</option><option value="SAPAPOST">۲) SAPA Post</option></select>
     <div style={{flex:1.5,minWidth:260}}><label className="muted" style={{display:'block',marginBottom:6}}>۳) تاریخ و ساعت ثبت رانشیت</label><PersianDateTimePicker value={createdAt} onChange={setCreatedAt}/></div>
     <button className="btn big" disabled={!riderId||creating} onClick={create}><Plus size={18}/>{creating?'در حال ساخت...':'۴) ساخت رانشیت'}</button>
   </div></div>

   <div className="section-grid section">
     <div className="card">
       <div className="row" style={{justifyContent:'space-between',marginBottom:12}}><h3 style={{margin:0}}>رانشیت‌ها</h3><span className="chip">{runs.length} مورد</span></div><div className="row responsive" style={{marginBottom:12}}><input className="input" style={{flex:1}} value={runsheetSearch} onChange={e=>{setRunsheetSearch(e.target.value);if(!e.target.value.trim())load('')}} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="جستجو با شماره رانشیت، نام راکب یا نوع..."/><button className="btn secondary" onClick={()=>load()} disabled={!runsheetSearch.trim()}>جستجو</button></div>
       <div className="runs-list">{runs.map(r=><div key={r.id} onClick={()=>setSelected(r)} className={`runs-item ${selected?.id===r.id?'active':''}`}>
         <div className="runs-item-top"><div className="row"><div className="nav-icon"><UserRound size={17}/></div><b>{r.rider.name}</b></div><span className="chip">{r.type}</span></div>
         <div className="muted" style={{margin:'8px 0 5px'}}><Package size={13} style={{verticalAlign:'middle'}}/> {r.items.length} مرسوله — #{r.id}</div>
         <small className="muted"><CalendarClock size={12} style={{verticalAlign:'middle'}}/> {faDate(r.createdAt)}، {faTime(r.createdAt)}</small>
       </div>)}{!runs.length&&<div className="empty"><div className="empty-icon"><ClipboardList size={28}/></div><h3>هنوز رانشیتی ساخته نشده</h3><div>از فرم بالا اولین رانشیت را بسازید.</div></div>}</div>
     </div>

     <div>{selected?<>
       <div className="card hero-card">
         <div className="row responsive" style={{justifyContent:'space-between',alignItems:'flex-start'}}>
           <div><div className="eyebrow">رانشیت انتخاب‌شده</div><h2>{selected.rider.name}</h2><div className="muted">{selected.type} #{selected.id} — ساخته شده {faDate(selected.createdAt)} ساعت {faTime(selected.createdAt)}</div></div>
           <div className="row responsive nedex-hero-actions"><span className="badge">{selected.items.length} مرسوله</span>{selected.type==='NDX'&&<button className="btn big nedex-refresh" disabled={nedexBusy||!selected.items.length} onClick={updateNedexStatuses}><RefreshCw size={17} className={nedexBusy?'spin':''}/>{nedexBusy?'در حال بررسی بارکدها...':'بروزرسانی وضعیت'}</button>}</div>
         </div>
         {selected.type==='NDX'&&nedexSummary&&<div className="nedex-summary"><span className="nedex-stat green">تحویل: <b>{nedexSummary.delivered}</b></span><span className="nedex-stat blue">درب منزل + کامنت: <b>{nedexSummary.withComment}</b></span><span className="nedex-stat red">درب منزل بدون کامنت: <b>{nedexSummary.withoutComment}</b></span><span className="nedex-stat neutral">سایر: <b>{nedexSummary.other}</b></span>{nedexSummary.errors>0&&<span className="nedex-stat error">خطا: <b>{nedexSummary.errors}</b></span>}</div>}
         {selected.type==='NDX'&&nedexError&&<div className="scan-status error">{nedexError}</div>}
       </div>

       <Scanner runsheetId={selected.id} onScanned={load} addStatus={addStatus} onAddStatusChange={setAddStatus}/>

       <div className="card section bulk-import-card">
         <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}><div><div className="eyebrow"><ClipboardPaste size={13}/> ورود گروهی از Excel</div><h3 style={{margin:'0 0 5px'}}>چند بارکد را یکجا ثبت کنید</h3><div className="muted">سلول‌ها یا ستون بارکد را در Excel کپی کنید و مستقیم اینجا Paste کنید. سطر، Tab، ویرگول و ; تشخیص داده می‌شود.</div></div><span className="chip">{parsedBarcodes.length} بارکد تشخیص داده شد</span></div>
         <textarea className="input bulk-textarea" value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={'مثال:\n123456789\n987654321\n112233445'} />
         <div className="row responsive" style={{marginTop:10}}><select className="select" style={{minWidth:155,flex:1}} value={addStatus} onChange={e=>setAddStatus(e.target.value as any)}><option value="IN_TRANSIT">درحال ارسال</option><option value="DELIVERED">تحویل</option><option value="RETURNED">برگشتی</option></select><button className="btn big" disabled={!parsedBarcodes.length||importBusy} onClick={importBarcodes}><Send size={17}/>{importBusy?'در حال ثبت...':`ثبت ${parsedBarcodes.length||0} بارکد با وضعیت ${statusLabel(addStatus)}`}</button></div>
         <div className="muted">بارکد جدید با وضعیت انتخاب‌شده ثبت می‌شود؛ بارکد موجود در همین رانشیت نیز همان وضعیت را می‌گیرد.</div>
         {importMsg&&<div className={`scan-status ${importMsg.err?'error':'success'}`}>{importMsg.text}</div>}
       </div>

       <div className="card section">
         <div className="row" style={{justifyContent:'space-between',marginBottom:12}}><div><h3 style={{margin:0}}>مرسوله‌های این رانشیت</h3><div className="muted" style={{marginTop:5}}>برای هر مرسوله می‌توانید وضعیت را مستقیم انتخاب کنید یا آن را از رانشیت حذف کنید.</div></div><span className="muted">{selected.items.length} مورد</span></div>

         {selected.items.length>0&&<div className="bulk-bar">
           <label className="select-all"><input type="checkbox" checked={selectedItems.length===selected.items.length} onChange={toggleAll}/>{selectedItems.length?`${selectedItems.length} مورد انتخاب شده`:'انتخاب همه'}</label>
           <select className="select bulk-select" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as any)}><option value="IN_TRANSIT">درحال ارسال</option><option value="DELIVERED">تحویل</option><option value="RETURNED">برگشتی</option></select>
           <button className="btn big" disabled={!selectedItems.length||bulkBusy} onClick={applyBulk}><CheckSquare size={17}/>{bulkBusy?'در حال اعمال...':`تغییر به ${statusLabel(bulkStatus)}`}</button>
           <button className="btn danger big" disabled={!selectedItems.length||bulkBusy} onClick={()=>removeItems(selectedItems)}><Trash2 size={17}/>حذف از رانشیت</button>
         </div>}

         <div className="table-wrap"><table className="table"><thead><tr><th><input type="checkbox" checked={selectedItems.length===selected.items.length&&selected.items.length>0} onChange={toggleAll}/></th><th>#</th><th>بارکد</th><th>تاریخ</th><th>ساعت</th><th>وضعیت داخلی</th>{selected.type==='NDX'&&<th>وضعیت NEDEx</th>}<th>عملیات</th></tr></thead><tbody>
           {selected.items.map((i:any,n:number)=>{const nx=nedexResults[i.id];return <tr key={i.id} className={selectedItems.includes(i.id)?'row-selected':''}>
             <td><input type="checkbox" checked={selectedItems.includes(i.id)} onChange={()=>toggleItem(i.id)}/></td><td>{n+1}</td><td dir="ltr" style={{textAlign:'right',fontWeight:800}}>{i.barcode}</td><td>{faDate(i.registeredAt)}</td><td>{faTime(i.registeredAt)}</td>
             <td><span className={statusClass(i.status)}>{i.status==='RETURNED'?<RotateCcw size={12}/>:i.status==='DELIVERED'?<CheckCircle2 size={12}/>:<Clock3 size={12}/>} {statusLabel(i.status)}</span></td>
             {selected.type==='NDX'&&<td><div className={`nedex-status ${nx?.color||'unchecked'}`}><div className="nedex-status-title">{nx?.state||'بررسی نشده'}</div>{nx?.color==='blue'&&<div className="nedex-comment"><MessageSquareText size={12}/>{nx.commentCount} کامنت{nx.latestComment&&<span title={nx.latestComment}> — {nx.latestComment}</span>}</div>}{nx?.color==='red'&&<div className="nedex-comment">بدون کامنت</div>}{nx?.error&&<div className="nedex-comment">{nx.error}</div>}</div></td>}
             <td><div className="row table-actions"><select className="select status-select" value={i.status==='NORMAL'?'IN_TRANSIT':i.status} onChange={e=>setStatus([i.id],e.target.value as any)}><option value="IN_TRANSIT">درحال ارسال</option><option value="DELIVERED">تحویل</option><option value="RETURNED">برگشتی</option></select><button className="btn danger" title="حذف از رانشیت" onClick={()=>removeItems([i.id])}><Trash2 size={14}/> حذف</button></div></td>
           </tr>})}
         </tbody></table></div>

         {!selected.items.length&&<div className="empty"><div className="empty-icon"><Package size={28}/></div><h3>رانشیت آماده ثبت است</h3><div>می‌توانید بارکد را اسکن کنید یا چند بارکد را از Excel یکجا Paste کنید.</div></div>}
       </div>
     </>:<div className="card empty"><div className="empty-icon"><ClipboardList size={28}/></div><h3>یک رانشیت را انتخاب کنید</h3><div>از سمت راست یک رانشیت قبلی را باز کنید یا یک رانشیت جدید بسازید.</div></div>}</div>
   </div>
 </>
}
