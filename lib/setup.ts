import { db } from "@/lib/db";
import { seedEmployees } from "@/lib/seed-employees";

export async function initializeDatabase() {
  const sql = db();

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      dni TEXT NOT NULL UNIQUE,
      employment TEXT NOT NULL,
      raw_schedule TEXT,
      pin_hash TEXT,
      pin_lookup TEXT UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin_lookup TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_pin_lookup ON employees(pin_lookup) WHERE pin_lookup IS NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_schedules (
      id BIGSERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      UNIQUE(employee_id, weekday)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS office_settings (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      office_name TEXT NOT NULL DEFAULT 'Dirección de Gestión Escolar',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      radius_meters INTEGER NOT NULL DEFAULT 75,
      lateness_tolerance_minutes INTEGER NOT NULL DEFAULT 10,
      auto_close_grace_minutes INTEGER NOT NULL DEFAULT 60,
      qr_ttl_minutes INTEGER NOT NULL DEFAULT 5,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_days (
      id BIGSERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      work_date DATE NOT NULL,
      scheduled_start TIME NOT NULL,
      scheduled_end TIME NOT NULL,
      entry_at TIMESTAMPTZ,
      exit_at TIMESTAMPTZ,
      entry_latitude DOUBLE PRECISION,
      entry_longitude DOUBLE PRECISION,
      entry_accuracy DOUBLE PRECISION,
      entry_distance_meters DOUBLE PRECISION,
      exit_latitude DOUBLE PRECISION,
      exit_longitude DOUBLE PRECISION,
      exit_accuracy DOUBLE PRECISION,
      exit_distance_meters DOUBLE PRECISION,
      late_minutes INTEGER NOT NULL DEFAULT 0,
      early_minutes INTEGER NOT NULL DEFAULT 0,
      compensation_minutes INTEGER NOT NULL DEFAULT 0,
      pending_minutes INTEGER NOT NULL DEFAULT 0,
      exit_type TEXT CHECK (exit_type IN ('EMPLOYEE','AUTO','ADMIN')),
      auto_close_processed_at TIMESTAMPTZ,
      admin_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(employee_id, work_date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_events (
      id BIGSERIAL PRIMARY KEY,
      attendance_day_id BIGINT REFERENCES attendance_days(id) ON DELETE SET NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('ENTRY','EXIT','AUTO_EXIT','ADMIN_EDIT','REJECTED')),
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      accuracy DOUBLE PRECISION,
      distance_meters DOUBLE PRECISION,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave_records (
      id BIGSERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      leave_type TEXT NOT NULL CHECK (leave_type IN ('MEDICAL','ADMINISTRATIVE','VACATION','COMMISSION','AFFECTATION','FRANCO','OTHER')),
      date_from DATE NOT NULL,
      date_to DATE NOT NULL,
      observation TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (date_to >= date_from)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS qr_tokens (
      id BIGSERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      previous_value JSONB,
      new_value JSONB,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;


  await sql`
    CREATE TABLE IF NOT EXISTS employee_devices (
      id BIGSERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      device_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_one_active_device ON employee_devices(employee_id) WHERE active=TRUE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_employee_devices_employee ON employee_devices(employee_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_attendance_days_date ON attendance_days(work_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leave_records_dates ON leave_records(date_from, date_to)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON qr_tokens(expires_at)`;

  await sql`
    INSERT INTO office_settings(id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `;

  const employeePayload = JSON.stringify(
    seedEmployees.map((e) => ({
      id: e.id,
      last_name: e.lastName,
      first_name: e.firstName,
      dni: e.dni,
      employment: e.employment,
      raw_schedule: e.rawSchedule,
    }))
  );

  await sql`
    INSERT INTO employees(id, last_name, first_name, dni, employment, raw_schedule)
    SELECT x.id, x.last_name, x.first_name, x.dni, x.employment, x.raw_schedule
    FROM jsonb_to_recordset(${employeePayload}::jsonb)
      AS x(id text, last_name text, first_name text, dni text, employment text, raw_schedule text)
    ON CONFLICT (id) DO UPDATE SET
      last_name = EXCLUDED.last_name,
      first_name = EXCLUDED.first_name,
      dni = EXCLUDED.dni,
      employment = EXCLUDED.employment,
      raw_schedule = EXCLUDED.raw_schedule,
      updated_at = now()
  `;

  const schedulePayload = JSON.stringify(
    seedEmployees.flatMap((e) =>
      e.schedules.map((s) => ({
        employee_id: e.id,
        weekday: s.weekday,
        start_time: s.start,
        end_time: s.end,
      }))
    )
  );

  await sql`
    INSERT INTO employee_schedules(employee_id, weekday, start_time, end_time)
    SELECT x.employee_id, x.weekday, x.start_time::time, x.end_time::time
    FROM jsonb_to_recordset(${schedulePayload}::jsonb)
      AS x(employee_id text, weekday int, start_time text, end_time text)
    ON CONFLICT (employee_id, weekday) DO UPDATE SET
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time
  `;

  return { employees: seedEmployees.length };
}
