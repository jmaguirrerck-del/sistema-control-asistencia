import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { getAdminSession,isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(){
  await ensureV13Schema(); const s=await getAdminSession(); if(!isAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const sql=db(); const rows=await sql`SELECT id,email,role,active,last_login_at,created_at,updated_at FROM app_users ORDER BY active DESC,email`;
  return NextResponse.json(rows);
}
export async function POST(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!isAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const email=String(b.email||"").trim().toLowerCase(), password=String(b.password||""), role=String(b.role||"LICENSE_OPERATOR");
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Correo inválido"},{status:400});
  if(password.length<8)return NextResponse.json({error:"La contraseña debe tener al menos 8 caracteres"},{status:400});
  if(role!=="LICENSE_OPERATOR"&&role!=="ADMIN")return NextResponse.json({error:"Rol inválido"},{status:400});
  const sql=db(); const dup=await sql`SELECT id FROM app_users WHERE lower(email)=lower(${email}) LIMIT 1`; if(dup[0])return NextResponse.json({error:"Ya existe un usuario con ese correo"},{status:409});
  const hash=await bcrypt.hash(password,12); const row=(await sql`INSERT INTO app_users(email,password_hash,role,created_by) VALUES(${email},${hash},${role},${s!.email}) RETURNING id`)[0];
  await writeAudit({actor:s!.email,action:"CREATE_APP_USER",entityType:"app_user",entityId:String(row.id),next:{email,role}});
  return NextResponse.json({ok:true,id:row.id});
}
export async function PATCH(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!isAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const id=Number(b.id); if(!Number.isInteger(id))return NextResponse.json({error:"ID inválido"},{status:400});
  const sql=db(); const prev=(await sql`SELECT id,email,role,active FROM app_users WHERE id=${id}`)[0]; if(!prev)return NextResponse.json({error:"Usuario inexistente"},{status:404});
  if(typeof b.active==="boolean")await sql`UPDATE app_users SET active=${b.active},updated_at=now() WHERE id=${id}`;
  if(b.password){const pwd=String(b.password);if(pwd.length<8)return NextResponse.json({error:"La contraseña debe tener al menos 8 caracteres"},{status:400});const hash=await bcrypt.hash(pwd,12);await sql`UPDATE app_users SET password_hash=${hash},updated_at=now() WHERE id=${id}`;}
  await writeAudit({actor:s!.email,action:"UPDATE_APP_USER",entityType:"app_user",entityId:String(id),previous:prev,next:{active:b.active,passwordReset:Boolean(b.password)}});
  return NextResponse.json({ok:true});
}
