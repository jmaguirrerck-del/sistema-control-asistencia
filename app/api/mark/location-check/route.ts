import { NextResponse } from "next/server";
import { validateLocation, validateQr } from "@/lib/attendance";

export async function POST(request:Request){
  const b=await request.json().catch(()=>({}));const token=String(b.token||"");const location=b.location||{};
  if(!token)return NextResponse.json({error:"QR inválido o incompleto."},{status:400});
  if(!Number.isFinite(Number(location.lat))||!Number.isFinite(Number(location.lng)))return NextResponse.json({error:"No se recibió una ubicación válida."},{status:400});
  const qr=await validateQr(token);if(!qr)return NextResponse.json({error:"El QR venció. Escaneá nuevamente el código que se muestra en la oficina."},{status:410});
  const geo=await validateLocation({lat:Number(location.lat),lng:Number(location.lng),accuracy:Number(location.accuracy)||null});
  if(!geo.ok){if(geo.reason==="OFFICE_NOT_CONFIGURED")return NextResponse.json({error:"La ubicación de la oficina todavía no fue configurada."},{status:503});return NextResponse.json({error:`No se puede registrar asistencia: el dispositivo está fuera del radio autorizado (${Math.round(Number(geo.distance||0))} m).`},{status:403});}
  return NextResponse.json({ok:true,distance:geo.distance,radius:geo.settings?.radius_meters});
}
