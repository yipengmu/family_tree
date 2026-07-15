const test = require("node:test");
const assert = require("node:assert/strict");

test("accepts only private import object keys from the current tenant", async () => {
  const { parseFamilyTreeImageSources } = await import(
    "../../lib/familyTreeImage.js"
  );
  assert.deepEqual(
    parseFamilyTreeImageSources(
      { images: [{ objectKey: "tenants/t-1/imports/page-1.jpg" }] },
      "t-1",
    ),
    [{ imageUrl: null, objectKey: "tenants/t-1/imports/page-1.jpg" }],
  );
  assert.throws(
    () =>
      parseFamilyTreeImageSources(
        { images: [{ objectKey: "tenants/t-2/imports/page-1.jpg" }] },
        "t-1",
      ),
    /不属于当前家谱空间/,
  );
});

test("keeps the legacy HTTPS input contract without accepting unsafe URLs", async () => {
  const { parseFamilyTreeImageSources } = await import(
    "../../lib/familyTreeImage.js"
  );
  assert.deepEqual(
    parseFamilyTreeImageSources(
      { imageUrls: ["https://example.com/page.jpg"] },
      "t-1",
    ),
    [{ imageUrl: "https://example.com/page.jpg", objectKey: null }],
  );
  assert.throws(
    () =>
      parseFamilyTreeImageSources(
        { imageUrls: ["http://127.0.0.1/private"] },
        "t-1",
      ),
    /地址无效/,
  );
});

test("remaps model-local relationship ids into stable page candidate ids", async () => {
  const { normalizeFamilyTreePeople } = await import(
    "../../lib/familyTreeImage.js"
  );
  const people = normalizeFamilyTreePeople(
    [
      { id: "father", name: "父", g_rank: 1 },
      {
        id: "child",
        name: "女",
        g_rank: 2,
        g_father_id: "father",
        sex: "女",
      },
    ],
    4,
  );

  assert.equal(people[0].id, 5);
  assert.equal(people[1].id, 6);
  assert.equal(people[1].g_father_id, 5);
  assert.equal(people[1].sex, "WOMAN");
});
