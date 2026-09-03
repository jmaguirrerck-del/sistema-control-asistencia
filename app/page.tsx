import Link from "next/link";
import PublicQrClient from "./PublicQrClient";

export default function Home() {
  return (
    <>
      <main className="main public-main">
        <div className="container public-container">
          <PublicQrClient />
          <div className="public-admin-link">
            <Link href="/admin/login">Administración</Link>
          </div>
        </div>
      </main>
      <footer className="footer">Dirección de Gestión Escolar · Ministerio de Educación · Gobierno de Corrientes</footer>
    </>
  );
}
