/**
 * 搜索历史管理工具
 * 使用 IndexedDB 进行持久化存储，支持数据分析
 */

const DB_NAME = 'FamilyTreeDB';
const DB_VERSION = 1;
const STORE_NAME = 'searchHistory';
const MAX_HISTORY_COUNT = 10;

class SearchHistoryManager {
  constructor() {
    this.db = null;
    this.initDB();
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 初始化成功');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建搜索历史表
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // 创建索引
          store.createIndex('searchTerm', 'searchTerm', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('resultCount', 'resultCount', { unique: false });
          
          console.log('搜索历史表创建成功');
        }
      };
    });
  }

  /**
   * 添加搜索记录
   * @param {string} searchTerm - 搜索关键词
   * @param {number} resultCount - 搜索结果数量
   * @param {Object} targetPerson - 搜索到的目标人员（如果只有一个结果）
   */
  async addSearchRecord(searchTerm, resultCount, targetPerson = null) {
    if (!this.db || !searchTerm.trim()) return;

    try {
      const record = {
        searchTerm: searchTerm.trim(),
        timestamp: new Date().toISOString(),
        resultCount,
        targetPerson: targetPerson ? {
          id: targetPerson.id,
          name: targetPerson.name,
          rank: targetPerson.rank,
          officialPosition: targetPerson.officialPosition
        } : null,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      };

      // 使用Promise包装事务
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => {
          console.log('搜索记录已保存:', record);
          resolve();
        };

        transaction.onerror = () => {
          console.error('保存搜索记录失败:', transaction.error);
          reject(transaction.error);
        };

        store.add(record);
      });

      // 在新的事务中清理旧记录
      await this.cleanupOldRecords();

    } catch (error) {
      console.error('保存搜索记录失败:', error);
    }
  }

  /**
   * 获取搜索历史
   * @param {number} limit - 返回记录数量限制
   * @returns {Array} 搜索历史记录
   */
  async getSearchHistory(limit = MAX_HISTORY_COUNT) {
    if (!this.db) return [];

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      const request = index.openCursor(null, 'prev'); // 按时间倒序
      const records = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && records.length < limit) {
            records.push(cursor.value);
            cursor.continue();
          } else {
            resolve(records);
          }
        };

        request.onerror = () => {
          console.error('获取搜索历史失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('获取搜索历史失败:', error);
      return [];
    }
  }

  /**
   * 获取热门搜索词
   * @param {number} limit - 返回数量限制
   * @returns {Array} 热门搜索词统计
   */
  async getPopularSearchTerms(limit = 5) {
    if (!this.db) return [];

    try {
      const allRecords = await this.getAllRecords();
      const termCounts = {};

      // 统计搜索词频率
      allRecords.forEach(record => {
        const term = record.searchTerm.toLowerCase();
        termCounts[term] = (termCounts[term] || 0) + 1;
      });

      // 排序并返回前N个
      return Object.entries(termCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([term, count]) => ({ term, count }));
    } catch (error) {
      console.error('获取热门搜索词失败:', error);
      return [];
    }
  }

  /**
   * 清理旧记录
   */
  async cleanupOldRecords() {
    if (!this.db) return;

    try {
      const allRecords = await this.getAllRecords();

      if (allRecords.length > MAX_HISTORY_COUNT) {
        // 删除最旧的记录
        const recordsToDelete = allRecords
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(0, allRecords.length - MAX_HISTORY_COUNT);

        // 使用新的事务删除记录
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          let deletedCount = 0;

          transaction.oncomplete = () => {
            console.log(`清理了 ${deletedCount} 条旧搜索记录`);
            resolve();
          };

          transaction.onerror = () => {
            console.error('清理旧记录失败:', transaction.error);
            reject(transaction.error);
          };

          // 批量删除记录
          recordsToDelete.forEach(record => {
            const deleteRequest = store.delete(record.id);
            deleteRequest.onsuccess = () => {
              deletedCount++;
            };
          });
        });
      }
    } catch (error) {
      console.error('清理旧记录失败:', error);
    }
  }

  /**
   * 获取所有记录（内部使用）
   */
  async getAllRecords() {
    if (!this.db) return [];

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error('获取所有记录失败:', request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('事务失败:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('获取所有记录失败:', error);
      return [];
    }
  }

  /**
   * 获取会话ID（用于数据分析）
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('familyTreeSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('familyTreeSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * 清空所有搜索历史
   */
  async clearAllHistory() {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
      console.log('搜索历史已清空');
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  }

  /**
   * 获取搜索统计数据
   */
  async getSearchStatistics() {
    if (!this.db) return null;

    try {
      const allRecords = await this.getAllRecords();
      
      const stats = {
        totalSearches: allRecords.length,
        uniqueTerms: new Set(allRecords.map(r => r.searchTerm.toLowerCase())).size,
        averageResultCount: allRecords.length > 0 
          ? allRecords.reduce((sum, r) => sum + r.resultCount, 0) / allRecords.length 
          : 0,
        searchesWithResults: allRecords.filter(r => r.resultCount > 0).length,
        searchesWithSingleResult: allRecords.filter(r => r.resultCount === 1).length,
        lastSearchTime: allRecords.length > 0 
          ? Math.max(...allRecords.map(r => new Date(r.timestamp).getTime()))
          : null
      };

      return stats;
    } catch (error) {
      console.error('获取搜索统计失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const searchHistoryManager = new SearchHistoryManager();

export default searchHistoryManager;
