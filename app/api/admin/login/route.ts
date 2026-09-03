import { NextResponse } from "next/server";
import { setAdminSession, validAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "");
  const password = String(body.password || "");
  if (!validAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }
  await setAdminSession(email);
  return NextResponse.json({ ok: true });
}
