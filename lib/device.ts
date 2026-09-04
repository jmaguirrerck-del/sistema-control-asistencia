import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "dge_device_id";
function hashDevice(value:string){
  const secret=process.env.AUTH_SECRET||"";
  return createHmac("sha256",secret).update(`device:${value}`).digest("hex");
}

function validClientKey(value:unknown){
  const v=String(value||"").trim();
  // Browser-generated UUID. Keep the bounds permissive for future migrations.
  return /^[A-Za-z0-9_-]{20,120}$/.test(v)?v:null;
}

async function deviceIdentity(clientKey?:unknown){
  const h=await headers();
  const userAgent=h.get("user-agent")||null;
  const stable=validClientKey(clientKey);
  if(stable){
    return {hash:hashDevice(`client:${stable}`),userAgent,source:"CLIENT" as const,cookieHash:null as string|null};
  }

  // Compatibility fallback for browsers where client storage is unavailable.
  const store=await cookies();
  let raw=store.get(COOKIE)?.value;
  if(!raw){
    raw=randomUUID();
    store.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  }
  return {hash:hashDevice(raw),userAgent,source:"COOKIE" as const,cookieHash:hashDevice(raw)};
}

export async function checkDevice(employeeId:string,bindIfMissing:boolean,clientKey?:unknown){
  const sql=db();
  const dev=await deviceIdentity(clientKey);
  const sameHash=await sql`SELECT id,employee_id,active FROM employee_devices WHERE device_hash=${dev.hash} LIMIT 1`;
  if(sameHash[0]&&String(sameHash[0].employee_id)!==employeeId&&sameHash[0].active){
    return {ok:false as const,reason:"DEVICE_USED_BY_OTHER"};
  }

  const active=await sql`SELECT id,device_hash,user_agent FROM employee_devices WHERE employee_id=${employeeId} AND active=TRUE LIMIT 1`;
  if(active[0]&&String(active[0].device_hash)!==dev.hash){
    // Seamless migration from the old cookie-based implementation when the old
    // cookie is still available in this same browser.
    if(dev.source==="CLIENT"){
      const store=await cookies();
      const raw=store.get(COOKIE)?.value;
      const legacyHash=raw?hashDevice(raw):null;
      if(legacyHash && String(active[0].device_hash)===legacyHash){
        await sql`UPDATE employee_devices SET device_hash=${dev.hash},last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
        return {ok:true as const,boundNow:false,pendingBinding:false,migrated:true};
      }
    }
    return {ok:false as const,reason:"OTHER_DEVICE_AUTHORIZED"};
  }

  if(!active[0]){
    if(!bindIfMissing)return {ok:true as const,boundNow:false,pendingBinding:true};
    if(sameHash[0]){
      await sql`UPDATE employee_devices SET employee_id=${employeeId},active=TRUE,revoked_at=NULL,last_seen_at=now(),user_agent=${dev.userAgent} WHERE id=${sameHash[0].id}`;
    }else{
      await sql`INSERT INTO employee_devices(employee_id,device_hash,user_agent) VALUES (${employeeId},${dev.hash},${dev.userAgent})`;
    }
    return {ok:true as const,boundNow:true,pendingBinding:false};
  }

  await sql`UPDATE employee_devices SET last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
  return {ok:true as const,boundNow:false,pendingBinding:false};
}
