import { NextResponse } from "next/server";
import { db, isDatabaseReady } from "@/lib/db";
import { hashToken, newQrToken } from "@/lib/qr";
import { ensureV13Schema } from "@/lib/migrations";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  await ensureV13Schema(); if(!(await isDatabaseReady()))return NextResponse.json({error:"La base de datos todavía no está inicializada."},{status:400});
  const b=await request.json().catch(()=>({})); const officeId=Number(b.officeId||1); if(!Number.isInteger(officeId)||officeId<1)return NextResponse.json({error:"Oficina inválida"},{status:400});
  const sql=db(); const settings=(await sql`SELECT o.name,c.latitude,c.longitude,c.qr_ttl_minutes FROM offices o JOIN office_configs c ON c.office_id=o.id WHERE o.id=${officeId} AND o.active=TRUE`)[0];
  if(!settings)return NextResponse.json({error:"Oficina inexistente o inactiva."},{status:404}); if(settings.latitude==null||settings.longitude==null)return NextResponse.json({error:"La ubicación de esta oficina todavía no está configurada."},{status:400});
  const ttl=Math.max(1,Number(settings.qr_ttl_minutes||5)),token=newQrToken(),tokenHash=hashToken(token);
  const rows=await sql`INSERT INTO qr_tokens(office_id,token_hash,expires_at) VALUES(${officeId},${tokenHash},now()+(${ttl}||' minutes')::interval) RETURNING expires_at`;
  await sql`DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 day'`; const origin=new URL(request.url).origin;
  return NextResponse.json({url:`${origin}/marcar?t=${encodeURIComponent(token)}`,expiresAt:rows[0].expires_at,ttlMinutes:ttl,officeName:String(settings.name)},{headers:{"Cache-Control":"no-store"}});
}
