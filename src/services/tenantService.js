/**
 * 多租户服务 - 管理租户数据和权限
 */

import cacheManager from '../utils/cacheManager';

// 缓存键常量
const CACHE_KEYS = {
  CURRENT_TENANT: 'current_tenant',
  TENANT_LIST: 'tenant_list',
  TENANT_DATA: 'tenant_data_',
};

class TenantService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
    this.isMultiTenantEnabled = process.env.REACT_APP_ENABLE_MULTI_TENANT === 'true';
    this.defaultTenantId = process.env.REACT_APP_DEFAULT_TENANT_ID || 'default';
    this.CACHE_KEYS = CACHE_KEYS;

    // 在所有属性初始化后再获取当前租户
    this.currentTenant = this.getCurrentTenant();
  }

  /**
   * 获取当前租户信息
   * @returns {Object} - 当前租户信息
   */
  getCurrentTenant() {
    // 优先从缓存获取
    const cachedTenant = cacheManager.get(this.CACHE_KEYS.CURRENT_TENANT);
    if (cachedTenant) {
      return cachedTenant;
    }

    // 从localStorage获取
    const storedTenant = localStorage.getItem('current_tenant');
    if (storedTenant) {
      try {
        const tenant = JSON.parse(storedTenant);
        cacheManager.set(this.CACHE_KEYS.CURRENT_TENANT, tenant, 3600); // 缓存1小时
        return tenant;
      } catch (error) {
        console.error('解析租户信息失败:', error);
      }
    }

    // 返回默认租户
    const defaultTenant = {
      id: this.defaultTenantId,
      name: '默认家谱',
      description: '默认家谱数据',
      createdAt: new Date().toISOString(),
      isDefault: true,
    };

    this.setCurrentTenant(defaultTenant);
    return defaultTenant;
  }

  /**
   * 设置当前租户
   * @param {Object} tenant - 租户信息
   */
  setCurrentTenant(tenant) {
    this.currentTenant = tenant;
    
    // 保存到localStorage
    localStorage.setItem('current_tenant', JSON.stringify(tenant));
    
    // 保存到缓存
    cacheManager.set(this.CACHE_KEYS.CURRENT_TENANT, tenant, 3600);
    
    console.log('🏢 切换到租户:', tenant.name, `(${tenant.id})`);
    
    // 触发租户切换事件
    this.dispatchTenantChangeEvent(tenant);
  }

  /**
   * 创建新租户
   * @param {Object} tenantData - 租户数据
   * @returns {Promise<Object>} - 创建的租户信息
   */
  async createTenant(tenantData) {
    try {
      const tenant = {
        id: this.generateTenantId(),
        name: tenantData.name,
        description: tenantData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
        settings: {
          nameProtection: tenantData.nameProtection || false,
          publicAccess: tenantData.publicAccess || false,
          ...tenantData.settings,
        },
      };

      // 如果启用了多租户且有后端API
      if (this.isMultiTenantEnabled && this.baseURL) {
        const response = await fetch(`${this.baseURL}/api/tenants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tenant),
        });

        if (!response.ok) {
          throw new Error(`创建租户失败: ${response.status}`);
        }

        const result = await response.json();
        tenant.id = result.id || tenant.id;
      }

      // 保存到本地存储
      this.saveTenantToLocal(tenant);
      
      // 更新租户列表缓存
      this.invalidateTenantListCache();
      
      console.log('✅ 租户创建成功:', tenant.name);
      return tenant;
    } catch (error) {
      console.error('❌ 创建租户失败:', error);
      throw error;
    }
  }

  /**
   * 获取租户列表
   * @returns {Promise<Array>} - 租户列表
   */
  async getTenantList() {
    try {
      // 先检查缓存
      const cachedList = cacheManager.get(this.CACHE_KEYS.TENANT_LIST);
      if (cachedList) {
        return cachedList;
      }

      let tenants = [];

      // 如果启用了多租户且有后端API
      if (this.isMultiTenantEnabled && this.baseURL) {
        try {
          const response = await fetch(`${this.baseURL}/api/tenants`);
          if (response.ok) {
            const result = await response.json();
            tenants = result.data || [];
          }
        } catch (error) {
          console.warn('从服务器获取租户列表失败，使用本地数据:', error);
        }
      }

      // 如果服务器没有数据，从本地存储获取
      if (tenants.length === 0) {
        tenants = this.getLocalTenants();
      }

      // 确保包含当前租户
      const currentTenant = this.getCurrentTenant();
      if (!tenants.find(t => t.id === currentTenant.id)) {
        tenants.unshift(currentTenant);
      }

      // 缓存结果
      cacheManager.set(this.CACHE_KEYS.TENANT_LIST, tenants, 1800); // 缓存30分钟
      
      return tenants;
    } catch (error) {
      console.error('❌ 获取租户列表失败:', error);
      return [this.getCurrentTenant()];
    }
  }

  /**
   * 切换租户
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Object>} - 切换后的租户信息
   */
  async switchTenant(tenantId) {
    try {
      const tenants = await this.getTenantList();
      const tenant = tenants.find(t => t.id === tenantId);
      
      if (!tenant) {
        throw new Error(`租户不存在: ${tenantId}`);
      }

      this.setCurrentTenant(tenant);
      
      // 清除相关缓存
      this.clearTenantDataCache(tenantId);
      
      return tenant;
    } catch (error) {
      console.error('❌ 切换租户失败:', error);
      throw error;
    }
  }

  /**
   * 删除租户
   * @param {string} tenantId - 租户ID
   * @returns {Promise<boolean>} - 是否删除成功
   */
  async deleteTenant(tenantId) {
    try {
      if (tenantId === this.defaultTenantId) {
        throw new Error('不能删除默认租户');
      }

      // 如果是当前租户，先切换到默认租户
      if (this.currentTenant.id === tenantId) {
        await this.switchTenant(this.defaultTenantId);
      }

      // 如果启用了多租户且有后端API
      if (this.isMultiTenantEnabled && this.baseURL) {
        const response = await fetch(`${this.baseURL}/api/tenants/${tenantId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`删除租户失败: ${response.status}`);
        }
      }

      // 从本地存储删除
      this.removeTenantFromLocal(tenantId);
      
      // 清除相关缓存
      this.clearTenantDataCache(tenantId);
      this.invalidateTenantListCache();
      
      console.log('✅ 租户删除成功:', tenantId);
      return true;
    } catch (error) {
      console.error('❌ 删除租户失败:', error);
      throw error;
    }
  }

  /**
   * 生成租户ID
   * @returns {string} - 租户ID
   */
  generateTenantId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `tenant_${timestamp}_${random}`;
  }

  /**
   * 保存租户到本地存储
   * @param {Object} tenant - 租户信息
   */
  saveTenantToLocal(tenant) {
    const tenants = this.getLocalTenants();
    const existingIndex = tenants.findIndex(t => t.id === tenant.id);
    
    if (existingIndex >= 0) {
      tenants[existingIndex] = tenant;
    } else {
      tenants.push(tenant);
    }
    
    localStorage.setItem('tenant_list', JSON.stringify(tenants));
  }

  /**
   * 从本地存储获取租户列表
   * @returns {Array} - 租户列表
   */
  getLocalTenants() {
    try {
      const stored = localStorage.getItem('tenant_list');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('解析本地租户列表失败:', error);
      return [];
    }
  }

  /**
   * 从本地存储删除租户
   * @param {string} tenantId - 租户ID
   */
  removeTenantFromLocal(tenantId) {
    const tenants = this.getLocalTenants();
    const filtered = tenants.filter(t => t.id !== tenantId);
    localStorage.setItem('tenant_list', JSON.stringify(filtered));
  }

  /**
   * 清除租户数据缓存
   * @param {string} tenantId - 租户ID
   */
  clearTenantDataCache(tenantId) {
    const cacheKey = this.CACHE_KEYS.TENANT_DATA + tenantId;
    cacheManager.remove(cacheKey);
    cacheManager.remove('family_data'); // 清除家谱数据缓存
    cacheManager.remove('family_statistics'); // 清除统计数据缓存
  }

  /**
   * 使租户列表缓存失效
   */
  invalidateTenantListCache() {
    cacheManager.remove(this.CACHE_KEYS.TENANT_LIST);
  }

  /**
   * 触发租户切换事件
   * @param {Object} tenant - 租户信息
   */
  dispatchTenantChangeEvent(tenant) {
    const event = new CustomEvent('tenantChanged', {
      detail: { tenant },
    });
    window.dispatchEvent(event);
  }

  /**
   * 监听租户切换事件
   * @param {Function} callback - 回调函数
   * @returns {Function} - 取消监听的函数
   */
  onTenantChange(callback) {
    const handler = (event) => {
      callback(event.detail.tenant);
    };
    
    window.addEventListener('tenantChanged', handler);
    
    return () => {
      window.removeEventListener('tenantChanged', handler);
    };
  }

  /**
   * 获取租户相关的API请求头
   * @returns {Object} - 请求头
   */
  getTenantHeaders() {
    return {
      'X-Tenant-ID': this.currentTenant.id,
      'X-Tenant-Name': this.currentTenant.name,
    };
  }

  /**
   * 检查是否启用多租户
   * @returns {boolean} - 是否启用多租户
   */
  isMultiTenantMode() {
    return this.isMultiTenantEnabled;
  }
}

// 创建单例实例
const tenantService = new TenantService();

export default tenantService;
