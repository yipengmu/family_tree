export function resolveDemoFamilyData(moduleValue) {
  let candidate = moduleValue;

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(candidate)) return candidate;
    if (!candidate || typeof candidate !== "object") break;
    candidate = candidate.default;
  }

  throw new TypeError("默认家谱数据模块未导出数组");
}

export async function loadDemoFamilyData() {
  const familyDataModule = await import("../src/data/familyData.js");
  return resolveDemoFamilyData(familyDataModule);
}
