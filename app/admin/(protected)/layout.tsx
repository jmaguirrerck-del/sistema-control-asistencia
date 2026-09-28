import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession,hasPermission,isGeneralAdmin } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession(); if (!session) redirect("/admin/login");
  const currentSession = session!;
  if (currentSession.mustChangePassword) redirect("/admin/cambiar-contrasena");
  const general=isGeneralAdmin(currentSession), dash=hasPermission(currentSession,"DASHBOARD"), personnel=hasPermission(currentSession,"PERSONNEL"), legajos=hasPermission(currentSession,"LEGAJOS"), licenses=hasPermission(currentSession,"LICENSES"), attendance=hasPermission(currentSession,"ATTENDANCE");
  const subtitle=general?"Administrador General":`${currentSession.officeName||"Oficina asignada"} · Usuario autorizado`;
  return <>
    <header className="site-header"><div className="container site-header-inner"><div><div className="brand-kicker">Gobierno de Corrientes · Ministerio de Educación</div><div className="brand-title">Sistema de Control de Asistencia</div><div className="brand-subtitle">{subtitle}</div></div><form action="/api/admin/logout" method="post"><button className="btn btn-secondary" type="submit">Cerrar sesión</button></form></div></header>
    <main className="main"><div className="container admin-shell"><nav className="admin-nav" aria-label="Administración">
      {dash&&<Link href="/admin">Resumen diario</Link>}
      {personnel&&<Link href="/admin/personal">Personal</Link>}
      {legajos&&<Link href="/admin/legajos">Legajos</Link>}
      {legajos&&<Link href="/admin/reportes">Reportes</Link>}
      {attendance&&<Link href="/admin/registros">Registros</Link>}
      {licenses&&<Link href="/admin/novedades">Licencias y vacaciones</Link>}
      {general&&<Link href="/admin/oficinas">Oficinas</Link>}
      {general&&<Link href="/admin/importacion-licencias">Importación histórica</Link>}
      {attendance&&<Link href="/admin/qr">QR de oficina</Link>}
      {general&&<Link href="/admin/usuarios">Usuarios y permisos</Link>}
      {general&&<Link href="/admin/configuracion">Configuración</Link>}
    </nav><section style={{ minWidth: 0 }}>{children}</section></div></main>
    <footer className="footer">Ministerio de Educación · Gobierno de Corrientes</footer>
  </>;
}
