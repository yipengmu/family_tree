import cacheManager from "../utils/cacheManager.js";
import { identifyUser, resetAnalyticsUser } from "../utils/analytics.js";

// 认证服务
class AuthService {
  static getApiBaseUrl() {
    return (
      process.env.REACT_APP_API_BASE_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3003" : "")
    );
  }

  static async sendPhoneCode(phone, purpose = "register") {
    const response = await fetch(
      `${this.getApiBaseUrl()}/api/auth?type=phone-send-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ phone, purpose }),
      },
    );
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? data
      : { success: false, error: data.error || `HTTP ${response.status}` };
  }

  // 登录
  static async login(account, password) {
    try {
      // 在Vercel部署中，API端点可能需要调整
      // 在Vercel部署中，API端点可能需要调整
      // 根据环境变量确定API基础URL
      const isDev = process.env.NODE_ENV === "development";
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL ||
        (isDev ? "http://localhost:3003" : "");
      const apiUrl = `${baseUrl}/api/auth/login`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "omit", // omit cookies to avoid oversized request headers
        cache: "no-store",
        body: JSON.stringify({
          account: account.trim().toLowerCase(),
          password,
        }),
      });

      // 检查响应状态
      if (!response.ok) {
        // 处理非2xx状态码
        let errorMessage = `HTTP ${response.status} ${response.statusText}`;

        try {
          // 尝试解析错误响应体
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析为JSON，使用文本形式
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // 如果也无法获取文本，使用默认错误消息
            errorMessage = `服务器错误: ${response.status} ${response.statusText}`;
          }
        }

        return { success: false, error: errorMessage };
      }

      // 检查响应内容类型
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { success: false, error: "服务器返回的数据格式不正确" };
      }

      const data = await response.json();

      if (data.success) {
        // 保存token到localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.tenant) {
          localStorage.setItem("current_tenant", JSON.stringify(data.tenant));
          cacheManager.set("current_tenant", data.tenant, 3600);
        }
        localStorage.removeItem("guest_mode");
        identifyUser(data.user);
        return {
          success: true,
          user: data.user,
          token: data.token,
          tenant: data.tenant,
        };
      } else {
        return { success: false, error: data.error || "登录失败" };
      }
    } catch (error) {
      console.error("登录失败:", error);
      // 添加更详细的错误信息
      if (error instanceof TypeError && error.message.includes("fetch")) {
        // 检查是否是网络错误
        if (
          window.location.protocol !== "https:" &&
          window.location.hostname !== "localhost"
        ) {
          // 非localhost环境使用HTTP而不是HTTPS
          return {
            success: false,
            error: "安全连接错误：网站应通过HTTPS访问以确保API调用正常工作",
          };
        }
        return {
          success: false,
          error: "网络连接失败，请检查您的网络连接或联系管理员",
        };
      }
      return { success: false, error: `登录失败：${error.message}` };
    }
  }

  // 注册
  static async register(name, email, password, code) {
    try {
      // 根据环境变量确定API基础URL
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3003" : "");
      const apiUrl = `${baseUrl}/api/auth/register`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "omit", // omit cookies to avoid oversized request headers
        cache: "no-store",
        body: JSON.stringify({
          name,
          email: (email || "").trim().toLowerCase(),
          password,
          code,
        }),
      });

      // 检查响应状态
      if (!response.ok) {
        // 处理非2xx状态码
        let errorMessage = `HTTP ${response.status} ${response.statusText}`;

        try {
          // 尝试解析错误响应体
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析为JSON，使用文本形式
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // 如果也无法获取文本，使用默认错误消息
            errorMessage = `服务器错误: ${response.status} ${response.statusText}`;
          }
        }

        return { success: false, error: errorMessage };
      }

      // 检查响应内容类型
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { success: false, error: "服务器返回的数据格式不正确" };
      }

      const data = await response.json();

      if (data.success) {
        // 保存token到localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.tenant) {
          localStorage.setItem("current_tenant", JSON.stringify(data.tenant));
          cacheManager.set("current_tenant", data.tenant, 3600);
        }
        localStorage.removeItem("guest_mode");
        identifyUser(data.user);
        return {
          success: true,
          user: data.user,
          token: data.token,
          tenant: data.tenant,
        };
      } else {
        return { success: false, error: data.error || "注册失败" };
      }
    } catch (error) {
      console.error("注册失败:", error);
      return { success: false, error: "注册失败，请检查网络连接" };
    }
  }

  static async registerPhone(phone, code, password, email = "") {
    try {
      const response = await fetch(
        `${this.getApiBaseUrl()}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          cache: "no-store",
          body: JSON.stringify({
            phone: phone.trim(),
            code,
            password,
            email: email.trim().toLowerCase(),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.tenant) {
        localStorage.setItem("current_tenant", JSON.stringify(data.tenant));
        cacheManager.set("current_tenant", data.tenant, 3600);
      }
      localStorage.removeItem("guest_mode");
      identifyUser(data.user);
      return data;
    } catch (error) {
      console.error("手机号注册失败:", error);
      return { success: false, error: "注册失败，请检查网络连接" };
    }
  }

  // 发送验证码
  static async sendVerificationCode(email, purpose = "register") {
    try {
      // 根据环境变量确定API基础URL
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3003" : "");
      const apiUrl = `${baseUrl}/api/auth/send-code`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "omit", // omit cookies to avoid oversized request headers
        cache: "no-store",
        body: JSON.stringify({
          email,
          purpose,
        }),
      });

      // 检查响应状态
      if (!response.ok) {
        // 处理非2xx状态码
        let errorMessage = `HTTP ${response.status} ${response.statusText}`;

        try {
          // 尝试解析错误响应体
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析为JSON，使用文本形式
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // 如果也无法获取文本，使用默认错误消息
            errorMessage = `服务器错误: ${response.status} ${response.statusText}`;
          }
        }

        return { success: false, error: errorMessage };
      }

