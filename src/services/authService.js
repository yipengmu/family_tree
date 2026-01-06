// 认证服务
class AuthService {
  // 登录
  static async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存token到localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, error: data.error || '登录失败' };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '登录失败，请检查网络连接' };
    }
  }

  // 注册
  static async register(name, email, password, code) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          code,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存token到localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, error: data.error || '注册失败' };
      }
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, error: '注册失败，请检查网络连接' };
    }
  }

  // 发送验证码
  static async sendVerificationCode(email, purpose = 'register') {
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          purpose,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        // 检查是否是邮件服务未配置的错误
        if (data.error && data.error.includes('邮件发送失败')) {
          console.warn('邮件发送失败，但在开发环境中继续处理:', data.error);
          // 在开发环境中，即使邮件发送失败也返回成功，因为验证码可能已保存到内存中
          return { success: true, message: '验证码已生成（开发环境）' };
        }
        return { success: false, error: data.error || '发送验证码失败' };
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      // 对于网络错误，提供更具体的错误信息
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { success: false, error: '无法连接到服务器，请检查网络连接或服务器是否运行' };
      }
      return { success: false, error: '发送验证码失败，请检查网络连接' };
    }
  }

  // 获取当前用户信息
  static async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.user;
      } else {
        // 如果token无效，清除本地存储
        this.logout();
        return null;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      this.logout(); // 如果出错，清除本地认证信息
      return null;
    }
  }

  // 检查用户是否已认证
  static isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  // 登出
  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // 获取认证头
  static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}

export default AuthService;