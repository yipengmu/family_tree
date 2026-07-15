import fs from "fs";
import path from "path";

describe("family journey panorama framing", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "FamilyTreeFlow.js"),
    "utf8",
  );

  test("fits the completed panorama to all visible nodes", () => {
    const completedPanoramaBranch = source.match(
      /if \(presentationComplete\) \{([\s\S]*?)return;/,
    );

    expect(completedPanoramaBranch).not.toBeNull();
    expect(completedPanoramaBranch[1]).toMatch(/fitView\(\{\s*nodes,/);
    expect(completedPanoramaBranch[1]).not.toContain("mainlineNodes");
    expect(completedPanoramaBranch[1]).not.toContain("presentationPathIds");
  });

  test("keeps following the focused mainline while the journey is playing", () => {
    expect(source).toMatch(
      /const focusNode = nodes\.find\([\s\S]*?setCenter\(\s*focusNode\.position\.x/,
    );
  });
});
