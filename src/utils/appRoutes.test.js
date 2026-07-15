import {
  getAppPageFromPath,
  getAppPath,
  getCreatePath,
  getPersonIdFromPath,
  getPersonProfilePath,
} from "./appRoutes.js";

describe("app route helpers", () => {
  test.each([
    ["/app", "tree"],
    ["/app/", "tree"],
    ["/app/demo", "tree"],
    ["/app/create", "create"],
    ["/app/settings", "settings"],
    ["/app/mine", "mine"],
    ["/app/person/p-18", "person"],
    ["/app/unknown", "tree"],
  ])("maps %s to %s", (pathname, page) => {
    expect(getAppPageFromPath(pathname)).toBe(page);
  });

  it("builds canonical app paths", () => {
    expect(getAppPath("tree")).toBe("/app");
    expect(getAppPath("create")).toBe("/app/create");
  });

  it("keeps the marketing create path behind registration", () => {
    expect(getCreatePath(false)).toBe("/register");
    expect(getCreatePath(true)).toBe("/app/create");
  });

  it("builds and reads deep links for a person's private archive", () => {
    expect(getPersonProfilePath("p/18")).toBe("/app/person/p%2F18");
    expect(getPersonProfilePath("p/18", { capture: true })).toBe(
      "/app/person/p%2F18?capture=1",
    );
    expect(getPersonIdFromPath("/app/person/p%2F18")).toBe("p/18");
    expect(getPersonIdFromPath("/app/person/%E0%A4%A")).toBe("%E0%A4%A");
    expect(getPersonIdFromPath("/app/create")).toBeNull();
  });
});
