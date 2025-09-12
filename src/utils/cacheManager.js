/**
 * 前端缓存管理器
 * 支持内存缓存和LocalStorage持久化缓存
 * 专为家谱数据优化，支持版本控制和过期时间
 */

const CACHE_PREFIX = 'familyTree_';
const CACHE_VERSION = '1.0.0';
const DEFAULT_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24小时

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      storageHits: 0
    };
  }

  /**
   * 生成缓存键
   * @param {string} key - 原始键
   * @returns {string} - 带前缀的缓存键
   */
  getCacheKey(key) {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * 创建缓存项
   * @param {any} data - 要缓存的数据
   * @param {number} expireTime - 过期时间（毫秒）
   * @returns {Object} - 缓存项对象
   */
  createCacheItem(data, expireTime = DEFAULT_EXPIRE_TIME) {
    return {
      data,
      timestamp: Date.now(),
      expireTime,
      version: CACHE_VERSION,
      size: JSON.stringify(data).length
    };
  }

  /**
   * 检查缓存项是否过期
   * @param {Object} cacheItem - 缓存项
   * @returns {boolean} - 是否过期
   */
  isExpired(cacheItem) {
    if (!cacheItem || !cacheItem.timestamp) return true;
    return Date.now() - cacheItem.timestamp > cacheItem.expireTime;
  }

  /**
   * 检查缓存项版本是否匹配
   * @param {Object} cacheItem - 缓存项
   * @returns {boolean} - 版本是否匹配
   */
  isVersionValid(cacheItem) {
    return cacheItem && cacheItem.version === CACHE_VERSION;
  }

  /**
   * 设置内存缓存
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   * @param {number} expireTime - 过期时间
   */
  setMemoryCache(key, data, expireTime = DEFAULT_EXPIRE_TIME) {
    const cacheItem = this.createCacheItem(data, expireTime);
    this.memoryCache.set(key, cacheItem);
    
    // 内存缓存大小限制（最多100个项目）
    if (this.memoryCache.size > 100) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  /**
   * 获取内存缓存
   * @param {string} key - 缓存键
   * @returns {any|null} - 缓存的数据或null
   */
  getMemoryCache(key) {
    const cacheItem = this.memoryCache.get(key);
    
    if (!cacheItem) return null;
    
    if (this.isExpired(cacheItem) || !this.isVersionValid(cacheItem)) {
      this.memoryCache.delete(key);
      return null;
    }
    
    this.cacheStats.memoryHits++;
    return cacheItem.data;
  }

  /**
   * 设置LocalStorage缓存
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   * @param {number} expireTime - 过期时间
   */
  setStorageCache(key, data, expireTime = DEFAULT_EXPIRE_TIME) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cacheItem = this.createCacheItem(data, expireTime);
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`💾 数据已缓存到LocalStorage: ${key} (${(cacheItem.size / 1024).toFixed(2)}KB)`);
    } catch (error) {
      console.warn('LocalStorage缓存失败:', error);
      // 如果存储空间不足，清理旧缓存
      this.cleanupExpiredStorage();
    }
  }

  /**
   * 获取LocalStorage缓存
   * @param {string} key - 缓存键
   * @returns {any|null} - 缓存的数据或null
   */
  getStorageCache(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheItem = JSON.parse(cached);
      
      if (this.isExpired(cacheItem) || !this.isVersionValid(cacheItem)) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      this.cacheStats.storageHits++;
      return cacheItem.data;
    } catch (error) {
      console.warn('LocalStorage读取失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存（同时设置内存和存储缓存）
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   * @param {number} expireTime - 过期时间
   */
  set(key, data, expireTime = DEFAULT_EXPIRE_TIME) {
    this.setMemoryCache(key, data, expireTime);
    this.setStorageCache(key, data, expireTime);
  }

  /**
   * 获取缓存（优先内存，然后存储）
   * @param {string} key - 缓存键
   * @returns {any|null} - 缓存的数据或null
   */
  get(key) {
    // 优先检查内存缓存
    let data = this.getMemoryCache(key);
    if (data !== null) {
      this.cacheStats.hits++;
      return data;
    }
    
    // 检查LocalStorage缓存
    data = this.getStorageCache(key);
    if (data !== null) {
      // 将数据重新加载到内存缓存
      this.setMemoryCache(key, data);
      this.cacheStats.hits++;
      return data;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.memoryCache.delete(key);

    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('删除LocalStorage缓存失败:', error);
    }
  }

  /**
   * 删除缓存（remove方法，与delete方法功能相同）
   * @param {string} key - 缓存键
   */
  remove(key) {
    return this.delete(key);
  }

  /**
   * 清理过期的LocalStorage缓存
   */
  cleanupExpiredStorage() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const cacheItem = JSON.parse(cached);
              if (this.isExpired(cacheItem) || !this.isVersionValid(cacheItem)) {
                keysToRemove.push(key);
              }
            } catch (error) {
              keysToRemove.push(key); // 删除损坏的缓存项
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`🧹 清理了 ${keysToRemove.length} 个过期缓存项`);
      }
    } catch (error) {
      console.warn('清理过期缓存失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.memoryCache.clear();
    
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ 所有缓存已清空');
    } catch (error) {
      console.warn('清空缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} - 缓存统计
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      storageCacheSize: this.getStorageCacheSize()
    };
  }

  /**
   * 获取LocalStorage缓存大小
   * @returns {number} - 缓存项数量
   */
  getStorageCacheSize() {
    let count = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          count++;
        }
      }
    } catch (error) {
      console.warn('获取存储缓存大小失败:', error);
    }
    return count;
  }

  /**
   * 预热缓存（应用启动时调用）
   */
  warmup() {
    console.log('🔥 缓存预热开始');
    this.cleanupExpiredStorage();
    
    // 可以在这里预加载一些关键数据
    const stats = this.getStats();
    console.log('📊 缓存统计:', stats);
  }
}

// 创建单例实例
const cacheManager = new CacheManager();

export default cacheManager;
