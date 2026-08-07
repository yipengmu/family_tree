import fs from "fs";
import path from "path";

describe("person poster sharing defaults", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "SharePosterModal.js"),
    "utf8",
  );

  test("requires an explicit choice before sharing a protected person's stories", () => {
    expect(source).toContain(
      "const [includeStories, setIncludeStories] = useState(!sensitivePerson)",
    );
    expect(source).toContain("setIncludeStories(!sensitivePerson)");
  });
});
