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
});
