import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

// V1.28: la generación pública de QR fue deshabilitada.
// El QR solo se genera desde /admin/qr con una sesión autenticada
// y el permiso QR_GENERATOR (o Administrador General).
export async function POST(){
  return NextResponse.json({error:"La generación pública de QR está deshabilitada. Ingrese por Administración."},{status:403,headers:{"Cache-Control":"no-store"}});
}
