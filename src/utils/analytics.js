import posthog from "posthog-js";

const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.REACT_APP_POSTHOG_HOST || "https://eu.i.posthog.com";

let posthogReady = false;

const SENSITIVE_KEYS =
  /email|name|phone|mobile|address|location|id_card|photo|image|content|text|story/i;

const sanitizeProperties = (properties = {}) =>
  Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        !SENSITIVE_KEYS.test(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    ),
  );

export const classifyAnalyticsError = (error) => {
  const message = String(error?.message || error || "").toLowerCase();
  if (/401|403|登录|令牌|权限|unauthor|forbidden/.test(message))
    return "unauthorized";
  if (/409|版本|冲突|conflict/.test(message)) return "conflict";
  if (/校验|填写|必填|格式|validation|invalid/.test(message))
    return "validation";
  if (/network|fetch|timeout|超时|网络|服务/.test(message)) return "network";
  return "unknown";
};

export const initAnalytics = () => {
  if (typeof window === "undefined" || !POSTHOG_KEY || posthogReady) return;
  // 公开分享链接携带 bearer token。该路由不初始化第三方分析，避免自动属性
  // 把完整 URL（包括 token）发送到 PostHog。
  if (/^\/s\/[^/]+/.test(window.location.pathname)) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false,
    disable_session_recording: true,
    respect_dnt: true,
    persistence: "localStorage",
  });

  posthogReady = true;

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      identifyUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("user");
    }
  }
};

export const identifyUser = (user) => {
  const userId = user?.id || user?.userId;
  if (!posthogReady || !userId) return;

  posthog.identify(String(userId), {
    role: user.role || "user",
  });
};

export const resetAnalyticsUser = () => {
  if (posthogReady) posthog.reset();
};

export const trackEvent = (name, detail = {}) => {
  if (typeof window === "undefined") return;

  const properties = sanitizeProperties(detail);
  const payload = {
    event: name,
    ...properties,
  };

  if (posthogReady) posthog.capture(name, properties);

  window.dispatchEvent(new CustomEvent("puli:analytics", { detail: payload }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }
};
