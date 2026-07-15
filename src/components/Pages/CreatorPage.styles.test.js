import fs from "fs";
import path from "path";

describe("creator page mobile directory", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "CreatorPage.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "CreatorPage.css"),
    "utf8",
  );

  test("keeps the mobile creation navigation to one line", () => {
    const header = source.match(
      /<header className="mobile-creation-header">([\s\S]*?)<\/header>/,
    );

    expect(header).not.toBeNull();
    expect(header[1]).toContain("<strong>续家谱</strong>");
    expect(header[1]).not.toContain("内容自动保存在你的家谱空间");
    expect(source).not.toContain("<span>续家谱</span>");
    expect(stylesheet).not.toContain(".mobile-continue-heading > span");
  });

  test("replaces the mobile horizontal table with a searchable card list", () => {
    expect(source).toContain('className="mobile-family-directory"');
    expect(source).toContain('className="mobile-directory-menu"');
    expect(source).toContain('className="mobile-person-list"');
    expect(source).toContain('className="mobile-person-card"');
    expect(source).toContain("openMobilePersonEditor(person)");
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.family-data-card\s*\{[^}]*display:\s*none;/s,
    );
    expect(stylesheet).toMatch(
      /\.mobile-directory-head\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*112px;/s,
    );
  });

  test("offers a focused mobile form for modifying a person", () => {
    expect(source).toContain("onFinish={saveMobilePerson}");
    expect(source).toContain(
      'className="mobile-person-modal mobile-edit-person-modal"',
    );
    expect(source).toContain("修改后会直接保存到当前私密家谱");
  });
});
