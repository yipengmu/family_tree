import fs from "fs";
import path from "path";

describe("app navigation guards", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  test("sends unauthenticated creation attempts to login with the create return path", () => {
    expect(appSource).toMatch(
      /if \(!isAuthenticated\(\) && menuKey === "create"\) \{[\s\S]*?navigate\("\/login"/,
    );
    expect(appSource).toContain('returnTo: "/app/create"');
    expect(appSource).toMatch(
      /if \(!isAuthenticated\(\) && currentPage === "create"\) \{[\s\S]*?navigate\("\/login"/,
    );
  });
});
