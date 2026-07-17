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

  test("clears stale local auth state and preserves server message on 403", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    localStorage.setItem(
      "current_tenant",
      JSON.stringify({ id: "tenant-private", name: "旧家谱" }),
    );
    localStorage.setItem("tenant_list", JSON.stringify([{ id: "tenant-private" }]));
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "令牌无效或已过期" }),
      headers: { get: () => "application/json" },
    });

    await expect(
      familyDataService.loadFamilyDataFromServer("tenant-private"),
    ).rejects.toMatchObject({
      message: "令牌无效或已过期",
      status: 403,
      isAuthError: true,
    });
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("current_tenant")).toBeNull();
    expect(localStorage.getItem("tenant_list")).toBeNull();
  });
});
