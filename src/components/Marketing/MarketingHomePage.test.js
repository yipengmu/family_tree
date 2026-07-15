import fs from "fs";
import path from "path";

describe("marketing homepage creation entry", () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, "MarketingHomePage.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "MarketingHomePage.css"),
    "utf8",
  );

  test("opens registration or creation on the current device", () => {
    expect(pageSource).toMatch(
      /const beginCreate = \(source\) => \{[\s\S]*?navigate\(createPath, \{ state: createState \}\);/,
    );
    expect(pageSource).toContain('? "mobile"');
    expect(pageSource).toContain(': "desktop"');
  });

  test("opens the app home from the authenticated mobile sticky action", () => {
    expect(pageSource).toMatch(
      /const openMyFamily = \(source\) => \{[\s\S]*?navigate\(getAppPath\("tree"\), \{ state: appHomeState \}\);/,
    );
    expect(pageSource).toMatch(
      /onClick=\{\(\) =>\s+authenticated\s+\? openMyFamily\("mobile-sticky"\)\s+: beginCreate\("mobile-sticky"\)\s+\}/,
    );
  });

  test("does not render the cross-device QR creation dialog", () => {
    expect(pageSource).not.toContain("createPanelOpen");
    expect(pageSource).not.toContain("<QRCode");
    expect(stylesheet).not.toContain(".create-panel-backdrop");
  });

  test("gives login and create actions distinct accessible styles", () => {
    expect(pageSource).toContain('className="site-header-login"');
    expect(pageSource).toContain('className="site-header-create"');
    expect(stylesheet).toContain(".site-header-actions > a:focus-visible");
    expect(stylesheet).toContain(".site-header-actions > button:focus-visible");
  });

  test("shows an accessible card progress navigation for the compact page", () => {
    expect(pageSource).toContain("const pageSections = [");
    expect(pageSource).toContain('className="site-page-progress"');
    expect(pageSource).toContain('aria-label="页面阅读进度"');
    expect(pageSource).toContain('aria-current={isActive ? "location"');
    expect(pageSource).toContain("scrollIntoView");
    expect(stylesheet).toContain(".site-page-progress a.is-active");
    expect(stylesheet).toMatch(
      /@media \(max-width: 1080px\) \{[\s\S]*?\.site-page-progress \{[\s\S]*?display: none;/,
    );
  });
});
