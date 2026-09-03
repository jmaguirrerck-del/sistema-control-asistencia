import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db, isDatabaseReady } from "@/lib/db";
import { hashToken, newQrToken } from "@/lib/qr";

export async function POST(request:Request){
  const session=await getAdminSession(); if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  if(!(await isDatabaseReady()))return NextResponse.json({error:"Primero inicializá la base de datos"},{status:400});
  const sql=db(); const settings=await sql`SELECT latitude,longitude,qr_ttl_minutes FROM office_settings WHERE id=1`;
  if(settings[0]?.latitude==null||settings[0]?.longitude==null)return NextResponse.json({error:"Primero configurá la ubicación de la oficina"},{status:400});
  const ttl=Number(settings[0]?.qr_ttl_minutes||5); const token=newQrToken(); const tokenHash=hashToken(token);
  const rows=await sql`INSERT INTO qr_tokens(token_hash,expires_at) VALUES(${tokenHash},now()+(${ttl}||' minutes')::interval) RETURNING expires_at`;
  await sql`DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 day'`;
  const origin=new URL(request.url).origin;
  return NextResponse.json({url:`${origin}/marcar?t=${encodeURIComponent(token)}`,expiresAt:rows[0].expires_at});
}
