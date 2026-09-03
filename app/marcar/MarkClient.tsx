"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Location = { lat:number; lng:number; accuracy:number };
type Status = { employee:{id:string;name:string;dni:string}; schedule:string; action:"ENTRY"|"EXIT"|"DONE"; lastMark?:string|null; message?:string; lateMinutes?:number; mustChangePin?:boolean };
type Success = { kind:"ENTRY"|"EXIT"; name:string; serverTime:string; entry?:string; exit?:string; lateMinutes?:number; compensationMinutes?:number; pendingMinutes?:number };

export default function MarkClient({ token }: { token: string }){
  const [loc,setLoc]=useState<Location|null>(null); const [geoState,setGeoState]=useState<"idle"|"checking"|"valid"|"bad">("idle");
  const [geoMsg,setGeoMsg]=useState(""); const [pin,setPin]=useState(""); const [status,setStatus]=useState<Status|null>(null); const [success,setSuccess]=useState<Success|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [changePinMode,setChangePinMode]=useState(false); const [newPin,setNewPin]=useState(""); const [repeatPin,setRepeatPin]=useState(""); const [pinMessage,setPinMessage]=useState("");
  const currentTime=useMemo(()=>new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),[]);

  useEffect(()=>{ if(!token){setGeoState("bad");setGeoMsg("El QR no contiene un token válido.");return;} verifyLocation(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[token]);

  function verifyLocation(){
    setError(""); setGeoMsg(""); setGeoState("checking");
    if(!navigator.geolocation){setGeoState("bad");setGeoMsg("Este dispositivo no permite obtener la ubicación.");return;}
    navigator.geolocation.getCurrentPosition(async p=>{
      const location={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}; setLoc(location);
      const r=await fetch("/api/mark/location-check",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,location})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setGeoState("bad");setGeoMsg(b.error||"No se pudo validar la ubicación.");return;}
      setGeoState("valid");setGeoMsg(`Ubicación verificada · a ${Math.round(b.distance)} m de la oficina`);
    },()=>{setGeoState("bad");setGeoMsg("No se pudo obtener la ubicación. Permití el acceso a la ubicación del celular e intentá nuevamente.");},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }

  async function identify(e:FormEvent){e.preventDefault(); if(!loc)return;setBusy(true);setError("");
    const r=await fetch("/api/mark/status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,location:loc,pin})});const b=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(b.error||"No se pudo identificar al agente.");return;}setStatus(b);setChangePinMode(Boolean(b.mustChangePin));setPinMessage("");
  }

  async function changePin(e:FormEvent){e.preventDefault();if(!loc||!status)return;setPinMessage("");setError("");
    if(!/^\d{4,8}$/.test(newPin)){setError("El nuevo PIN debe tener entre 4 y 8 dígitos.");return;}
    if(newPin!==repeatPin){setError("Los nuevos PIN no coinciden.");return;}
    setBusy(true);
    const r=await fetch("/api/mark/change-pin",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,location:loc,currentPin:pin,newPin})});
    const b=await r.json().catch(()=>({}));setBusy(false);
    if(!r.ok){setError(b.error||"No se pudo cambiar el PIN.");return;}
    setPin(newPin);setNewPin("");setRepeatPin("");setChangePinMode(false);setStatus({...status,mustChangePin:false});setPinMessage("PIN actualizado correctamente. Ya podés continuar con la marcación.");
  }

  async function mark(){if(!loc||!status)return;setBusy(true);setError("");const r=await fetch("/api/mark/submit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,location:loc,pin,action:status.action})});const b=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(b.error||"No se pudo registrar la marcación.");return;}setSuccess(b);}

  if(success)return <main className="mark-shell"><div className="mark-card stack" style={{textAlign:"center"}}><div className="status-icon good">✓</div><h1 className="mark-title">{success.kind==="ENTRY"?"ENTRADA REGISTRADA CORRECTAMENTE":"SALIDA REGISTRADA CORRECTAMENTE"}</h1><div className="mark-time">{success.serverTime}</div><strong>{success.name}</strong><div className="notice good">Ubicación verificada · registro guardado en el servidor</div>{success.kind==="ENTRY"?<div className="muted">Próxima acción: registrar salida al finalizar la jornada.</div>:<div className="grid grid-2" style={{textAlign:"left"}}><div className="kpi info"><div className="kpi-label">Compensación</div><div className="kpi-value">{success.compensationMinutes||0} min</div></div><div className="kpi info"><div className="kpi-label">Saldo pendiente</div><div className="kpi-value">{success.pendingMinutes||0} min</div></div></div>}<button className="btn btn-secondary" onClick={()=>window.location.reload()}>Finalizar</button></div></main>;

  return <main className="mark-shell"><div className="mark-card stack"><div style={{textAlign:"center"}}><div className="brand-kicker">Dirección de Gestión Escolar</div><h1 className="mark-title">Registro de asistencia</h1><div className="mark-time">{currentTime}</div></div>
    {geoState==="checking"&&<div className="notice info">Verificando ubicación del celular…</div>}
    {geoState==="bad"&&<><div className="notice bad">{geoMsg}</div><button className="btn btn-secondary" onClick={verifyLocation}>Reintentar ubicación</button></>}
    {geoState==="valid"&&!status&&<><div className="notice good">✓ {geoMsg}</div><form className="stack" onSubmit={identify}><div><label className="label" htmlFor="pin">PIN personal</label><input className="input" id="pin" inputMode="numeric" type="password" pattern="[0-9]{4,8}" minLength={4} maxLength={8} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} autoFocus required placeholder="Ingresá tu PIN" /></div>{error&&<div className="notice bad">{error}</div>}<button className="btn btn-primary" disabled={busy}>{busy?"Validando…":"Continuar"}</button></form></>}
    {status&&changePinMode&&<div className="stack"><div className="notice info"><strong>{status.employee.name}</strong><br/>Por seguridad, debés cambiar el PIN temporal antes de continuar.</div><form className="stack" onSubmit={changePin}><div><label className="label">Nuevo PIN (4 a 8 dígitos)</label><input className="input" type="password" inputMode="numeric" pattern="[0-9]{4,8}" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} required autoFocus/></div><div><label className="label">Repetir nuevo PIN</label><input className="input" type="password" inputMode="numeric" pattern="[0-9]{4,8}" value={repeatPin} onChange={e=>setRepeatPin(e.target.value.replace(/\D/g,""))} required/></div>{error&&<div className="notice bad">{error}</div>}<button className="btn btn-primary" disabled={busy}>{busy?"Actualizando…":"Cambiar PIN y continuar"}</button></form></div>}
    {status&&!changePinMode&&<div className="stack"><div className="notice info"><strong>{status.employee.name}</strong><br/>DNI {status.employee.dni}<br/><span className="muted">Horario de hoy: {status.schedule}</span></div>{status.lastMark&&<div className="notice info">Última marcación: {status.lastMark}</div>}{pinMessage&&<div className="notice good">{pinMessage}</div>}{error&&<div className="notice bad">{error}</div>}{status.action==="DONE"?<div className="notice good">La jornada de hoy ya tiene entrada y salida registradas. No es necesario volver a marcar.</div>:<button className={status.action==="ENTRY"?"btn btn-success":"btn btn-primary"} onClick={mark} disabled={busy}>{busy?"Registrando…":status.action==="ENTRY"?"REGISTRAR ENTRADA":"REGISTRAR SALIDA"}</button>}<button className="btn btn-secondary" type="button" onClick={()=>{setChangePinMode(true);setError("");setPinMessage("");}}>Cambiar mi PIN</button><div className="notice info">Este dispositivo está asociado a {status.employee.name}. Para cambiar de dispositivo o de agente, debe intervenir Administración.</div></div>}
  </div><div className="footer">Dirección de Gestión Escolar · Ministerio de Educación · Gobierno de Corrientes</div></main>;
}
