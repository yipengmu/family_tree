import {
  getAdaptiveTreeFitOptions,
  getHorizontallyCenteredViewportX,
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

  test("centers a demo tree whose layout starts at a positive x coordinate", () => {
    expect(
      getHorizontallyCenteredViewportX({
        bounds: { x: 420, width: 860 },
        viewportWidth: 640,
        zoom: 0.35,
      }),
    ).toBe(22.5);
  });
});
