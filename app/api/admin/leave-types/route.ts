import { NextResponse } from "next/server";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { writeAudit } from "@/lib/audit";

export async function GET(){await ensureV13Schema();const s=await getAdminSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});const sql=db();return NextResponse.json(await sql`SELECT * FROM leave_types ORDER BY category,name`);}
export async function POST(req:Request){await ensureV13Schema();const s=await getAdminSession();if(!isAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});const b=await req.json().catch(()=>({}));
 const code=String(b.code||"").trim().toUpperCase().slice(0,40),name=String(b.name||"").trim().slice(0,160),article=String(b.article||"").trim().slice(0,100),category=String(b.category||""),dayBasis=String(b.dayBasis||"CALENDAR"),payRule=String(b.payRule||"").slice(0,300),notes=String(b.notes||"").slice(0,1000);
 if(!code||!name||!["MEDICAL","ADMINISTRATIVE"].includes(category)||!["CALENDAR","BUSINESS","MANUAL"].includes(dayBasis))return NextResponse.json({error:"Datos inválidos"},{status:400});
 const num=(v:any)=>v===""||v==null?null:Math.max(0,Number(v)); const sql=db();
 try{const r=await sql`INSERT INTO leave_types(code,name,article,category,day_basis,annual_limit,monthly_limit,event_limit,extension_limit,pay_rule,notes) VALUES(${code},${name},${article||null},${category},${dayBasis},${num(b.annualLimit)},${num(b.monthlyLimit)},${num(b.eventLimit)},${num(b.extensionLimit)},${payRule||null},${notes||null}) RETURNING id`;await writeAudit({actor:s.email,action:"CREATE_LEAVE_TYPE",entityType:"leave_type",entityId:String(r[0].id),next:b});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"No se pudo crear. Verifique que el código no esté repetido."},{status:409})}}
export async function PATCH(req:Request){await ensureV13Schema();const s=await getAdminSession();if(!isAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});const b=await req.json().catch(()=>({}));const id=Number(b.id);if(!Number.isInteger(id))return NextResponse.json({error:"ID inválido"},{status:400});const sql=db();await sql`UPDATE leave_types SET active=${Boolean(b.active)},updated_at=now() WHERE id=${id}`;return NextResponse.json({ok:true});}
