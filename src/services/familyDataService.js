/**
 * 家谱数据服务
 * 集成缓存机制，提供高性能的数据访问
 */

import cacheManager from '../utils/cacheManager';
import tenantService from './tenantService';

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

class FamilyDataService {
  constructor() {
    this.isLoading = false;
    this.loadingPromise = null;
  }

  /**
   * 获取原始家谱数据
   * @param {boolean} forceRefresh - 是否强制刷新
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 家谱数据
   */
  async getFamilyData(forceRefresh = false, tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
    const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, currentTenantId);

    // 如果不强制刷新，先检查缓存
    if (!forceRefresh) {
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData) {
        console.log(`📦 从缓存加载家谱数据 (租户: ${currentTenantId})`);
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
    this.loadingPromise = this.loadFamilyDataFromServer(currentTenantId);

    try {
      const data = await this.loadingPromise;

      // 缓存数据
      cacheManager.set(cacheKey, data, CACHE_EXPIRY.FAMILY_DATA);

      console.log(`🌐 从服务器加载家谱数据完成 (租户: ${currentTenantId})`);
      return data;
    } finally {
      this[loadingKey] = false;
      this.loadingPromise = null;
    }
  }

  /**
   * 从服务器加载家谱数据
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 家谱数据
   */
  async loadFamilyDataFromServer(tenantId) {
    try {
      console.log(`🌐 开始从服务器加载家谱数据... (租户: ${tenantId})`);
      const startTime = Date.now();

      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      const url = `${baseURL}/api/family-data?tenantId=${tenantId}`;

      const response = await fetch(url, {
        headers: {
          ...tenantService.getTenantHeaders(),
        },
      });

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

      // 如果网络请求失败，尝试从租户缓存获取旧数据
      const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, tenantId);
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData) {
        console.log(`🔄 网络失败，使用缓存数据 (租户: ${tenantId})`);
        return cachedData;
      }

