import { createTypedRouter } from "../lib/apiRouter.js";

const routes = {
  manage: () => import("../lib/api-handlers/shares/manage.js"),
  public: () => import("../lib/api-handlers/shares/public.js"),
};

export default createTypedRouter(routes, {
  defaultType: "manage",
  notFoundMessage: "Share endpoint not found",
});

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
