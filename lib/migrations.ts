import { db } from "@/lib/db";
let migrated=false;

const catalog = [
  {code:"ART8A",name:"Afecciones comunes",article:"Art. 8 inc. a",category:"MEDICAL",basis:"CALENDAR",annual:30,monthly:null,event:null,extension:null,pay:"100% hasta 30 días/año; exceso sin goce",notes:"Continuos o discontinuos por año calendario. Sin antigüedad mínima."},
  {code:"ART8B",name:"Afecciones de largo tratamiento",article:"Art. 8 inc. b",category:"MEDICAL",basis:"CALENDAR",annual:null,monthly:null,event:1095,extension:null,pay:"Hasta 2 años 100% + 1 año al 50%",notes:"Tras agotar 3 años, nueva licencia de este carácter luego de 3 años de servicios."},
  {code:"ART8C",name:"Accidente de trabajo o enfermedad ocupacional",article:"Art. 8 inc. c",category:"MEDICAL",basis:"CALENDAR",annual:null,monthly:null,event:1095,extension:null,pay:"Hasta 2 años 100% + 1 año al 50%",notes:"Sin antigüedad mínima."},
  {code:"ART12",name:"Atención de miembro del grupo familiar enfermo",article:"Art. 12",category:"MEDICAL",basis:"CALENDAR",annual:40,monthly:null,event:null,extension:20,pay:"20 días 100% + hasta 20 días sin goce",notes:"Familiar conviviente a exclusivo cuidado o padre/hijo directo."},
  {code:"ART13",name:"Maternidad",article:"Art. 13 inc. a y f",category:"MEDICAL",basis:"CALENDAR",annual:null,monthly:null,event:180,extension:null,pay:"100% con 10 meses de servicios docentes; de lo contrario sin goce",notes:"Duración general 180 días corridos. Casos especiales se registran según corresponda."},
  {code:"LEY5898",name:"Atención de hijo recién nacido por fallecimiento de la madre",article:"Ley 5898 - Art. 1",category:"MEDICAL",basis:"CALENDAR",annual:null,monthly:null,event:null,extension:null,pay:"100%",notes:"Período equivalente al de maternidad que correspondía a la madre."},
  {code:"ART13BIS",name:"Violencia de género",article:"Art. 13 bis",category:"MEDICAL",basis:"CALENDAR",annual:30,monthly:null,event:15,extension:15,pay:"100%",notes:"Hasta 15 días corridos, continuos o discontinuos, prorrogables por otro período idéntico."},
  {code:"ART15",name:"Matrimonio",article:"Art. 15",category:"ADMINISTRATIVE",basis:"CALENDAR",annual:null,monthly:null,event:15,extension:null,pay:"100%",notes:"15 días corridos."},
  {code:"ART16_7",name:"Duelo - familiar directo",article:"Art. 16",category:"ADMINISTRATIVE",basis:"CALENDAR",annual:null,monthly:null,event:7,extension:null,pay:"100%",notes:"Madre, padre, cónyuge, hijo, hermano, padrastro, madrastra, hermanastros o hijastros."},
  {code:"ART16_3",name:"Duelo - abuelos/nietos/bisabuelos/familiares políticos",article:"Art. 16",category:"ADMINISTRATIVE",basis:"CALENDAR",annual:null,monthly:null,event:3,extension:null,pay:"100%",notes:"Hasta 3 días corridos según parentesco previsto en la norma."},
  {code:"ART16_1",name:"Duelo - tíos/sobrinos/primos",article:"Art. 16",category:"ADMINISTRATIVE",basis:"CALENDAR",annual:null,monthly:null,event:1,extension:null,pay:"100%",notes:"1 día: fallecimiento o sepelio."},
  {code:"ART17",name:"Representación política",article:"Art. 17",category:"ADMINISTRATIVE",basis:"MANUAL",annual:null,monthly:null,event:null,extension:null,pay:"Sin goce",notes:"Mientras dure el mandato. Requiere 1 año de antigüedad en la docencia."},
  {code:"ART18",name:"Representación gremial",article:"Art. 18",category:"ADMINISTRATIVE",basis:"MANUAL",annual:null,monthly:null,event:null,extension:null,pay:"Sin goce",notes:"Mientras dure el mandato gremial. Sin antigüedad mínima."},
  {code:"ART19_SUP",name:"Preparación y mesa de exámenes - Nivel Superior",article:"Art. 19",category:"ADMINISTRATIVE",basis:"BUSINESS",annual:12,monthly:null,event:3,extension:null,pay:"100%",notes:"Hasta 12 días hábiles/año, fracciones de hasta 3 días hábiles por vez, inmediatos anteriores al examen."},
  {code:"ART19_MEDIA",name:"Preparación y mesa de exámenes - Enseñanza Media",article:"Art. 19",category:"ADMINISTRATIVE",basis:"BUSINESS",annual:8,monthly:null,event:2,extension:null,pay:"100%",notes:"Hasta 8 días hábiles/año, fracciones de hasta 2 días hábiles continuos, incluido el examen."},
  {code:"ART30B",name:"Razones particulares",article:"Art. 30 inc. b",category:"ADMINISTRATIVE",basis:"CALENDAR",annual:6,monthly:2,event:null,extension:null,pay:"100%",notes:"Hasta 6 días por año calendario y no más de 2 por mes. Sujeto a criterio de autoridad competente."}
];

export async function ensureV13Schema(){
  if(migrated)return;
  const sql=db();
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS force_pin_change BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin_changed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin_change_source TEXT`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin_reset_count INTEGER NOT NULL DEFAULT 0`;
  await sql`CREATE TABLE IF NOT EXISTS employee_devices (
    id BIGSERIAL PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    device_hash TEXT NOT NULL UNIQUE, user_agent TEXT, active BOOLEAN NOT NULL DEFAULT TRUE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_one_active_device ON employee_devices(employee_id) WHERE active=TRUE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_employee_devices_employee ON employee_devices(employee_id)`;

  await sql`CREATE TABLE IF NOT EXISTS leave_types (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    article TEXT,
    category TEXT NOT NULL CHECK(category IN ('MEDICAL','ADMINISTRATIVE')),
    day_basis TEXT NOT NULL DEFAULT 'CALENDAR' CHECK(day_basis IN ('CALENDAR','BUSINESS','MANUAL')),
    annual_limit INTEGER,
    monthly_limit INTEGER,
    event_limit INTEGER,
    extension_limit INTEGER,
    pay_rule TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS leave_type_id BIGINT REFERENCES leave_types(id)`;
  await sql`ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS computed_days INTEGER`;
  await sql`ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS warning_text TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leave_records_type ON leave_records(leave_type_id)`;

  const payload=JSON.stringify(catalog);
  await sql`INSERT INTO leave_types(code,name,article,category,day_basis,annual_limit,monthly_limit,event_limit,extension_limit,pay_rule,notes)
    SELECT x.code,x.name,x.article,x.category,x.basis,x.annual,x.monthly,x.event,x.extension,x.pay,x.notes
    FROM jsonb_to_recordset(${payload}::jsonb) AS x(code text,name text,article text,category text,basis text,annual int,monthly int,event int,extension int,pay text,notes text)
    ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,article=EXCLUDED.article,category=EXCLUDED.category,day_basis=EXCLUDED.day_basis,
      annual_limit=EXCLUDED.annual_limit,monthly_limit=EXCLUDED.monthly_limit,event_limit=EXCLUDED.event_limit,extension_limit=EXCLUDED.extension_limit,
      pay_rule=EXCLUDED.pay_rule,notes=EXCLUDED.notes,updated_at=now()`;
  migrated=true;
}
