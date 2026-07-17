import fs from "fs";
import path from "path";

describe("login account history", () => {
  const loginPageSource = fs.readFileSync(
    path.join(__dirname, "LoginPage.js"),
    "utf8",
  );

  test("remembers the account for the active login mode inside the successful login branch", () => {
    expect(loginPageSource).toMatch(
      /const accountValue =[\s\S]*?mode === "phone" \? values\.phone : result\.user\?\.email \|\| values\.email/,
    );
    expect(loginPageSource).toMatch(
      /rememberLoginAccount\(accountValue, mode\)/,
    );
  });

  test("clears the password and fills the active mode field when a historical account is selected", () => {
    expect(loginPageSource).toContain(
      'form.setFieldsValue({ [mode]: account, password: "" });',
    );
    expect(loginPageSource).toContain("onSelect={handleAccountSelect}");
  });

  test("renders history dropdowns for both phone and email modes", () => {
    expect(loginPageSource).toContain('name="phone"');
    expect(loginPageSource).toContain('name="email"');
    const autoCompleteCount = (loginPageSource.match(/<AutoComplete/g) || [])
      .length;
    expect(autoCompleteCount).toBeGreaterThanOrEqual(2);
    expect(loginPageSource).toContain("getLoginAccountHistory(mode)");
  });

  test("uses password login for both phone and email accounts", () => {
    expect(loginPageSource).toContain("onFinish={handleLogin}");
    expect(loginPageSource).toContain(
      'const account = mode === "phone" ? values.phone : values.email;',
    );
    expect(loginPageSource).toContain(
      "AuthService.login(account, values.password)",
    );
    expect(loginPageSource).toContain('name="password"');
    expect(loginPageSource).not.toContain('name="phoneCode"');
    expect(loginPageSource).not.toContain("获取验证码");
  });

  test("shows password reset from both login modes", () => {
    expect(loginPageSource).toContain('className="login-secondary-action"');
    expect(loginPageSource).toContain('className="login-forgot-link"');
    expect(loginPageSource).toContain("找回密码");
  });
});
