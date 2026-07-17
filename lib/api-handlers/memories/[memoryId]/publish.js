import prisma from "../../../prisma.js";
import { authenticateRequest, sendAuthError } from "../../../auth.js";
import {
  assertDatePrecision,
  assertVisibility,
  canMutateContribution,
  createAuditLog,
  deriveSortYear,
  eventSnapshot,
  requireStoryWrite,
} from "../../../personStories.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  try {
    const user = authenticateRequest(req);
    const memory = await prisma.memory.findUnique({
      where: { id: req.query.memoryId },
    });
    if (!memory || memory.deleted_at)
      return res.status(404).json({ success: false, error: "记忆不存在" });
    const membership = await requireStoryWrite(
      prisma,
      user.userId,
      memory.tenant_id,
    );
    if (!canMutateContribution(memory, membership, user.userId))
      return res.status(403).json({ success: false, error: "无权发布此记忆" });
    const submitted = req.body?.events;
    if (!Array.isArray(submitted) || !submitted.length || submitted.length > 30)
      return res
        .status(400)
        .json({ success: false, error: "请选择要发布的事件" });

    const events = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of submitted) {
        const title = String(item.title || "")
          .trim()
          .slice(0, 120);
        const narrative = String(item.narrative || "")
          .trim()
          .slice(0, 10000);
        if (!title || !narrative) throw new Error("每条事件都需要标题和正文");
        const allowedTagTypes = ["TOPIC", "PERSON", "PLACE", "TIME", "REVIEW"];
        const allowedTagSources = ["AI", "USER"];
        const event = await tx.event.create({
          data: {
            tenant_id: memory.tenant_id,
            person_id: memory.person_id,
            created_by: Number(user.userId),
            updated_by: Number(user.userId),
            title,
            narrative,
            event_type: String(item.eventType || "OTHER")
              .toUpperCase()
              .slice(0, 40),
            time_text: String(item.timeText || "").slice(0, 100) || null,
            sort_year: Number.isInteger(Number(item.sortYear))
              ? Number(item.sortYear)
              : deriveSortYear(item.timeText),
            date_precision: assertDatePrecision(item.datePrecision),
            location: String(item.location || "").slice(0, 200) || null,
            tags: JSON.stringify(
              (Array.isArray(item.tags) ? item.tags : [])
                .map((tag) =>
                  typeof tag === "string"
                    ? { label: tag, type: "TOPIC", source: "USER" }
                    : tag,
                )
                .filter((tag) => String(tag?.label || "").trim())
                .slice(0, 12)
                .map((tag) => ({
                  label: String(tag.label).trim().slice(0, 30),
                  type: allowedTagTypes.includes(String(tag.type).toUpperCase())
                    ? String(tag.type).toUpperCase()
                    : "TOPIC",
                  source: allowedTagSources.includes(
                    String(tag.source).toUpperCase(),
                  )
                    ? String(tag.source).toUpperCase()
                    : "USER",
                })),
            ),
            is_highlight: item.isHighlight === true,
            visibility: assertVisibility(item.visibility || memory.visibility),
            sources: {
              create: {
                memory_id: memory.id,
                source_quote:
                  String(item.sourceQuote || "").slice(0, 2000) || null,
              },
            },
          },
        });
        await tx.eventRevision.create({
          data: {
            event_id: event.id,
            actor_user_id: Number(user.userId),
            action: "PUBLISH",
            snapshot: eventSnapshot(event),
          },
        });
        created.push(event);
      }
      await tx.memory.update({
        where: { id: memory.id },
        data: { status: "PUBLISHED", published_at: new Date() },
      });
      return created;
    });
    await createAuditLog(prisma, {
      tenantId: memory.tenant_id,
      actorUserId: user.userId,
      action: "PUBLISH",
      entityType: "MEMORY",
      entityId: memory.id,
      metadata: { eventIds: events.map((event) => event.id) },
    });
    return res
      .status(201)
      .json({ success: true, eventIds: events.map((event) => event.id) });
  } catch (error) {
    console.error("发布人物纪事失败:", error);
    if (error.message === "每条事件都需要标题和正文")
      return res.status(400).json({ success: false, error: error.message });
    return sendAuthError(res, error);
  }
}
