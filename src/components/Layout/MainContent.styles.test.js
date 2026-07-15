import fs from "fs";
import path from "path";

describe("main content desktop header layout", () => {
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
});
