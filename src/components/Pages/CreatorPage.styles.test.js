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

  test("uses the bottom navigation instead of a duplicate mobile header", () => {
    expect(source).not.toContain('className="mobile-creation-header"');
    expect(source).not.toContain("ArrowLeftOutlined");
    expect(stylesheet).not.toContain(".mobile-creation-header");
  });

  test("replaces the mobile horizontal table with a searchable card list", () => {
    expect(source).toContain('className="mobile-family-directory"');
    expect(source).toContain('className="mobile-person-list"');
    expect(source).toContain('className="mobile-person-card"');
    expect(source).toContain("openMobilePersonEditor(person)");
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.family-data-card\s*\{[^}]*display:\s*none;/s,
    );
    expect(source).not.toContain('className="mobile-manage-link"');
    expect(source).toContain('className="mobile-family-directory"');
    expect(source).not.toContain("showMobileTable");
    expect(source).not.toContain("mobile-directory-toggle");
    expect(stylesheet).not.toContain(".mobile-directory-toggle");
    expect(stylesheet).not.toContain(".mobile-directory-summary");
    expect(stylesheet).not.toContain(".mobile-manage-link");
  });

  test("offers a focused mobile form for modifying a person", () => {
    expect(source).toContain("onFinish={saveMobilePerson}");
    expect(source).toContain(
      'className="mobile-person-modal mobile-edit-person-modal"',
    );
    expect(source).toContain("修改后会直接保存到当前私密家谱");
  });
});
