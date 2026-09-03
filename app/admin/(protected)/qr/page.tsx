"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

export default function QrPage() {
  const [image, setImage] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/qr", { method: "POST", cache: "no-store" });
    const body = await res.json().catch(()=>({}));
    if (!res.ok) { setError(body.error || "No se pudo generar el QR"); return; }
    const png = await QRCode.toDataURL(body.url, { width: 520, margin: 2, errorCorrectionLevel: "M" });
    setImage(png); setExpires(body.expiresAt);
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 4 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return <div className="stack">
    <div><h1 className="heading">QR dinámico de la oficina</h1><p className="subheading">Dejá esta pantalla abierta en un monitor o dispositivo dentro de la oficina. El código se renueva automáticamente.</p></div>
    <div className="card" style={{textAlign:"center"}}>
      {error ? <div className="notice bad">{error}</div> : image ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Código QR dinámico para registrar asistencia" style={{width:"min(100%,520px)",height:"auto"}} />
        <div className="muted">Válido hasta: {expires ? new Date(expires).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}) : "—"}</div>
      </> : <div>Generando QR…</div>}
    </div>
    <div className="row"><button className="btn btn-secondary" onClick={refresh}>Renovar ahora</button><span className="muted">Cada QR vence automáticamente; una fotografía antigua deja de servir.</span></div>
  </div>;
}
