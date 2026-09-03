import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request:Request){
  const session=await getAdminSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
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
