export const getAdaptiveTreeFitOptions = (nodeCount, isMobile) => {
  const visibleNodeCount = Math.max(0, Number(nodeCount) || 0);

  if (visibleNodeCount <= 4) {
    return {
      padding: isMobile ? 0.12 : 0.16,
      minZoom: isMobile ? 0.3 : 0.2,
      maxZoom: isMobile ? 0.9 : 1.05,
    };
  }

  if (visibleNodeCount <= 12) {
    return {
      padding: isMobile ? 0.1 : 0.16,
      minZoom: isMobile ? 0.3 : 0.2,
      maxZoom: isMobile ? 0.78 : 0.9,
    };
  }

  return {
    padding: isMobile ? 0.06 : 0.12,
    minZoom: isMobile ? 0.3 : 0.2,
    maxZoom: isMobile ? 0.62 : 0.76,
  };
};

export const getHorizontallyCenteredViewportX = ({
  bounds,
  viewportWidth,
  zoom,
}) => {
  const boundsX = Number(bounds?.x) || 0;
  const boundsWidth = Math.max(0, Number(bounds?.width) || 0);
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1;

  return (safeViewportWidth - boundsWidth * safeZoom) / 2 - boundsX * safeZoom;
};
