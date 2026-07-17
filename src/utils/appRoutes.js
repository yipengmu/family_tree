export const APP_BASE_PATH = "/app";

const APP_PAGES = new Set([
  "tree",
  "create",
  "settings",
  "mine",
  "discover",
  "share",
]);

export const getAppPageFromPath = (pathname = "") => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") return "tree";

  const page = segments[1];
  if (!page || page === "demo") return "tree";
  if (page === "person" && segments[2]) {
    return segments[3] === "edit" ? "person-edit" : "person";
  }
  return APP_PAGES.has(page) ? page : "tree";
};

export const getAppPath = (page = "tree") => {
  if (!page || page === "tree") return APP_BASE_PATH;
  return `${APP_BASE_PATH}/${page}`;
};

export const getCreatePath = (authenticated) =>
  authenticated ? `${APP_BASE_PATH}/create` : "/register";

export const getPersonIdFromPath = (pathname = "") => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app" || segments[1] !== "person" || !segments[2]) {
    return null;
  }
  try {
    return decodeURIComponent(segments[2]);
  } catch {
    return segments[2];
  }
};

export const getPersonEditPath = (personId) => {
  if (personId === undefined || personId === null || String(personId) === "") {
    return APP_BASE_PATH;
  }
  return `${APP_BASE_PATH}/person/${encodeURIComponent(String(personId))}/edit`;
};

export const getPersonProfilePath = (personId, { capture = false } = {}) => {
  if (personId === undefined || personId === null || String(personId) === "") {
    return APP_BASE_PATH;
  }
  const path = `${APP_BASE_PATH}/person/${encodeURIComponent(String(personId))}`;
  return capture ? `${path}?capture=1` : path;
};
