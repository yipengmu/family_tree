/**
 * 家谱数据服务
 * 3层数据架构：内存缓存 → 数据库持久化 → 原始familyData.js
 * 为云端SaaS部署优化，确保数据一致性
 */

import tenantService from './tenantService.js';
import dbJson from '../data/familyData.js';

const CACHE_KEYS = {
  FAMILY_DATA: 'familyData',
  FAMILY_STATISTICS: 'familyStatistics',
  PROCESSED_DATA: 'processedData'
};

// 获取租户相关的缓存键
const getTenantCacheKey = (key, tenantId = null) => {
  const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
  return `${key}_${currentTenantId}`;
};

// 缓存过期时间配置
const CACHE_EXPIRY = {
  FAMILY_DATA: 24 * 60 * 60 * 1000,      // 24小时
  STATISTICS: 12 * 60 * 60 * 1000,       // 12小时
  PROCESSED_DATA: 6 * 60 * 60 * 1000     // 6小时
};

// 内存缓存管理器
class MemoryCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0
    };
  }

  set(key, data, expireTime = CACHE_EXPIRY.FAMILY_DATA) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expireTime
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.cacheStats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.expireTime) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return item.data;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      ...this.cacheStats,
      cacheSize: this.cache.size
    };
  }
}

// 全局内存缓存实例
const memoryCache = new MemoryCacheManager();

class FamilyDataService {
  constructor() {
    this.isLoading = false;
    this.loadingPromise = null;
  }

  /**
   * 获取家谱数据 - 3层架构
   * 第1层：内存缓存 → 第2层：数据库持久化 → 第3层：原始familyData.js
   * @param {boolean} forceRefresh - 是否强制刷新
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 家谱数据
   */
  async getFamilyData(forceRefresh = false, tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
    const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, currentTenantId);
    
    console.log(`🔍 [3层架构] 获取家谱数据 (租户: ${currentTenantId}, 强制刷新: ${forceRefresh})`);
    
    // 强制刷新时清除内存缓存
    if (forceRefresh) {
      console.log(`🔄 强制刷新，清除内存缓存... (租户: ${currentTenantId})`);
      memoryCache.delete(cacheKey);
      this.loadingPromise = null;
    }

    // 第1层：检查内存缓存
    if (!forceRefresh) {
      const cachedData = memoryCache.get(cacheKey);
      if (cachedData) {
        console.log(`📦 [第1层] 从内存缓存加载家谱数据 (租户: ${currentTenantId})`);
        return cachedData;
      }
    }

    // 防止重复请求
    const loadingKey = `loading_${currentTenantId}`;
    if (this[loadingKey] && this.loadingPromise) {
      console.log(`⏳ 等待正在进行的数据加载... (租户: ${currentTenantId})`);
      return this.loadingPromise;
    }

    this[loadingKey] = true;
    this.loadingPromise = this.loadDataWithFallback(currentTenantId);

