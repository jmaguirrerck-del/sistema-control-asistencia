import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession(); if (!session) redirect("/admin/login");
  const operator=session.role==="LICENSE_OPERATOR";
  return <>
    <header className="site-header"><div className="container site-header-inner"><div><div className="brand-kicker">Gobierno de Corrientes · Ministerio de Educación</div><div className="brand-title">Dirección de Gestión Escolar</div><div className="brand-subtitle">{operator?"Operador de Licencias":"Administración"} · Control de Asistencia</div></div><form action="/api/admin/logout" method="post"><button className="btn btn-secondary" type="submit">Cerrar sesión</button></form></div></header>
    <main className="main"><div className="container admin-shell"><nav className="admin-nav" aria-label="Administración">
      {!operator&&<Link href="/admin">Resumen diario</Link>}
      {!operator&&<Link href="/admin/personal">Personal</Link>}
      {!operator&&<Link href="/admin/registros">Registros</Link>}
      <Link href="/admin/novedades">Licencias y vacaciones</Link>
      {!operator&&<Link href="/admin/importacion-licencias">Importación histórica</Link>}
      {!operator&&<Link href="/admin/qr">QR de oficina</Link>}
      {!operator&&<Link href="/admin/usuarios">Usuarios y permisos</Link>}
      {!operator&&<Link href="/admin/configuracion">Configuración</Link>}
    </nav><section style={{ minWidth: 0 }}>{children}</section></div></main>
    <footer className="footer">Dirección de Gestión Escolar · Ministerio de Educación · Gobierno de Corrientes</footer>
  </>;
}
