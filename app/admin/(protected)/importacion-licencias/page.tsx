"use client";
import {useEffect,useState} from "react";
export default function Page(){
 const [s,setS]=useState<any>({records:[]}),[msg,setMsg]=useState(''),[loading,setLoading]=useState(false);
 async function load(){const r=await fetch('/api/admin/historical-confirmed');if(r.ok)setS(await r.json())}
 useEffect(()=>{load()},[]);
 async function run(){if(!confirm('Se incorporarán únicamente los formularios históricos 2026 ya validados que se muestran en esta pantalla. La operación no duplica registros si se ejecuta más de una vez. ¿Continuar?'))return;setLoading(true);setMsg('');const r=await fetch('/api/admin/historical-confirmed',{method:'POST'});const b=await r.json().catch(()=>({}));setLoading(false);if(!r.ok){setMsg(b.error||'No se pudo importar.');return}let t=`Importación finalizada: ${b.imported} nuevos, ${b.already} ya existentes.`;if(b.missingEmployee)t+=` ${b.missingEmployee} no se incorporaron porque el DNI no existe actualmente en Personal.`;setMsg(t);await load()}
 return <div className="stack"><div><h1 className="heading">Importación histórica 2026</h1><p className="subheading">Carga segura de formularios institucionales revisados visualmente. No se importan certificados, constancias ni documentación respaldatoria.</p></div>
 <div className="card stack"><div className="notice info"><strong>Criterio definitivo.</strong> Solo ingresan registros con agente identificado y período validado. Cuando “Hasta” contradice la cantidad informada, prevalecen <strong>Cantidad + Desde</strong>. Si RRHH otorgó parcialmente una solicitud, se registra únicamente lo otorgado.</div>
 <div className="form-row"><div className="card"><strong>{s.validated??'—'}</strong><br/>Formularios validados en este lote</div><div className="card"><strong>{s.imported??'—'}</strong><br/>Ya incorporados</div><div className="card"><strong>{s.excludedManual??4}</strong><br/>Excluidos para carga manual</div></div>
 <div className="notice warn"><strong>Quedan fuera de la importación automática:</strong> pág. 196, pág. 207 superior, pág. 207 inferior y pág. 209. Se cargarán manualmente cuando estén identificados.</div>
 <button className="btn btn-primary" disabled={loading} onClick={run}>{loading?'Incorporando…':'Incorporar histórico 2026 confirmado'}</button>{msg&&<div className="notice info">{msg}</div>}
 <p className="subheading">Esta operación es idempotente: podés ejecutarla nuevamente sin duplicar los formularios ya incorporados.</p></div>
 <div className="card table-wrap"><h2 className="heading" style={{fontSize:'1.15rem'}}>Registros incluidos en este lote validado</h2><table><thead><tr><th>Pág.</th><th>Agente</th><th>DNI</th><th>Artículo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Observación</th></tr></thead><tbody>{(s.records||[]).map((r:any)=><tr key={`${r.sourcePage}-${r.formIndex}`}><td>{r.sourcePage}</td><td>{r.employeeName}</td><td>{r.dni}</td><td>{r.article}</td><td>{r.dateFrom}</td><td>{r.dateTo}</td><td>{r.quantity}</td><td>{r.note||'—'}</td></tr>)}</tbody></table></div>
 </div>
}
