import {
  LOGIN_ACCOUNT_HISTORY_KEY,
  LOGIN_PHONE_HISTORY_KEY,
  clearLoginAccountHistory,
  getLoginAccountHistory,
  rememberLoginAccount,
} from "./loginAccountHistory.js";

const createStorage = (initial = {}) => {
  const store = { ...initial };

  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, nextValue) => {
      store[key] = nextValue;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
};

describe("login account history", () => {
  test("remembers only the normalized email after a successful login", () => {
    const storage = createStorage();

    const accounts = rememberLoginAccount(
      "  USER@Example.com ",
      "email",
      storage,
    );

    expect(accounts).toEqual(["user@example.com"]);
    expect(storage.setItem).toHaveBeenCalledWith(
      LOGIN_ACCOUNT_HISTORY_KEY,
      JSON.stringify(["user@example.com"]),
    );
    expect(storage.setItem.mock.calls[0][1]).not.toContain("password");
  });

  test("remembers the normalized phone after a successful phone login", () => {
    const storage = createStorage();

    const accounts = rememberLoginAccount(" 13800000001 ", "phone", storage);

    expect(accounts).toEqual(["13800000001"]);
    expect(storage.setItem).toHaveBeenCalledWith(
      LOGIN_PHONE_HISTORY_KEY,
      JSON.stringify(["13800000001"]),
    );
  });

  test("keeps email and phone histories in separate storage keys", () => {
    const storage = createStorage();

    rememberLoginAccount("user@example.com", "email", storage);
    rememberLoginAccount("13800000001", "phone", storage);

    expect(getLoginAccountHistory("email", storage)).toEqual([
      "user@example.com",
    ]);
    expect(getLoginAccountHistory("phone", storage)).toEqual(["13800000001"]);
  });

  test("moves reused email accounts to the front, removes invalid data, and keeps five", () => {
    const storage = createStorage({
      [LOGIN_ACCOUNT_HISTORY_KEY]: JSON.stringify([
        "one@example.com",
        "invalid-account",
        "two@example.com",
        "three@example.com",
        "four@example.com",
        "five@example.com",
      ]),
    });

    expect(rememberLoginAccount("TWO@example.com", "email", storage)).toEqual([
      "two@example.com",
      "one@example.com",
      "three@example.com",
      "four@example.com",
      "five@example.com",
    ]);
  });

  test("moves reused phone accounts to the front and limits to five", () => {
    const storage = createStorage({
      [LOGIN_PHONE_HISTORY_KEY]: JSON.stringify([
        "13800000001",
        "not-a-phone",
        "13800000002",
        "13800000003",
        "13800000004",
        "13800000005",
        "13800000006",
      ]),
    });

    expect(rememberLoginAccount("13800000003", "phone", storage)).toEqual([
      "13800000003",
      "13800000001",
      "13800000002",
      "13800000004",
      "13800000005",
    ]);
  });

  test("ignores malformed local data and supports clearing history", () => {
    const storage = createStorage({
      [LOGIN_ACCOUNT_HISTORY_KEY]: "not-json",
      [LOGIN_PHONE_HISTORY_KEY]: "not-json",
    });

    expect(getLoginAccountHistory("email", storage)).toEqual([]);
    expect(getLoginAccountHistory("phone", storage)).toEqual([]);

    clearLoginAccountHistory("email", storage);
    expect(storage.removeItem).toHaveBeenCalledWith(LOGIN_ACCOUNT_HISTORY_KEY);

    clearLoginAccountHistory(undefined, storage);
    expect(storage.removeItem).toHaveBeenCalledWith(LOGIN_PHONE_HISTORY_KEY);
  });
});
