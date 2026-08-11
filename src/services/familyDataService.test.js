import familyDataService, {
  FAMILY_DATA_REQUEST_TIMEOUT_MS,
} from "./familyDataService.js";

const originalFetch = global.fetch;

describe("private family data loading", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    familyDataService.clearAllCache();
    familyDataService.versions.clear();
    familyDataService.writeQueues.clear();
    familyDataService.inFlightSaves.clear();
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

  test("persists the guest demo snapshot for the next browser visit", async () => {
    localStorage.removeItem("token");
    const snapshot = [{ id: 1, name: "示例人物", g_rank: 1, g_father_id: 0 }];
    jest.spyOn(familyDataService, "loadOriginalFamilyData").mockReturnValue(snapshot);

    await expect(familyDataService.getGuestDemoSnapshot("default")).resolves.toEqual(snapshot);

    familyDataService.clearAllCache();
    expect(familyDataService.getCachedFamilyData("default")).toEqual(snapshot);
  });

  test("never reads or writes the guest cache for an authenticated tenant", async () => {
    localStorage.setItem("token", "user-token");
    const snapshot = [{ id: 1, name: "用户人物", g_rank: 1, g_father_id: 0 }];
    jest.spyOn(familyDataService, "loadOriginalFamilyData").mockReturnValue(snapshot);

    await expect(familyDataService.getGuestDemoSnapshot("default")).resolves.toBeNull();
    expect(familyDataService.getCachedFamilyData("default")).toBeNull();
    expect(localStorage.getItem("familyTree_guest_demo_family_data")).toBeNull();
  });

  test("does not let an older read response roll back the known version", async () => {
    localStorage.setItem("token", "test-token");
    familyDataService.versions.set("tenant-private", 1);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ version: 0, data: [{ id: 1, name: "旧数据" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ version: 1, data: [{ id: 1, name: "最新数据" }] }),
      });

    await expect(
      familyDataService.loadFamilyDataFromServer("tenant-private"),
    ).resolves.toEqual([{ id: 1, name: "最新数据" }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(familyDataService.versions.get("tenant-private")).toBe(1);
  });

  test("serializes same-tenant writes and advances expectedVersion", async () => {
    localStorage.setItem("token", "test-token");
    const requests = [];
    global.fetch = jest.fn(async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({ success: true, version: requests.length }),
      };
    });

    const first = familyDataService.saveFamilyData(
      [{ id: 1, name: "本人" }],
      "tenant-private",
    );
    const second = familyDataService.saveFamilyData(
      [{ id: 1, name: "本人" }, { id: 2, name: "父亲" }],
      "tenant-private",
    );

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(requests.map(({ expectedVersion }) => expectedVersion)).toEqual([0, 1]);
  });

  test("coalesces duplicate in-flight full saves", async () => {
    localStorage.setItem("token", "test-token");
    let resolveResponse;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const data = [{ id: 1, name: "本人" }];

    const first = familyDataService.saveFamilyData(data, "tenant-private");
    const duplicate = familyDataService.saveFamilyData(data, "tenant-private");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveResponse({
      ok: true,
      json: async () => ({ success: true, version: 1 }),
    });
    await expect(Promise.all([first, duplicate])).resolves.toEqual([true, true]);
  });
});
