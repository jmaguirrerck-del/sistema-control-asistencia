import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureV13Schema } from "@/lib/migrations";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  await ensureV13Schema();
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (String(body?.confirmation || "").trim().toUpperCase() !== "REINICIAR") {
    return NextResponse.json({ error: "Confirmación inválida. Escribí REINICIAR para continuar." }, { status: 400 });
  }

  const sql = db();

  const [attendanceDays, attendanceEvents, leaves, devices, qrTokens, audits] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM attendance_days`,
    sql`SELECT COUNT(*)::int AS count FROM attendance_events`,
    sql`SELECT COUNT(*)::int AS count FROM leave_records`,
    sql`SELECT COUNT(*)::int AS count FROM employee_devices`,
    sql`SELECT COUNT(*)::int AS count FROM qr_tokens`,
    sql`SELECT COUNT(*)::int AS count FROM audit_logs`,
  ]);

  const deleted = {
    attendanceDays: Number(attendanceDays[0]?.count || 0),
    attendanceEvents: Number(attendanceEvents[0]?.count || 0),
    leaveRecords: Number(leaves[0]?.count || 0),
    employeeDevices: Number(devices[0]?.count || 0),
    qrTokens: Number(qrTokens[0]?.count || 0),
    auditLogs: Number(audits[0]?.count || 0),
  };

  // Orden deliberado para respetar claves foráneas y conservar el padrón/configuración.
  await sql`DELETE FROM attendance_events`;
  await sql`DELETE FROM attendance_days`;
  await sql`DELETE FROM leave_records`;
  await sql`DELETE FROM employee_devices`;
  await sql`DELETE FROM qr_tokens`;
  await sql`DELETE FROM audit_logs`;

  // Registrar el propio reinicio después de limpiar la auditoría anterior.
  await writeAudit({
    actor: session.email,
    action: "RESET_OPERATIONAL_DATA",
    entityType: "system",
    entityId: "operational-data",
    previous: deleted,
    next: { operationalData: "cleared" },
    reason: "Reinicio de datos operativos desde Administración",
  });

  return NextResponse.json({
    ok: true,
    deleted,
    preserved: [
      "employees",
      "employee_schedules",
      "office_settings",
      "leave_types",
      "PINs y configuración de personal",
    ],
  });
}
