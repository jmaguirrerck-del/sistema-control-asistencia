import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { argentinaParts, minutesFromHHMM } from "@/lib/time";
import { autoCloseEligibleDays } from "@/lib/attendance";

const leaveLabels:Record<string,string>={MEDICAL:"Licencia médica",ADMINISTRATIVE:"Licencia administrativa",VACATION:"Vacaciones",COMMISSION:"Comisión",AFFECTATION:"Afectación",FRANCO:"Franco",OTHER:"Otra novedad"};

export async function GET(){
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  if(!(await isDatabaseReady()))return NextResponse.json({ready:false});
  await autoCloseEligibleDays();
  const p=argentinaParts(); const nowMinutes=p.hour*60+p.minute; const sql=db();
  const settings=(await sql`SELECT lateness_tolerance_minutes FROM office_settings WHERE id=1`)[0]; const tolerance=Number(settings?.lateness_tolerance_minutes||10);
  const rows=await sql`
    SELECT e.id AS employee_id,e.last_name,e.first_name,e.dni,
      s.start_time::text,s.end_time::text,
      ad.entry_at,ad.exit_at,ad.late_minutes,ad.compensation_minutes,ad.pending_minutes,ad.exit_type,
      lr.leave_type
    FROM employee_schedules s
    JOIN employees e ON e.id=s.employee_id AND e.active=TRUE
    LEFT JOIN attendance_days ad ON ad.employee_id=e.id AND ad.work_date=${p.date}::date
    LEFT JOIN LATERAL (
      SELECT leave_type FROM leave_records l
      WHERE l.employee_id=e.id AND l.active=TRUE AND ${p.date}::date BETWEEN l.date_from AND l.date_to
      ORDER BY l.created_at DESC LIMIT 1
    ) lr ON TRUE
    WHERE s.weekday=${p.weekday}
    ORDER BY e.last_name,e.first_name
  `;
  const out=rows.map((r:any)=>{
    const start=String(r.start_time).slice(0,5),end=String(r.end_time).slice(0,5);
    let status="Pendiente de ingreso",tone="info";
    if(r.leave_type){status=leaveLabels[String(r.leave_type)]||String(r.leave_type);tone="info";}
    else if(r.entry_at && !r.exit_at){status=Number(r.late_minutes)>0?"Presente · atraso a compensar":"Presente";tone=Number(r.late_minutes)>0?"warn":"good";}
    else if(r.entry_at && r.exit_at){if(Number(r.pending_minutes)>0){status=r.exit_type==="AUTO"?"Tardanza efectiva · cierre por sistema":"Tardanza efectiva";tone="warn";}else{status=r.exit_type==="AUTO"?"Jornada cerrada por sistema":"Retirado · sin tardanza";tone=r.exit_type==="AUTO"?"warn":"good";}}
    else if(nowMinutes>minutesFromHHMM(start)+tolerance){status="Ausente sin justificar";tone="bad";}
    return {employeeId:r.employee_id,name:`${r.last_name}, ${r.first_name}`,dni:r.dni,schedule:`${start}–${end}`,
      entry:r.entry_at?new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(r.entry_at)):null,
      exit:r.exit_at?new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(r.exit_at)):null,
      lateMinutes:Number(r.late_minutes||0),compensationMinutes:Number(r.compensation_minutes||0),pendingMinutes:Number(r.pending_minutes||0),exitType:r.exit_type,status,statusTone:tone,leaveType:r.leave_type};
  });
  const totals={scheduled:out.length,present:out.filter(r=>r.entry).length,late:out.filter(r=>r.exit&&r.pendingMinutes>0).length,absent:out.filter(r=>r.status==="Ausente sin justificar").length,leave:out.filter(r=>r.leaveType).length,inOffice:out.filter(r=>r.entry&&!r.exit).length,open:out.filter(r=>r.entry&&!r.exit).length,autoExit:out.filter(r=>r.exitType==="AUTO").length};
  const displayDate=new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  return NextResponse.json({ready:true,date:displayDate,totals,rows:out});
}
