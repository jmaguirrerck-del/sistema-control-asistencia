"use client";

import { useEffect, useMemo, useState } from "react";

function today() { return new Date().toLocaleDateString("en-CA", { timeZone:"America/Argentina/Buenos_Aires" }); }
const reasonLabels:Record<string,string>={PERSONAL:"Trámite / motivo personal",MEDICAL:"Atención médica",COMMISSION:"Comisión de servicio",AUTHORIZED_PERMISSION:"Permiso autorizado",LEAVE_HOURS:"Licencia por horas",UNJUSTIFIED:"Salida no justificada",OTHER:"Otra causa"};
const movementLabel:Record<string,string>={ENTRY:"Entrada",EXIT:"Salida",REENTRY:"Reingreso",AUTO_EXIT:"Salida automática"};

export default function RegistrosPage() {
  const [date,setDate]=useState(today());
  const [rows,setRows]=useState<any[]>([]);
  const [selected,setSelected]=useState<number[]>([]);
  const [msg,setMsg]=useState("");
  async function load() {
    const r=await fetch(`/api/admin/records?date=${encodeURIComponent(date)}`,{cache:"no-store"});
    if(r.ok){setRows(await r.json());setSelected([]);}else setMsg("No se pudieron cargar los registros.");
  }
  useEffect(()=>{load();},[date]);
  const allSelected=useMemo(()=>rows.length>0&&rows.every(r=>selected.includes(Number(r.id))),[rows,selected]);
  function toggle(id:number){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
  function toggleAll(){setSelected(allSelected?[]:rows.map(r=>Number(r.id)));}
  async function remove(ids:number[]){
    if(!ids.length)return;
    const label=ids.length===1?"este registro de asistencia":`estos ${ids.length} registros de asistencia`;
    if(!confirm(`¿Eliminar ${label}?\n\nEsta acción NO elimina licencias, vacaciones, personal ni horarios.`))return;
    setMsg("Eliminando…");
    const r=await fetch("/api/admin/records",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({ids,reason:"Eliminación desde Registros de asistencia"})});
    const b=await r.json().catch(()=>({}));
    if(!r.ok){setMsg(b.error||"No se pudieron eliminar los registros.");return;}
    setMsg(`${b.deleted} registro${b.deleted===1?"":"s"} de asistencia eliminado${b.deleted===1?"":"s"}. Licencias y vacaciones permanecen sin cambios.`);
    await load();
  }
  async function classify(intervalId:number,reasonCode:string,countsAsWork:boolean,adminNote:string){
    if(!reasonCode){setMsg("Seleccione el motivo de la salida intermedia.");return;}
    setMsg("Guardando clasificación…");
    const r=await fetch("/api/admin/records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({intervalId,reasonCode,countsAsWork,adminNote})});
    const b=await r.json().catch(()=>({}));
    if(!r.ok){setMsg(b.error||"No se pudo clasificar la salida.");return;}
    setMsg("Salida intermedia clasificada correctamente.");await load();
  }
  return <div className="stack">
    <div><h1 className="heading">Registros de asistencia</h1><p className="subheading">Cada jornada se conserva como una secuencia de Entrada → Salida → Reingreso → Salida. Las salidas intermedias son clasificadas posteriormente por Administración.</p></div>
    <div className="card row"><div><label className="label">Fecha</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><button className="btn btn-secondary" style={{alignSelf:"end"}} onClick={load}>Actualizar</button><div className="spacer"/>{selected.length>0&&<button className="btn btn-danger" style={{alignSelf:"end"}} onClick={()=>remove(selected)}>Eliminar seleccionados ({selected.length})</button>}</div>
    {msg&&<div className="notice info">{msg}</div>}
    <div className="card table-wrap"><table><thead><tr><th style={{width:42}}><input aria-label="Seleccionar todos" type="checkbox" checked={allSelected} onChange={toggleAll}/></th><th>Agente</th><th>Horario</th><th>Movimientos</th><th>Tardanza</th><th>Compensó</th><th>Saldo</th><th></th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><input aria-label={`Seleccionar ${r.last_name}, ${r.first_name}`} type="checkbox" checked={selected.includes(Number(r.id))} onChange={()=>toggle(Number(r.id))}/></td><td><strong>{r.last_name}, {r.first_name}</strong><div className="muted">DNI {r.dni}</div></td><td>{String(r.scheduled_start).slice(0,5)}–{String(r.scheduled_end).slice(0,5)}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(r.movements||[]).map((m:any)=><span key={m.id} className={`badge ${m.event_type==="EXIT"||m.event_type==="AUTO_EXIT"?"warn":"info"}`}>{movementLabel[m.event_type]||m.event_type} {m.time}</span>)}</div>{(r.intervals||[]).map((i:any)=><IntervalEditor key={i.id} interval={i} onSave={classify}/>)}</td><td>{r.late_minutes||0} min</td><td>{r.compensation_minutes||0} min</td><td>{r.pending_minutes||0} min</td><td><button className="btn btn-secondary" onClick={()=>remove([Number(r.id)])}>Eliminar jornada</button></td></tr>)}
      {!rows.length && <tr><td colSpan={8} className="muted">No hay marcaciones registradas para esta fecha.</td></tr>}
    </tbody></table></div>
  </div>;
}

function IntervalEditor({interval,onSave}:{interval:any;onSave:(id:number,reason:string,counts:boolean,note:string)=>Promise<void>}){
  const [reason,setReason]=useState(interval.reason_code||"");
  const [counts,setCounts]=useState(interval.counts_as_work===true);
  const [note,setNote]=useState(interval.admin_note||"");
  return <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}}>
    <div><strong>Salida intermedia:</strong> {interval.exit_time} → {interval.reentry_time} · {interval.minutes} min {interval.reason_code?<span className="badge good">{reasonLabels[interval.reason_code]||interval.reason_code}</span>:<span className="badge warn">Motivo pendiente</span>}</div>
    <div className="row" style={{marginTop:8,alignItems:"end"}}><div style={{minWidth:190}}><label className="label">Motivo</label><select className="select" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Seleccionar…</option>{Object.entries(reasonLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><label style={{display:"flex",gap:7,alignItems:"center",minHeight:42}}><input type="checkbox" checked={counts} onChange={e=>setCounts(e.target.checked)}/> Computa como tiempo trabajado</label><div style={{minWidth:220,flex:1}}><label className="label">Observación</label><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Opcional"/></div><button className="btn btn-primary" type="button" onClick={()=>onSave(Number(interval.id),reason,counts,note)}>Guardar</button></div>
  </div>
}
