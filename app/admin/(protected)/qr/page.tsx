import { redirect } from "next/navigation";
import { getAdminSession, canGenerateQr } from "@/lib/auth";
import QrClient from "./QrClient";

export default async function QrPage(){
  const session=await getAdminSession();
  if(!session) redirect("/admin/login");
  if(!canGenerateQr(session)) redirect("/admin");
  return <QrClient/>;
}
