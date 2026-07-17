import {
  getAdaptiveTreeFitOptions,
  getCompactTreeNodeMetrics,
  getViewportXForNodeCenter,
  getViewportYForNodeCenter,
} from "./familyTreeViewport.js";

describe("family tree adaptive viewport", () => {
  test("lets a four-generation mobile tree use most of the canvas", () => {
    expect(getAdaptiveTreeFitOptions(4, true)).toEqual({
      padding: 0.12,
      minZoom: 0.3,
      maxZoom: 0.9,
    });
  });

  test("reduces the zoom cap as the visible tree grows", () => {
    const compactTree = getAdaptiveTreeFitOptions(4, true);
    const mediumTree = getAdaptiveTreeFitOptions(10, true);
    const largeTree = getAdaptiveTreeFitOptions(30, true);

    expect(compactTree.maxZoom).toBeGreaterThan(mediumTree.maxZoom);
    expect(mediumTree.maxZoom).toBeGreaterThan(largeTree.maxZoom);
  });

  test("keeps desktop framing slightly larger than mobile", () => {
    expect(getAdaptiveTreeFitOptions(3, false).maxZoom).toBeGreaterThan(
      getAdaptiveTreeFitOptions(3, true).maxZoom,
    );
  });

  test("keeps compact card width and layout spacing on one shared metric", () => {
    expect(getCompactTreeNodeMetrics(true)).toEqual({
      width: 152,
      gap: 12,
      height: 80,
      zoom: 0.62,
    });
    expect(getCompactTreeNodeMetrics(false).width).toBe(160);
  });

  test("centers a node whose layout starts at a positive x coordinate", () => {
    expect(
      getViewportXForNodeCenter({
        nodeX: 420,
        nodeWidth: 120,
        viewportWidth: 640,
        zoom: 0.35,
      }),
    ).toBe(152);
  });

  test("keeps a journey node above the bottom player safe area", () => {
    expect(
      getViewportYForNodeCenter({
        nodeY: 600,
        nodeHeight: 80,
        viewportCenterY: 360,
        zoom: 0.62,
      }),
    ).toBeCloseTo(-36.8);
  });
});
