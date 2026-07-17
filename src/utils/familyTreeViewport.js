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

export const getCompactTreeNodeMetrics = (isMobile) => ({
  width: isMobile ? 152 : 160,
  gap: isMobile ? 12 : 16,
  height: 80,
  zoom: isMobile ? 0.72 : 1.0,
});

export const getViewportXForNodeCenter = ({
  nodeX,
  nodeWidth,
  viewportWidth,
  zoom,
}) => {
  const safeNodeX = Number(nodeX) || 0;
  const safeNodeWidth = Math.max(0, Number(nodeWidth) || 0);
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1;

  return safeViewportWidth / 2 - (safeNodeX + safeNodeWidth / 2) * safeZoom;
};

export const getViewportYForNodeCenter = ({
  nodeY,
  nodeHeight,
  viewportCenterY,
  zoom,
}) => {
  const safeNodeY = Number(nodeY) || 0;
  const safeNodeHeight = Math.max(0, Number(nodeHeight) || 0);
  const safeViewportCenterY = Number(viewportCenterY) || 0;
  const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1;

  return safeViewportCenterY - (safeNodeY + safeNodeHeight / 2) * safeZoom;
};
