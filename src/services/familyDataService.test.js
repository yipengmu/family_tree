import familyDataService, {
  FAMILY_DATA_REQUEST_TIMEOUT_MS,
} from "./familyDataService.js";

const originalFetch = global.fetch;

describe("private family data loading", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    familyDataService.clearAllCache();
    localStorage.clear();
    global.fetch = originalFetch;
  });

  test("allows enough time for a cold database connection", async () => {
    localStorage.setItem("token", "test-token");
    global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }));
    jest.useFakeTimers();

    const request = familyDataService.loadFamilyDataFromServer("tenant-private");
    jest.advanceTimersByTime(FAMILY_DATA_REQUEST_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(false);

    jest.advanceTimersByTime(1);
    await expect(request).rejects.toThrow("家谱数据请求超时，请稍后重试");
    jest.useRealTimers();
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
