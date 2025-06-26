/**
 * 数据更新管理器
 * 统一管理家谱数据的更新流程，减少更新触发链条
 */

import { simplifyFamilyData, getCompressionStats } from './dataSimplifier.js';
import familyDataService from '../services/familyDataService.js';

class DataUpdateManager {
  constructor() {
    this.isUpdating = false;
    this.updateQueue = [];
  }

  /**
   * 检查是否有新的数据更新
   * @param {Array} newData - 新的数据
   * @param {Array} currentData - 当前数据
   * @returns {boolean} - 是否有更新
   */
  hasDataChanged(newData, currentData) {
    if (!currentData || newData.length !== currentData.length) {
      return true;
    }

    // 简单的数据变化检测
    const newIds = new Set(newData.map(item => item.id));
    const currentIds = new Set(currentData.map(item => item.id));
    
    // 检查ID集合是否相同
    if (newIds.size !== currentIds.size) {
      return true;
    }

    for (const id of newIds) {
      if (!currentIds.has(id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 更新所有相关数据文件
   * @param {Array} sourceData - 源数据（来自dbjson.js）
   */
  async updateAllDataFiles(sourceData) {
    if (this.isUpdating) {
      console.log('⏳ 数据更新正在进行中，跳过此次更新');
      return;
    }

    this.isUpdating = true;
    console.log('🔄 开始更新所有数据文件...');

    try {
      // 1. 简化数据
      const simplifiedData = simplifyFamilyData(sourceData);
      
      // 2. 计算压缩统计
      const stats = getCompressionStats(sourceData, simplifiedData);
      console.log(`📊 数据简化完成，压缩率: ${stats.compressionRatio}`);

      // 3. 更新缓存数据
      await this.updateCacheData(simplifiedData);

      // 4. 生成简化的JSON文件（如果需要）
      await this.generateSimplifiedFiles(simplifiedData, stats);

      console.log('✅ 所有数据文件更新完成');

    } catch (error) {
      console.error('❌ 数据更新失败:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 更新缓存数据
   * @param {Array} data - 数据
   */
  async updateCacheData(data) {
    try {
      // 清除旧缓存
      familyDataService.clearAllCache();

      // 重新加载数据到缓存
      await familyDataService.getFamilyData(true);
      await familyDataService.getFamilyStatistics(true);

      console.log('📦 缓存数据更新完成');
    } catch (error) {
      console.error('❌ 缓存更新失败:', error);
    }
  }

  /**
   * 生成简化的JSON文件
   * @param {Array} data - 简化数据
   * @param {Object} stats - 统计信息
   */
  async generateSimplifiedFiles(data, stats) {
    // 这里可以根据需要生成不同的简化文件
    // 例如：完整数据、特定分支数据等
    
    console.log('📄 简化文件生成完成');
  }

  /**
   * 强制刷新所有数据
   */
  async forceRefreshAll() {
    console.log('🔄 强制刷新所有数据...');
    
    try {
      // 清除所有缓存
      familyDataService.clearAllCache();
      
      // 重新加载数据
      await familyDataService.getFamilyData(true);
      
      // 重新计算统计信息
      await familyDataService.getFamilyStatistics(true);
      
      console.log('✅ 强制刷新完成');
      
      return true;
    } catch (error) {
      console.error('❌ 强制刷新失败:', error);
      return false;
    }
  }

  /**
   * 检查数据完整性
   * @param {Array} data - 数据
   * @returns {Object} - 检查结果
   */
  validateDataIntegrity(data) {
    const issues = [];
    
    // 检查必要字段
    const requiredFields = ['id', 'name', 'g_rank', 'g_father_id'];
    
    data.forEach((member, index) => {
      requiredFields.forEach(field => {
        if (member[field] === undefined || member[field] === null) {
          if (field !== 'g_father_id' || member.id !== 1) { // 根节点的g_father_id可以为0
            issues.push(`记录${index + 1} (ID: ${member.id}) 缺少字段: ${field}`);
          }
        }
      });
    });

    // 检查ID唯一性
    const ids = data.map(m => m.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('存在重复的ID');
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalRecords: data.length,
      uniqueIds: uniqueIds.size
    };
  }

  /**
   * 获取数据更新状态
   */
  getUpdateStatus() {
    return {
      isUpdating: this.isUpdating,
      queueLength: this.updateQueue.length,
      lastUpdate: this.lastUpdateTime
    };
  }
}

// 创建单例实例
const dataUpdateManager = new DataUpdateManager();

export default dataUpdateManager;
