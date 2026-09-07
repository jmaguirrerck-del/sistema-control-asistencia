import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getAdminSession,canManageLicenses} from "@/lib/auth";
import {writeAudit} from "@/lib/audit";
import {ensureHistoricalLicenseImportSchema} from "@/lib/migrations";
import {historicalLicenseForms} from "@/lib/historical-license-forms";

async function ensureFormSchema(){
  await ensureHistoricalLicenseImportSchema();
  const sql=db();
  await sql`CREATE TABLE IF NOT EXISTS historical_leave_forms (
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_page INTEGER NOT NULL,
    form_index INTEGER NOT NULL DEFAULT 1,
    position TEXT NOT NULL DEFAULT 'COMPLETO',
    form_type TEXT NOT NULL,
    detected_name TEXT,
    detected_dni TEXT,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    confidence TEXT NOT NULL DEFAULT 'UNMATCHED',
    match_method TEXT,
    article_text TEXT,
    date_from DATE,
    date_to DATE,
    quantity_value NUMERIC,
    quantity_unit TEXT CHECK(quantity_unit IN ('DAYS','HOURS')),
    raw_excerpt TEXT,
    previous_recognized TEXT,
    next_recognized TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','REJECTED')),
    imported_leave_id BIGINT REFERENCES leave_records(id) ON DELETE SET NULL,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_file,source_page,form_index)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_hist_forms_status ON historical_leave_forms(status)`;
}

export async function POST(request:Request){
  const session=await getAdminSession(); if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureFormSchema(); const sql=db(); const body=await request.json().catch(()=>({}));
  if(body.action==="seed"){
    const payload=JSON.stringify(historicalLicenseForms);
    await sql`INSERT INTO historical_leave_forms(source_file,source_page,form_index,position,form_type,detected_name,detected_dni,confidence,match_method,article_text,date_from,date_to,quantity_value,quantity_unit,raw_excerpt,previous_recognized,next_recognized,employee_id)
      SELECT 'LICENCIAS 2026-comprimido.pdf',x.page,x.form_index,x.position,x.form_type,x.employee_name,x.dni,x.confidence,x.match_method,NULLIF(x.article,''),x.date_from::date,x.date_to::date,x.quantity,x.unit,x.excerpt,x.previous_recognized,x.next_recognized,e.id
      FROM jsonb_to_recordset(${payload}::jsonb) AS x(page int,form_index int,position text,form_type text,employee_name text,dni text,confidence text,match_method text,article text,date_from text,date_to text,quantity numeric,unit text,excerpt text,previous_recognized text,next_recognized text)
      LEFT JOIN employees e ON regexp_replace(e.dni,'\\D','','g')=regexp_replace(COALESCE(x.dni,''),'\\D','','g') AND COALESCE(x.dni,'')<>''
      ON CONFLICT(source_file,source_page,form_index) DO UPDATE SET position=EXCLUDED.position,form_type=EXCLUDED.form_type,detected_name=EXCLUDED.detected_name,detected_dni=EXCLUDED.detected_dni,confidence=EXCLUDED.confidence,match_method=EXCLUDED.match_method,article_text=EXCLUDED.article_text,date_from=EXCLUDED.date_from,date_to=EXCLUDED.date_to,quantity_value=EXCLUDED.quantity_value,quantity_unit=EXCLUDED.quantity_unit,raw_excerpt=EXCLUDED.raw_excerpt,previous_recognized=EXCLUDED.previous_recognized,next_recognized=EXCLUDED.next_recognized,employee_id=COALESCE(historical_leave_forms.employee_id,EXCLUDED.employee_id),updated_at=now()`;
    const s=(await sql`SELECT count(*)::int total,count(*) FILTER(WHERE employee_id IS NOT NULL)::int identified,count(*) FILTER(WHERE employee_id IS NULL)::int unresolved FROM historical_leave_forms`)[0];
    await writeAudit({actor:session.email,action:"SEED_HISTORICAL_FORMS",entityType:"historical_leave_forms",next:s});
    return NextResponse.json({ok:true,...s});
  }
  if(body.action==="review"){
    const id=Number(body.id); if(!id)return NextResponse.json({error:"ID inválido"},{status:400});
    if(body.status==="REJECTED"){
      await sql`UPDATE historical_leave_forms SET status='REJECTED',reviewed_by=${session.email},reviewed_at=now(),updated_at=now() WHERE id=${id}`;
      return NextResponse.json({ok:true});
    }
    if(!body.employeeId||!body.leaveTypeId||!body.dateFrom)return NextResponse.json({error:"Agente, tipo de licencia y fecha Desde son obligatorios"},{status:400});
    const type=(await sql`SELECT * FROM leave_types WHERE id=${Number(body.leaveTypeId)} AND active=TRUE`)[0]; if(!type)return NextResponse.json({error:"Tipo inválido"},{status:400});
    const qty=body.quantityValue?Number(body.quantityValue):1; const unit=body.quantityUnit||'DAYS';
    let dateTo=body.dateTo||body.dateFrom;
    if(unit==='DAYS'&&qty>0){const d=new Date(body.dateFrom+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Math.max(0,Math.round(qty)-1));dateTo=d.toISOString().slice(0,10)}
    const computed=unit==='DAYS'?Math.max(1,Math.round(qty)):1;
    const row=(await sql`SELECT source_page,form_index,position FROM historical_leave_forms WHERE id=${id}`)[0];
    const observation=`Importación histórica 2026 · PDF pág. ${row.source_page}${row.position&&row.position!=='COMPLETO'?` · ${String(row.position).toLowerCase()}`:''}${unit==='HOURS'?` · ${qty} horas`:''}`;
    const lr=await sql`INSERT INTO leave_records(employee_id,leave_type,leave_type_id,date_from,date_to,observation,computed_days,created_by)
      VALUES(${body.employeeId},${type.category==='MEDICAL'?'MEDICAL':'ADMINISTRATIVE'},${Number(body.leaveTypeId)},${body.dateFrom}::date,${dateTo}::date,${observation},${computed},${session.email}) RETURNING id`;
    await sql`UPDATE historical_leave_forms SET employee_id=${body.employeeId},article_text=${body.articleText||null},date_from=${body.dateFrom}::date,date_to=${dateTo}::date,quantity_value=${qty},quantity_unit=${unit},status='CONFIRMED',imported_leave_id=${lr[0].id},reviewed_by=${session.email},reviewed_at=now(),updated_at=now() WHERE id=${id}`;
    await writeAudit({actor:session.email,action:"CONFIRM_HISTORICAL_FORM",entityType:"historical_leave_forms",entityId:String(id),next:{leaveRecordId:lr[0].id}});
    return NextResponse.json({ok:true,leaveId:lr[0].id});
  }
  return NextResponse.json({error:"Acción inválida"},{status:400});
}

