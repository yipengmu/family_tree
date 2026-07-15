class TencentImageAnalysisService {
  constructor() {
    this.endpoint = "/api/tencent/image-parse";
  }

  async parseFamilyTree(images, tenantId) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("请登录后使用图片解析");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ images, tenantId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success)
      throw new Error(result.error || "腾讯混元图片解析失败");
    return result.data || [];
  }

  async testConnection() {
    return {
      success: true,
      managedByServer: true,
      provider: "Tencent TokenHub",
    };
  }
}

export default new TencentImageAnalysisService();
