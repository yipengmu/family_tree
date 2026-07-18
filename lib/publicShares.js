import crypto from "crypto";
import { getJwtSecret } from "./auth.js";

export const PUBLIC_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const asId = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === 0 ||
    value === "0"
  ) {
    return null;
  }
  return String(value);
};

const cleanName = (value) =>
  String(value || "姓名待考")
    .trim()
    .slice(0, 80) || "姓名待考";

const safeLifeStatus = (value) => {
  if (value === "alive") return "alive";
  if (value === "unknown") return "unknown";
  return null;
};

export function buildPublicFamilySnapshot({
  tenant,
  records = [],
  sourceVersion = 0,
}) {
  const people = records.map((person) => ({
    id: String(person.person_id),
    person_id: String(person.person_id),
    name: cleanName(person.name),
    g_rank: Number(person.g_rank) || 1,
    rank_index: Number(person.rank_index) || 0,
    g_father_id: asId(person.g_father_id),
    g_mother_id: asId(person.g_mother_id),
    sex: person.sex === "WOMAN" ? "WOMAN" : "MAN",
    dealth: safeLifeStatus(person.death_date),
    death_date: safeLifeStatus(person.death_date),
  }));
  const generations = new Set(people.map((person) => person.g_rank));
  const relationshipCount = people.reduce(
    (total, person) =>
      total +
      Number(Boolean(person.g_father_id)) +
      Number(Boolean(person.g_mother_id)),
    0,
  );

  return {
    version: 1,
    familyName:
      String(tenant?.name || "家谱")
        .trim()
        .slice(0, 50) || "家谱",
    sourceVersion: Number(sourceVersion) || 0,
    stats: {
      memberCount: people.length,
      generationCount: generations.size,
      relationshipCount,
    },
    people,
  };
}

export const createShareToken = () =>
  crypto.randomBytes(32).toString("base64url");

export const hashShareToken = (token) =>
  crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");

const encryptionKey = () =>
  crypto.createHash("sha256").update(getJwtSecret()).digest();

export function encryptShareToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(token), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptShareToken(value) {
  try {
    const [iv, tag, encrypted] = String(value || "")
      .split(".")
      .map((part) => Buffer.from(part, "base64url"));
    if (!iv?.length || !tag?.length || !encrypted?.length) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function getPublicShareStatus(share, now = new Date()) {
  if (!share || share.status === "REVOKED" || share.revoked_at)
    return "REVOKED";
  if (share.status === "EXPIRED" || new Date(share.expires_at) <= now)
    return "EXPIRED";
  return "ACTIVE";
}

export function getPublicAppUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").replace(
    /\/$/,
    "",
  );
  if (configured) return configured;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${req.headers.host}`;
}

export function serializeManagedShare(share, req) {
  if (!share) return null;
  const status = getPublicShareStatus(share);
  const token =
    status === "ACTIVE" ? decryptShareToken(share.token_encrypted) : null;
  return {
    id: share.id,
    status,
    createdAt: share.created_at,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    viewCount: share.view_count,
    lastViewedAt: share.last_viewed_at,
    sourceVersion: share.source_version,
    shareUrl: token
      ? `${getPublicAppUrl(req)}/s/${encodeURIComponent(token)}`
      : null,
  };
}

export function parsePublicSnapshot(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || !Array.isArray(parsed.people) || !parsed.stats) return null;
    return parsed;
  } catch {
    return null;
  }
}
