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

  test("keeps the brand at the start of the topbar and links it home", () => {
    expect(layoutSource).toMatch(
      /<header className="auth-topbar">[\s\S]*?<Link className="auth-brand" to="\/"/,
    );
    expect(layoutSource).toContain('aria-label="谱里官网首页"');
    expect(stylesheet).toContain(".auth-brand:focus-visible");
  });

  test("uses compact desktop spacing so the footer remains in view", () => {
    expect(stylesheet).toContain("padding: 30px 38px 24px;");
    expect(stylesheet).toContain(
      "@media (min-width: 901px) and (max-height: 760px)",
    );
  });
});
