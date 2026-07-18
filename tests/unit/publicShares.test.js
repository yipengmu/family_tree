const test = require("node:test");
const assert = require("node:assert/strict");

test("public family snapshots keep names and topology but exclude private profile fields", async () => {
  const { buildPublicFamilySnapshot } = await import(
    "../../lib/publicShares.js"
  );
  const snapshot = buildPublicFamilySnapshot({
    tenant: { name: "测试家谱" },
    sourceVersion: 4,
    records: [
      {
        person_id: "1",
        name: "测试本人",
        g_rank: 1,
        rank_index: 1,
        sex: "MAN",
        death_date: "alive",
        birth_date: "2015-01-01",
        location: "不应公开",
        summary: "不应公开的人物志摘要",
        face_img: "private.jpg",
      },
      {
        person_id: "2",
        name: "测试孩子",
        g_rank: 2,
        rank_index: 1,
        g_father_id: "1",
        sex: "WOMAN",
        death_date: "unknown",
        id_card: "secret",
      },
    ],
  });

  assert.equal(snapshot.familyName, "测试家谱");
  assert.equal(snapshot.people[0].name, "测试本人");
  assert.equal(snapshot.people[1].name, "测试孩子");
  assert.equal(snapshot.people[1].g_father_id, "1");
  assert.equal(snapshot.people[0].death_date, "alive");
  assert.equal(snapshot.stats.memberCount, 2);
  assert.equal(snapshot.stats.generationCount, 2);
  assert.equal(snapshot.stats.relationshipCount, 1);
  assert.equal("birth_date" in snapshot.people[0], false);
  assert.equal("location" in snapshot.people[0], false);
  assert.equal("summary" in snapshot.people[0], false);
  assert.equal("face_img" in snapshot.people[0], false);
  assert.equal("id_card" in snapshot.people[1], false);
});

test("share tokens can be managed without storing the raw token", async () => {
  const {
    createShareToken,
    decryptShareToken,
    encryptShareToken,
    hashShareToken,
  } = await import("../../lib/publicShares.js");
  const token = createShareToken();
  const encrypted = encryptShareToken(token);
  assert.equal(token.length >= 40, true);
  assert.equal(encrypted.includes(token), false);
  assert.equal(decryptShareToken(encrypted), token);
  assert.match(hashShareToken(token), /^[a-f0-9]{64}$/);
});

test("public shares expire at the seven-day boundary", async () => {
  const { getPublicShareStatus, PUBLIC_SHARE_TTL_MS } = await import(
    "../../lib/publicShares.js"
  );
  assert.equal(PUBLIC_SHARE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date("2026-07-25T00:00:00.000Z");
  const share = { status: "ACTIVE", expires_at: expiresAt, revoked_at: null };
  assert.equal(
    getPublicShareStatus(share, new Date("2026-07-24T23:59:59.999Z")),
    "ACTIVE",
  );
  assert.equal(getPublicShareStatus(share, expiresAt), "EXPIRED");
});
