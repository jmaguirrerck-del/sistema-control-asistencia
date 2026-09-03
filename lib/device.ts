import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "dge_device_id";
function hashDevice(value:string){const secret=process.env.AUTH_SECRET||"";return createHmac("sha256",secret).update(`device:${value}`).digest("hex");}

async function deviceIdentity(){
  const store=await cookies();let raw=store.get(COOKIE)?.value;let isNew=false;
  if(!raw){raw=randomUUID();isNew=true;store.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});}
  const h=await headers();return {hash:hashDevice(raw),userAgent:h.get("user-agent")||null,isNew};
}

export async function checkDevice(employeeId:string,bindIfMissing:boolean){
  const sql=db();const dev=await deviceIdentity();
  const sameHash=await sql`SELECT id,employee_id,active FROM employee_devices WHERE device_hash=${dev.hash} LIMIT 1`;
  if(sameHash[0]&&String(sameHash[0].employee_id)!==employeeId&&sameHash[0].active)return {ok:false as const,reason:"DEVICE_USED_BY_OTHER"};
  const active=await sql`SELECT id,device_hash FROM employee_devices WHERE employee_id=${employeeId} AND active=TRUE LIMIT 1`;
  if(active[0]&&String(active[0].device_hash)!==dev.hash)return {ok:false as const,reason:"OTHER_DEVICE_AUTHORIZED"};
  if(!active[0]){
    if(!bindIfMissing)return {ok:true as const,boundNow:false,pendingBinding:true};
    if(sameHash[0])await sql`UPDATE employee_devices SET employee_id=${employeeId},active=TRUE,revoked_at=NULL,last_seen_at=now(),user_agent=${dev.userAgent} WHERE id=${sameHash[0].id}`;
    else await sql`INSERT INTO employee_devices(employee_id,device_hash,user_agent) VALUES (${employeeId},${dev.hash},${dev.userAgent})`;
    return {ok:true as const,boundNow:true,pendingBinding:false};
  }
  await sql`UPDATE employee_devices SET last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
  return {ok:true as const,boundNow:false,pendingBinding:false};
}
