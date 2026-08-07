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
  const headerSource = fs.readFileSync(
    path.join(__dirname, "SharePageHeader.js"),
    "utf8",
  );
  const analyticsSource = fs.readFileSync(
    path.join(__dirname, "../../utils/analytics.js"),
    "utf8",
  );

  test("uses the public share layout for both the recipient and the owner", () => {
    expect(headerSource).toContain("7天内有效");
    expect(pageSource).not.toContain("formatShareExpiry(share.expiresAt)");
    expect(pageSource).toContain("SharePageHeader");
    expect(sharePageSource).toContain("SharePageHeader");
    expect(sharePageSource).toContain("ShareOverview");
    expect(sharePageSource).not.toContain("getPublicShareDestination");
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
    expect(sharePageSource).toContain("确认发布并复制链接");
    expect(sharePageSource).toContain(
      "我已确认上述人物姓名和关系适合通过限时链接分享",
    );
    expect(sharePageSource).toContain('currentTenant.role === "OWNER"');
    expect(sharePageSource).toContain("确认内容并生成链接");
    expect(headerSource).toContain("分享链接");
  });

  test("separates public achievement sharing from the named family link", () => {
    expect(sharePageSource).toContain("生成匿名成果图");
    expect(sharePageSource).toContain("familyAnonymized");
    expect(sharePageSource).toContain("全部人物姓名和家谱名称自动隐藏");
    expect(sharePageSource).toContain("限时给家人看家谱");
    expect(sharePageSource).toContain("share_link_revoked");
  });

  test("makes the viewer boundary and product value explicit", () => {
    expect(pageSource).toContain("你正在以查看者身份浏览");
    expect(pageSource).toContain("这里不会公开");
    expect(pageSource).toContain("你不能操作");
    expect(pageSource).toContain("一棵家谱，可以由一个人先开始");
    expect(pageSource).toContain("免费创建我的家谱");
    expect(pageSource).toContain("public_share_create_clicked");
  });

  test("does not initialize third-party analytics on bearer-token routes", () => {
    expect(analyticsSource).toContain("/^\\/s\\/[^/]+/");
    expect(analyticsSource).toContain("return;");
  });
});
