"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PublicQrClient() {
  const [image, setImage] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/qr/public", { method: "POST", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No se pudo generar el código QR.");
      const png = await QRCode.toDataURL(body.url, {
        width: 620,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setImage(png);
      setExpiresAt(new Date(body.expiresAt).getTime());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el código QR.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - now;
    if (remaining <= 0 && !loading) refresh();
  }, [expiresAt, now, loading, refresh]);

  const secondsLeft = useMemo(() => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }, [expiresAt, now]);

  const countdown = secondsLeft == null
    ? "—"
    : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const currentDate = new Date(now);

  return (
    <div className="public-qr-shell">
      <section className="public-qr-card" aria-live="polite">
        <div className="public-qr-head">
          <div>
            <div className="brand-kicker">Gobierno de Corrientes · Ministerio de Educación</div>
            <h1 className="public-qr-title">Dirección de Gestión Escolar</h1>
            <p className="public-qr-subtitle">Registro de entrada y salida del personal</p>
          </div>
          <div className="public-clock" aria-label="Hora actual">
            <strong>{formatClock(currentDate)}</strong>
            <span>{formatDate(currentDate)}</span>
          </div>
        </div>

        <div className="public-qr-content">
          <div className="public-qr-copy">
            <div className="public-step">1</div>
            <h2>Escanee el código QR</h2>
            <p>Use la cámara de su celular para iniciar la marcación. Luego se verificará la ubicación y se solicitará su PIN personal.</p>
            <div className="public-security-note">
              QR dinámico · Geolocalización · PIN · Dispositivo autorizado
            </div>
          </div>

          <div className="public-qr-box">
            {error ? (
              <div className="notice bad" style={{ maxWidth: 520 }}>
                {error}
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-secondary" type="button" onClick={refresh}>Reintentar</button>
                </div>
              </div>
            ) : image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Código QR dinámico para registrar asistencia" className="public-qr-image" />
                <div className="public-qr-expiry">
                  <span>Se actualiza automáticamente en</span>
                  <strong>{countdown}</strong>
                </div>
              </>
            ) : (
              <div className="public-qr-loading">Generando código QR…</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
