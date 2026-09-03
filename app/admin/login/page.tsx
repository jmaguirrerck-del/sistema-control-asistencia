"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo iniciar sesión");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mark-shell">
      <div className="mark-card stack">
        <div>
          <div className="brand-kicker">Dirección de Gestión Escolar</div>
          <h1 className="heading">Acceso administrador</h1>
          <p className="subheading">Panel institucional de control de asistencia.</p>
        </div>
        <form className="stack" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="email">Correo</label>
            <input className="input" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input className="input" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <div className="notice bad">{error}</div>}
          <button className="btn btn-primary" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button>
        </form>
      </div>
    </main>
  );
}
