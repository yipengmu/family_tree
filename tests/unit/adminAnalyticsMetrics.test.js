const test = require("node:test");
const assert = require("node:assert/strict");

const event = (actor_id, name, minute, extra = {}) => ({
  actor_id,
  event: name,
  timestamp: `2026-07-01T00:${String(minute).padStart(2, "0")}:00.000Z`,
  date: "2026-07-01",
  ...extra,
});

test("BI funnel requires the same user to complete steps in order", async () => {
  const { buildBehaviorMetrics } = await import(
    "../../lib/api-handlers/admin/analytics.js"
  );
  const rows = [
    event("complete", "homepage_view", 0),
    event("complete", "app_create_open", 1),
    event("complete", "registration_complete", 3),
    event("complete", "family_created_success", 8),
    event("complete", "first_relationship_created", 9),
    event("complete", "fourth_generation_connected", 19),
    event("skips-create", "homepage_view", 0),
    event("skips-create", "registration_complete", 2),
  ];

  const metrics = buildBehaviorMetrics(rows, {
    from: "2026-07-01",
    to: "2026-07-01",
  });

  assert.deepEqual(
    metrics.funnel.map((step) => step.users),
    [2, 1, 1, 1, 1, 1],
  );
  assert.equal(metrics.funnel[1].stepRate, 50);
  assert.equal(metrics.funnel[3].medianMinutes, 5);
});

test("BI behavior metrics classify devices and mature quick-loss signals", async () => {
  const { buildBehaviorMetrics } = await import(
    "../../lib/api-handlers/admin/analytics.js"
  );
  const rows = [
    event("mobile-user", "app_view", 0, { device: "Mobile" }),
    event("desktop-user", "app_view", 1, { device: "Desktop" }),
    event("lost-user", "family_save_failed", 2, {
      stage: "activation",
      reason: "validation",
    }),
  ];

  const metrics = buildBehaviorMetrics(rows, {
    from: "2026-07-01",
    to: "2026-07-01",
  });

  assert.equal(
    metrics.devices.find((item) => item.device === "mobile").users,
    1,
  );
  assert.equal(
    metrics.devices.find((item) => item.device === "desktop").users,
    1,
  );
  assert.equal(metrics.friction[0].quickLossUsers, 1);
  assert.equal(metrics.friction[0].quickLossRate, 100);
});

test("BI creator identity masks email addresses", async () => {
  const { maskEmail } = await import(
    "../../lib/api-handlers/admin/analytics.js"
  );
  assert.equal(maskEmail("creator@example.com"), "cr*****@example.com");
  assert.equal(maskEmail(null), "");
});
