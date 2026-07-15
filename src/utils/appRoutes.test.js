import { getAppPageFromPath, getAppPath, getCreatePath } from "./appRoutes.js";

describe("app route helpers", () => {
  test.each([
    ["/app", "tree"],
    ["/app/", "tree"],
    ["/app/demo", "tree"],
    ["/app/create", "create"],
    ["/app/settings", "settings"],
    ["/app/mine", "mine"],
    ["/app/unknown", "tree"],
  ])("maps %s to %s", (pathname, page) => {
    expect(getAppPageFromPath(pathname)).toBe(page);
  });

  it("builds canonical app paths", () => {
    expect(getAppPath("tree")).toBe("/app");
    expect(getAppPath("create")).toBe("/app/create");
  });

  it("keeps unauthenticated creation behind registration", () => {
    expect(getCreatePath(false)).toBe("/register");
    expect(getCreatePath(true)).toBe("/app/create");
  });
});
