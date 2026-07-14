import familyDataService from "./familyDataService.js";

describe("private family data loading", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test("does not turn a private tenant request failure into an empty genealogy", async () => {
    localStorage.setItem("token", "test-token");
    jest
      .spyOn(familyDataService, "loadFamilyDataFromServer")
      .mockRejectedValue(new Error("network unavailable"));

    await expect(
      familyDataService.loadDataWithFallback("tenant-private"),
    ).rejects.toThrow("network unavailable");
  });

  test("keeps a successful empty private genealogy as a valid first-use state", async () => {
    localStorage.setItem("token", "test-token");
    jest
      .spyOn(familyDataService, "loadFamilyDataFromServer")
      .mockResolvedValue([]);
    const fallback = jest.spyOn(familyDataService, "loadOriginalFamilyData");

    await expect(
      familyDataService.loadDataWithFallback("tenant-private"),
    ).resolves.toEqual([]);
    expect(fallback).not.toHaveBeenCalled();
  });
});
