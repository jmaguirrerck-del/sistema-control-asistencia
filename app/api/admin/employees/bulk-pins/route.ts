import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { getAdminSession, isAdmin, pinLookup } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

type GeneratedRow = { id:string; lastName:string; firstName:string; dni:string; pin:string; expiresAt:string };

async function makeUniquePin(sql: ReturnType<typeof db>, reserved:Set<string>) {
  for (let attempt=0; attempt<200; attempt++) {
    const pin=String(randomInt(100000,1000000));
    const lookup=await pinLookup(pin);
    if(reserved.has(lookup)) continue;
    const existing=await sql`SELECT id FROM employees WHERE pin_lookup=${lookup} LIMIT 1`;
    if(!existing[0]){ reserved.add(lookup); return {pin,lookup}; }
  }
  throw new Error("No se pudo generar un PIN único. Intentá nuevamente.");
}

export async function POST(){
  await ensureV13Schema();
  const session=await getAdminSession();
  if(!isAdmin(session)) return NextResponse.json({error:"No autorizado"},{status:403});
  const sql=db();
  const employees=await sql`
    SELECT id,last_name,first_name,dni
    FROM employees
    WHERE active=TRUE AND pin_hash IS NULL
    ORDER BY last_name,first_name
  `;
  if(!employees.length) return NextResponse.json({ok:true,generated:[],count:0,message:"Todos los agentes activos ya tienen PIN configurado."});

  const reserved=new Set<string>();
  const generated:GeneratedRow[]=[];
  const expiresAt=new Date(Date.now()+7*24*60*60*1000);
  for(const e of employees){
    const {pin,lookup}=await makeUniquePin(sql,reserved);
    const hash=await bcrypt.hash(pin,12);
    await sql`
      UPDATE employees
      SET pin_hash=${hash},pin_lookup=${lookup},force_pin_change=TRUE,
          pin_changed_at=now(),pin_change_source='ADMIN_BULK',
          temporary_pin_expires_at=${expiresAt},updated_at=now()
      WHERE id=${String(e.id)} AND active=TRUE AND pin_hash IS NULL
    `;
    generated.push({id:String(e.id),lastName:String(e.last_name),firstName:String(e.first_name),dni:String(e.dni),pin,expiresAt:expiresAt.toISOString()});
  }

  await writeAudit({
    actor:session.email,
    action:"GENERATE_BULK_TEMP_PINS",
    entityType:"employee",
    entityId:null,
    next:{count:generated.length,employeeIds:generated.map(x=>x.id),expiresAt:expiresAt.toISOString(),forceChange:true}
  });

  return NextResponse.json({ok:true,count:generated.length,generated,expiresAt:expiresAt.toISOString()});
}
