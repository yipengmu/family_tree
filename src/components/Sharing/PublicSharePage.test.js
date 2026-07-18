import fs from "fs";
import path from "path";

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

  test("shows the seven-day limit to both publisher and viewer", () => {
    expect(pageSource).toContain("7 天后过期");
    expect(pageSource).not.toContain("formatShareExpiry(share.expiresAt)");
    expect(sharePageSource).toContain("固定有效 7 天");
    expect(sharePageSource).toContain(
      "有效至 ${formatShareExpiry(share.expiresAt)}",
    );
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
