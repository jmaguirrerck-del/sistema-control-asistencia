import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureHistoricalLicenseImportSchema } from "@/lib/migrations";
import { historicalLicensePages } from "@/lib/historical-licenses";
import { writeAudit } from "@/lib/audit";

export async function POST(request:Request){
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureHistoricalLicenseImportSchema(); const sql=db(); const body=await request.json().catch(()=>({}));
  if(body.action==="seed"){
    const payload=JSON.stringify(historicalLicensePages);
    await sql`INSERT INTO historical_leave_import(source_file,source_page,employee_id,confidence,match_method,article_text,date_from,date_to,quantity_value,quantity_unit,raw_excerpt)
      SELECT 'LICENCIAS 2026-comprimido.pdf',x.page,x."employeeId",x.confidence,x."matchMethod",NULLIF(x.article,''),x."dateFrom"::date,x."dateTo"::date,x.quantity,x.unit,x.excerpt
      FROM jsonb_to_recordset(${payload}::jsonb) AS x(page int,"employeeId" text,confidence text,"matchMethod" text,article text,"dateFrom" text,"dateTo" text,quantity numeric,unit text,excerpt text)
      ON CONFLICT(source_file,source_page) DO NOTHING`;
    const c=await sql`SELECT count(*)::int AS total,count(employee_id)::int AS identified FROM historical_leave_import WHERE source_file='LICENCIAS 2026-comprimido.pdf'`;
    return NextResponse.json(c[0]);
  }
  if(body.action==="review"){
    const id=Number(body.id); if(!id)return NextResponse.json({error:"ID inválido"},{status:400});
    if(body.status==="REJECTED"){
      await sql`UPDATE historical_leave_import SET status='REJECTED',reviewed_by=${session.email},reviewed_at=now(),updated_at=now() WHERE id=${id}`;
      return NextResponse.json({ok:true});
    }
    if(!body.employeeId||!body.dateFrom||!body.dateTo||!body.leaveTypeId)return NextResponse.json({error:"Completá agente, tipo y fechas"},{status:400});
    const type=(await sql`SELECT * FROM leave_types WHERE id=${Number(body.leaveTypeId)} AND active=TRUE`)[0]; if(!type)return NextResponse.json({error:"Tipo inválido"},{status:400});
    const qty=body.quantityValue?Number(body.quantityValue):null; const unit=body.quantityUnit||'DAYS';
    const computed=unit==='DAYS'&&qty?Math.round(qty):Math.max(1,Math.round((new Date(body.dateTo).getTime()-new Date(body.dateFrom).getTime())/86400000)+1);
    const lr=await sql`INSERT INTO leave_records(employee_id,leave_type,leave_type_id,date_from,date_to,observation,computed_days,created_by)
      VALUES(${body.employeeId},${type.category==='MEDICAL'?'MEDICAL':'ADMINISTRATIVE'},${Number(body.leaveTypeId)},${body.dateFrom}::date,${body.dateTo}::date,${`Importación histórica 2026 · PDF pág. ${body.sourcePage}${unit==='HOURS'&&qty?` · ${qty} horas`:''}`},${computed},${session.email}) RETURNING id`;
    await sql`UPDATE historical_leave_import SET employee_id=${body.employeeId},article_text=${body.articleText||null},date_from=${body.dateFrom}::date,date_to=${body.dateTo}::date,quantity_value=${qty},quantity_unit=${unit},status='CONFIRMED',imported_leave_id=${lr[0].id},reviewed_by=${session.email},reviewed_at=now(),updated_at=now() WHERE id=${id}`;
    await writeAudit({actor:session.email,action:"CONFIRM_HISTORICAL_LEAVE",entityType:"historical_leave_import",entityId:String(id),next:{leaveRecordId:lr[0].id,sourcePage:body.sourcePage}});
    return NextResponse.json({ok:true,leaveId:lr[0].id});
  }
  return NextResponse.json({error:"Acción inválida"},{status:400});
}

export async function GET(request:Request){
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureHistoricalLicenseImportSchema(); const sql=db(); const u=new URL(request.url); const status=u.searchParams.get('status')||'PENDING';
  const rows=await sql`SELECT h.*,e.last_name,e.first_name,e.dni FROM historical_leave_import h LEFT JOIN employees e ON e.id=h.employee_id WHERE (${status}='ALL' OR h.status=${status}) ORDER BY h.source_page`;
  const summary=await sql`SELECT count(*)::int total,count(*) FILTER(WHERE employee_id IS NOT NULL)::int identified,count(*) FILTER(WHERE status='CONFIRMED')::int confirmed,count(*) FILTER(WHERE status='PENDING')::int pending,count(*) FILTER(WHERE employee_id IS NULL)::int unmatched FROM historical_leave_import`;
  return NextResponse.json({rows,summary:summary[0]||{total:0,identified:0,confirmed:0,pending:0,unmatched:0}});
}

export async function PUT(request:Request){
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureHistoricalLicenseImportSchema(); const sql=db(); const body=await request.json().catch(()=>({}));
  if(body.action!=="export-unresolved")return NextResponse.json({error:"Acción inválida"},{status:400});
  const rows=await sql`SELECT h.source_page,h.confidence,h.match_method,h.article_text,h.date_from::text,h.date_to::text,h.quantity_value,h.quantity_unit,h.raw_excerpt,e.last_name,e.first_name,e.dni FROM historical_leave_import h LEFT JOIN employees e ON e.id=h.employee_id WHERE h.status='PENDING' ORDER BY h.source_page`;
  const esc=(v:any)=>`"${String(v??"").replaceAll('"','""')}"`;
  const head=["Pagina","Agente identificado","DNI","Confianza","Metodo","Articulo","Desde","Hasta","Cantidad","Unidad","Extracto"].join(",");
  const lines=rows.map((r:any)=>[r.source_page,r.last_name?`${r.last_name}, ${r.first_name}`:"",r.dni,r.confidence,r.match_method,r.article_text,r.date_from,r.date_to,r.quantity_value,r.quantity_unit,r.raw_excerpt].map(esc).join(","));
  return new Response([head,...lines].join("\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=licencias_2026_pendientes_revision.csv"}});
}
