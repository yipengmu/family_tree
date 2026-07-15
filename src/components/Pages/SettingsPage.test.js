import fs from "fs";
import path from "path";

describe("family settings page", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "SettingsPage.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "SettingsPage.css"),
    "utf8",
  );

  test("keeps only settings that are connected to real product behavior", () => {
    expect(source).toContain("字段隐私");
    expect(source).toContain("导出家谱数据");
    expect(source).toContain("本机缓存");
    expect(source).not.toContain("视图控制");
    expect(source).not.toContain("显示设置");
    expect(source).not.toContain("puli_settings_");
  });

  test("uses a dense desktop grid and preserves mobile cards", () => {
    expect(stylesheet).toMatch(
      /\.settings-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1\.4fr\)\s*minmax\(320px,\s*0\.85fr\)/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.settings-grid\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.settings-card\s*\{[^}]*border-radius:\s*11px;[^}]*box-shadow:\s*none/s,
    );
  });
});
