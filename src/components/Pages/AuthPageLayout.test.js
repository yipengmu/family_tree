import fs from "fs";
import path from "path";

describe("authentication page layout", () => {
  const layoutSource = fs.readFileSync(
    path.join(__dirname, "AuthPageLayout.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "AuthPageLayout.css"),
    "utf8",
  );

  test("loads its shared stylesheet without relying on the app workspace", () => {
    expect(layoutSource).toContain('import "./AuthPageLayout.css"');
  });

  test("uses a two-column desktop layout and a single-column compact layout", () => {
    expect(stylesheet).toMatch(
      /\.auth-shell\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(420px, 500px\)/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.auth-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s,
    );
  });

  test("keeps the website return action visibly styled and keyboard accessible", () => {
    expect(layoutSource).toContain('className="auth-back-button"');
    expect(layoutSource).toContain("aria-label={backLabel}");
    expect(stylesheet).toContain(".auth-back-button:focus-visible");
  });
});
