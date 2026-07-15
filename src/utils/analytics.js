export const trackEvent = (name, detail = {}) => {
  if (typeof window === "undefined") return;

  const payload = {
    event: name,
    ...detail,
  };

  window.dispatchEvent(new CustomEvent("puli:analytics", { detail: payload }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }
};
