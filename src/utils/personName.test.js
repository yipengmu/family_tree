import { getSurnameLabel } from "./personName.js";

describe("getSurnameLabel", () => {
  it("uses the first character for a common Chinese surname", () => {
    expect(getSurnameLabel("穆宗震")).toBe("穆");
  });

  it("keeps a recognized compound surname", () => {
    expect(getSurnameLabel("欧阳修")).toBe("欧阳");
  });

  it("provides a neutral fallback for an empty name", () => {
    expect(getSurnameLabel("  ")).toBe("家");
  });
});
