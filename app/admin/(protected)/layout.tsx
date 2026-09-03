import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <div>
            <div className="brand-kicker">Gobierno de Corrientes · Ministerio de Educación</div>
            <div className="brand-title">Dirección de Gestión Escolar</div>
            <div className="brand-subtitle">Administración · Control de Asistencia</div>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="btn btn-secondary" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="main">
        <div className="container admin-shell">
          <nav className="admin-nav" aria-label="Administración">
            <Link href="/admin">Resumen diario</Link>
            <Link href="/admin/personal">Personal</Link>
            <Link href="/admin/registros">Registros</Link>
            <Link href="/admin/novedades">Licencias y vacaciones</Link>
            <Link href="/admin/qr">QR de oficina</Link>
            <Link href="/admin/configuracion">Configuración</Link>
          </nav>
          <section style={{ minWidth: 0 }}>{children}</section>
        </div>
      </main>
      <footer className="footer">Dirección de Gestión Escolar · Ministerio de Educación · Gobierno de Corrientes</footer>
    </>
  );
}
