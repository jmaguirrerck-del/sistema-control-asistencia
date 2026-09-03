import { db } from "@/lib/db";
let migrated=false;
export async function ensureV13Schema(){
  if(migrated)return;
  const sql=db();
  await sql`CREATE TABLE IF NOT EXISTS employee_devices (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    device_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_one_active_device ON employee_devices(employee_id) WHERE active=TRUE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_employee_devices_employee ON employee_devices(employee_id)`;
  migrated=true;
}