    try {
      const data = await this.loadingPromise;
      
      // 缓存到内存
      if (data && data.length > 0) {
        memoryCache.set(cacheKey, data, CACHE_EXPIRY.FAMILY_DATA);
        console.log(`✅ [3层架构] 数据已缓存到内存 (租户: ${currentTenantId}, ${data.length}条记录)`);
      }

      return data;
    } finally {
      this[loadingKey] = false;
      this.loadingPromise = null;
    }
  }

  /**
   * 数据加载回退机制
   * 第2层：尝试从数据库加载 → 第3层：回退到原始familyData.js
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 家谱数据
   */
  async loadDataWithFallback(tenantId) {
    // 检查用户是否已登录
    const isAuthenticated = !!localStorage.getItem('token');
    
    // 对于未登录用户（游客模式）或默认租户，优先使用本地原始数据文件
    // 这样可以确保在 Vercel 环境下也能正确显示完整的穆氏族谱
    if (!isAuthenticated || tenantId === 'default' || tenantService.isGuestMode()) {
      console.log(`📁 [第3层] 未登录/游客模式/默认租户，优先加载本地familyData.js`);
      try {
        const originalData = this.loadOriginalFamilyData(tenantId);
        if (originalData && originalData.length > 0) {
          console.log(`✅ [第3层] 成功加载本地数据: ${originalData.length} 条记录`);
          return originalData;
        }
      } catch (error) {
        console.warn(`⚠️ [第3层] 加载原始数据失败:`, error.message);
      }
    }

    try {
      // 第2层：从数据库加载（带超时）- 仅对已登录用户
      console.log(`🗄️ [第2层] 尝试从数据库加载数据 (租户: ${tenantId})`);
      const dbData = await this.loadFamilyDataFromServer(tenantId);
      
      if (dbData && dbData.length > 0) {
        console.log(`✅ [第2层] 从数据库加载成功 (${dbData.length}条记录)`);
        return dbData;
      }
    } catch (error) {
      console.warn(`⚠️ [第2层] 数据库加载失败:`, error.message);
    }

    // 第3层：回退到原始数据文件
    console.log(`📁 [第3层] 回退到原始familyData.js`);
    return this.loadOriginalFamilyData(tenantId);
  }

  /**
   * 从服务器加载家谱数据（带超时控制）
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 家谱数据
   */
  async loadFamilyDataFromServer(tenantId) {
    try {
      console.log(`🌐 开始从服务器加载家谱数据... (租户: ${tenantId})`);
      const startTime = Date.now();

      // 根据租户ID确定请求URL
      let url;
      if (tenantId === 'default' || tenantId === process.env.REACT_APP_DEFAULT_TENANT_ID) {
        url = '/api/family-data/default';
      } else {
        // 对于非默认租户，需要认证
        const token = localStorage.getItem('token');
        if (!token) {
          console.log(`🔒 未登录，跳过非默认租户数据加载 (租户: ${tenantId})`);
          throw new Error('需要登录才能加载此租户数据');
        }
        url = `/api/family-data`;
      }
      
      console.log(`🔗 请求URL: ${url}`);
      
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时（优化：减少超时时间以提高响应速度）

      const headers = {
        'Content-Type': 'application/json',
      };

      // 添加认证头部（如果需要）
      const token = localStorage.getItem('token');
      if (token && tenantId !== 'default' && tenantId !== process.env.REACT_APP_DEFAULT_TENANT_ID) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 添加租户信息到请求头
      headers['X-Tenant-ID'] = tenantId;
      if (tenantService.getCurrentTenant().name) {
        headers['X-Tenant-Name'] = encodeURIComponent(tenantService.getCurrentTenant().name);
      }

      const response = await fetch(url, {
        headers: headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回的不是JSON数据');
      }

      const result = await response.json();
      const data = result.data || result;
      const loadTime = Date.now() - startTime;

      console.log(`✅ 家谱数据加载完成 (${loadTime}ms, ${data.length}条记录, 租户: ${tenantId})`);

      return data;
    } catch (error) {
      console.error(`❌ 加载家谱数据失败 (租户: ${tenantId}):`, error);

      // 如果是超时错误，提供更友好的提示
      if (error.name === 'AbortError') {
        console.warn(`⏰ 数据库请求超时 (租户: ${tenantId})`);
        throw new Error('数据库连接超时，请检查后端服务是否正常运行');
      }

      // 数据库加载失败，抛出错误让上层处理回退逻辑
      throw error;
    }
  }

  /**
   * 加载原始家谱数据文件 (第3层)
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 家谱数据
   */
  loadOriginalFamilyData(tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
    const isAuthenticated = !!localStorage.getItem('token');
    
    // 对于未登录用户，始终加载默认的穆氏族谱数据
    // 对于已登录用户，只有默认租户才从原始文件加载
    if (isAuthenticated && currentTenantId !== 'default' && currentTenantId !== process.env.REACT_APP_DEFAULT_TENANT_ID) {
      console.log(`📊 [第3层] 已登录用户的非默认租户 ${currentTenantId}，返回空数据`);
      return [];
    }

    console.log(`📁 [第3层] 加载原始familyData.js文件 (租户: ${currentTenantId})`);
    
    try {
      // 使用顶部静态导入的数据
      const data = dbJson;
      console.log(`📋 静态导入数据文件类型: ${typeof data}, 是否数组: ${Array.isArray(data)}`);
      
      // 验证数据格式
      if (!Array.isArray(data)) {
        console.error('❌ 静态导入的数据不是数组格式，无法获取家谱数据');
        return [];
      }
      
      console.log(`✅ 静态导入数据格式正确，包含 ${data.length} 条记录`);

      if (!data || data.length === 0) {
        console.error('❌ 原始家谱数据为空');
        return [];
      }

      // 为数据添加租户信息和时间戳
      const dataWithMeta = data.map(item => ({
        ...item,
        tenant_id: currentTenantId,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));

      // 数据校验
      const validationResult = this.validateFamilyData(dataWithMeta);
      if (!validationResult.isValid) {
        console.warn('⚠️ [第3层] 原始数据校验发现问题:', validationResult.issues);
      } else {
        console.log('✅ [第3层] 原始数据校验通过');
      }

      console.log(`📊 [第3层] 加载原始数据完成: ${dataWithMeta.length} 条记录 (租户: ${currentTenantId})`);
      return dataWithMeta;
    } catch (error) {
      console.error('❌ [第3层] 加载原始家谱数据失败:', error);
      return [];
    }
  }

  /**
   * 校验家谱数据完整性
   * @param {Array} familyData - 家谱数据
   * @returns {Object} - 校验结果
   */
  validateFamilyData(familyData) {
    const issues = [];
    const personIds = new Set(familyData.map(p => p.id));

    // 检查必要字段
    familyData.forEach(person => {
      if (!person.id) {
        issues.push(`缺少ID字段: ${JSON.stringify(person)}`);
        return;
      }

      if (!person.name || person.name.trim() === '') {
        issues.push(`ID ${person.id} 缺少姓名`);
      }

      if (!person.g_rank || person.g_rank < 1) {
        issues.push(`${person.name} (ID: ${person.id}) 的代数信息异常: ${person.g_rank}`);
      }

      // 检查父亲ID是否存在（除了根节点）
      if (person.g_father_id && person.g_father_id !== 0 && !personIds.has(person.g_father_id)) {
        issues.push(`${person.name} (ID: ${person.id}) 的父亲ID ${person.g_father_id} 不存在`);
      }
    });

    // 检查穆毅鹏是否存在
    const muYiPeng = familyData.find(p => p.name === '穆毅鹏');
    if (!muYiPeng) {
      issues.push('未找到当前登录用户: 穆毅鹏');
    } else {
      console.log(`✅ 找到当前用户: ${muYiPeng.name} (ID: ${muYiPeng.id}, 第${muYiPeng.g_rank}代)`);
    }

    // 检查根节点
    const rootNodes = familyData.filter(p => p.g_father_id === 0 || !p.g_father_id);
    if (rootNodes.length === 0) {
      issues.push('未找到根节点');
    } else {
      console.log(`✅ 找到根节点: ${rootNodes.map(r => r.name).join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalRecords: familyData.length,
      generations: Math.max(...familyData.map(p => p.g_rank || 0)),
      rootNodes: rootNodes.length,
      currentUser: muYiPeng
    };
  }

  /**
   * 获取家谱统计信息
   * @param {Array} familyData - 家谱数据（可选，如果不提供会自动获取）
   * @returns {Promise<Object>} - 统计信息
   */
  async getFamilyStatistics(familyData = null) {
    const currentTenantId = tenantService.getCurrentTenant().id;
    const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_STATISTICS, currentTenantId);
    
    // 先检查内存缓存
    const cachedStats = memoryCache.get(cacheKey);
    if (cachedStats) {
      console.log('📊 从内存缓存加载统计信息');
      return cachedStats;
    }

    // 如果没有提供数据，先获取数据
    if (!familyData) {
      familyData = await this.getFamilyData();
    }

    // 计算统计信息
    const stats = this.calculateStatistics(familyData);
    
    // 缓存统计信息
    memoryCache.set(cacheKey, stats, CACHE_EXPIRY.STATISTICS);
    
    console.log('📊 统计信息计算完成');
    return stats;
  }

  /**
   * 计算家谱统计信息
   * @param {Array} familyData - 家谱数据
   * @returns {Object} - 统计信息
   */
  calculateStatistics(familyData) {
    const stats = {
      totalMembers: familyData.length,
      maleCount: 0,
      femaleCount: 0,
      generations: 0,
      averageChildrenPerFamily: 0,
      oldestMember: null,
      youngestMember: null
    };

    let totalChildren = 0;
    let familiesWithChildren = 0;
    const generationSet = new Set();

    familyData.forEach(person => {
      // 性别统计
      if (person.gender === 'M' || person.gender === 'male' || person.gender === '男') {
        stats.maleCount++;
      } else if (person.gender === 'F' || person.gender === 'female' || person.gender === '女') {
        stats.femaleCount++;
      }

      // 代数统计
      if (person.g_rank) {
        generationSet.add(person.g_rank);
      }

      // 子女统计
      const children = familyData.filter(child => child.g_father_id === person.id);
      if (children.length > 0) {
        totalChildren += children.length;
        familiesWithChildren++;
      }

      // 年龄统计（如果有出生日期）
      if (person.birthDate) {
        if (!stats.oldestMember || person.birthDate < stats.oldestMember.birthDate) {
          stats.oldestMember = person;
        }
        if (!stats.youngestMember || person.birthDate > stats.youngestMember.birthDate) {
          stats.youngestMember = person;
        }
      }
    });

    stats.generations = Math.max(...generationSet);
    stats.averageChildrenPerFamily = familiesWithChildren > 0 
      ? (totalChildren / familiesWithChildren).toFixed(2) 
      : 0;

    return stats;
  }

  /**
   * 获取处理后的数据（用于特定的筛选和搜索）
   * @param {string} cacheKey - 缓存键
   * @param {Function} processor - 数据处理函数
   * @param {Array} familyData - 家谱数据
   * @returns {Promise<any>} - 处理后的数据
   */
  async getProcessedData(cacheKey, processor, familyData = null) {
    const currentTenantId = tenantService.getCurrentTenant().id;
    const fullCacheKey = getTenantCacheKey(`${CACHE_KEYS.PROCESSED_DATA}_${cacheKey}`, currentTenantId);
    
    // 检查内存缓存
    const cachedData = memoryCache.get(fullCacheKey);
    if (cachedData) {
      console.log(`📦 从内存缓存加载处理数据: ${cacheKey}`);
      return cachedData;
    }

    // 如果没有提供数据，先获取数据
    if (!familyData) {
      familyData = await this.getFamilyData();
    }

    // 处理数据
    const processedData = await processor(familyData);
    
    // 缓存处理结果
    memoryCache.set(fullCacheKey, processedData, CACHE_EXPIRY.PROCESSED_DATA);
    
    console.log(`✅ 数据处理完成并缓存: ${cacheKey}`);
    return processedData;
  }

  /**
   * 预加载数据（应用启动时调用）
   */
  async preloadData() {
    try {
      console.log('🚀 [3层架构] 开始预加载家谱数据...');
      
      // 预加载主要数据
      const familyData = await this.getFamilyData();
      
      // 预计算统计信息
      await this.getFamilyStatistics(familyData);
      
      console.log('✅ [3层架构] 数据预加载完成');
      
      // 显示内存缓存统计
      const cacheStats = memoryCache.getStats();
      console.log('📊 内存缓存统计:', cacheStats);
      
    } catch (error) {
      console.error('❌ 数据预加载失败:', error);
    }
  }

  /**
   * 刷新内存缓存
   */
  async refreshCache() {
    console.log('🔄 刷新内存缓存...');
    
    // 清除内存缓存
    memoryCache.clear();
    
    // 重新加载数据
    await this.preloadData();
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo() {
    return {
      stats: memoryCache.getStats(),
      keys: CACHE_KEYS,
      expiry: CACHE_EXPIRY
    };
  }

  /**
   * 清除所有内存缓存
   */
  clearAllCache() {
    memoryCache.clear();
    console.log('🗑️ 所有内存缓存已清除');
  }

  /**
   * 保存家谱数据
   * @param {Array} familyData - 家谱数据
   * @param {string} tenantId - 租户ID
   * @returns {Promise<boolean>} - 是否保存成功
   */
  async saveFamilyData(familyData, tenantId = null) {
    try {
      // 检查用户是否已登录
      const isAuthenticated = !!localStorage.getItem('token');
      if (!isAuthenticated) {
        throw new Error('需要登录才能保存家谱数据');
      }

      const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
      console.log(`💾 保存家谱数据 (租户: ${currentTenantId}, 记录数: ${familyData.length})`);

      // 添加租户信息到每条记录
      const dataWithTenant = familyData.map(item => ({
        ...item,
        tenant_id: currentTenantId,
        updated_at: new Date().toISOString(),
      }));

      // 保存到数据库服务器 (第2层持久化)
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('需要登录才能保存家谱数据');
      }

      const response = await fetch(`/api/family-data/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': currentTenantId,
          'X-Tenant-Name': encodeURIComponent(tenantService.getCurrentTenant().name || ''),
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          familyData: familyData, // 使用原始数据，不带tenant_id
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`数据库保存失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [第2层] 数据已保存到数据库:', result.message);
      
      // 清除内存缓存，强制重新加载
      this.clearAllCache();
      
      // 触发数据更新事件
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('familyDataUpdated', {
          detail: {
            tenantId: currentTenantId,
            dataCount: familyData.length,
            timestamp: new Date().toISOString()
          }
        }));
      }

      console.log('✅ 家谱数据保存完成');
      return true;
    } catch (error) {
      console.error('❌ 保存家谱数据失败:', error);
      throw error;
    }
  }

  /**
   * 强制刷新所有数据
   */
  async forceRefreshAll() {
    console.log('🔄 开始强制刷新所有数据...');

    try {
      const currentTenantId = tenantService.getCurrentTenant().id;

      // 清除当前租户的内存缓存
      Object.values(CACHE_KEYS).forEach(key => {
        const tenantCacheKey = getTenantCacheKey(key, currentTenantId);
        memoryCache.delete(tenantCacheKey);
      });
      console.log(`🗑️ 租户 ${currentTenantId} 的内存缓存已清除`);

      // 重新加载数据
      const data = await this.getFamilyData(true);

      // 重新计算统计信息
      await this.getFamilyStatistics(data);

      console.log('✅ 数据刷新完成');
      return data;
    } catch (error) {
      console.error('❌ 强制刷新失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const familyDataService = new FamilyDataService();

export default familyDataService;