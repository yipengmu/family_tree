import fs from "fs";
import path from "path";

describe("family journey animation styles", () => {
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "FamilyTreePage.css"),
    "utf8",
  );
  const journeyPlayerStylesheet = fs.readFileSync(
    path.join(__dirname, "../FamilyJourneyPlayer.css"),
    "utf8",
  );

  test("does not animate the transform used by React Flow to position nodes", () => {
    expect(stylesheet).toContain(
      ".journey-active .react-flow__node.journey-node-entering .family-member-node",
    );
    expect(stylesheet).not.toMatch(
      /\.journey-active\s+\.react-flow__node\.journey-node-entering\s*\{[^}]*\banimation\s*:/s,
    );
    expect(stylesheet).not.toMatch(
      /\.journey-active\s+\.react-flow__node\s*\{[^}]*\btransition\s*:\s*transform/s,
    );
  });

  test("uses an opacity fade for journey generation changes", () => {
    expect(stylesheet).toMatch(
      /@keyframes\s+journey-node-reveal\s*\{[^}]*opacity:\s*0;[^}]*filter:\s*blur/s,
    );
    expect(stylesheet).not.toMatch(
      /@keyframes\s+journey-node-reveal\s*\{[^}]*transform\s*:/s,
    );
    expect(journeyPlayerStylesheet).toMatch(
      /@keyframes\s+journey-copy-change\s*\{[^}]*opacity:\s*0;[^}]*filter:\s*blur/s,
    );
    expect(journeyPlayerStylesheet).not.toMatch(
      /@keyframes\s+journey-copy-change\s*\{[^}]*transform\s*:/s,
    );
  });

  test("keeps the modern and completed journey cards in the green palette", () => {
    const modernStyles = journeyPlayerStylesheet.match(
      /\.family-journey-player\.era-modern\s*\{([\s\S]*?)\n\}/,
    );
    const completeStyles = journeyPlayerStylesheet.match(
      /\.family-journey-player\.era-complete\s*\{([\s\S]*?)\n\}/,
    );

    expect(modernStyles).not.toBeNull();
    expect(completeStyles).not.toBeNull();
    expect(modernStyles[1]).toContain("rgba(17, 82, 66, 0.97)");
    expect(completeStyles[1]).toContain("rgba(17, 72, 56, 0.96)");
    expect(modernStyles[1]).not.toContain("rgba(117, 57, 44, 0.97)");
    expect(completeStyles[1]).not.toContain("rgba(139, 58, 42, 0.96)");
  });

  test("gives the journey launcher a dedicated circular play affordance", () => {
    expect(journeyPlayerStylesheet).toContain(".journey-launcher-play {");
    expect(journeyPlayerStylesheet).toMatch(
      /\.journey-launcher-play\s*\{[^}]*border-radius:\s*50%/s,
    );
  });

  test("keeps the demo creation guide aligned to the tree viewport", () => {
    expect(stylesheet).toMatch(
      /\.demo-create-guide\s*\{[^}]*width:\s*100%;[^}]*margin:\s*0 0 12px/s,
    );
  });
});
