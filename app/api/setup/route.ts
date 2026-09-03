import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { initializeDatabase } from "@/lib/setup";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const result = await initializeDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al inicializar la base" }, { status: 500 });
  }
}
