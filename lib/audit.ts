import { db } from "@/lib/db";

export async function writeAudit(params: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  previous?: unknown;
  next?: unknown;
  reason?: string | null;
}) {
  const sql = db();
  await sql`
    INSERT INTO audit_logs(actor, action, entity_type, entity_id, previous_value, new_value, reason)
    VALUES (
      ${params.actor},
      ${params.action},
      ${params.entityType},
      ${params.entityId || null},
      ${params.previous ? JSON.stringify(params.previous) : null}::jsonb,
      ${params.next ? JSON.stringify(params.next) : null}::jsonb,
      ${params.reason || null}
    )
  `;
}
