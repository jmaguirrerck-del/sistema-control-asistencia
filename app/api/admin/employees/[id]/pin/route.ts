import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminSession, pinLookup, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ensureV13Schema } from "@/lib/migrations";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  await ensureV13Schema();
  const session=await getAdminSession(); if(!isAdmin(session))return NextResponse.json({error:"No autorizado"},{status:403});
  const {id}=await params; const body=await request.json().catch(()=>({})); const pin=String(body.pin||""); const forceChange=body.forceChange!==false;
  if(!/^\d{4,8}$/.test(pin))return NextResponse.json({error:"El PIN debe tener entre 4 y 8 dígitos"},{status:400});
  const hash=await bcrypt.hash(pin,12); const lookup=await pinLookup(pin); const sql=db();
  const duplicate=await sql`SELECT id,last_name,first_name FROM employees WHERE pin_lookup=${lookup} AND id<>${id} LIMIT 1`;
  if(duplicate[0])return NextResponse.json({error:"Ese PIN ya está asignado a otro agente. Elegí uno diferente."},{status:409});
  const rows=await sql`UPDATE employees SET pin_hash=${hash},pin_lookup=${lookup},force_pin_change=${forceChange},pin_changed_at=now(),pin_change_source='ADMIN',pin_reset_count=pin_reset_count+1,temporary_pin_expires_at=CASE WHEN ${forceChange} THEN now()+interval '7 days' ELSE NULL END,updated_at=now() WHERE id=${id} RETURNING id,last_name,first_name`;
  if(!rows[0])return NextResponse.json({error:"Agente no encontrado"},{status:404});
  await writeAudit({actor:session.email,action:"RESET_PIN",entityType:"employee",entityId:id,next:{pinConfigured:true,forceChange,source:"ADMIN"}});
  return NextResponse.json({ok:true});
}
