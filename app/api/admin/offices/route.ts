import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { getAdminSession,isGeneralAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const sql=db();
  const rows=await sql`SELECT o.id,o.code,o.name,o.active,c.latitude,c.longitude,c.radius_meters,c.lateness_tolerance_minutes,c.auto_close_grace_minutes,c.qr_ttl_minutes,c.absence_count_start_date::text,
    (SELECT COUNT(*)::int FROM employees e WHERE e.office_id=o.id AND e.active=TRUE) AS active_employees
    FROM offices o LEFT JOIN office_configs c ON c.office_id=o.id ORDER BY o.active DESC,o.name`;
  return NextResponse.json({offices:rows});
}

export async function POST(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const name=String(b.name||"").trim().slice(0,160),code=String(b.code||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,24);
  if(!name||!code)return NextResponse.json({error:"Completá nombre y código de la oficina."},{status:400});
  const sql=db();
  try{
    const row=(await sql`INSERT INTO offices(code,name,active) VALUES(${code},${name},TRUE) RETURNING id,code,name`)[0];
    await sql`INSERT INTO office_configs(office_id,radius_meters,lateness_tolerance_minutes,auto_close_grace_minutes,qr_ttl_minutes,absence_count_start_date) VALUES(${Number(row.id)},75,15,60,5,CURRENT_DATE) ON CONFLICT DO NOTHING`;
    await writeAudit({actor:s!.email,action:"CREATE_OFFICE",entityType:"office",entityId:String(row.id),next:row});
    return NextResponse.json({ok:true,office:row});
  }catch{return NextResponse.json({error:"No se pudo crear la oficina. Verificá que el código no esté repetido."},{status:409});}
}

export async function PATCH(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const id=Number(b.id); if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"Oficina inválida"},{status:400});
  const sql=db(); const prev=(await sql`SELECT * FROM offices WHERE id=${id}`)[0]; if(!prev)return NextResponse.json({error:"Oficina inexistente"},{status:404});
  const name=String(b.name??prev.name).trim().slice(0,160),active=typeof b.active==='boolean'?b.active:Boolean(prev.active);
  await sql`UPDATE offices SET name=${name},active=${active},updated_at=now() WHERE id=${id}`;
  await writeAudit({actor:s!.email,action:"UPDATE_OFFICE",entityType:"office",entityId:String(id),previous:prev,next:{name,active}});
  return NextResponse.json({ok:true});
}
