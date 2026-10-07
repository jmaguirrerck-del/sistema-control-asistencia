import { NextResponse } from "next/server";
import { getAdminSession, isGeneralAdmin } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ensureV13Schema } from "@/lib/migrations";

export async function GET(req:Request) {
  await ensureV13Schema(); const session=await getAdminSession(); if(!session||!isGeneralAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const ready=await isDatabaseReady(); if(!ready)return NextResponse.json({ready:false});
  const u=new URL(req.url); const officeId=Number(u.searchParams.get('officeId')||1); if(!Number.isInteger(officeId)||officeId<1)return NextResponse.json({error:"Oficina inválida"},{status:400});
  const sql=db(); const rows=await sql`SELECT o.id AS office_id,o.name AS office_name,c.latitude,c.longitude,c.radius_meters,c.lateness_tolerance_minutes,c.auto_close_grace_minutes,c.qr_ttl_minutes,c.absence_count_start_date::text AS absence_count_start_date FROM offices o JOIN office_configs c ON c.office_id=o.id WHERE o.id=${officeId}`;
  const offices=await sql`SELECT id,name FROM offices WHERE active=TRUE ORDER BY name`;
  return NextResponse.json({ready:true,settings:rows[0],offices});
}

export async function PUT(request:Request){
  await ensureV13Schema(); const session=await getAdminSession(); if(!session||!isGeneralAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const body=await request.json().catch(()=>({})); const officeId=Number(body.office_id); if(!Number.isInteger(officeId)||officeId<1)return NextResponse.json({error:"Oficina inválida"},{status:400});
  const officeName=String(body.office_name||"").trim().slice(0,160),lat=Number(body.latitude),lng=Number(body.longitude),radius=Number(body.radius_meters),tolerance=Number(body.lateness_tolerance_minutes),qrTtl=3,absenceStart=String(body.absence_count_start_date||"");
  if(!officeName)return NextResponse.json({error:"Nombre de oficina inválido"},{status:400});
  if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180)return NextResponse.json({error:"Coordenadas inválidas"},{status:400});
  if(!Number.isFinite(radius)||radius<20||radius>500)return NextResponse.json({error:"El radio debe estar entre 20 y 500 metros"},{status:400});
  if(!Number.isFinite(tolerance)||tolerance<0||tolerance>60)return NextResponse.json({error:"La tolerancia debe estar entre 0 y 60 minutos"},{status:400});
  if(absenceStart&&!/^\d{4}-\d{2}-\d{2}$/.test(absenceStart))return NextResponse.json({error:"Fecha de inicio inválida"},{status:400});
  const sql=db(); const prev=(await sql`SELECT o.name,c.* FROM offices o JOIN office_configs c ON c.office_id=o.id WHERE o.id=${officeId}`)[0]; if(!prev)return NextResponse.json({error:"Oficina inexistente"},{status:404});
  await sql`UPDATE offices SET name=${officeName},updated_at=now() WHERE id=${officeId}`;
  const row=(await sql`UPDATE office_configs SET latitude=${lat},longitude=${lng},radius_meters=${radius},lateness_tolerance_minutes=${tolerance},auto_close_grace_minutes=60,qr_ttl_minutes=${qrTtl},absence_count_start_date=${absenceStart||null}::date,updated_at=now() WHERE office_id=${officeId} RETURNING *`)[0];
  const settings={...row,office_id:officeId,office_name:officeName}; await writeAudit({actor:session.email,action:"UPDATE_OFFICE_SETTINGS",entityType:"office",entityId:String(officeId),previous:prev,next:settings});
  return NextResponse.json({ok:true,settings});
}
