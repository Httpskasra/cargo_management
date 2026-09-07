'use client'
import { useEffect,useRef,useState } from 'react'
import { ScanLine, RotateCcw, CheckCircle2, AlertTriangle, Keyboard } from 'lucide-react'
export default function Scanner({runsheetId,onScanned}:{runsheetId:number|null,onScanned?:()=>void}){
 const [barcode,setBarcode]=useState(''); const [returned,setReturned]=useState(false); const [msg,setMsg]=useState<any>(null); const [busy,setBusy]=useState(false); const ref=useRef<HTMLInputElement>(null)
 useEffect(()=>{ref.current?.focus()},[runsheetId,msg])
 async function submit(e:React.FormEvent){e.preventDefault(); if(busy)return; if(!runsheetId){setMsg({err:true,text:'ابتدا یک رانشیت را انتخاب کنید'});return} if(!barcode.trim())return
 setBusy(true); const r=await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({barcode,runsheetId,status:returned?'RETURNED':'NORMAL'})}); const d=await r.json();
 if(!r.ok)setMsg({err:true,text:d.error}); else {setMsg({err:false,text:`${d.barcode} با موفقیت برای ${d.runsheet.rider.name} ثبت شد`}); setBarcode(''); onScanned?.(); try{const ctx=new AudioContext();const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.04;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.09)}catch{}}
 setBusy(false); ref.current?.focus()
 }
 return <div className="card scan-card section"><div className="row" style={{justifyContent:'space-between',marginBottom:14}}><div><div className="eyebrow" style={{background:'#312e81',color:'#c7d2fe',borderColor:'#4338ca'}}><ScanLine size={13}/> حالت اسکن سریع</div><h3 style={{margin:'0 0 5px'}}>بارکد را اسکن کنید</h3><div className="muted"><Keyboard size={13} style={{verticalAlign:'middle'}}/> بعد از اسکن، Enter خودکار ثبت می‌کند.</div></div><ScanLine size={36} color="#818cf8"/></div><form onSubmit={submit}><div className="row responsive"><input ref={ref} className="input scanner-input" style={{flex:1,minWidth:220}} value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="SCAN BARCODE..." autoComplete="off"/><label className="return-toggle"><input type="checkbox" checked={returned} onChange={e=>setReturned(e.target.checked)}/><RotateCcw size={16}/> برگشتی</label><button className="btn big" disabled={busy}>{busy?'در حال ثبت...':'ثبت مرسوله'}</button></div></form>{msg&&<div className={`scan-status ${msg.err?'error':'success'}`}>{msg.err?<AlertTriangle size={16} style={{verticalAlign:'middle',marginLeft:6}}/>:<CheckCircle2 size={16} style={{verticalAlign:'middle',marginLeft:6}}/>}{msg.text}</div>}</div>
}
