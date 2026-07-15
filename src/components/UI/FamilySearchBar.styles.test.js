import fs from "fs";
import path from "path";

describe("family search alignment", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "FamilySearchBar.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "FamilySearchBar.css"),
    "utf8",
  );

  test("centers the native input placeholder with the search control", () => {
    expect(source).toMatch(/<Input[\s\S]*placeholder=\{placeholder\}/);
    expect(stylesheet).toMatch(
      /\.search-section \.ant-select\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center/s,
    );
    expect(stylesheet).toMatch(
      /\.family-search-input input\.ant-input::placeholder\s*\{[^}]*line-height:\s*32px/s,
    );
  });
});
