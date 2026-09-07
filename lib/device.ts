import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "dge_device_id";
function hashDevice(value:string){
  const secret=process.env.AUTH_SECRET||process.env.BETTER_AUTH_SECRET||"";
  return createHmac("sha256",secret).update(`device:${value}`).digest("hex");
}

function validClientKey(value:unknown){
  const v=String(value||"").trim();
  return /^[A-Za-z0-9_-]{20,160}$/.test(v)?v:null;
}

function validSignature(value:unknown){
  const v=String(value||"").trim();
  // Signature is generated from stable browser/device capabilities, not from a secret.
  return v.length>=20&&v.length<=1200?v:null;
}

async function deviceIdentity(clientKey?:unknown,deviceSignature?:unknown){
  const h=await headers();
  const userAgent=h.get("user-agent")||null;
  const stable=validClientKey(clientKey);
  const sig=validSignature(deviceSignature);
  const familyHash=sig?hashDevice(`family:${sig}`):null;
  if(stable){
    return {hash:hashDevice(`client:${stable}`),familyHash,userAgent,source:"CLIENT" as const};
  }

  // Compatibility fallback when browser storage is unavailable.
  const store=await cookies();
  let raw=store.get(COOKIE)?.value;
  if(!raw){
    raw=randomUUID();
    store.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  }
  return {hash:hashDevice(`cookie:${raw}`),familyHash,userAgent,source:"COOKIE" as const};
}

export async function checkDevice(employeeId:string,bindIfMissing:boolean,clientKey?:unknown,deviceSignature?:unknown){
  const sql=db();
  const dev=await deviceIdentity(clientKey,deviceSignature);

  // The same logical/physical device cannot be active for two different agents.
  const sameHash=await sql`SELECT id,employee_id,active FROM employee_devices WHERE device_hash=${dev.hash} LIMIT 1`;
  if(sameHash[0]&&String(sameHash[0].employee_id)!==employeeId&&sameHash[0].active){
    return {ok:false as const,reason:"DEVICE_USED_BY_OTHER"};
  }
  if(dev.familyHash){
    const sameFamily=await sql`SELECT id,employee_id,active FROM employee_devices WHERE device_family_hash=${dev.familyHash} AND active=TRUE LIMIT 1`;
    if(sameFamily[0]&&String(sameFamily[0].employee_id)!==employeeId){
      return {ok:false as const,reason:"DEVICE_USED_BY_OTHER"};
    }
  }

  const active=await sql`SELECT id,device_hash,device_family_hash,user_agent FROM employee_devices WHERE employee_id=${employeeId} AND active=TRUE LIMIT 1`;
  if(active[0]&&String(active[0].device_hash)!==dev.hash){
    // Preferred recovery: localStorage/cookie changed, but the stable device family is the same.
    if(dev.familyHash && active[0].device_family_hash && String(active[0].device_family_hash)===dev.familyHash){
      await sql`UPDATE employee_devices SET device_hash=${dev.hash},last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
      return {ok:true as const,boundNow:false,pendingBinding:false,recovered:true};
    }

    // One-time migration from versions <=1.16. Those rows do not have a family hash.
    // Identification still requires current QR + geofence + the employee's valid PIN.
    if(dev.familyHash && !active[0].device_family_hash){
      await sql`UPDATE employee_devices SET device_hash=${dev.hash},device_family_hash=${dev.familyHash},last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
      return {ok:true as const,boundNow:false,pendingBinding:false,migrated:true};
    }

    return {ok:false as const,reason:"OTHER_DEVICE_AUTHORIZED"};
  }

  if(!active[0]){
    if(!bindIfMissing)return {ok:true as const,boundNow:false,pendingBinding:true};
    if(sameHash[0]){
      await sql`UPDATE employee_devices SET employee_id=${employeeId},device_family_hash=${dev.familyHash},active=TRUE,revoked_at=NULL,last_seen_at=now(),user_agent=${dev.userAgent} WHERE id=${sameHash[0].id}`;
    }else{
      await sql`INSERT INTO employee_devices(employee_id,device_hash,device_family_hash,user_agent) VALUES (${employeeId},${dev.hash},${dev.familyHash},${dev.userAgent})`;
    }
    return {ok:true as const,boundNow:true,pendingBinding:false};
  }

  await sql`UPDATE employee_devices SET last_seen_at=now(),device_family_hash=COALESCE(device_family_hash,${dev.familyHash}),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
  return {ok:true as const,boundNow:false,pendingBinding:false};
}
