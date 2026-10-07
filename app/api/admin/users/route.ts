import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { getAdminSession,isGeneralAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const VALID_PERMISSIONS=["DASHBOARD","PERSONNEL","LEGAJOS","LICENSES","ATTENDANCE","QR_GENERATOR"] as const;
function normalizePermissions(value:any): string[]{const list=Array.isArray(value)?value.map(String):[];return [...new Set(list.filter(x=>(VALID_PERMISSIONS as readonly string[]).includes(x)))];}
function legacyRole(perms:string[]){if(perms.length===1&&perms[0]==="LICENSES")return "LICENSE_OPERATOR";if(perms.length===1&&perms[0]==="ATTENDANCE")return "ATTENDANCE_OPERATOR";return "CUSTOM";}

export async function GET(){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const sql=db();
  const rows=await sql`SELECT u.id,u.email,u.role,u.active,u.must_change_password,u.last_login_at,u.created_at,u.updated_at,u.office_id,u.is_general_admin,o.name AS office_name,
    COALESCE(array_agg(up.permission_code ORDER BY up.permission_code) FILTER (WHERE up.permission_code IS NOT NULL),ARRAY[]::text[]) AS permissions
    FROM app_users u LEFT JOIN app_user_permissions up ON up.user_id=u.id LEFT JOIN offices o ON o.id=u.office_id
    GROUP BY u.id,o.name ORDER BY u.active DESC,u.email`;
  const permissions=await sql`SELECT code,name,description FROM app_permissions WHERE active=TRUE ORDER BY name`;
  const offices=await sql`SELECT id,code,name FROM offices WHERE active=TRUE ORDER BY name`;
  return NextResponse.json({users:rows,permissionCatalog:permissions,offices});
}

export async function POST(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),permissions=normalizePermissions(b.permissions),officeId=Number(b.officeId);
  const forcePasswordChange=b.forcePasswordChange!==false;
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Correo inválido"},{status:400});
  if(password.length<8)return NextResponse.json({error:"La contraseña debe tener al menos 8 caracteres"},{status:400});
  if(permissions.length===0)return NextResponse.json({error:"Seleccioná al menos un permiso"},{status:400});
  if(!Number.isInteger(officeId)||officeId<1)return NextResponse.json({error:"Seleccioná la oficina o Dirección del usuario."},{status:400});
  const sql=db(); const office=(await sql`SELECT id FROM offices WHERE id=${officeId} AND active=TRUE`)[0]; if(!office)return NextResponse.json({error:"Oficina inválida"},{status:400});
  const dup=await sql`SELECT id FROM app_users WHERE lower(email)=lower(${email}) LIMIT 1`;if(dup[0])return NextResponse.json({error:"Ya existe un usuario con ese correo"},{status:409});
  const hash=await bcrypt.hash(password,12),role=legacyRole(permissions);
  const row=(await sql`INSERT INTO app_users(email,password_hash,role,created_by,must_change_password,office_id,is_general_admin) VALUES(${email},${hash},${role},${s!.email},${forcePasswordChange},${officeId},FALSE) RETURNING id`)[0];
  for(const permission of permissions)await sql`INSERT INTO app_user_permissions(user_id,permission_code,granted_by) VALUES(${Number(row.id)},${permission},${s!.email}) ON CONFLICT DO NOTHING`;
  await writeAudit({actor:s!.email,action:"CREATE_APP_USER",entityType:"app_user",entityId:String(row.id),next:{email,permissions,officeId,mustChangePassword:forcePasswordChange}});
  return NextResponse.json({ok:true,id:row.id});
}

export async function PATCH(req:Request){
  await ensureV13Schema(); const s=await getAdminSession(); if(!s||!isGeneralAdmin(s))return NextResponse.json({error:"No autorizado"},{status:403});
  const b=await req.json().catch(()=>({})); const id=Number(b.id); if(!Number.isInteger(id))return NextResponse.json({error:"ID inválido"},{status:400});
  const sql=db(); const prev=(await sql`SELECT id,email,role,active,must_change_password,office_id,is_general_admin FROM app_users WHERE id=${id}`)[0];if(!prev)return NextResponse.json({error:"Usuario inexistente"},{status:404});
  const previousPermissions=(await sql`SELECT permission_code FROM app_user_permissions WHERE user_id=${id} ORDER BY permission_code`).map((r:any)=>String(r.permission_code));
  if(typeof b.active==="boolean")await sql`UPDATE app_users SET active=${b.active},updated_at=now() WHERE id=${id}`;
  if(b.password){const pwd=String(b.password);if(pwd.length<8)return NextResponse.json({error:"La contraseña debe tener al menos 8 caracteres"},{status:400});const hash=await bcrypt.hash(pwd,12);const force=b.forcePasswordChange!==false;await sql`UPDATE app_users SET password_hash=${hash},must_change_password=${force},updated_at=now() WHERE id=${id}`;}
  let newPermissions:string[]|undefined;
  if(Array.isArray(b.permissions)){newPermissions=normalizePermissions(b.permissions);if(newPermissions.length===0)return NextResponse.json({error:"El usuario debe conservar al menos un permiso. Si no debe ingresar, desactivalo."},{status:400});await sql`DELETE FROM app_user_permissions WHERE user_id=${id}`;for(const permission of newPermissions)await sql`INSERT INTO app_user_permissions(user_id,permission_code,granted_by) VALUES(${id},${permission},${s!.email})`;await sql`UPDATE app_users SET role=${legacyRole(newPermissions)},updated_at=now() WHERE id=${id}`;}
  if(b.officeId!==undefined){const officeId=Number(b.officeId);const office=(await sql`SELECT id FROM offices WHERE id=${officeId} AND active=TRUE`)[0];if(!office)return NextResponse.json({error:"Oficina inválida"},{status:400});await sql`UPDATE app_users SET office_id=${officeId},updated_at=now() WHERE id=${id}`;}
  await writeAudit({actor:s!.email,action:"UPDATE_APP_USER",entityType:"app_user",entityId:String(id),previous:{...prev,permissions:previousPermissions},next:{active:b.active,passwordReset:Boolean(b.password),permissions:newPermissions,officeId:b.officeId}});
  return NextResponse.json({ok:true});
}
