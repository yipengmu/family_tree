export const getPublicShareDestination = (shareUrl, currentOrigin) => {
  if (!shareUrl) return null;
  try {
    const url = new URL(shareUrl, currentOrigin);
    if (url.origin === currentOrigin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.href;
  } catch {
    return null;
  }
};