      // 检查响应内容类型
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { success: false, error: "服务器返回的数据格式不正确" };
      }

      const data = await response.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || "发送验证码失败" };
      }
    } catch (error) {
      console.error("发送验证码失败:", error);
      // 对于网络错误，提供更具体的错误信息
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return {
          success: false,
          error: "无法连接到服务器，请检查网络连接或服务器是否运行",
        };
      }
      return { success: false, error: "发送验证码失败，请检查网络连接" };
    }
  }

  // 使用邮箱验证码重置密码
  static async resetPassword(account, code, newPassword) {
    try {
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3003" : "");
      const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({
          account: account.trim().toLowerCase(),
          code,
          newPassword,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        return { success: false, error: `服务器错误: ${response.status}` };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data.success
        ? { success: true, message: data.message }
        : { success: false, error: data.error || "密码重置失败" };
    } catch (error) {
      console.error("密码重置失败:", error);
      return { success: false, error: "密码重置失败，请检查网络连接" };
    }
  }

  // 获取当前用户信息
  static async getCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) {
      return null;
    }

    try {
      // 根据环境变量确定API基础URL
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3003" : "");
      const apiUrl = `${baseUrl}/api/user/profile`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit", // omit cookies to avoid oversized request headers
        cache: "no-store",
      });

      // 检查响应状态
      if (!response.ok) {
        // 处理非2xx状态码
        if (response.status === 401 || response.status === 403) {
          // 如果是认证失败，清除本地存储
          this.logout();
          return null;
        }

        let errorMessage = `HTTP ${response.status} ${response.statusText}`;

        try {
          // 尝试解析错误响应体
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析为JSON，使用文本形式
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // 如果也无法获取文本，使用默认错误消息
            errorMessage = `服务器错误: ${response.status} ${response.statusText}`;
          }
        }

        console.error("获取用户信息失败:", errorMessage);
        return null;
      }

      // 检查响应内容类型
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("服务器返回的数据格式不正确");
        return null;
      }

      const data = await response.json();

      if (data.success) {
        return data.user;
      } else {
        // 如果token无效，清除本地存储
        this.logout();
        return null;
      }
    } catch (error) {
      console.error("获取用户信息失败:", error);
      this.logout(); // 如果出错，清除本地认证信息
      return null;
    }
  }

  // 检查用户是否已认证
  static isAuthenticated() {
    const token = localStorage.getItem("token");
    return !!token;
  }

  // 登出
  static logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    resetAnalyticsUser();
  }

  // 获取认证头
  static getAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        "Content-Type": "application/json",
      };
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // 获取认证请求选项
  static getAuthOptions(method = "GET", additionalHeaders = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return {
      method,
      headers,
      credentials: "omit", // omit cookies to avoid oversized request headers
      cache: "no-store",
    };
  }
}

export default AuthService;
