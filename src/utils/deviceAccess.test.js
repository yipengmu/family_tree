import {
  getMobileAccessUrl,
  getMobileBrowserKind,
  isStandaloneDisplay,
  shouldOfferHomeShortcut,
} from "./deviceAccess.js";

describe("cross-device access helpers", () => {
  test("builds a public app URL with an attributable source", () => {
    expect(getMobileAccessUrl("https://tree.example.com")).toBe(
      "https://tree.example.com/app?from=desktop-qr",
    );
  });

  test("distinguishes iOS and WeChat instructions", () => {
    expect(getMobileBrowserKind("MicroMessenger iPhone")).toBe("wechat");
    expect(getMobileBrowserKind("Mobile Safari iPhone")).toBe("ios");
    expect(getMobileBrowserKind("Chrome Android")).toBe("other");
  });

  test("does not offer a shortcut when already running standalone", () => {
    const targetWindow = {
      navigator: {},
      matchMedia: (query) => ({
        matches:
          query === "(max-width: 768px)" ||
          query === "(display-mode: standalone)",
      }),
    };

    expect(isStandaloneDisplay(targetWindow)).toBe(true);
    expect(shouldOfferHomeShortcut(targetWindow)).toBe(false);
  });
});
