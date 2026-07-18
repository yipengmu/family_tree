const authHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("请登录后分享家谱");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const parseResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || `分享请求失败: ${response.status}`);
  return result;
};

const shareService = {
  async getCurrent(tenantId) {
    const response = await fetch(
      `/api/shares?tenantId=${encodeURIComponent(tenantId)}`,
      {
        headers: authHeaders(),
        cache: "no-store",
      },
    );
    return parseResponse(response);
  },

  async publish(tenantId, { refresh = false } = {}) {
    const response = await fetch("/api/shares", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tenantId, refresh }),
    });
    return parseResponse(response);
  },

  async revoke(tenantId, shareId) {
    const response = await fetch(
      `/api/shares/${encodeURIComponent(shareId)}?tenantId=${encodeURIComponent(tenantId)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    return parseResponse(response);
  },

  async getPublic(token) {
    const response = await fetch(
      `/api/public-shares/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        referrerPolicy: "no-referrer",
      },
    );
    return parseResponse(response);
  },
};

export default shareService;
