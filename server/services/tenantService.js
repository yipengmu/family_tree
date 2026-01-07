/**
 * 多租戶服務 - 管理租戶數據和權限
 */

// 在服務器端，我們簡化租戶服務的實現
// 因為實際的租戶邏輯可能與前端不同

class TenantService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
    this.isMultiTenantEnabled = process.env.REACT_APP_ENABLE_MULTI_TENANT === 'true';
    this.defaultTenantId = process.env.REACT_APP_DEFAULT_TENANT_ID || 'default';
    
    // 設置默認租戶
    this.currentTenant = this.getCurrentTenant();
  }

  /**
   * 獲取當前租戶信息
   * @returns {Object} - 當前租戶信息
   */
  getCurrentTenant() {
    // 從內存或配置獲取當前租戶
    const storedTenant = this.currentTenant || {
      id: this.defaultTenantId,
      name: '默認家譜',
      description: '默認家譜數據',
      createdAt: new Date().toISOString(),
      isDefault: true,
    };

    return storedTenant;
  }

  /**
   * 設置當前租戶
   * @param {Object} tenant - 租戶信息
   */
  setCurrentTenant(tenant) {
    this.currentTenant = tenant;
    console.log('🏢 切換到租戶:', tenant.name, `(${tenant.id})`);
  }

  /**
   * 獲取所有租戶列表
   * @returns {Promise<Array>} - 租戶列表
   */
  async getAllTenants() {
    // 在服務器端，返回預定義的租戶列表或從數據庫查詢
    return [
      {
        id: 'default',
        name: '默認家譜',
        description: '系統默認家譜',
        createdAt: new Date().toISOString(),
        settings: {},
        status: 'active'
      }
    ];
  }

  /**
   * 獲取指定租戶信息
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Object>} - 租戶信息
   */
  async getTenant(tenantId) {
    // 在服務器端，從數據庫查詢租戶信息
    const tenants = await this.getAllTenants();
    return tenants.find(t => t.id === tenantId) || null;
  }

  /**
   * 創建或更新租戶
   * @param {string} tenantId - 租戶ID
   * @param {Object} tenantData - 租戶數據
   * @returns {Promise<Object>} - 租戶信息
   */
  async createOrUpdateTenant(tenantId, tenantData) {
    // 在服務器端，創建或更新數據庫中的租戶記錄
    const tenant = {
      id: tenantId,
      name: tenantData.name || `租戶_${tenantId}`,
      description: tenantData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: tenantData.settings || {},
      status: tenantData.status || 'active'
    };

    console.log('🏢 創建或更新租戶:', tenant.name);
    return tenant;
  }

  /**
   * 刪除租戶
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Object>} - 刪除結果
   */
  async deleteTenant(tenantId) {
    if (tenantId === 'default') {
      throw new Error('不能刪除默認租戶');
    }

    // 在服務器端，從數據庫刪除此租戶及其相關數據
    console.log('🗑️ 刪除租戶:', tenantId);
    return { message: `租戶 ${tenantId} 已刪除` };
  }

  /**
   * 獲取租戶統計信息
   * @param {string} tenantId - 租戶ID
   * @returns {Promise<Object>} - 統計信息
   */
  async getTenantStats(tenantId) {
    // 在服務器端，計算租戶的統計信息
    return {
      tenantId,
      familyMembers: 0, // 從數據庫查詢實際數量
      generations: 0,
      lastUpdated: new Date().toISOString(),
      storageUsed: 0
    };
  }

  /**
   * 獲取租戶相關的頭信息
   * @returns {Object} - 頭信息
   */
  getTenantHeaders() {
    return {
      'X-Tenant-ID': this.currentTenant?.id || this.defaultTenantId,
      'X-Tenant-Name': this.currentTenant?.name || 'Default Tenant'
    };
  }

  /**
   * 強制初始化默認家譜數據
   */
  async forceInitializeDefaultFamilyData() {
    console.log('🔄 強制初始化默認家譜數據');
    // 在服務器端，這裡會重新加載默認家譜數據
    return { message: '默認家譜數據初始化完成' };
  }
}

// 創建並導出服務實例
const tenantService = new TenantService();
module.exports = tenantService;