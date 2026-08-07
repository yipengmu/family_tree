import {
  DEMO_STORY_PERSON_ID,
  getDemoPersonStories,
} from "./demoPersonStories.js";

describe("public demo person stories", () => {
  test("only exposes the reviewed family story attached to the demo person", () => {
    const stories = getDemoPersonStories(DEMO_STORY_PERSON_ID);
    expect(stories).toHaveLength(3);
    expect(stories.every((story) => story.status === "PUBLISHED")).toBe(true);
    expect(stories.every((story) => story.sourceLabel)).toBe(true);
    expect(getDemoPersonStories("1")).toEqual([]);
  });
});
