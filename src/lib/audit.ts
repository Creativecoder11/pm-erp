import { AuditLog } from "@/models/AuditLog"
import type { AuditEntityType } from "@/types"

interface LogAuditParams {
  organizationId: string
  projectId?: string
  actorId: string
  action: string
  entityType: AuditEntityType
  entityId: string
  changes?: Record<string, { before: unknown; after: unknown }>
  ip?: string
}

export async function logAudit(params: LogAuditParams) {
  await AuditLog.create({
    organizationId: params.organizationId,
    projectId: params.projectId,
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    changes: params.changes ?? {},
    ip: params.ip,
  })
}

/**
 * Computes a shallow diff between two plain objects, returning only the
 * keys present in `after` whose values changed, in {before, after} form.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {}

  for (const key of Object.keys(after)) {
    const beforeVal = before[key]
    const afterVal = after[key]
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes[key] = { before: beforeVal, after: afterVal }
    }
  }

  return changes
}
