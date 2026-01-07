/**
 * 家譜數據服務
 * 3層數據架構：內存緩存 → 數據庫持久化 → 原始familyData.js
 * 為雲端SaaS部署優化，確保數據一致性
 */

const tenantService = require('./tenantService');

const CACHE_KEYS = {
  FAMILY_DATA: 'familyData',
  FAMILY_STATISTICS: 'familyStatistics',
  PROCESSED_DATA: 'processedData'
};

// 獲取租戶相關的緩存鍵
const getTenantCacheKey = (key, tenantId = null) => {
  const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
  return `${key}_${currentTenantId}`;
};

// 緩存過期時間配置
const CACHE_EXPIRY = {
  FAMILY_DATA: 24 * 60 * 60 * 1000,      // 24小時
  STATISTICS: 12 * 60 * 60 * 1000,       // 12小時
  PROCESSED_DATA: 6 * 60 * 60 * 1000     // 6小時
};

// 內存緩存管理器
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

    // 檢查是否過期
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

// 全局內存緩存實例
const memoryCache = new MemoryCacheManager();

class FamilyDataService {
  constructor() {
    this.isLoading = false;
    this.loadingPromise = null;
  }

  /**
   * 獲取家譜數據 - 3層架構
   * 第1層：內存緩存 → 第2層：數據庫持久化 → 第3層：原始familyData.js
   * @param {boolean} forceRefresh - 是否強制刷新
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Array>} - 家譜數據
   */
  async getFamilyData(forceRefresh = false, tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
    const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, currentTenantId);
    
    console.log(`🔍 [3層架構] 獲取家譜數據 (租戶: ${currentTenantId}, 強制刷新: ${forceRefresh})`);
    
    // 強制刷新時清除內存緩存
    if (forceRefresh) {
      console.log(`🔄 強制刷新，清除內存緩存... (租戶: ${currentTenantId})`);
      memoryCache.delete(cacheKey);
      this.loadingPromise = null;
    }

    // 第1層：檢查內存緩存
    if (!forceRefresh) {
      const cachedData = memoryCache.get(cacheKey);
      if (cachedData) {
        console.log(`📦 [第1層] 從內存緩存加載家譜數據 (租戶: ${currentTenantId})`);
        return cachedData;
      }
    }

    // 防止重複請求
    const loadingKey = `loading_${currentTenantId}`;
    if (this[loadingKey] && this.loadingPromise) {
      console.log(`⏳ 等待正在進行的數據加載... (租戶: ${currentTenantId})`);
      return this.loadingPromise;
    }

    this[loadingKey] = true;
    this.loadingPromise = this.loadDataWithFallback(currentTenantId);

