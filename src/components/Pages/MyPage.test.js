import fs from "fs";
import path from "path";

describe("guest my page entry points", () => {
  const pageSource = fs.readFileSync(path.join(__dirname, "MyPage.js"), "utf8");

  test("puts login first and labels creation as registration", () => {
    const loginIndex = pageSource.indexOf(">\n                立即登录");
    const registerIndex = pageSource.indexOf(
      ">\n                注册并创建家谱",
    );

    expect(loginIndex).toBeGreaterThan(-1);
    expect(registerIndex).toBeGreaterThan(loginIndex);
    expect(pageSource).toContain("新用户将进入注册流程");
  });
});
