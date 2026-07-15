import fs from "fs";
import path from "path";

describe("family journey animation styles", () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, "FamilyTreePage.js"),
    "utf8",
  );
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

  test("places the expanded journey card on the desktop right edge", () => {
    expect(journeyPlayerStylesheet).toMatch(
      /\.family-journey-player\s*\{[^}]*right:\s*18px;[^}]*left:\s*auto;/s,
    );
    expect(journeyPlayerStylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.family-journey-player\s*\{[^}]*right:\s*9px;[^}]*left:\s*9px;/s,
    );
  });

  test("merges the demo creation guide into the compact context bar", () => {
    expect(stylesheet).toMatch(
      /\.family-context-bar\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s,
    );
    expect(stylesheet).toContain(".family-context-guide {");
    expect(pageSource).toContain('className="family-context-guide"');
    expect(pageSource).not.toContain('className="demo-create-guide"');
    expect(pageSource).not.toContain('className="privacy-badge"');
    expect(pageSource).toContain('className="create-family-btn-eyebrow"');
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.family-context-guide\s*\{[^}]*display:\s*none;/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.create-family-btn-eyebrow\s*\{[^}]*display:\s*block;/s,
    );
    expect(stylesheet).toMatch(
      /\.family-context-copy\s*\{[^}]*justify-self:\s*start;/s,
    );
  });

  test("keeps the family call to action on one consistent button style", () => {
    const actionClassMatches = pageSource.match(
      /className="create-family-btn"/g,
    );

    expect(actionClassMatches).toHaveLength(3);
    expect(stylesheet).toMatch(
      /\.family-context-actions \.create-family-btn\s*\{[^}]*height:\s*42px !important;[^}]*border-radius:\s*10px/s,
    );
    expect(stylesheet).toMatch(
      /\.family-context-actions\s*\{[^}]*grid-column:\s*4;/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*1200px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*?\.family-context-actions\s*\{[^}]*grid-column:\s*3;/s,
    );
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.family-context-actions\s*\{[^}]*grid-column:\s*2;/s,
    );
  });

  test("keeps the guided ancestor action only in the progress banner", () => {
    const contextActionStart = pageSource.indexOf(
      'className="family-context-actions"',
    );
    const contextActionEnd = pageSource.indexOf(
      "</section>",
      contextActionStart,
    );
    const contextActionSource = pageSource.slice(
      contextActionStart,
      contextActionEnd,
    );

    expect(pageSource).toContain("const showContextAction =");
    expect(contextActionSource).not.toContain(
      "paternalOnboarding.nextActionLabel",
    );
    expect(pageSource).toMatch(
      /className={`paternal-progress-banner[\s\S]*?paternalOnboarding\.nextActionLabel/,
    );
    expect(stylesheet).toContain(".family-context-bar--compact {");
  });

  test("styles the final panorama summary as a centered overlay", () => {
    const flowStylesheet = fs.readFileSync(
      path.join(__dirname, "../FamilyTreeFlow.css"),
      "utf8",
    );

    expect(flowStylesheet).toMatch(
      /\.journey-panorama-summary\s*\{[^}]*position:\s*absolute;[^}]*left:\s*50%;[^}]*transform:\s*translateX\(-50%\)/s,
    );
  });
});
