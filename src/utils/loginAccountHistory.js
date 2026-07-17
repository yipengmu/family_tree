export const LOGIN_ACCOUNT_HISTORY_KEY = "puli_login_account_history";
export const LOGIN_PHONE_HISTORY_KEY = "puli_login_phone_history";
export const LOGIN_ACCOUNT_HISTORY_LIMIT = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;

const ACCOUNT_TYPE_CONFIG = {
  email: {
    storageKey: LOGIN_ACCOUNT_HISTORY_KEY,
    pattern: EMAIL_PATTERN,
    normalize: (account) => account.trim().toLowerCase(),
  },
  phone: {
    storageKey: LOGIN_PHONE_HISTORY_KEY,
    pattern: PHONE_PATTERN,
    normalize: (account) => account.trim(),
  },
};

const getAccountTypeConfig = (type) =>
  ACCOUNT_TYPE_CONFIG[type] || ACCOUNT_TYPE_CONFIG.email;

const getLocalStorage = (storage) => {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

export const getLoginAccountHistory = (type = "email", storage) => {
  const config = getAccountTypeConfig(type);
  const localStorage = getLocalStorage(storage);

  if (!localStorage) {
    return [];
  }

  try {
    const savedAccounts = JSON.parse(
      localStorage.getItem(config.storageKey) || "[]",
    );

    if (!Array.isArray(savedAccounts)) {
      return [];
    }

    return [...new Set(savedAccounts.map(config.normalize))]
      .filter((account) => config.pattern.test(account))
      .slice(0, LOGIN_ACCOUNT_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

export const rememberLoginAccount = (account, type = "email", storage) => {
  const config = getAccountTypeConfig(type);
  const normalizedAccount = config.normalize(account);
  const localStorage = getLocalStorage(storage);

  if (!localStorage || !config.pattern.test(normalizedAccount)) {
    return getLoginAccountHistory(type, storage);
  }

  const nextAccounts = [
    normalizedAccount,
    ...getLoginAccountHistory(type, localStorage).filter(
      (savedAccount) => savedAccount !== normalizedAccount,
    ),
  ].slice(0, LOGIN_ACCOUNT_HISTORY_LIMIT);

  try {
    localStorage.setItem(config.storageKey, JSON.stringify(nextAccounts));
  } catch {
    // 登录不能因浏览器禁用或限制本地存储而失败。
  }

  return nextAccounts;
};

export const clearLoginAccountHistory = (type, storage) => {
  const localStorage = getLocalStorage(storage);

  if (!localStorage) {
    return;
  }

  const keys = type
    ? [getAccountTypeConfig(type).storageKey]
    : Object.values(ACCOUNT_TYPE_CONFIG).map((config) => config.storageKey);

  try {
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 清理失败时保持登录页可用。
  }
};
