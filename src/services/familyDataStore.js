/**
 * 家谱数据存储服务
 * 负责与后端数据库的交互，提供统一的数据访问接口
 */

const API_BASE_URL = 'http://localhost:3003/api';

class FamilyDataStore {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 保存家谱数据到数据库
   * @param {string} tenantId - 租户ID
   * @param {Array} familyData - 家谱数据数组
   * @returns {Promise<Object>} 保存结果
   */
  async saveFamilyData(tenantId, familyData) {
    try {
      console.log(`💾 [FamilyDataStore] 保存家谱数据 - 租户: ${tenantId}, 数据条数: ${familyData.length}`);

      const response = await fetch(`${API_BASE_URL}/family-data/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          familyData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 保存失败`);
      }

      if (result.success) {
        // 清除缓存
        this.clearCache(tenantId);
        console.log(`✅ [FamilyDataStore] 保存成功: ${result.message}`);
        return result;
      } else {
        throw new Error(result.message || '保存失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 保存家谱数据失败:`, error);
      throw new Error(`保存家谱数据失败: ${error.message}`);
    }
  }

  /**
   * 获取家谱数据
   * @param {string} tenantId - 租户ID
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>} 家谱数据数组
   */
  async getFamilyData(tenantId, useCache = true) {
    try {
      // 检查缓存
      if (useCache) {
        const cached = this.getFromCache(tenantId);
        if (cached) {
          console.log(`📋 [FamilyDataStore] 使用缓存数据 - 租户: ${tenantId}, 数据条数: ${cached.length}`);
          return cached;
        }
      }

      console.log(`📖 [FamilyDataStore] 从数据库获取家谱数据 - 租户: ${tenantId}`);

      const response = await fetch(`${API_BASE_URL}/family-data/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 获取失败`);
      }

      if (result.success) {
        const familyData = result.data || [];
        
        // 缓存数据
        this.setCache(tenantId, familyData);
        
        console.log(`✅ [FamilyDataStore] 获取成功: ${familyData.length} 条记录`);
        return familyData;
      } else {
        throw new Error(result.message || '获取失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 获取家谱数据失败:`, error);
      
      // 如果网络错误，尝试返回缓存数据
      if (error.message.includes('fetch')) {
        const cached = this.getFromCache(tenantId);
        if (cached) {
          console.log(`🔄 [FamilyDataStore] 网络错误，使用缓存数据`);
          return cached;
        }
      }
      
      throw new Error(`获取家谱数据失败: ${error.message}`);
    }
  }

  /**
   * 获取家谱统计信息
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Object>} 统计信息
   */
  async getFamilyStats(tenantId) {
    try {
      console.log(`📊 [FamilyDataStore] 获取家谱统计 - 租户: ${tenantId}`);

      const response = await fetch(`${API_BASE_URL}/family-data/${tenantId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 获取统计失败`);
      }

      if (result.success) {
        console.log(`✅ [FamilyDataStore] 统计获取成功:`, result.stats);
        return result.stats;
      } else {
        throw new Error(result.message || '获取统计失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 获取家谱统计失败:`, error);
      throw new Error(`获取家谱统计失败: ${error.message}`);
    }
  }

  /**
   * 搜索家谱成员
   * @param {string} tenantId - 租户ID
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>} 搜索结果
   */
  async searchFamilyMembers(tenantId, keyword) {
    try {
      console.log(`🔍 [FamilyDataStore] 搜索家谱成员 - 租户: ${tenantId}, 关键词: ${keyword}`);

      const response = await fetch(`${API_BASE_URL}/family-data/${tenantId}/search?keyword=${encodeURIComponent(keyword)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 搜索失败`);
      }

      if (result.success) {
        console.log(`✅ [FamilyDataStore] 搜索成功: ${result.results.length} 条结果`);
        return result.results;
      } else {
        throw new Error(result.message || '搜索失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 搜索家谱成员失败:`, error);
      throw new Error(`搜索家谱成员失败: ${error.message}`);
    }
  }

  /**
   * 获取租户信息
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Object>} 租户信息
   */
  async getTenantInfo(tenantId) {
    try {
      console.log(`🏢 [FamilyDataStore] 获取租户信息 - 租户: ${tenantId}`);

      const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return null; // 租户不存在
        }
        throw new Error(result.message || `HTTP ${response.status}: 获取租户信息失败`);
      }

      if (result.success) {
        console.log(`✅ [FamilyDataStore] 租户信息获取成功:`, result.tenant);
        return result.tenant;
      } else {
        throw new Error(result.message || '获取租户信息失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 获取租户信息失败:`, error);
      throw new Error(`获取租户信息失败: ${error.message}`);
    }
  }

  /**
   * 获取所有租户列表
   * @returns {Promise<Array>} 租户列表
   */
  async getAllTenants() {
    try {
      console.log(`🏢 [FamilyDataStore] 获取所有租户列表`);

      const response = await fetch(`${API_BASE_URL}/tenants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 获取租户列表失败`);
      }

      if (result.success) {
        console.log(`✅ [FamilyDataStore] 租户列表获取成功: ${result.tenants.length} 个租户`);
        return result.tenants;
      } else {
        throw new Error(result.message || '获取租户列表失败');
      }

    } catch (error) {
      console.error(`❌ [FamilyDataStore] 获取租户列表失败:`, error);
      throw new Error(`获取租户列表失败: ${error.message}`);
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 设置缓存
   * @param {string} tenantId - 租户ID
   * @param {Array} data - 数据
   */
  setCache(tenantId, data) {
    const cacheKey = `family_data_${tenantId}`;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存
   * @param {string} tenantId - 租户ID
   * @returns {Array|null} 缓存的数据或null
   */
  getFromCache(tenantId) {
    const cacheKey = `family_data_${tenantId}`;
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * 清除缓存
   * @param {string} tenantId - 租户ID（可选，不传则清除所有缓存）
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      const cacheKey = `family_data_${tenantId}`;
      this.cache.delete(cacheKey);
      console.log(`🗑️ [FamilyDataStore] 清除缓存: ${cacheKey}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ [FamilyDataStore] 清除所有缓存`);
    }
  }

  /**
   * 获取缓存状态
   * @returns {Object} 缓存状态信息
   */
  getCacheStatus() {
    const cacheKeys = Array.from(this.cache.keys());
    const cacheInfo = {};
    
    cacheKeys.forEach(key => {
      const cached = this.cache.get(key);
      cacheInfo[key] = {
        size: cached.data.length,
        age: Date.now() - cached.timestamp,
        expired: Date.now() - cached.timestamp > this.cacheTimeout
      };
    });

    return {
      totalCaches: cacheKeys.length,
      caches: cacheInfo
    };
  }
}

// 单例模式
const familyDataStore = new FamilyDataStore();

export default familyDataStore;
