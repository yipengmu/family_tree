import {
  LOGIN_ACCOUNT_HISTORY_KEY,
  clearLoginAccountHistory,
  getLoginAccountHistory,
  rememberLoginAccount,
} from "./loginAccountHistory.js";

const createStorage = (initialValue) => {
  let value = initialValue;

  return {
    getItem: jest.fn(() => value ?? null),
    setItem: jest.fn((key, nextValue) => {
      if (key === LOGIN_ACCOUNT_HISTORY_KEY) {
        value = nextValue;
      }
    }),
    removeItem: jest.fn(() => {
      value = null;
    }),
  };
};

describe("login account history", () => {
  test("remembers only the normalized account after a successful login", () => {
    const storage = createStorage();

    const accounts = rememberLoginAccount("  USER@Example.com ", storage);

    expect(accounts).toEqual(["user@example.com"]);
    expect(storage.setItem).toHaveBeenCalledWith(
      LOGIN_ACCOUNT_HISTORY_KEY,
      JSON.stringify(["user@example.com"]),
    );
    expect(storage.setItem.mock.calls[0][1]).not.toContain("password");
  });

  test("moves reused accounts to the front, removes invalid data, and keeps five", () => {
    const storage = createStorage(
      JSON.stringify([
        "one@example.com",
        "invalid-account",
        "two@example.com",
        "three@example.com",
        "four@example.com",
        "five@example.com",
      ]),
    );

    expect(rememberLoginAccount("TWO@example.com", storage)).toEqual([
      "two@example.com",
      "one@example.com",
      "three@example.com",
      "four@example.com",
      "five@example.com",
    ]);
  });

  test("ignores malformed local data and supports clearing history", () => {
    const storage = createStorage("not-json");

    expect(getLoginAccountHistory(storage)).toEqual([]);

    clearLoginAccountHistory(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(LOGIN_ACCOUNT_HISTORY_KEY);
  });
});
