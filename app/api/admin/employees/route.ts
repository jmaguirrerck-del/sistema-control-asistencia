import { randomUUID } from "node:crypto";
import { ensureV13Schema } from "@/lib/migrations";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminSession, pinLookup } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

type S={weekday:number;works:boolean;start:string;end:string};
function validTime(v:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)}
function parseSchedules(v:any):S[]{
  if(!Array.isArray(v))return [];
  return v.map(x=>({weekday:Number(x.weekday),works:Boolean(x.works),start:String(x.start||""),end:String(x.end||"")})).filter(x=>x.weekday>=1&&x.weekday<=7);
}
async function replaceSchedules(sql:any,employeeId:string,schedules:S[]){
  await sql`DELETE FROM employee_schedules WHERE employee_id=${employeeId}`;
  for(const s of schedules){
    if(!s.works)continue;
    if(!validTime(s.start)||!validTime(s.end)||s.end<=s.start)throw new Error("INVALID_SCHEDULE");
    await sql`INSERT INTO employee_schedules(employee_id,weekday,start_time,end_time) VALUES (${employeeId},${s.weekday},${s.start}::time,${s.end}::time)`;
  }
}

export async function GET(){
  await ensureV13Schema();
  const session=await getAdminSession(); if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  if(!(await isDatabaseReady())) return NextResponse.json([]);
  const sql=db();
  const rows=await sql`
    SELECT e.id,e.last_name,e.first_name,e.dni,e.employment,e.active,(e.pin_hash IS NOT NULL) AS pin_configured,
      COALESCE((SELECT json_agg(json_build_object('weekday',s.weekday,'start_time',s.start_time::text,'end_time',s.end_time::text) ORDER BY s.weekday) FROM employee_schedules s WHERE s.employee_id=e.id),'[]'::json) AS schedules,
      (SELECT COUNT(*)::int FROM employee_devices d WHERE d.employee_id=e.id AND d.active=TRUE) AS active_devices,
      (SELECT to_char(MAX(d.last_seen_at) AT TIME ZONE 'America/Argentina/Buenos_Aires','DD/MM/YYYY HH24:MI') FROM employee_devices d WHERE d.employee_id=e.id AND d.active=TRUE) AS device_last_seen
    FROM employees e ORDER BY e.active DESC,e.last_name,e.first_name
  `;
  return NextResponse.json(rows);
}

export async function POST(request:Request){
  await ensureV13Schema();
  const session=await getAdminSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const b=await request.json().catch(()=>({}));
  const lastName=String(b.lastName||"").trim().slice(0,100), firstName=String(b.firstName||"").trim().slice(0,100), dni=String(b.dni||"").replace(/\D/g,"").slice(0,12), employment=String(b.employment||"").trim().slice(0,120), pin=String(b.pin||"");
  const schedules=parseSchedules(b.schedules);
  if(!lastName||!firstName||dni.length<6||!employment)return NextResponse.json({error:"Completá apellido, nombre, DNI y situación de revista."},{status:400});
  if(pin && !/^\d{4,8}$/.test(pin))return NextResponse.json({error:"El PIN debe tener entre 4 y 8 dígitos."},{status:400});
  const sql=db();
  const dup=await sql`SELECT id FROM employees WHERE dni=${dni} LIMIT 1`;if(dup[0])return NextResponse.json({error:"Ya existe un agente con ese DNI."},{status:409});
  const id=randomUUID();let hash:null|string=null,lookup:null|string=null;
  if(pin){hash=await bcrypt.hash(pin,12);lookup=await pinLookup(pin);const pdup=await sql`SELECT id FROM employees WHERE pin_lookup=${lookup} LIMIT 1`;if(pdup[0])return NextResponse.json({error:"Ese PIN ya está asignado a otro agente."},{status:409});}
  try{
    await sql`INSERT INTO employees(id,last_name,first_name,dni,employment,pin_hash,pin_lookup,active) VALUES (${id},${lastName},${firstName},${dni},${employment},${hash},${lookup},TRUE)`;
    await replaceSchedules(sql,id,schedules);
  }catch(e){await sql`DELETE FROM employees WHERE id=${id}`;if(e instanceof Error&&e.message==="INVALID_SCHEDULE")return NextResponse.json({error:"Revisá los horarios: la salida debe ser posterior a la entrada."},{status:400});throw e;}
  await writeAudit({actor:session.email,action:"CREATE_EMPLOYEE",entityType:"employee",entityId:id,next:{lastName,firstName,dni,employment,schedules}});
  return NextResponse.json({ok:true,id});
}
