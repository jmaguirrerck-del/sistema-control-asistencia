"use client";

import { useEffect, useState } from "react";

function today() { return new Date().toLocaleDateString("en-CA", { timeZone:"America/Argentina/Buenos_Aires" }); }

export default function RegistrosPage() {
  const [date,setDate]=useState(today());
  const [rows,setRows]=useState<any[]>([]);
  async function load() { const r=await fetch(`/api/admin/records?date=${encodeURIComponent(date)}`,{cache:"no-store"}); if(r.ok) setRows(await r.json()); }
  useEffect(()=>{load();},[date]);
  return <div className="stack">
    <div><h1 className="heading">Registros de asistencia</h1><p className="subheading">Consulta histórica de entradas, salidas, tardanzas y compensaciones.</p></div>
    <div className="card row"><div><label className="label">Fecha</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><button className="btn btn-secondary" style={{alignSelf:"end"}} onClick={load}>Actualizar</button></div>
    <div className="card table-wrap"><table><thead><tr><th>Agente</th><th>Horario</th><th>Entrada</th><th>Tardanza</th><th>Salida</th><th>Tipo</th><th>Compensó</th><th>Saldo</th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><strong>{r.last_name}, {r.first_name}</strong><div className="muted">DNI {r.dni}</div></td><td>{String(r.scheduled_start).slice(0,5)}–{String(r.scheduled_end).slice(0,5)}</td><td>{r.entry_local||"—"}</td><td>{r.late_minutes||0} min</td><td>{r.exit_local||"—"}</td><td><span className={`badge ${r.exit_type==="AUTO"?"warn":"info"}`}>{r.exit_type||"Pendiente"}</span></td><td>{r.compensation_minutes||0} min</td><td>{r.pending_minutes||0} min</td></tr>)}
      {!rows.length && <tr><td colSpan={8} className="muted">No hay marcaciones registradas para esta fecha.</td></tr>}
    </tbody></table></div>
  </div>;
}
