import { NextResponse } from "next/server";
import { getAdminSession, canManageAttendance, isGeneralAdmin } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { hashToken, newQrToken } from "@/lib/qr";
import { ensureV13Schema } from "@/lib/migrations";

export async function POST(request:Request){
  await ensureV13Schema(); const session=await getAdminSession(); if(!canManageAttendance(session))return NextResponse.json({error:"No autorizado"},{status:403});
  if(!(await isDatabaseReady()))return NextResponse.json({error:"Primero inicializá la base de datos"},{status:400});
  const body=await request.json().catch(()=>({})); const requested=Number(body.officeId); const officeId=isGeneralAdmin(session)&&(Number.isInteger(requested)&&requested>0)?requested:session!.officeId;
  if(!officeId)return NextResponse.json({error:"Seleccioná una oficina"},{status:400});
  const sql=db(); const settings=(await sql`SELECT o.name,c.latitude,c.longitude,c.qr_ttl_minutes FROM offices o JOIN office_configs c ON c.office_id=o.id WHERE o.id=${officeId} AND o.active=TRUE`)[0];
  if(!settings)return NextResponse.json({error:"Oficina inexistente o inactiva"},{status:404});
  if(settings.latitude==null||settings.longitude==null)return NextResponse.json({error:"Primero configurá la ubicación de la oficina"},{status:400});
  const ttl=Number(settings.qr_ttl_minutes||5),token=newQrToken(),tokenHash=hashToken(token);
  const rows=await sql`INSERT INTO qr_tokens(office_id,token_hash,expires_at) VALUES(${officeId},${tokenHash},now()+(${ttl}||' minutes')::interval) RETURNING expires_at`;
  await sql`DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 day'`;
  const origin=new URL(request.url).origin;
  return NextResponse.json({url:`${origin}/marcar?t=${encodeURIComponent(token)}`,expiresAt:rows[0].expires_at,officeId,officeName:String(settings.name)});
}
