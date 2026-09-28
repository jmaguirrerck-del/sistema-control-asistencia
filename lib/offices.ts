import { db } from "@/lib/db";
import { getAdminSession, isGeneralAdmin } from "@/lib/auth";

export type OfficeScope = { officeId:number|null; general:boolean };

export async function officeScope(): Promise<OfficeScope|null> {
  const session=await getAdminSession();
  if(!session) return null;
  if(isGeneralAdmin(session)) return {officeId:null,general:true};
  return {officeId:session.officeId??null,general:false};
}

export function requestedOfficeId(url:string, scope:OfficeScope, fallback?:number|null){
  const u=new URL(url);
  const raw=u.searchParams.get("officeId");
  const requested=raw&&/^\d+$/.test(raw)?Number(raw):null;
  if(scope.general) return requested ?? fallback ?? null;
  return scope.officeId;
}

export async function officeExists(id:number){
  const sql=db();
  const row=(await sql`SELECT id FROM offices WHERE id=${id} AND active=TRUE LIMIT 1`)[0];
  return Boolean(row);
}

export async function canAccessEmployee(employeeId:string, officeId:number|null, general:boolean){
  if(general) return true;
  if(!officeId) return false;
  const sql=db();
  const row=(await sql`SELECT id FROM employees WHERE id=${employeeId} AND office_id=${officeId} LIMIT 1`)[0];
  return Boolean(row);
}
