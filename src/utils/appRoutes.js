export const APP_BASE_PATH = "/app";

const APP_PAGES = new Set(["tree", "create", "settings", "mine", "discover"]);

export const getAppPageFromPath = (pathname = "") => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") return "tree";

  const page = segments[1];
  if (!page || page === "demo") return "tree";
  return APP_PAGES.has(page) ? page : "tree";
};

export const getAppPath = (page = "tree") => {
  if (!page || page === "tree") return APP_BASE_PATH;
  return `${APP_BASE_PATH}/${page}`;
};

export const getCreatePath = (authenticated) =>
  authenticated ? `${APP_BASE_PATH}/create` : "/register";