export async function GET(request:Request){
  const session=await getAdminSession(); if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureFormSchema(); const sql=db(); const u=new URL(request.url); const status=u.searchParams.get('status')||'PENDING';
  const rows=await sql`SELECT h.*,e.last_name,e.first_name,e.dni FROM historical_leave_forms h LEFT JOIN employees e ON e.id=h.employee_id WHERE (${status}='ALL' OR h.status=${status}) ORDER BY h.source_page,h.form_index`;
  const summary=(await sql`SELECT count(*)::int total,count(*) FILTER(WHERE employee_id IS NOT NULL)::int identified,count(*) FILTER(WHERE status='CONFIRMED')::int confirmed,count(*) FILTER(WHERE status='PENDING')::int pending,count(*) FILTER(WHERE employee_id IS NULL AND status='PENDING')::int unresolved FROM historical_leave_forms`)[0];
  return NextResponse.json({rows,summary:summary||{total:0,identified:0,confirmed:0,pending:0,unresolved:0}});
}

export async function PUT(request:Request){
  const session=await getAdminSession(); if(!canManageLicenses(session))return NextResponse.json({error:"No autorizado"},{status:403});
  await ensureFormSchema(); const sql=db(); const body=await request.json().catch(()=>({}));
  if(body.action!=="export-unresolved")return NextResponse.json({error:"Acción inválida"},{status:400});
  const rows=await sql`SELECT source_page,form_index,position,form_type,detected_name,detected_dni,previous_recognized,next_recognized FROM historical_leave_forms WHERE status='PENDING' AND employee_id IS NULL ORDER BY source_page,form_index`;
  const esc=(v:any)=>`"${String(v??"").replaceAll('"','""')}"`;
  const head=["Orden","Pagina","Posicion","Tipo formulario","Nombre/DNI detectado","Formulario anterior reconocido","Formulario posterior reconocido","Motivo"].join(",");
  const lines=rows.map((r:any,i:number)=>[i+1,r.source_page,r.position,r.form_type,[r.detected_name,r.detected_dni].filter(Boolean).join(' · '),r.previous_recognized,r.next_recognized,"No se pudo identificar con seguridad al agente"].map(esc).join(","));
  return new Response([head,...lines].join("\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=formularios_historicos_pendientes_revision.csv"}});
}
