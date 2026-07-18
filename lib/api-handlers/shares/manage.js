import prisma from "../../prisma.js";
import {
  authenticateRequest,
  requireTenantRole,
  sendAuthError,
} from "../../auth.js";
import { getCurrentVersion } from "../../familyData.js";
import { createAuditLog } from "../../personStories.js";
import {
  PUBLIC_SHARE_TTL_MS,
  buildPublicFamilySnapshot,
  createShareToken,
  encryptShareToken,
  getPublicShareStatus,
  hashShareToken,
  serializeManagedShare,
} from "../../publicShares.js";

const requireOwner = async (req) => {
  const user = authenticateRequest(req);
  const tenantId = String(req.body?.tenantId || req.query?.tenantId || "");
  await requireTenantRole(prisma, user.userId, tenantId, ["OWNER"]);
  return { user, tenantId };
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { user, tenantId } = await requireOwner(req);
    const now = new Date();

    if (req.method === "GET") {
      let share = await prisma.publicShare.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: "desc" },
      });
      if (
        share?.status === "ACTIVE" &&
        getPublicShareStatus(share, now) === "EXPIRED"
      ) {
        share = await prisma.publicShare.update({
          where: { id: share.id },
          data: { status: "EXPIRED" },
        });
      }
      return res.json({
        success: true,
        share: serializeManagedShare(share, req),
      });
    }

    if (req.method === "POST") {
      const refresh = req.body?.refresh === true;
      let active = await prisma.publicShare.findFirst({
        where: { tenant_id: tenantId, status: "ACTIVE" },
        orderBy: { created_at: "desc" },
      });
      if (
        active &&
        getPublicShareStatus(active, now) === "ACTIVE" &&
        !refresh
      ) {
        const serialized = serializeManagedShare(active, req);
        if (serialized.shareUrl)
          return res.json({ success: true, share: serialized, reused: true });
      }

      const [tenant, records, sourceVersion] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true },
        }),
        prisma.familyData.findMany({
          where: { tenant_id: tenantId },
          orderBy: [{ g_rank: "asc" }, { rank_index: "asc" }],
        }),
        getCurrentVersion(prisma, tenantId),
      ]);
      if (!tenant)
        return res.status(404).json({ success: false, error: "家谱不存在" });
      if (!records.length)
        return res
          .status(400)
          .json({ success: false, error: "请先添加家谱人物再分享" });

      const token = createShareToken();
      const expiresAt = new Date(now.getTime() + PUBLIC_SHARE_TTL_MS);
      const snapshot = buildPublicFamilySnapshot({
        tenant,
        records,
        sourceVersion,
      });
      const share = await prisma.$transaction(async (tx) => {
        await tx.publicShare.updateMany({
          where: { tenant_id: tenantId, status: "ACTIVE" },
          data: { status: "REVOKED", revoked_at: now },
        });
        return tx.publicShare.create({
          data: {
            tenant_id: tenantId,
            created_by: Number(user.userId),
            token_hash: hashShareToken(token),
            token_encrypted: encryptShareToken(token),
            snapshot: JSON.stringify(snapshot),
            source_version: sourceVersion,
            expires_at: expiresAt,
          },
        });
      });
      await createAuditLog(prisma, {
        tenantId,
        actorUserId: user.userId,
        action: refresh ? "REFRESH" : "CREATE",
        entityType: "PUBLIC_SHARE",
        entityId: share.id,
        metadata: { expiresAt: expiresAt.toISOString(), sourceVersion },
      });
      return res
        .status(201)
        .json({
          success: true,
          share: serializeManagedShare(share, req),
          reused: false,
        });
    }

    if (req.method === "DELETE") {
      const shareId = String(req.query?.shareId || req.body?.shareId || "");
      const share = await prisma.publicShare.findFirst({
        where: { id: shareId, tenant_id: tenantId },
      });
      if (!share)
        return res
          .status(404)
          .json({ success: false, error: "分享链接不存在" });
      const revoked =
        share.status === "ACTIVE"
          ? await prisma.publicShare.update({
              where: { id: share.id },
              data: { status: "REVOKED", revoked_at: now },
            })
          : share;
      await createAuditLog(prisma, {
        tenantId,
        actorUserId: user.userId,
        action: "REVOKE",
        entityType: "PUBLIC_SHARE",
        entityId: share.id,
      });
      return res.json({
        success: true,
        share: serializeManagedShare(revoked, req),
      });
    }

    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("在线家谱分享管理失败:", error?.message || error);
    return sendAuthError(res, error);
  }
}
