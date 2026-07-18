import prisma from "../../prisma.js";
import { hashShareToken, parsePublicSnapshot } from "../../publicShares.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const token = String(req.query?.token || "");
  if (!token || token.length > 128) {
    return res.status(410).json({ success: false, error: "分享链接已失效" });
  }

  try {
    const share = await prisma.publicShare.findUnique({
      where: { token_hash: hashShareToken(token) },
    });
    const now = new Date();
    if (!share || share.status !== "ACTIVE" || share.expires_at <= now) {
      if (share?.status === "ACTIVE" && share.expires_at <= now) {
        await prisma.publicShare.updateMany({
          where: { id: share.id, status: "ACTIVE" },
          data: { status: "EXPIRED" },
        });
      }
      return res.status(410).json({ success: false, error: "分享链接已失效" });
    }

    const snapshot = parsePublicSnapshot(share.snapshot);
    if (!snapshot)
      return res.status(410).json({ success: false, error: "分享内容不可用" });

    await prisma.publicShare.updateMany({
      where: { id: share.id, status: "ACTIVE" },
      data: { view_count: { increment: 1 }, last_viewed_at: now },
    });
    return res.json({
      success: true,
      share: { createdAt: share.created_at, expiresAt: share.expires_at },
      snapshot,
    });
  } catch (error) {
    console.error("读取公开家谱分享失败:", error?.message || error);
    return res
      .status(500)
      .json({ success: false, error: "分享内容暂时无法打开" });
  }
}
