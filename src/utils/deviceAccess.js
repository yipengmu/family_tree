export const MOBILE_ACCESS_SOURCE = "desktop-qr";
export const HOME_SHORTCUT_OPEN_EVENT = "puli:open-home-shortcut";
export const HOME_SHORTCUT_SEEN_KEY = "puli:home-shortcut-seen:v1";

export const getMobileAccessUrl = (origin = window.location.origin) => {
  const url = new URL("/app", origin);
  url.searchParams.set("from", MOBILE_ACCESS_SOURCE);
  return url.toString();
};

export const isStandaloneDisplay = (targetWindow = window) =>
  Boolean(
    targetWindow.matchMedia?.("(display-mode: standalone)").matches ||
      targetWindow.navigator?.standalone,
  );

export const getMobileBrowserKind = (userAgent = navigator.userAgent) => {
  if (/MicroMessenger/i.test(userAgent)) return "wechat";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "other";
};

export const shouldOfferHomeShortcut = (targetWindow = window) =>
  targetWindow.matchMedia?.("(max-width: 768px)").matches &&
  !isStandaloneDisplay(targetWindow);
