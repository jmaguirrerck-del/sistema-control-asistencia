import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(request:Request){
  const session=await getAdminSession();if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const url=new URL(request.url);const date=url.searchParams.get("date");if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"Fecha inválida"},{status:400});
  const sql=db();const rows=await sql`
    SELECT ad.id,e.last_name,e.first_name,e.dni,ad.scheduled_start::text,ad.scheduled_end::text,
      to_char(ad.entry_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI') AS entry_local,
      to_char(ad.exit_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI') AS exit_local,
      ad.late_minutes,ad.compensation_minutes,ad.pending_minutes,ad.exit_type
    FROM attendance_days ad JOIN employees e ON e.id=ad.employee_id
    WHERE ad.work_date=${date}::date ORDER BY e.last_name,e.first_name
  `;return NextResponse.json(rows);
}

export async function DELETE(request:Request){
  const session=await getAdminSession();
  if(!isAdmin(session))return NextResponse.json({error:"Solo el administrador puede eliminar registros de asistencia."},{status:403});
  const body=await request.json().catch(()=>({}));
  const ids=Array.isArray(body.ids)?[...new Set(body.ids.map((v:any)=>Number(v)).filter((v:number)=>Number.isInteger(v)&&v>0))]:[];
  if(!ids.length)return NextResponse.json({error:"Seleccione al menos un registro de asistencia."},{status:400});
  if(ids.length>200)return NextResponse.json({error:"Se pueden eliminar hasta 200 registros por operación."},{status:400});
  const sql=db();
  const previous=await sql`
    SELECT ad.*,e.last_name,e.first_name,e.dni
    FROM attendance_days ad JOIN employees e ON e.id=ad.employee_id
    WHERE ad.id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    ORDER BY ad.work_date,e.last_name,e.first_name
  `;
  if(!previous.length)return NextResponse.json({error:"No se encontraron los registros seleccionados."},{status:404});

  // Se eliminan solamente la asistencia y sus eventos técnicos. Las licencias, vacaciones,
  // personal, horarios, PIN y dispositivos no se modifican.
  await sql`DELETE FROM attendance_events WHERE attendance_day_id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
  const deleted=await sql`DELETE FROM attendance_days WHERE id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)) RETURNING id`;
  await writeAudit({
    actor:session!.email,
    action:"DELETE_ATTENDANCE_RECORDS",
    entityType:"attendance_day",
    entityId:ids.join(","),
    previous,
    next:{deletedIds:deleted.map((r:any)=>Number(r.id)),reason:String(body.reason||"Eliminación administrativa").slice(0,300)}
  });
  return NextResponse.json({ok:true,deleted:deleted.length,deletedIds:deleted.map((r:any)=>Number(r.id))});
}
