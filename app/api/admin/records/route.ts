import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ensureV13Schema } from "@/lib/migrations";

const reasons=new Set(["PERSONAL","MEDICAL","COMMISSION","AUTHORIZED_PERMISSION","LEAVE_HOURS","UNJUSTIFIED","OTHER"]);

export async function GET(request:Request){
  await ensureV13Schema();
  const session=await getAdminSession();if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const url=new URL(request.url);const date=url.searchParams.get("date");if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"Fecha inválida"},{status:400});
  const sql=db();const rows=await sql`
    SELECT ad.id,e.last_name,e.first_name,e.dni,ad.scheduled_start::text,ad.scheduled_end::text,
      to_char(ad.entry_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI') AS entry_local,
      to_char(ad.exit_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI') AS exit_local,
      ad.late_minutes,ad.compensation_minutes,ad.pending_minutes,ad.exit_type,
      COALESCE((SELECT json_agg(json_build_object('id',ae.id,'event_type',ae.event_type,'time',to_char(ae.occurred_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI')) ORDER BY ae.occurred_at,ae.id)
        FROM attendance_events ae WHERE ae.attendance_day_id=ad.id AND ae.event_type IN ('ENTRY','EXIT','REENTRY','AUTO_EXIT')),'[]'::json) AS movements,
      COALESCE((SELECT json_agg(json_build_object(
        'id',ai.id,
        'exit_time',to_char(ai.exited_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI'),
        'reentry_time',to_char(ai.reentered_at AT TIME ZONE 'America/Argentina/Buenos_Aires','HH24:MI'),
        'minutes',CASE WHEN ai.reentered_at IS NULL THEN NULL ELSE GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (ai.reentered_at-ai.exited_at))/60))::int END,
        'reason_code',ai.reason_code,'admin_note',ai.admin_note,'counts_as_work',ai.counts_as_work,
        'classified_by',ai.classified_by,'classified_at',ai.classified_at
      ) ORDER BY ai.exited_at) FROM attendance_intervals ai WHERE ai.attendance_day_id=ad.id AND ai.reentered_at IS NOT NULL),'[]'::json) AS intervals
    FROM attendance_days ad JOIN employees e ON e.id=ad.employee_id
    WHERE ad.work_date=${date}::date ORDER BY e.last_name,e.first_name
  `;return NextResponse.json(rows);
}

export async function PATCH(request:Request){
  await ensureV13Schema();
  const session=await getAdminSession();if(!isAdmin(session))return NextResponse.json({error:"Solo el administrador puede clasificar salidas intermedias."},{status:403});
  const body=await request.json().catch(()=>({}));
  const id=Number(body.intervalId);const reason=String(body.reasonCode||"");
  if(!Number.isInteger(id)||id<=0||!reasons.has(reason))return NextResponse.json({error:"Datos de clasificación inválidos."},{status:400});
  const note=String(body.adminNote||"").trim().slice(0,500);
  const countsAsWork=body.countsAsWork===true;
  const sql=db();
  const previous=(await sql`SELECT * FROM attendance_intervals WHERE id=${id}`)[0];
  if(!previous)return NextResponse.json({error:"Intervalo no encontrado."},{status:404});
  if(!previous.reentered_at)return NextResponse.json({error:"La salida todavía no tiene reingreso registrado."},{status:409});
  const updated=(await sql`
    UPDATE attendance_intervals SET reason_code=${reason},admin_note=${note||null},counts_as_work=${countsAsWork},classified_by=${session!.email},classified_at=now(),updated_at=now()
    WHERE id=${id}
    RETURNING *
  `)[0];
  await writeAudit({actor:session!.email,action:"CLASSIFY_ATTENDANCE_INTERVAL",entityType:"attendance_interval",entityId:String(id),previous,next:updated});
  return NextResponse.json({ok:true,interval:updated});
}

export async function DELETE(request:Request){
  await ensureV13Schema();
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
  await sql`DELETE FROM attendance_intervals WHERE attendance_day_id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
  await sql`DELETE FROM attendance_events WHERE attendance_day_id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
  const deleted=await sql`DELETE FROM attendance_days WHERE id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)) RETURNING id`;
  await writeAudit({actor:session!.email,action:"DELETE_ATTENDANCE_RECORDS",entityType:"attendance_day",entityId:ids.join(","),previous,next:{deletedIds:deleted.map((r:any)=>Number(r.id)),reason:String(body.reason||"Eliminación administrativa").slice(0,300)}});
  return NextResponse.json({ok:true,deleted:deleted.length,deletedIds:deleted.map((r:any)=>Number(r.id))});
}
