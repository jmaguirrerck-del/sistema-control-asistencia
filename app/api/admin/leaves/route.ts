import { NextResponse } from "next/server";
import { getAdminSession, canManageLicenses, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ensureV119LeaveDetailSchema } from "@/lib/migrations";

function dayCount(a:string,b:string,basis:string){const start=new Date(a+"T00:00:00Z"),end=new Date(b+"T00:00:00Z");let n=0;for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){const w=d.getUTCDay();if(basis!=="BUSINESS"||(w!==0&&w!==6))n++;}return n;}

export async function GET(){
  await ensureV119LeaveDetailSchema();const session=await getAdminSession();if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const sql=db();const rows=await sql`SELECT l.id,l.employee_id,l.leave_type,l.leave_type_id,l.date_from::text,l.date_to::text,l.observation,l.computed_days,l.warning_text,l.created_by,l.created_at,l.source_article,l.quantity_value,l.quantity_unit,e.last_name,e.first_name,t.name AS type_name,COALESCE(t.article,l.source_article) AS article,t.category FROM leave_records l JOIN employees e ON e.id=l.employee_id LEFT JOIN leave_types t ON t.id=l.leave_type_id WHERE l.active=TRUE ORDER BY l.date_from DESC,e.last_name`;
  return NextResponse.json(rows);
}

export async function POST(request:Request){
  await ensureV119LeaveDetailSchema();const session=await getAdminSession();if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await request.json().catch(()=>({}));const employeeId=String(b.employeeId||""),dateFrom=String(b.dateFrom||""),dateTo=String(b.dateTo||""),observation=String(b.observation||"").slice(0,1000),mode=String(b.mode||"LICENSE");
  if(!employeeId||!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)||dateTo<dateFrom)return NextResponse.json({error:"Datos de novedad inválidos"},{status:400});const sql=db();
  let leaveType="VACATION",typeId:null|number=null,computed=dayCount(dateFrom,dateTo,"CALENDAR"),warning="";
  if(mode!=="VACATION"){
    typeId=Number(b.leaveTypeId);if(!Number.isInteger(typeId))return NextResponse.json({error:"Seleccione un tipo de licencia"},{status:400});
    const t=(await sql`SELECT * FROM leave_types WHERE id=${typeId} AND active=TRUE`)[0];if(!t)return NextResponse.json({error:"Tipo de licencia inválido"},{status:400});leaveType=String(t.category);computed=dayCount(dateFrom,dateTo,String(t.day_basis));
    const warnings:string[]=[];if(t.event_limit&&computed>Number(t.event_limit))warnings.push(`El período supera el máximo por evento (${t.event_limit} días).`);
    const year=dateFrom.slice(0,4);if(t.annual_limit){const u=(await sql`SELECT COALESCE(SUM(computed_days),0)::int AS used FROM leave_records WHERE employee_id=${employeeId} AND leave_type_id=${typeId} AND active=TRUE AND EXTRACT(YEAR FROM date_from)=${Number(year)}`)[0];if(Number(u.used)+computed>Number(t.annual_limit))warnings.push(`Supera el máximo anual de ${t.annual_limit} días. Acumulado resultante: ${Number(u.used)+computed}.`)}
    if(t.monthly_limit){const ym=dateFrom.slice(0,7);const u=(await sql`SELECT COALESCE(SUM(computed_days),0)::int AS used FROM leave_records WHERE employee_id=${employeeId} AND leave_type_id=${typeId} AND active=TRUE AND to_char(date_from,'YYYY-MM')=${ym}`)[0];if(Number(u.used)+computed>Number(t.monthly_limit))warnings.push(`Supera el máximo mensual de ${t.monthly_limit} días. Acumulado resultante: ${Number(u.used)+computed}.`)}warning=warnings.join(" ");
  } else {
    const year=Number(dateFrom.slice(0,4));const p=(await sql`SELECT entitlement_days FROM vacation_entitlements WHERE employee_id=${employeeId} AND benefit_year=${year}`)[0];
    if(p){const used=(await sql`SELECT COALESCE(SUM(computed_days),0)::int AS used FROM leave_records WHERE employee_id=${employeeId} AND leave_type='VACATION' AND active=TRUE AND EXTRACT(YEAR FROM date_from)=${year}`)[0];const resulting=Number(used.used||0)+computed,ent=Number(p.entitlement_days);if(resulting>ent)warning=`El período supera el derecho de vacaciones configurado para ${year}. Derecho: ${ent} días; acumulado resultante: ${resulting}; exceso: ${Math.round((resulting-ent)*100)/100}.`;}
    else warning=`No hay cálculo de derecho de vacaciones configurado para ${year}. El período se registra manualmente, pendiente de control de saldo.`;
  }
  const rows=await sql`INSERT INTO leave_records(employee_id,leave_type,leave_type_id,date_from,date_to,observation,computed_days,warning_text,created_by,source_article,quantity_value,quantity_unit) VALUES(${employeeId},${leaveType},${typeId},${dateFrom}::date,${dateTo}::date,${observation||null},${computed},${warning||null},${session!.email},NULL,${computed},'DAYS') RETURNING id`;
  await writeAudit({actor:session!.email,action:"CREATE_LEAVE",entityType:"leave_record",entityId:String(rows[0].id),next:{employeeId,leaveType,typeId,dateFrom,dateTo,computed,warning}});
  return NextResponse.json({ok:true,id:rows[0].id,computedDays:computed,warning});
}

export async function DELETE(request:Request){
  await ensureV119LeaveDetailSchema();const session=await getAdminSession();if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});const id=Number(new URL(request.url).searchParams.get("id"));if(!Number.isInteger(id))return NextResponse.json({error:"ID inválido"},{status:400});const sql=db();const prev=(await sql`SELECT * FROM leave_records WHERE id=${id}`)[0];if(!prev)return NextResponse.json({error:"Registro inexistente"},{status:404});
  if(!isAdmin(session)&&String(prev.created_by).toLowerCase()!==session!.email.toLowerCase())return NextResponse.json({error:"Solo podés desactivar registros cargados por tu usuario."},{status:403});
  await sql`UPDATE leave_records SET active=FALSE,updated_at=now() WHERE id=${id}`;await writeAudit({actor:session!.email,action:"DEACTIVATE_LEAVE",entityType:"leave_record",entityId:String(id),previous:prev,next:{active:false}});return NextResponse.json({ok:true});
}
