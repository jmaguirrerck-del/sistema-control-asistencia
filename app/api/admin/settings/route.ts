import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getAdminSession(); if (!isAdmin(session)) return NextResponse.json({ error:"No autorizado" },{status:403});
  const ready = await isDatabaseReady(); if (!ready) return NextResponse.json({ ready:false });
  const sql=db(); const rows=await sql`SELECT office_name, latitude, longitude, radius_meters, lateness_tolerance_minutes, auto_close_grace_minutes, qr_ttl_minutes FROM office_settings WHERE id=1`;
  return NextResponse.json({ ready:true, settings:rows[0] });
}

export async function PUT(request:Request){
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const body=await request.json().catch(()=>({}));
  const officeName=String(body.office_name||"Dirección de Gestión Escolar").slice(0,120);
  const lat=Number(body.latitude), lng=Number(body.longitude), radius=Number(body.radius_meters), tolerance=Number(body.lateness_tolerance_minutes), qrTtl=Number(body.qr_ttl_minutes);
  if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lng)||lng < -180||lng>180) return NextResponse.json({error:"Coordenadas inválidas"},{status:400});
  if(!Number.isFinite(radius)||radius<20||radius>500) return NextResponse.json({error:"El radio debe estar entre 20 y 500 metros"},{status:400});
  if(!Number.isFinite(tolerance)||tolerance<0||tolerance>60) return NextResponse.json({error:"La tolerancia debe estar entre 0 y 60 minutos"},{status:400});
  if(!Number.isFinite(qrTtl)||qrTtl<1||qrTtl>15) return NextResponse.json({error:"La vigencia del QR debe estar entre 1 y 15 minutos"},{status:400});
  const sql=db(); const prev=(await sql`SELECT * FROM office_settings WHERE id=1`)[0];
  const rows=await sql`UPDATE office_settings SET office_name=${officeName}, latitude=${lat}, longitude=${lng}, radius_meters=${radius}, lateness_tolerance_minutes=${tolerance}, auto_close_grace_minutes=60, qr_ttl_minutes=${qrTtl}, updated_at=now() WHERE id=1 RETURNING office_name, latitude, longitude, radius_meters, lateness_tolerance_minutes, auto_close_grace_minutes, qr_ttl_minutes`;
  await writeAudit({actor:session.email,action:"UPDATE_SETTINGS",entityType:"office_settings",entityId:"1",previous:prev,next:rows[0]});
  return NextResponse.json({ok:true,settings:rows[0]});
}
