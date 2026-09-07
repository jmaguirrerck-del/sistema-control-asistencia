"use client";

import { useEffect, useMemo, useState } from "react";

function today() { return new Date().toLocaleDateString("en-CA", { timeZone:"America/Argentina/Buenos_Aires" }); }

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
  return <div className="stack">
    <div><h1 className="heading">Registros de asistencia</h1><p className="subheading">Consulta y depuración de entradas, salidas, tardanzas y compensaciones. La eliminación de asistencia no afecta licencias ni vacaciones.</p></div>
    <div className="card row"><div><label className="label">Fecha</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><button className="btn btn-secondary" style={{alignSelf:"end"}} onClick={load}>Actualizar</button><div className="spacer"/>{selected.length>0&&<button className="btn btn-danger" style={{alignSelf:"end"}} onClick={()=>remove(selected)}>Eliminar seleccionados ({selected.length})</button>}</div>
    {msg&&<div className="notice info">{msg}</div>}
    <div className="card table-wrap"><table><thead><tr><th style={{width:42}}><input aria-label="Seleccionar todos" type="checkbox" checked={allSelected} onChange={toggleAll}/></th><th>Agente</th><th>Horario</th><th>Entrada</th><th>Tardanza</th><th>Salida</th><th>Tipo</th><th>Compensó</th><th>Saldo</th><th></th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><input aria-label={`Seleccionar ${r.last_name}, ${r.first_name}`} type="checkbox" checked={selected.includes(Number(r.id))} onChange={()=>toggle(Number(r.id))}/></td><td><strong>{r.last_name}, {r.first_name}</strong><div className="muted">DNI {r.dni}</div></td><td>{String(r.scheduled_start).slice(0,5)}–{String(r.scheduled_end).slice(0,5)}</td><td>{r.entry_local||"—"}</td><td>{r.late_minutes||0} min</td><td>{r.exit_local||"—"}</td><td><span className={`badge ${r.exit_type==="AUTO"?"warn":"info"}`}>{r.exit_type||"Pendiente"}</span></td><td>{r.compensation_minutes||0} min</td><td>{r.pending_minutes||0} min</td><td><button className="btn btn-secondary" onClick={()=>remove([Number(r.id)])}>Eliminar</button></td></tr>)}
      {!rows.length && <tr><td colSpan={10} className="muted">No hay marcaciones registradas para esta fecha.</td></tr>}
    </tbody></table></div>
  </div>;
}
