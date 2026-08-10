const test = require("node:test");
const assert = require("node:assert/strict");

test("resolves demo data from native and bundled module shapes", async () => {
  const { resolveDemoFamilyData } = await import(
    "../../lib/demoFamilyData.js"
  );
  const familyData = [{ id: 1 }];

  assert.equal(resolveDemoFamilyData(familyData), familyData);
  assert.equal(resolveDemoFamilyData({ default: familyData }), familyData);
  assert.equal(
    resolveDemoFamilyData({ default: { default: familyData } }),
    familyData,
  );
});

test("rejects an invalid demo data module instead of returning undefined counts", async () => {
  const { resolveDemoFamilyData } = await import(
    "../../lib/demoFamilyData.js"
  );

  assert.throws(
    () => resolveDemoFamilyData({ default: {} }),
    /默认家谱数据模块未导出数组/,
  );
});

test("loads all records from the checked-in demo genealogy", async () => {
  const { loadDemoFamilyData } = await import("../../lib/demoFamilyData.js");
  const familyData = await loadDemoFamilyData();

  assert.ok(Array.isArray(familyData));
  assert.equal(familyData.length, 624);
});
