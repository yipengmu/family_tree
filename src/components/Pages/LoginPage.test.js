import fs from "fs";
import path from "path";

describe("login account history", () => {
  const loginPageSource = fs.readFileSync(
    path.join(__dirname, "LoginPage.js"),
    "utf8",
  );

  test("remembers the account only inside the successful login branch", () => {
    expect(loginPageSource).toMatch(
      /if \(result\.success\) \{[\s\S]*?if \(mode === "email"\) \{[\s\S]*?rememberLoginAccount\(account\)/,
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

  test("uses password login for both phone and email without a code field", () => {
    expect(loginPageSource).toContain('const account = mode === "phone"');
    expect(loginPageSource).toContain(
      "AuthService.login(account, values.password)",
    );
    expect(loginPageSource).not.toContain('name="phoneCode"');
    expect(loginPageSource).not.toContain("获取验证码");
    expect(loginPageSource).toContain("忘记密码？");
  });
});
