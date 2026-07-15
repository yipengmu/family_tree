import fs from "fs";
import path from "path";

describe("family journey animation styles", () => {
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "FamilyTreePage.css"),
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
});
