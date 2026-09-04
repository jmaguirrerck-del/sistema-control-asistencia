"use client";

import { FormEvent, useEffect, useState } from "react";

type Settings = {
  office_name: string; latitude: number | null; longitude: number | null; radius_meters: number;
  lateness_tolerance_minutes: number; auto_close_grace_minutes: number; qr_ttl_minutes: number;
};

export default function ConfiguracionPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    setReady(Boolean(body.ready));
    if (body.settings) setSettings(body.settings);
  }
  useEffect(() => { load(); }, []);

  async function initialize() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/setup", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(body.error || "No se pudo inicializar"); return; }
    setMsg(`Base inicializada. ${body.employees} agentes cargados.`); await load();
  }

  async function save(e: FormEvent) {
    e.preventDefault(); if (!settings) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/settings", { method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify(settings) });
    const body = await res.json().catch(()=>({})); setBusy(false);
    if (!res.ok) { setMsg(body.error || "No se pudo guardar"); return; }
    setMsg("Configuración guardada correctamente."); setSettings(body.settings);
  }

  async function resetOperationalData() {
    if (resetConfirmation.trim().toUpperCase() !== "REINICIAR") {
      setResetMsg("Escribí REINICIAR para confirmar.");
      return;
    }
    setBusy(true); setResetMsg("");
    const res = await fetch("/api/admin/reset-operational-data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: resetConfirmation }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setResetMsg(body.error || "No se pudo reiniciar los datos operativos."); return; }
    setResetMsg("Datos de prueba eliminados. El padrón, horarios, configuración, catálogo de licencias y PINs se conservaron.");
    setResetConfirmation("");
  }

  function useMyLocation() {
    setMsg("");
    if (!navigator.geolocation) { setMsg("Este navegador no ofrece geolocalización."); return; }
    navigator.geolocation.getCurrentPosition(
      p => setSettings(s => s ? {...s, latitude:p.coords.latitude, longitude:p.coords.longitude} : s),
      () => setMsg("No se pudo obtener la ubicación. Verificá el permiso del navegador."),
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  }

  return <div className="stack">
    <div><h1 className="heading">Configuración</h1><p className="subheading">Parámetros generales de la única sede autorizada.</p></div>
    {ready === false && <div className="card stack">
      <div className="notice warn"><strong>Primera configuración.</strong> Todavía no existen las tablas en Neon.</div>
      <button className="btn btn-primary" onClick={initialize} disabled={busy}>{busy ? "Inicializando…" : "Inicializar base de datos y cargar los 46 agentes"}</button>
      {msg && <div className="notice info">{msg}</div>}
    </div>}
    {ready && settings && <form className="card stack" onSubmit={save}>
      <div><label className="label">Nombre de la oficina</label><input className="input" value={settings.office_name} onChange={e=>setSettings({...settings,office_name:e.target.value})}/></div>
      <div className="form-row">
        <div><label className="label">Latitud</label><input className="input" type="number" step="any" required value={settings.latitude ?? ""} onChange={e=>setSettings({...settings,latitude:e.target.value===""?null:Number(e.target.value)})}/></div>
        <div><label className="label">Longitud</label><input className="input" type="number" step="any" required value={settings.longitude ?? ""} onChange={e=>setSettings({...settings,longitude:e.target.value===""?null:Number(e.target.value)})}/></div>
      </div>
      <button className="btn btn-secondary" type="button" onClick={useMyLocation}>Usar la ubicación actual de este dispositivo</button>
      <div className="form-row">
        <div><label className="label">Radio autorizado (metros)</label><input className="input" type="number" min={20} max={500} value={settings.radius_meters} onChange={e=>setSettings({...settings,radius_meters:Number(e.target.value)})}/></div>
        <div><label className="label">Tolerancia de tardanza (minutos)</label><input className="input" type="number" min={0} max={60} value={settings.lateness_tolerance_minutes} onChange={e=>setSettings({...settings,lateness_tolerance_minutes:Number(e.target.value)})}/></div>
      </div>
      <div className="form-row">
        <div><label className="label">Margen por olvido de salida</label><input className="input" value="60 minutos (regla definida)" disabled /></div>
        <div><label className="label">Vigencia de cada QR (minutos)</label><input className="input" type="number" min={1} max={15} value={settings.qr_ttl_minutes} onChange={e=>setSettings({...settings,qr_ttl_minutes:Number(e.target.value)})}/></div>
      </div>
      <div className="notice info">Para una geolocalización confiable, configurá las coordenadas estando físicamente en la oficina y luego verificá una marcación de prueba.</div>
      {msg && <div className={`notice ${msg.includes("correctamente") ? "good" : "bad"}`}>{msg}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</button>
    </form>}

    {ready && <div className="card stack">
      <div>
        <h2 style={{margin:"0 0 6px"}}>Mantenimiento de datos</h2>
        <p className="subheading" style={{margin:0}}>Herramienta de uso excepcional durante la etapa de prueba.</p>
      </div>
      <div className="notice warn">
        <strong>Reiniciar datos de prueba</strong><br/>
        Elimina marcaciones de entrada/salida, licencias y vacaciones cargadas, vínculos de dispositivos, QR históricos y auditoría de prueba.
        <br/><strong>No elimina</strong> personal, horarios, ubicación de la oficina, catálogo de licencias ni PINs actuales.
      </div>
      {!resetOpen ? <button className="btn btn-danger" type="button" onClick={()=>{setResetOpen(true);setResetMsg("");}}>Reiniciar datos de prueba</button> : <div className="stack">
        <div className="notice bad"><strong>Esta acción no se puede deshacer.</strong> Usala únicamente cuando quieras comenzar la operación oficial con la base limpia.</div>
        <div>
          <label className="label">Para confirmar, escribí REINICIAR</label>
          <input className="input" value={resetConfirmation} onChange={e=>setResetConfirmation(e.target.value)} placeholder="REINICIAR" autoComplete="off" />
        </div>
        {resetMsg && <div className={`notice ${resetMsg.startsWith("Datos de prueba") ? "good" : "bad"}`}>{resetMsg}</div>}
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-danger" type="button" disabled={busy || resetConfirmation.trim().toUpperCase()!=="REINICIAR"} onClick={resetOperationalData}>{busy ? "Reiniciando…" : "Confirmar reinicio"}</button>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={()=>{setResetOpen(false);setResetConfirmation("");setResetMsg("");}}>Cancelar</button>
        </div>
      </div>}
    </div>}
  </div>;
}
