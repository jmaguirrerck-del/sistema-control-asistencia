import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getAdminSession,canManageLicenses} from '@/lib/auth';
import {ensureV13Schema} from '@/lib/migrations';
import {writeAudit} from '@/lib/audit';
import {historicalConfirmed2026} from '@/lib/historical-confirmed-2026';

async function ensureSchema(){
  await ensureV13Schema();
  const sql=db();
  await sql`CREATE TABLE IF NOT EXISTS historical_confirmed_imports(
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_page INTEGER NOT NULL,
    form_index INTEGER NOT NULL DEFAULT 1,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    imported_leave_id BIGINT REFERENCES leave_records(id) ON DELETE SET NULL,
    imported_by TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_file,source_page,form_index)
  )`;
}

export async function GET(){
  const session=await getAdminSession();
  if(!canManageLicenses(session))return NextResponse.json({error:'No autorizado'},{status:403});
  await ensureSchema(); const sql=db();
  const imported=(await sql`SELECT count(*)::int n FROM historical_confirmed_imports WHERE source_file='LICENCIAS 2026-comprimido.pdf'`)[0]?.n||0;
  return NextResponse.json({validated:historicalConfirmed2026.length,imported,excludedManual:4,records:historicalConfirmed2026});
}

export async function POST(){
  const session=await getAdminSession();
  if(!canManageLicenses(session))return NextResponse.json({error:'No autorizado'},{status:403});
  await ensureSchema(); const sql=db();
  let imported=0,already=0,missingEmployee=0;
  const missing:any[]=[];
  for(const r of historicalConfirmed2026){
    const existing=(await sql`SELECT id FROM historical_confirmed_imports WHERE source_file='LICENCIAS 2026-comprimido.pdf' AND source_page=${r.sourcePage} AND form_index=${r.formIndex}`)[0];
    if(existing){already++;continue;}
    const emp=(await sql`SELECT id,last_name,first_name FROM employees WHERE regexp_replace(dni,'\\D','','g')=${r.dni} LIMIT 1`)[0];
    if(!emp){missingEmployee++;missing.push({page:r.sourcePage,dni:r.dni,name:r.employeeName});continue;}
    const observation=[`Histórico 2026 confirmado · PDF pág. ${r.sourcePage}`,r.article,`${r.quantity} días`,r.note].filter(Boolean).join(' · ');
    const lr=(await sql`INSERT INTO leave_records(employee_id,leave_type,leave_type_id,date_from,date_to,observation,computed_days,warning_text,created_by)
      VALUES(${emp.id},'VACATION',NULL,${r.dateFrom}::date,${r.dateTo}::date,${observation},${r.quantity},NULL,${session!.email}) RETURNING id`)[0];
    await sql`INSERT INTO historical_confirmed_imports(source_file,source_page,form_index,employee_id,imported_leave_id,imported_by)
      VALUES('LICENCIAS 2026-comprimido.pdf',${r.sourcePage},${r.formIndex},${emp.id},${lr.id},${session!.email})`;
    imported++;
  }
  await writeAudit({actor:session!.email,action:'IMPORT_CONFIRMED_HISTORICAL_2026',entityType:'historical_confirmed_imports',next:{imported,already,missingEmployee,missing}});
  return NextResponse.json({ok:true,validated:historicalConfirmed2026.length,imported,already,missingEmployee,missing,excludedManual:4});
}
