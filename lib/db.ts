import { neon } from "@neondatabase/serverless";

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  return neon(url);
}

export async function isDatabaseReady() {
  try {
    const sql = db();
    const rows = await sql`SELECT to_regclass('public.employees') AS table_name`;
    return Boolean(rows[0]?.table_name);
  } catch {
    return false;
  }
}
