export const OFFICIAL_SITE_PATH = "/?from=app";

export const isMobileViewport = () => {
  if (typeof window === "undefined") return false;

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  return window.innerWidth <= 768;
};

export const shouldRedirectMobileHome = (
  search = "",
  mobile = isMobileViewport(),
) => {
  const searchParams = new URLSearchParams(search);
  return mobile && searchParams.get("from") !== "app";
};
