import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

type S={weekday:number;works:boolean;start:string;end:string};
function validTime(v:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getAdminSession();if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const {id}=await params;const b=await request.json().catch(()=>({}));const sql=db();
  const prev=(await sql`SELECT id,last_name,first_name,dni,employment,active FROM employees WHERE id=${id}`)[0];if(!prev)return NextResponse.json({error:"Agente no encontrado"},{status:404});
  const lastName=String(b.lastName||"").trim().slice(0,100),firstName=String(b.firstName||"").trim().slice(0,100),dni=String(b.dni||"").replace(/\D/g,"").slice(0,12),employment=String(b.employment||"").trim().slice(0,120),active=Boolean(b.active);
  const schedules=(Array.isArray(b.schedules)?b.schedules:[]).map((x:any)=>({weekday:Number(x.weekday),works:Boolean(x.works),start:String(x.start||""),end:String(x.end||"")})) as S[];
  if(!lastName||!firstName||dni.length<6||!employment)return NextResponse.json({error:"Datos incompletos."},{status:400});
  const dup=await sql`SELECT id FROM employees WHERE dni=${dni} AND id<>${id} LIMIT 1`;if(dup[0])return NextResponse.json({error:"Ya existe otro agente con ese DNI."},{status:409});
  for(const s of schedules){if(s.works&&(!validTime(s.start)||!validTime(s.end)||s.end<=s.start))return NextResponse.json({error:"Revisá los horarios informados."},{status:400});}
  await sql`UPDATE employees SET last_name=${lastName},first_name=${firstName},dni=${dni},employment=${employment},active=${active},updated_at=now() WHERE id=${id}`;
  await sql`DELETE FROM employee_schedules WHERE employee_id=${id}`;
  for(const s of schedules){if(s.works)await sql`INSERT INTO employee_schedules(employee_id,weekday,start_time,end_time) VALUES (${id},${s.weekday},${s.start}::time,${s.end}::time)`;}
  await writeAudit({actor:session.email,action:"UPDATE_EMPLOYEE",entityType:"employee",entityId:id,previous:prev,next:{lastName,firstName,dni,employment,active,schedules}});
  return NextResponse.json({ok:true});
}
