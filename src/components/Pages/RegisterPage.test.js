import fs from "fs";
import path from "path";

describe("phone registration", () => {
  const registerPageSource = fs.readFileSync(
    path.join(__dirname, "RegisterPage.js"),
    "utf8",
  );

  test("keeps verification code and password setup inside registration", () => {
    expect(registerPageSource).toContain('name="phone"');
    expect(registerPageSource).toContain('name="code"');
    expect(registerPageSource).toContain('name="password"');
    expect(registerPageSource).toContain('name="confirmPassword"');
    expect(registerPageSource).toContain(
      'AuthService.sendPhoneCode(phone, "register")',
    );
    expect(registerPageSource).toContain("AuthService.registerPhone(");
  });

  test("offers email as an optional pending identity", () => {
    expect(registerPageSource).toContain('placeholder="邮箱（用于密码找回）"');
  });

  test("keeps primary action visually separated from the form fields", () => {
    expect(registerPageSource).toContain('className="auth-submit-item"');
  });
});
