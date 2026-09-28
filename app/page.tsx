import Link from "next/link";
import PublicQrClient from "./PublicQrClient";
export default async function Home({searchParams}:{searchParams:Promise<{office?:string}>}){
 const p=await searchParams; const officeId=/^\d+$/.test(p.office||'')?Number(p.office):1;
 return <><main className="main public-main"><div className="container public-container"><PublicQrClient officeId={officeId}/><div className="public-admin-link"><Link href="/admin/login">Administración</Link></div></div></main><footer className="footer">Ministerio de Educación · Gobierno de Corrientes</footer></>;
}
