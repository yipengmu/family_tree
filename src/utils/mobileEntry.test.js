import fs from "fs";
import path from "path";
import { OFFICIAL_SITE_PATH, shouldRedirectMobileHome } from "./mobileEntry.js";

describe("mobile homepage entry", () => {
  const routerSource = fs.readFileSync(
    path.join(__dirname, "..", "RouterApp.js"),
    "utf8",
  );

  test("redirects a mobile visit to the product app", () => {
    expect(shouldRedirectMobileHome("", true)).toBe(true);
    expect(shouldRedirectMobileHome("?campaign=family", true)).toBe(true);
  });

  test("keeps desktop visits on the official website", () => {
    expect(shouldRedirectMobileHome("", false)).toBe(false);
  });

  test("keeps the app website link on the official website", () => {
    expect(OFFICIAL_SITE_PATH).toBe("/?from=app");
    expect(shouldRedirectMobileHome("?from=app", true)).toBe(false);
    expect(shouldRedirectMobileHome("?from=app&campaign=family", true)).toBe(
      false,
    );
  });

  test("wires the mobile decision into the root route", () => {
    expect(routerSource).toContain("shouldRedirectMobileHome(location.search)");
    expect(routerSource).toContain('<Navigate to="/app" replace />');
    expect(routerSource).toContain(
      '<Route path="/" element={<HomeRoute />} />',
    );
  });
});