      // 如果没有缓存数据，使用本地数据
      console.log(`📝 使用本地数据 (租户: ${tenantId})`);
      return this.getLocalFamilyData(tenantId);
    }
  }

  /**
   * 获取本地家谱数据
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 家谱数据
   */
  getLocalFamilyData(tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;

    // 首先尝试从localStorage获取租户数据
    const localKey = `family_data_${currentTenantId}`;
    const storedData = localStorage.getItem(localKey);

    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log(`📊 从本地存储加载家谱数据: ${data.length} 条记录 (租户: ${currentTenantId})`);
        return data;
      } catch (error) {
        console.error('解析本地存储数据失败:', error);
      }
    }

    // 如果是默认租户且没有本地数据，使用内置数据
    if (currentTenantId === 'default' || currentTenantId === process.env.REACT_APP_DEFAULT_TENANT_ID) {
      const dbJson = require('../data/familyData.js');
      const data = dbJson.default || dbJson;

      // 为默认数据添加租户信息
      const dataWithTenant = data.map(item => ({
        ...item,
        tenant_id: currentTenantId,
      }));

      // 数据校验
      const validationResult = this.validateFamilyData(dataWithTenant);
      if (!validationResult.isValid) {
        console.warn('⚠️ 家谱数据校验发现问题:', validationResult.issues);
      } else {
        console.log('✅ 家谱数据校验通过');
      }

      console.log(`📊 加载默认家谱数据: ${dataWithTenant.length} 条记录 (租户: ${currentTenantId})`);
      return dataWithTenant;
    }

    // 其他租户返回空数组
    console.log(`📊 租户 ${currentTenantId} 暂无数据`);
    return [];
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
    // 先检查缓存
    const cachedStats = cacheManager.get(CACHE_KEYS.FAMILY_STATISTICS);
    if (cachedStats) {
      console.log('📊 从缓存加载统计信息');
      return cachedStats;
    }

    // 如果没有提供数据，先获取数据
    if (!familyData) {
      familyData = await this.getFamilyData();
    }

    // 计算统计信息
    const stats = this.calculateStatistics(familyData);
    
    // 缓存统计信息
    cacheManager.set(CACHE_KEYS.FAMILY_STATISTICS, stats, CACHE_EXPIRY.STATISTICS);
    
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
    const fullCacheKey = `${CACHE_KEYS.PROCESSED_DATA}_${cacheKey}`;
    
    // 检查缓存
    const cachedData = cacheManager.get(fullCacheKey);
    if (cachedData) {
      console.log(`📦 从缓存加载处理数据: ${cacheKey}`);
      return cachedData;
    }

    // 如果没有提供数据，先获取数据
    if (!familyData) {
      familyData = await this.getFamilyData();
    }

    // 处理数据
    const processedData = await processor(familyData);
    
    // 缓存处理结果
    cacheManager.set(fullCacheKey, processedData, CACHE_EXPIRY.PROCESSED_DATA);
    
    console.log(`✅ 数据处理完成并缓存: ${cacheKey}`);
    return processedData;
  }

  /**
   * 预加载数据（应用启动时调用）
   */
  async preloadData() {
    try {
      console.log('🚀 开始预加载家谱数据...');
      
      // 预加载主要数据
      const familyData = await this.getFamilyData();
      
      // 预计算统计信息
      await this.getFamilyStatistics(familyData);
      
      console.log('✅ 数据预加载完成');
      
      // 显示缓存统计
      const cacheStats = cacheManager.getStats();
      console.log('📊 缓存统计:', cacheStats);
      
    } catch (error) {
      console.error('❌ 数据预加载失败:', error);
    }
  }

  /**
   * 刷新缓存
   */
  async refreshCache() {
    console.log('🔄 刷新缓存...');
    
    // 清除相关缓存
    cacheManager.delete(CACHE_KEYS.FAMILY_DATA);
    cacheManager.delete(CACHE_KEYS.FAMILY_STATISTICS);
    
    // 清除所有处理数据缓存
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(CACHE_KEYS.PROCESSED_DATA)) {
        cacheManager.delete(key.replace('familyTree_', ''));
      }
    });
    
    // 重新加载数据
    await this.preloadData();
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo() {
    return {
      stats: cacheManager.getStats(),
      keys: CACHE_KEYS,
      expiry: CACHE_EXPIRY
    };
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    Object.values(CACHE_KEYS).forEach(key => {
      cacheManager.delete(key);
    });
    console.log('🗑️ 所有缓存已清除');
  }

  /**
   * 保存家谱数据
   * @param {Array} familyData - 家谱数据
   * @param {string} tenantId - 租户ID
   * @returns {Promise<boolean>} - 是否保存成功
   */
  async saveFamilyData(familyData, tenantId = null) {
    try {
      const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
      console.log(`💾 保存家谱数据 (租户: ${currentTenantId}, 记录数: ${familyData.length})`);

      // 添加租户信息到每条记录
      const dataWithTenant = familyData.map(item => ({
        ...item,
        tenant_id: currentTenantId,
        updated_at: new Date().toISOString(),
      }));

      // 如果有后端API，保存到服务器
      const baseURL = process.env.REACT_APP_API_BASE_URL;
      if (baseURL) {
        try {
          const response = await fetch(`${baseURL}/api/family-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...tenantService.getTenantHeaders(),
            },
            body: JSON.stringify({
              data: dataWithTenant,
              tenantId: currentTenantId,
            }),
          });

          if (!response.ok) {
            throw new Error(`服务器保存失败: ${response.status}`);
          }

          console.log('✅ 数据已保存到服务器');
        } catch (error) {
          console.warn('⚠️ 服务器保存失败，保存到本地:', error);
        }
      }

      // 保存到本地存储
      const localKey = `family_data_${currentTenantId}`;
      localStorage.setItem(localKey, JSON.stringify(dataWithTenant));

      // 更新缓存
      const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, currentTenantId);
      cacheManager.set(cacheKey, dataWithTenant, CACHE_EXPIRY.FAMILY_DATA);

      // 清除统计缓存，强制重新计算
      const statsCacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_STATISTICS, currentTenantId);
      cacheManager.remove(statsCacheKey);

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

      // 清除当前租户的缓存
      Object.values(CACHE_KEYS).forEach(key => {
        const tenantCacheKey = getTenantCacheKey(key, currentTenantId);
        cacheManager.delete(tenantCacheKey);
      });
      console.log(`🗑️ 租户 ${currentTenantId} 的缓存已清除`);

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
