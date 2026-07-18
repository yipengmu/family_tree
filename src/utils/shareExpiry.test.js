import { formatShareExpiry, getShareTimeRemaining } from "./shareExpiry.js";

describe("share expiry presentation", () => {
  test("shows an explicit local expiry time", () => {
    expect(formatShareExpiry(new Date(2026, 6, 25, 14, 30))).toBe(
      "2026-07-25 14:30",
    );
  });

  test("shows days, hours and expired state", () => {
    const now = new Date("2026-07-18T06:00:00.000Z").getTime();
    expect(getShareTimeRemaining("2026-07-20T09:00:00.000Z", now)).toBe(
      "剩余 2 天 3 小时",
    );
    expect(getShareTimeRemaining("2026-07-18T05:59:00.000Z", now)).toBe(
      "已到期",
    );
  });
});
