export const LOGIN_ACCOUNT_HISTORY_KEY = "puli_login_account_history";
export const LOGIN_ACCOUNT_HISTORY_LIMIT = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getLocalStorage = (storage) => {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const normalizeAccount = (account) => {
  if (typeof account !== "string") {
    return "";
  }

  return account.trim().toLowerCase();
};

export const getLoginAccountHistory = (storage) => {
  const localStorage = getLocalStorage(storage);

  if (!localStorage) {
    return [];
  }

  try {
    const savedAccounts = JSON.parse(
      localStorage.getItem(LOGIN_ACCOUNT_HISTORY_KEY) || "[]",
    );

    if (!Array.isArray(savedAccounts)) {
      return [];
    }

    return [...new Set(savedAccounts.map(normalizeAccount))]
      .filter((account) => EMAIL_PATTERN.test(account))
      .slice(0, LOGIN_ACCOUNT_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

export const rememberLoginAccount = (account, storage) => {
  const normalizedAccount = normalizeAccount(account);
  const localStorage = getLocalStorage(storage);

  if (!localStorage || !EMAIL_PATTERN.test(normalizedAccount)) {
    return getLoginAccountHistory(storage);
  }

  const nextAccounts = [
    normalizedAccount,
    ...getLoginAccountHistory(localStorage).filter(
      (savedAccount) => savedAccount !== normalizedAccount,
    ),
  ].slice(0, LOGIN_ACCOUNT_HISTORY_LIMIT);

  try {
    localStorage.setItem(
      LOGIN_ACCOUNT_HISTORY_KEY,
      JSON.stringify(nextAccounts),
    );
  } catch {
    // 登录不能因浏览器禁用或限制本地存储而失败。
  }

  return nextAccounts;
};

export const clearLoginAccountHistory = (storage) => {
  const localStorage = getLocalStorage(storage);

  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(LOGIN_ACCOUNT_HISTORY_KEY);
  } catch {
    // 清理失败时保持登录页可用。
  }
};
