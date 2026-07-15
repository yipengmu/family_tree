import fs from "fs";
import path from "path";

describe("login account history", () => {
  const loginPageSource = fs.readFileSync(
    path.join(__dirname, "LoginPage.js"),
    "utf8",
  );

  test("remembers the account only inside the successful login branch", () => {
    expect(loginPageSource).toMatch(
      /if \(result\.success\) \{[\s\S]*?rememberLoginAccount\(result\.user\?\.email \|\| values\.email\)/,
    );
  });

  test("clears the password when a historical account is selected", () => {
    expect(loginPageSource).toContain(
      'form.setFieldsValue({ email: account, password: "" });',
    );
    expect(loginPageSource).toContain("onSelect={handleAccountSelect}");
  });

  test("tells users that passwords are never saved in account history", () => {
    expect(loginPageSource).toContain("仅保存邮箱，不保存密码");
  });
});
