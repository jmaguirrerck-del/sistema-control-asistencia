"use client";

import { FormEvent, useEffect, useState } from "react";

const types: Record<string,string> = {MEDICAL:"Licencia médica",ADMINISTRATIVE:"Licencia administrativa",VACATION:"Vacaciones",COMMISSION:"Comisión de servicio",AFFECTATION:"Afectación",FRANCO:"Franco",OTHER:"Otra novedad"};

export default function NovedadesPage(){
  const [employees,setEmployees]=useState<any[]>([]); const [rows,setRows]=useState<any[]>([]); const [msg,setMsg]=useState("");
  const [form,setForm]=useState({employeeId:"",leaveType:"MEDICAL",dateFrom:"",dateTo:"",observation:""});
  async function load(){const [e,l]=await Promise.all([fetch("/api/admin/employees"),fetch("/api/admin/leaves")]);if(e.ok)setEmployees(await e.json());if(l.ok)setRows(await l.json());}
  useEffect(()=>{load();},[]);
  async function submit(ev:FormEvent){ev.preventDefault();setMsg("");const r=await fetch("/api/admin/leaves",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});const b=await r.json().catch(()=>({}));if(!r.ok){setMsg(b.error||"No se pudo guardar");return;}setMsg("Novedad registrada correctamente.");setForm({...form,dateFrom:"",dateTo:"",observation:""});await load();}
  async function remove(id:number){if(!confirm("¿Desactivar esta novedad?"))return;const r=await fetch(`/api/admin/leaves?id=${id}`,{method:"DELETE"});if(r.ok)await load();}
  return <div className="stack"><div><h1 className="heading">Licencias, vacaciones y novedades</h1><p className="subheading">Estas situaciones se verifican antes de considerar ausente a un agente.</p></div>
    <form className="card stack" onSubmit={submit}><div className="form-row"><div><label className="label">Agente</label><select className="select" required value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}><option value="">Seleccionar…</option>{employees.map(e=><option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>)}</select></div><div><label className="label">Tipo</label><select className="select" value={form.leaveType} onChange={e=>setForm({...form,leaveType:e.target.value})}>{Object.entries(types).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div>
      <div className="form-row"><div><label className="label">Desde</label><input className="input" type="date" required value={form.dateFrom} onChange={e=>setForm({...form,dateFrom:e.target.value})}/></div><div><label className="label">Hasta</label><input className="input" type="date" required value={form.dateTo} onChange={e=>setForm({...form,dateTo:e.target.value})}/></div></div>
      <div><label className="label">Observación</label><textarea className="textarea" value={form.observation} onChange={e=>setForm({...form,observation:e.target.value})}/></div>{msg&&<div className={`notice ${msg.includes("correctamente")?"good":"bad"}`}>{msg}</div>}<button className="btn btn-primary">Registrar novedad</button></form>
    <div className="card table-wrap"><table><thead><tr><th>Agente</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Observación</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.last_name}, {r.first_name}</td><td><span className="badge info">{types[r.leave_type]||r.leave_type}</span></td><td>{r.date_from}</td><td>{r.date_to}</td><td>{r.observation||"—"}</td><td><button className="btn btn-secondary" onClick={()=>remove(r.id)}>Desactivar</button></td></tr>)}</tbody></table></div>
  </div>;
}
