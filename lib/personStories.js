import { ApiAuthError, requireTenantRole } from './auth.js';

export const STORY_READ_ROLES = ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'];
export const STORY_WRITE_ROLES = ['OWNER', 'EDITOR', 'CONTRIBUTOR'];
export const VISIBILITIES = ['PRIVATE', 'FAMILY'];
export const DATE_PRECISIONS = ['EXACT', 'MONTH', 'YEAR', 'DECADE', 'APPROXIMATE', 'UNKNOWN'];

export function asJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function assertVisibility(value) {
  const normalized = String(value || 'FAMILY').toUpperCase();
  if (!VISIBILITIES.includes(normalized)) throw new ApiAuthError(400, '不支持的可见范围');
  return normalized;
}

export function assertDatePrecision(value) {
  const normalized = String(value || 'UNKNOWN').toUpperCase();
  return DATE_PRECISIONS.includes(normalized) ? normalized : 'UNKNOWN';
}

export function deriveSortYear(timeText) {
  const match = String(timeText || '').match(/(?:18|19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

export async function requirePerson(prisma, tenantId, personId) {
  const person = await prisma.familyData.findUnique({
    where: { tenant_id_person_id: { tenant_id: tenantId, person_id: String(personId) } },
  });
  if (!person) throw new ApiAuthError(404, '人物不存在');
  return person;
}

export async function requireStoryRead(prisma, userId, tenantId) {
  return requireTenantRole(prisma, userId, tenantId, STORY_READ_ROLES);
}

export async function requireStoryWrite(prisma, userId, tenantId) {
  return requireTenantRole(prisma, userId, tenantId, STORY_WRITE_ROLES);
}

export function canReadPrivate(record, userId) {
  return record.visibility !== 'PRIVATE' || Number(record.created_by) === Number(userId);
}

export function canMutateContribution(record, membership, userId) {
  return ['OWNER', 'EDITOR'].includes(membership.role) || Number(record.created_by) === Number(userId);
}

export function serializeAsset(asset) {
  return {
    id: asset.id,
    kind: asset.kind,
    originalName: asset.original_name,
    contentType: asset.content_type,
    fileSize: asset.file_size,
    durationSeconds: asset.duration_seconds,
    checksumSha256: asset.checksum_sha256,
    status: asset.status,
    createdAt: asset.created_at,
  };
}

export function serializeMemory(memory, { includeDrafts = false } = {}) {
  const jobs = (memory.aiJobs || []).map((job) => ({
    id: job.id,
    kind: job.kind,
    status: job.status,
    error: job.error_message,
    output: includeDrafts ? asJson(job.output_snapshot, null) : undefined,
    updatedAt: job.updated_at,
  }));
  return {
    id: memory.id,
    tenantId: memory.tenant_id,
    personId: memory.person_id,
    createdBy: memory.created_by,
    creatorName: memory.creator?.username || null,
    title: memory.title,
    rawText: memory.raw_text,
    correctedText: memory.corrected_text,
    transcriptRaw: memory.transcript_raw,
    transcriptDetails: includeDrafts ? asJson(memory.transcript_details, null) : undefined,
    visibility: memory.visibility,
    status: memory.status,
    assets: (memory.assets || []).filter((asset) => !asset.deleted_at).map(serializeAsset),
    jobs,
    publishedAt: memory.published_at,
    createdAt: memory.created_at,
    updatedAt: memory.updated_at,
  };
}

export function serializeEvent(event) {
  return {
    id: event.id,
    tenantId: event.tenant_id,
    personId: event.person_id,
    createdBy: event.created_by,
    creatorName: event.creator?.username || null,
    title: event.title,
    narrative: event.narrative,
    eventType: event.event_type,
    timeText: event.time_text,
    startDate: event.start_date,
    endDate: event.end_date,
    sortYear: event.sort_year,
    datePrecision: event.date_precision,
    location: event.location,
    isHighlight: event.is_highlight,
    visibility: event.visibility,
    status: event.status,
    sources: (event.sources || []).map((source) => ({
      memoryId: source.memory_id,
      sourceQuote: source.source_quote,
      startMs: source.start_ms,
      endMs: source.end_ms,
      assets: (source.memory?.assets || []).filter((asset) => !asset.deleted_at).map(serializeAsset),
    })),
    revisions: (event.revisions || []).map((revision) => ({
      id: revision.id,
      action: revision.action,
      actorUserId: revision.actor_user_id,
      actorName: revision.actor?.username || null,
      createdAt: revision.created_at,
    })),
    publishedAt: event.published_at,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

export async function createAuditLog(prisma, { tenantId, actorUserId, action, entityType, entityId, metadata }) {
  return prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      actor_user_id: Number(actorUserId),
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export function eventSnapshot(event) {
  return JSON.stringify({
    title: event.title,
    narrative: event.narrative,
    eventType: event.event_type,
    timeText: event.time_text,
    startDate: event.start_date,
    endDate: event.end_date,
    sortYear: event.sort_year,
    datePrecision: event.date_precision,
    location: event.location,
    isHighlight: event.is_highlight,
    visibility: event.visibility,
    status: event.status,
  });
}
