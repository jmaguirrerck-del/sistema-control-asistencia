import { NextResponse } from "next/server";
import { getAdminSession, canViewLegajos, isGeneralAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureV119LeaveDetailSchema } from "@/lib/migrations";

function validDate(v:string|null){return !!v&&/^\d{4}-\d{2}-\d{2}$/.test(v)}

export async function GET(request:Request){
  await ensureV119LeaveDetailSchema();
  const session=await getAdminSession();
  if(!canViewLegajos(session)) return NextResponse.json({error:"No autorizado"},{status:403});

  const u=new URL(request.url);
  const year=new Date().getFullYear();
  const from=validDate(u.searchParams.get("from"))?u.searchParams.get("from")!:`${year}-01-01`;
  const to=validDate(u.searchParams.get("to"))?u.searchParams.get("to")!:`${year}-12-31`;
  if(to<from) return NextResponse.json({error:"Período inválido"},{status:400});
  const requested=Number(u.searchParams.get('officeId'));
  const officeId=isGeneralAdmin(session)&&(Number.isInteger(requested)&&requested>0)?requested:session!.officeId;

  const sql=db();
  const defaultStart="2026-09-12";
  const officeRows=officeId?await sql`SELECT o.name,c.absence_count_start_date::text AS absence_count_start_date FROM offices o LEFT JOIN office_configs c ON c.office_id=o.id WHERE o.id=${officeId}`:[];
  const absenceStart=String(officeRows[0]?.absence_count_start_date||defaultStart);

  const rows=officeId?await sql`
    WITH params AS (
      SELECT GREATEST(${from}::date,${absenceStart}::date) AS date_from, LEAST(${to}::date,CURRENT_DATE-1) AS date_to
    ), scheduled AS (
      SELECT e.id AS employee_id,d::date AS work_date
      FROM employees e CROSS JOIN params p CROSS JOIN LATERAL generate_series(p.date_from,p.date_to,'1 day'::interval) d
      JOIN employee_schedules s ON s.employee_id=e.id AND s.weekday=EXTRACT(ISODOW FROM d)::int
      WHERE e.active=TRUE AND e.office_id=${officeId} AND p.date_to>=p.date_from
    ), daily AS (
      SELECT sc.employee_id,sc.work_date,
        EXISTS(SELECT 1 FROM attendance_days ad WHERE ad.employee_id=sc.employee_id AND ad.work_date=sc.work_date AND ad.entry_at IS NOT NULL) AS has_entry,
        EXISTS(SELECT 1 FROM leave_records l WHERE l.employee_id=sc.employee_id AND l.active=TRUE AND sc.work_date BETWEEN l.date_from AND l.date_to) AS has_justification
      FROM scheduled sc
    ), absence_counts AS (
      SELECT employee_id,COUNT(*) FILTER (WHERE NOT has_entry AND has_justification)::int AS justified,COUNT(*) FILTER (WHERE NOT has_entry AND NOT has_justification)::int AS unjustified FROM daily GROUP BY employee_id
    ), scheduled_counts AS (
      SELECT employee_id,COUNT(*)::int AS scheduled_days FROM scheduled GROUP BY employee_id
    ), late_counts AS (
      SELECT ad.employee_id,COUNT(*) FILTER (WHERE COALESCE(ad.late_minutes,0)>0)::int AS late_entries,COUNT(*) FILTER (WHERE COALESCE(ad.pending_minutes,0)>0)::int AS effective_late,COALESCE(SUM(ad.late_minutes),0)::int AS late_minutes,COALESCE(SUM(ad.compensation_minutes),0)::int AS compensated_minutes,COALESCE(SUM(GREATEST(COALESCE(ad.late_minutes,0)-COALESCE(ad.compensation_minutes,0),0)),0)::int AS late_pending_minutes,COALESCE(SUM(ad.pending_minutes),0)::int AS pending_minutes
      FROM attendance_days ad,params p WHERE ad.work_date BETWEEN p.date_from AND p.date_to AND ad.office_id=${officeId} GROUP BY ad.employee_id
    )
    SELECT e.id,e.last_name,e.first_name,e.dni,e.employment,o.name AS office_name,COALESCE(sc.scheduled_days,0)::int AS scheduled_days,COALESCE(a.justified,0)::int AS justified,COALESCE(a.unjustified,0)::int AS unjustified,(COALESCE(a.justified,0)+COALESCE(a.unjustified,0))::int AS total_absences,COALESCE(l.late_entries,0)::int AS late_entries,COALESCE(l.effective_late,0)::int AS effective_late,COALESCE(l.late_minutes,0)::int AS late_minutes,COALESCE(l.compensated_minutes,0)::int AS compensated_minutes,COALESCE(l.late_pending_minutes,0)::int AS late_pending_minutes,COALESCE(l.pending_minutes,0)::int AS pending_minutes
    FROM employees e JOIN offices o ON o.id=e.office_id LEFT JOIN scheduled_counts sc ON sc.employee_id=e.id LEFT JOIN absence_counts a ON a.employee_id=e.id LEFT JOIN late_counts l ON l.employee_id=e.id
    WHERE e.active=TRUE AND e.office_id=${officeId} ORDER BY e.last_name,e.first_name,e.dni`
  :await sql`
    WITH params AS (SELECT ${from}::date AS date_from,LEAST(${to}::date,CURRENT_DATE-1) AS date_to), scheduled AS (
      SELECT e.id AS employee_id,d::date AS work_date,e.office_id,COALESCE(c.absence_count_start_date,'2026-09-12'::date) AS start_date
      FROM employees e JOIN office_configs c ON c.office_id=e.office_id CROSS JOIN params p CROSS JOIN LATERAL generate_series(GREATEST(p.date_from,COALESCE(c.absence_count_start_date,'2026-09-12'::date)),p.date_to,'1 day'::interval) d
      JOIN employee_schedules s ON s.employee_id=e.id AND s.weekday=EXTRACT(ISODOW FROM d)::int WHERE e.active=TRUE AND p.date_to>=GREATEST(p.date_from,COALESCE(c.absence_count_start_date,'2026-09-12'::date))
    ), daily AS (
      SELECT sc.employee_id,sc.work_date,EXISTS(SELECT 1 FROM attendance_days ad WHERE ad.employee_id=sc.employee_id AND ad.work_date=sc.work_date AND ad.entry_at IS NOT NULL) AS has_entry,EXISTS(SELECT 1 FROM leave_records l WHERE l.employee_id=sc.employee_id AND l.active=TRUE AND sc.work_date BETWEEN l.date_from AND l.date_to) AS has_justification FROM scheduled sc
    ), absence_counts AS (SELECT employee_id,COUNT(*) FILTER (WHERE NOT has_entry AND has_justification)::int AS justified,COUNT(*) FILTER (WHERE NOT has_entry AND NOT has_justification)::int AS unjustified FROM daily GROUP BY employee_id),
    scheduled_counts AS (SELECT employee_id,COUNT(*)::int AS scheduled_days FROM scheduled GROUP BY employee_id),
    late_counts AS (SELECT ad.employee_id,COUNT(*) FILTER (WHERE COALESCE(ad.late_minutes,0)>0)::int AS late_entries,COUNT(*) FILTER (WHERE COALESCE(ad.pending_minutes,0)>0)::int AS effective_late,COALESCE(SUM(ad.late_minutes),0)::int AS late_minutes,COALESCE(SUM(ad.compensation_minutes),0)::int AS compensated_minutes,COALESCE(SUM(GREATEST(COALESCE(ad.late_minutes,0)-COALESCE(ad.compensation_minutes,0),0)),0)::int AS late_pending_minutes,COALESCE(SUM(ad.pending_minutes),0)::int AS pending_minutes FROM attendance_days ad,params p WHERE ad.work_date BETWEEN p.date_from AND p.date_to GROUP BY ad.employee_id)
    SELECT e.id,e.last_name,e.first_name,e.dni,e.employment,o.name AS office_name,COALESCE(sc.scheduled_days,0)::int AS scheduled_days,COALESCE(a.justified,0)::int AS justified,COALESCE(a.unjustified,0)::int AS unjustified,(COALESCE(a.justified,0)+COALESCE(a.unjustified,0))::int AS total_absences,COALESCE(l.late_entries,0)::int AS late_entries,COALESCE(l.effective_late,0)::int AS effective_late,COALESCE(l.late_minutes,0)::int AS late_minutes,COALESCE(l.compensated_minutes,0)::int AS compensated_minutes,COALESCE(l.late_pending_minutes,0)::int AS late_pending_minutes,COALESCE(l.pending_minutes,0)::int AS pending_minutes
    FROM employees e JOIN offices o ON o.id=e.office_id LEFT JOIN scheduled_counts sc ON sc.employee_id=e.id LEFT JOIN absence_counts a ON a.employee_id=e.id LEFT JOIN late_counts l ON l.employee_id=e.id WHERE e.active=TRUE ORDER BY o.name,e.last_name,e.first_name,e.dni`;
  const offices=isGeneralAdmin(session)?await sql`SELECT id,name FROM offices WHERE active=TRUE ORDER BY name`:[];
  return NextResponse.json({from,to,absenceStartDate:officeId?absenceStart:null,rows,officeId,officeName:officeRows[0]?.name||session!.officeName||"Todas las oficinas",offices});
}
