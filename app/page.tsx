import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <div>
            <div className="brand-kicker">Gobierno de Corrientes · Ministerio de Educación</div>
            <div className="brand-title">Dirección de Gestión Escolar</div>
            <div className="brand-subtitle">Sistema de Control de Asistencia</div>
          </div>
          <Link className="btn btn-secondary" href="/admin/login">Administración</Link>
        </div>
      </header>
      <main className="main">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="card stack">
            <div>
              <h1 className="heading">Control de asistencia del personal</h1>
              <p className="subheading">La marcación se inicia escaneando el QR dinámico disponible en la oficina.</p>
            </div>
            <div className="notice info">
              Para registrar entrada o salida se verificará la ubicación del celular y luego se solicitará el PIN personal.
            </div>
          </div>
        </div>
      </main>
      <footer className="footer">Dirección de Gestión Escolar · Ministerio de Educación · Gobierno de Corrientes</footer>
    </>
  );
}
