import fs from "fs";
import path from "path";

describe("main content desktop header layout", () => {
  const component = fs.readFileSync(
    path.join(__dirname, "MainContent.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "MainContent.css"),
    "utf8",
  );

  test("keeps search next to the count on the desktop right edge", () => {
    expect(stylesheet).toMatch(
      /\.header-search \.family-search-bar\s*\{[^}]*justify-content:\s*flex-end;[^}]*gap:\s*18px;/s,
    );
    expect(stylesheet).toMatch(
      /\.header-search \.family-search-bar \.search-section\s*\{[^}]*flex:\s*0 0 auto;/s,
    );
  });

  test("lets the search field fill the available header space on mobile", () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.header-search \.family-search-bar \.search-section\s*\{[^}]*flex:\s*1 1 auto;/s,
    );
  });

  test("links the mobile brand identity to the official website", () => {
    expect(component).toContain('className="mobile-header-identity"');
    expect(component).toContain("to={OFFICIAL_SITE_PATH}");
    expect(component).toContain('aria-label="打开谱里产品官网"');
    expect(component).not.toContain('className="mobile-official-link"');
    expect(component).not.toContain("HomeOutlined");
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.mobile-header-identity\s*\{[^}]*display:\s*inline-flex;/s,
    );
  });
});
