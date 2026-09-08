import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

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
  return v.length>=8&&v.length<=1200?v:null;
}

/**
 * Normaliza el User-Agent quitando números de versión. Esto permite reconocer el
 * mismo navegador tras una actualización de Chrome/Android sin depender de una
 * coincidencia byte a byte. No se usa como identidad primaria: sólo como rescate
 * controlado cuando el agente ya validó QR + geocerca + PIN.
 */
function normalizedUserAgent(value:unknown){
  return String(value||"")
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+){1,5}\b/g,"#")
    .replace(/\b(?:build|wv)\/[a-z0-9._-]+/g,"version#")
    .replace(/\s+/g," ")
    .trim();
}

async function deviceIdentity(clientKey?:unknown,deviceSignature?:unknown,deviceRecoverySignature?:unknown){
  const h=await headers();
  const userAgent=h.get("user-agent")||null;
  const stable=validClientKey(clientKey);
  const sig=validSignature(deviceSignature);
  const recoverySig=validSignature(deviceRecoverySignature);
  const familyHash=sig?hashDevice(`family:${sig}`):null;
  const recoveryHash=recoverySig?hashDevice(`recovery:${recoverySig}`):null;
  if(stable){
    return {hash:hashDevice(`client:${stable}`),familyHash,recoveryHash,userAgent,source:"CLIENT" as const};
  }

  // Compatibility fallback when browser storage is unavailable.
  const store=await cookies();
  let raw=store.get(COOKIE)?.value;
  if(!raw){
    raw=randomUUID();
    store.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  }
  return {hash:hashDevice(`cookie:${raw}`),familyHash,recoveryHash,userAgent,source:"COOKIE" as const};
}

async function auditRecovery(employeeId:string,reason:string,previousHash:unknown,nextHash:string){
  try{
    await writeAudit({
      actor:`employee:${employeeId}`,
      action:"RECOVER_DEVICE_IDENTITY",
      entityType:"employee_device",
      entityId:employeeId,
      previous:{deviceHash:String(previousHash||"").slice(0,12)},
      next:{deviceHash:nextHash.slice(0,12)},
      reason
    });
  }catch{
    // La auditoría no debe bloquear una marcación válida.
  }
}

export async function checkDevice(employeeId:string,bindIfMissing:boolean,clientKey?:unknown,deviceSignature?:unknown,deviceRecoverySignature?:unknown){
  const sql=db();
  const dev=await deviceIdentity(clientKey,deviceSignature,deviceRecoverySignature);

  // El mismo identificador exacto no puede estar activo para dos agentes.
  const sameHash=await sql`SELECT id,employee_id,active FROM employee_devices WHERE device_hash=${dev.hash} LIMIT 1`;
  if(sameHash[0]&&String(sameHash[0].employee_id)!==employeeId&&sameHash[0].active){
    return {ok:false as const,reason:"DEVICE_USED_BY_OTHER"};
  }
  // IMPORTANTE: las huellas de familia/perfil NO son identificadores únicos.
  // Dos celulares del mismo modelo/configuración pueden compartirlas. Por eso
  // nunca se usan para bloquear a otro agente; sólo sirven para recuperar la
  // vinculación del MISMO agente cuando cambia su identificador local.

  const active=await sql`SELECT id,device_hash,device_family_hash,device_recovery_hash,user_agent FROM employee_devices WHERE employee_id=${employeeId} AND active=TRUE LIMIT 1`;
  if(active[0]&&String(active[0].device_hash)!==dev.hash){
    const previousHash=active[0].device_hash;

    // 1) Coincidencia estricta de la familia histórica.
    if(dev.familyHash && active[0].device_family_hash && String(active[0].device_family_hash)===dev.familyHash){
      await sql`UPDATE employee_devices SET device_hash=${dev.hash},device_recovery_hash=COALESCE(${dev.recoveryHash},device_recovery_hash),last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
      await auditRecovery(employeeId,"FAMILY_HASH_MATCH",previousHash,dev.hash);
      return {ok:true as const,boundNow:false,pendingBinding:false,recovered:true};
    }

    // 2) Coincidencia de perfil tolerante (pantalla física aproximada + plataforma + zona + táctil).
    if(dev.recoveryHash && active[0].device_recovery_hash && String(active[0].device_recovery_hash)===dev.recoveryHash){
      await sql`UPDATE employee_devices SET device_hash=${dev.hash},device_family_hash=COALESCE(${dev.familyHash},device_family_hash),last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
      await auditRecovery(employeeId,"RECOVERY_PROFILE_MATCH",previousHash,dev.hash);
      return {ok:true as const,boundNow:false,pendingBinding:false,recovered:true};
    }

    // 3) Migración/rescate de registros anteriores que todavía no poseen perfil tolerante.
    // Se exige que el navegador/OS normalizado coincida con el ya registrado.
    const currentUa=normalizedUserAgent(dev.userAgent);
    const previousUa=normalizedUserAgent(active[0].user_agent);
    const sameBrowserFamily=Boolean(currentUa && previousUa && currentUa===previousUa);
    if(dev.recoveryHash && !active[0].device_recovery_hash && sameBrowserFamily){
      await sql`UPDATE employee_devices SET device_hash=${dev.hash},device_family_hash=${dev.familyHash},device_recovery_hash=${dev.recoveryHash},last_seen_at=now(),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
      await auditRecovery(employeeId,"LEGACY_SAME_BROWSER_RECOVERY",previousHash,dev.hash);
      return {ok:true as const,boundNow:false,pendingBinding:false,migrated:true};
    }

    return {ok:false as const,reason:"OTHER_DEVICE_AUTHORIZED"};
  }

  if(!active[0]){
    if(!bindIfMissing)return {ok:true as const,boundNow:false,pendingBinding:true};
    if(sameHash[0]){
      await sql`UPDATE employee_devices SET employee_id=${employeeId},device_family_hash=${dev.familyHash},device_recovery_hash=${dev.recoveryHash},active=TRUE,revoked_at=NULL,last_seen_at=now(),user_agent=${dev.userAgent} WHERE id=${sameHash[0].id}`;
    }else{
      await sql`INSERT INTO employee_devices(employee_id,device_hash,device_family_hash,device_recovery_hash,user_agent) VALUES (${employeeId},${dev.hash},${dev.familyHash},${dev.recoveryHash},${dev.userAgent})`;
    }
    return {ok:true as const,boundNow:true,pendingBinding:false};
  }

  await sql`UPDATE employee_devices SET last_seen_at=now(),device_family_hash=COALESCE(device_family_hash,${dev.familyHash}),device_recovery_hash=COALESCE(device_recovery_hash,${dev.recoveryHash}),user_agent=COALESCE(${dev.userAgent},user_agent) WHERE id=${active[0].id}`;
  return {ok:true as const,boundNow:false,pendingBinding:false};
}
