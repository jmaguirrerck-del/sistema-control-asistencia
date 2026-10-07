"use client";
import { FormEvent, useEffect, useState } from "react";

type Settings={office_id:number;office_name:string;latitude:number|null;longitude:number|null;radius_meters:number;lateness_tolerance_minutes:number;auto_close_grace_minutes:number;qr_ttl_minutes:number;absence_count_start_date:string|null};
type Office={id:number;name:string};
export default function ConfiguracionPage(){
 const [ready,setReady]=useState<boolean|null>(null),[settings,setSettings]=useState<Settings|null>(null),[offices,setOffices]=useState<Office[]>([]),[officeId,setOfficeId]=useState("1"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 async function load(id=officeId){const res=await fetch(`/api/admin/settings?officeId=${id}`,{cache:'no-store'});const body=await res.json().catch(()=>({}));setReady(Boolean(body.ready));if(body.settings)setSettings(body.settings);if(body.offices)setOffices(body.offices);}
 useEffect(()=>{load('1')},[]);
 async function save(e:FormEvent){e.preventDefault();if(!settings)return;setBusy(true);setMsg('');const res=await fetch('/api/admin/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(settings)});const body=await res.json().catch(()=>({}));setBusy(false);if(!res.ok){setMsg(body.error||'No se pudo guardar');return;}setMsg('Configuración guardada correctamente.');setSettings(body.settings);}
 function useMyLocation(){setMsg('');if(!navigator.geolocation){setMsg('Este navegador no ofrece geolocalización.');return;}navigator.geolocation.getCurrentPosition(p=>setSettings(s=>s?{...s,latitude:p.coords.latitude,longitude:p.coords.longitude}:s),()=>setMsg('No se pudo obtener la ubicación. Verificá el permiso del navegador.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
 return <div className="stack"><div><h1 className="heading">Configuración por oficina</h1><p className="subheading">El Administrador General define ubicación y parámetros operativos para cada Dirección.</p></div>
 {offices.length>0&&<div className="card"><label className="label">Oficina / Dirección</label><select className="input" value={officeId} onChange={e=>{setOfficeId(e.target.value);load(e.target.value)}}>{offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>}
 {ready&&settings&&<form className="card stack" onSubmit={save}><div><label className="label">Nombre de la oficina</label><input className="input" value={settings.office_name} onChange={e=>setSettings({...settings,office_name:e.target.value})}/></div>
 <div className="form-row"><div><label className="label">Latitud</label><input className="input" type="number" step="any" required value={settings.latitude??''} onChange={e=>setSettings({...settings,latitude:Number(e.target.value)})}/></div><div><label className="label">Longitud</label><input className="input" type="number" step="any" required value={settings.longitude??''} onChange={e=>setSettings({...settings,longitude:Number(e.target.value)})}/></div></div>
 <button type="button" className="btn btn-secondary" onClick={useMyLocation}>Usar mi ubicación actual</button>
 <div className="form-row"><div><label className="label">Radio autorizado (m)</label><input className="input" type="number" min={20} max={500} value={settings.radius_meters} onChange={e=>setSettings({...settings,radius_meters:Number(e.target.value)})}/></div><div><label className="label">Tolerancia de ingreso (min)</label><input className="input" type="number" min={0} max={60} value={settings.lateness_tolerance_minutes} onChange={e=>setSettings({...settings,lateness_tolerance_minutes:Number(e.target.value)})}/></div></div>
 <div className="form-row"><div><label className="label">Vigencia QR</label><input className="input" value="3 minutos (fija)" readOnly/></div><div><label className="label">Inicio oficial del cómputo</label><input className="input" type="date" value={settings.absence_count_start_date||''} onChange={e=>setSettings({...settings,absence_count_start_date:e.target.value})}/></div></div>
 <div className="notice info">La fecha de inicio evita generar inasistencias retroactivas antes de que cada oficina implemente formalmente el sistema.</div>
 {msg&&<div className="notice info">{msg}</div>}<button className="btn btn-primary" disabled={busy}>{busy?'Guardando…':'Guardar configuración'}</button></form>}
 </div>;
}
