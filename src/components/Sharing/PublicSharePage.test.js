import fs from "fs";
import path from "path";
import { getPublicShareDestination } from "../../utils/shareNavigation.js";

describe("public share product boundary", () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, "PublicSharePage.js"),
    "utf8",
  );
  const sharePageSource = fs.readFileSync(
    path.join(__dirname, "FamilySharePage.js"),
    "utf8",
  );
  const analyticsSource = fs.readFileSync(
    path.join(__dirname, "../../utils/analytics.js"),
    "utf8",
  );

  test("opens the same public route for the owner and recipient", () => {
    expect(pageSource).toContain("7 天后过期");
    expect(pageSource).not.toContain("formatShareExpiry(share.expiresAt)");
    expect(sharePageSource).toContain("getPublicShareDestination");
    expect(sharePageSource).toContain(
      "navigate(destination, { replace: true })",
    );
    expect(sharePageSource).not.toContain("ShareOverview");
    expect(sharePageSource).not.toContain("renderFamilyPoster");
    expect(sharePageSource).not.toContain("图片分享");
  });

  test("resolves managed share URLs to the public route on the current host", () => {
    expect(
      getPublicShareDestination(
        "https://tree.tatababa.top/s/public-token",
        "https://tree.tatababa.top",
      ),
    ).toBe("/s/public-token");
    expect(
      getPublicShareDestination(
        "https://preview.tatababa.top/s/public-token",
        "https://tree.tatababa.top",
      ),
    ).toBe("https://preview.tatababa.top/s/public-token");
    expect(getPublicShareDestination("", "https://tree.tatababa.top")).toBe(
      null,
    );
  });

  test("keeps the privacy confirmation before publishing a new snapshot", () => {
    expect(sharePageSource).toContain("确认发布并查看");
    expect(sharePageSource).toContain(
      "我已确认上述人物姓名和关系适合通过限时链接分享",
    );
    expect(sharePageSource).toContain('currentTenant.role === "OWNER"');
  });

  test("keeps the public page focused on tree value and new-user activation", () => {
    expect(pageSource).toContain("家谱树状图");
    expect(pageSource).toContain("家谱保存的不只是姓名");
    expect(pageSource).toContain("免费创建我的家谱");
    expect(pageSource).not.toContain(
      "本页只展示分享人确认发布的家谱结构与摘要",
    );
    expect(pageSource).not.toContain('className="public-share-trust"');
  });

  test("does not initialize third-party analytics on bearer-token routes", () => {
    expect(analyticsSource).toContain("/^\\/s\\/[^/]+/");
    expect(analyticsSource).toContain("return;");
  });
});
