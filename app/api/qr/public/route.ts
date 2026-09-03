import { NextResponse } from "next/server";
import { db, isDatabaseReady } from "@/lib/db";
import { hashToken, newQrToken } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "La base de datos todavía no está inicializada." }, { status: 400 });
  }

  const sql = db();
  const settings = await sql`
    SELECT latitude, longitude, qr_ttl_minutes
    FROM office_settings
    WHERE id = 1
  `;

  if (settings[0]?.latitude == null || settings[0]?.longitude == null) {
    return NextResponse.json({ error: "La ubicación de la oficina todavía no está configurada." }, { status: 400 });
  }

  const ttl = Math.max(1, Number(settings[0]?.qr_ttl_minutes || 10));
  const token = newQrToken();
  const tokenHash = hashToken(token);

  const rows = await sql`
    INSERT INTO qr_tokens(token_hash, expires_at)
    VALUES(${tokenHash}, now() + (${ttl} || ' minutes')::interval)
    RETURNING expires_at
  `;

  await sql`DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 day'`;

  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      url: `${origin}/marcar?t=${encodeURIComponent(token)}`,
      expiresAt: rows[0].expires_at,
      ttlMinutes: ttl,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
