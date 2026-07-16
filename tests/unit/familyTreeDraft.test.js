const test = require("node:test");
const assert = require("node:assert/strict");

test("normalizes a connected image draft into top-down generations", async () => {
  const { validateFamilyTreeDraft } = await import(
    "../../lib/familyTreeImage.js"
  );
  const people = validateFamilyTreeDraft([
    { id: "ancestor", name: "始祖" },
    { id: "child", name: "儿子", g_father_id: "ancestor" },
    { id: "grandchild", name: "孙子", g_father_id: "child" },
  ]);
  assert.deepEqual(
    people.map((person) => person.g_rank),
    [1, 2, 3],
  );
  assert.equal(people[2].g_father_id, 2);
});

test("rejects disconnected image drafts instead of silently creating multiple trees", async () => {
  const { validateFamilyTreeDraft } = await import(
    "../../lib/familyTreeImage.js"
  );
  assert.throws(
    () =>
      validateFamilyTreeDraft([
        { id: "a", name: "甲" },
        { id: "b", name: "乙" },
      ]),
    /同一棵连续家谱/,
  );
});

test("rejects cyclic image drafts", async () => {
  const { validateFamilyTreeDraft } = await import(
    "../../lib/familyTreeImage.js"
  );
  assert.throws(
    () =>
      validateFamilyTreeDraft([
        { id: "a", name: "甲", g_father_id: "b" },
        { id: "b", name: "乙", g_father_id: "a" },
      ]),
    /唯一的最上层祖先/,
  );
});

test("rejects repeated model-local ids", async () => {
  const { validateFamilyTreeDraft } = await import(
    "../../lib/familyTreeImage.js"
  );
  assert.throws(
    () =>
      validateFamilyTreeDraft([
        { id: "same", name: "甲" },
        { id: "same", name: "乙", g_father_id: "same" },
      ]),
    /重复的人物编号/,
  );
});
