import { NextResponse } from "next/server";
import { getAdminSession,canManagePersonnel,isGeneralAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessEmployee } from "@/lib/offices";
import { ensureV13Schema } from "@/lib/migrations";
import { writeAudit } from "@/lib/audit";
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  await ensureV13Schema();const s=await getAdminSession();if(!s||!canManagePersonnel(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const {id}=await params;if(!(await canAccessEmployee(id,s!.officeId,isGeneralAdmin(s))))return NextResponse.json({error:"No autorizado para este agente"},{status:403});const b=await request.json().catch(()=>({}));const date=String(b.seniorityDate||""),notes=String(b.seniorityNotes||"").trim().slice(0,500);
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"Fecha inválida"},{status:400});
  const sql=db();const prev=(await sql`SELECT seniority_date::text,seniority_notes FROM employees WHERE id=${id}`)[0];if(!prev)return NextResponse.json({error:"Agente no encontrado"},{status:404});
  await sql`UPDATE employees SET seniority_date=${date||null}::date,seniority_notes=${notes||null},updated_at=now() WHERE id=${id}`;
  await writeAudit({actor:s.email,action:"UPDATE_SENIORITY",entityType:"employee",entityId:id,previous:prev,next:{seniorityDate:date||null,seniorityNotes:notes||null}});
  return NextResponse.json({ok:true});
}
