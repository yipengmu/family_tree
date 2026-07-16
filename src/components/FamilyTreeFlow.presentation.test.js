import fs from "fs";
import path from "path";

describe("family journey panorama framing", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "FamilyTreeFlow.js"),
    "utf8",
  );

  test("fits the completed panorama to all visible nodes", () => {
    expect(source).toMatch(
      /if \(presentationComplete\) \{[\s\S]*?getNodesBounds\(\s*nodes\.map[\s\S]*?getViewportForBounds/,
    );
    expect(source).not.toContain("mainlineNodes");
  });

  test("centers the completed panorama between the summary and player", () => {
    expect(source).toMatch(
      /const summaryRect =[\s\S]*?const playerRect =[\s\S]*?const availableCenter =/,
    );
    expect(source).toContain(".closest('.family-tree-wrapper')");
    expect(source).toMatch(
      /y: availableCenter - boundsCenterY \* fittedViewport\.zoom/,
    );
  });

  test("shows a compact data-backed summary only for the completed panorama", () => {
    expect(source).toMatch(
      /presentationComplete && panorama[\s\S]*?journey-panorama-summary/,
    );
    expect(source).toContain("称谓均沿用原谱记载");
  });

  test("keeps following the focused mainline while the journey is playing", () => {
    expect(source).toMatch(
      /const focusNode = nodes\.find\([\s\S]*?setCenter\(\s*centerX/,
    );
  });

  test("centers every journey step on its focused mainline node", () => {
    expect(source).toMatch(
      /const focusNode = nodes\.find\([\s\S]*?getViewportXForNodeCenter\([\s\S]*?nodeX: focusNode\.position\.x/,
    );
    expect(source).toMatch(
      /getViewportYForNodeCenter\([\s\S]*?nodeY: focusNode\.position\.y/,
    );
  });

  test("auto-fits a personal tree when its nodes or canvas size change", () => {
    expect(source).toContain("getAdaptiveTreeFitOptions");
    expect(source).toMatch(
      /fitPersonalTreeToCanvas[\s\S]*?reactFlow\.fitView\([\s\S]*?visibleNodeSignature/,
    );
    expect(source).toContain("new ResizeObserver");
  });
});