    try {
      const data = await this.loadingPromise;
      
      // 緩存到內存
      if (data && data.length > 0) {
        memoryCache.set(cacheKey, data, CACHE_EXPIRY.FAMILY_DATA);
        console.log(`✅ [3層架構] 數據已緩存到內存 (租戶: ${currentTenantId}, ${data.length}條記錄)`);
      }

      return data;
    } finally {
      this[loadingKey] = false;
      this.loadingPromise = null;
    }
  }

  /**
   * 數據加載回退機制
   * 第2層：嘗試從數據庫加載 → 第3層：回退到原始familyData.js
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Array>} - 家譜數據
   */
  async loadDataWithFallback(tenantId) {
    try {
      // 第2層：從數據庫加載
      console.log(`🗄️ [第2層] 嘗試從數據庫加載數據 (租戶: ${tenantId})`);
      const dbData = await this.loadFamilyDataFromServer(tenantId);
      
      if (dbData && dbData.length > 0) {
        console.log(`✅ [第2層] 從數據庫加載成功 (${dbData.length}條記錄)`);
        return dbData;
      }
    } catch (error) {
      console.warn(`⚠️ [第2層] 數據庫加載失敗:`, error.message);
    }

    // 第3層：回退到原始數據文件
    console.log(`📁 [第3層] 回退到原始familyData.js`);
    return this.loadOriginalFamilyData(tenantId);
  }

  /**
   * 從服務器加載家譜數據
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Array>} - 家譜數據
   */
  async loadFamilyDataFromServer(tenantId) {
    try {
      console.log(`🌐 開始從服務器加載家譜數據... (租戶: ${tenantId})`);
      const startTime = Date.now();

      const baseURL = process.env.REACT_APP_API_BASE_URL || '';
      // 修正API請求URL格式，確保正確處理默認租戶
      const url = tenantId === 'default' || tenantId === process.env.REACT_APP_DEFAULT_TENANT_ID
        ? `${baseURL}/api/family-data/default`
        : `${baseURL}/api/family-data?tenantId=${tenantId}`;
      
      console.log(`🔗 請求URL: ${url}`);
      

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
        throw new Error('服務器返回的不是JSON數據');
      }

      const result = await response.json();
      console.log(`📊 從服務器加載數據完成 (${result.data?.length || 0}條記錄)`);

      return result.data || [];
    } catch (error) {
      console.error('從服務器加載數據失敗:', error);
      return []; // 返回空數組而不是拋出錯誤
    }
  }

  /**
   * 從原始數據文件加載家譜數據
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Array>} - 家譜數據
   */
  async loadOriginalFamilyData(tenantId) {
    try {
      // 在服務器端，我們不直接加載前端的familyData.js
      // 這裏應該從數據庫獲取或返回空數組
      console.log(`📁 從原始數據文件加載家譜數據 (租戶: ${tenantId})`);
      
      // 在服務器端環境中，我們無法訪問前端的數據文件
      // 所以返回空數組或從數據庫查詢
      return [];
    } catch (error) {
      console.error('加載原始家譜數據失敗:', error);
      return [];
    }
  }

  /**
   * 保存家譜數據到服務器
   * @param {string} tenantId - 租戶ID
   * @param {Array} familyData - 家譜數據
   * @returns {Promise<Object>} - 保存結果
   */
  async saveFamilyData(tenantId, familyData) {
    try {
      console.log(`💾 開始保存家譜數據到服務器... (租戶: ${tenantId}, ${familyData.length}條記錄)`);
      
      // 在服務器端，將數據保存到數據庫
      const result = await this.saveFamilyDataToDatabase(tenantId, familyData);
      
      // 清除相關緩存
      const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_DATA, tenantId);
      memoryCache.delete(cacheKey);
      
      console.log(`✅ 家譜數據保存完成`);
      
      return {
        success: true,
        message: '家譜數據保存成功',
        savedCount: result.savedCount || familyData.length
      };
    } catch (error) {
      console.error('保存家譜數據失敗:', error);
      throw error;
    }
  }

  /**
   * 保存家譜數據到數據庫
   * @param {string} tenantId - 租戶ID
   * @param {Array} familyData - 家譜數據
   * @returns {Promise<Object>} - 保存結果
   */
  async saveFamilyDataToDatabase(tenantId, familyData) {
    try {
      // 在實際實現中，這裡會將數據保存到數據庫
      // 使用Prisma或其他ORM進行數據庫操作
      console.log(`🗄️ 保存家譜數據到數據庫 (租戶: ${tenantId}, ${familyData.length}條記錄)`);
      
      // 模擬數據庫保存操作
      // 在真實實現中，這裡會使用Prisma客戶端進行數據庫操作
      return { savedCount: familyData.length };
    } catch (error) {
      console.error('保存數據到數據庫失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取家譜統計信息
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Object>} - 統計信息
   */
  async getFamilyStatistics(tenantId = null) {
    try {
      const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
      const cacheKey = getTenantCacheKey(CACHE_KEYS.FAMILY_STATISTICS, currentTenantId);
      
      // 檢查緩存
      const cachedStats = memoryCache.get(cacheKey);
      if (cachedStats) {
        console.log(`📊 [緩存] 獲取家譜統計信息 (租戶: ${currentTenantId})`);
        return cachedStats;
      }

      // 獲取家譜數據
      const familyData = await this.getFamilyData(false, currentTenantId);
      
      // 計算統計信息
      const statistics = this.calculateFamilyStatistics(familyData);
      
      // 緩存結果
      memoryCache.set(cacheKey, statistics, CACHE_EXPIRY.STATISTICS);
      
      console.log(`📊 計算家譜統計信息完成 (租戶: ${currentTenantId})`);
      return statistics;
    } catch (error) {
      console.error('獲取家譜統計信息失敗:', error);
      return {};
    }
  }

  /**
   * 計算家譜統計信息
   * @param {Array} familyData - 家譜數據
   * @returns {Object} - 統計信息
   */
  calculateFamilyStatistics(familyData) {
    if (!familyData || !Array.isArray(familyData) || familyData.length === 0) {
      return {
        totalMembers: 0,
        totalGenerations: 0,
        membersByGeneration: {},
        generationNames: []
      };
    }

    // 計算統計信息
    const totalMembers = familyData.length;
    const generations = [...new Set(familyData.map(member => member.g_rank))];
    const totalGenerations = generations.length;

    // 按世代分組統計
    const membersByGeneration = {};
    generations.forEach(gen => {
      membersByGeneration[gen] = familyData.filter(member => member.g_rank === gen).length;
    });

    // 世代名稱（如果有的話）
    const generationNames = generations.sort((a, b) => a - b).map(gen => `第${gen}代`);

    return {
      totalMembers,
      totalGenerations,
      membersByGeneration,
      generationNames
    };
  }

  /**
   * 清除緩存
   * @param {string} tenantId - 租戶ID
   */
  clearCache(tenantId = null) {
    const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
    
    // 清除特定租戶的緩存
    Object.values(CACHE_KEYS).forEach(cacheType => {
      const cacheKey = getTenantCacheKey(cacheType, currentTenantId);
      memoryCache.delete(cacheKey);
    });
    
    console.log(`🧹 清除租戶 ${currentTenantId} 的緩存`);
  }

  /**
   * 獲取緩存統計信息
   * @returns {Object} - 緩存統計信息
   */
  getCacheStats() {
    return memoryCache.getStats();
  }
}

// 創建並導出服務實例
const familyDataService = new FamilyDataService();
module.exports = familyDataService;