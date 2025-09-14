const getDatabase = require('../models/database');

class TenantService {
  constructor() {
    this.db = null;
  }

  async getDB() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  // 创建或更新租户
  async createOrUpdateTenant(tenantId, tenantData) {
    try {
      console.log(`🏢 创建或更新租户: ${tenantId}`);

      const db = await this.getDB();
      const { name, description, settings = {} } = tenantData;

      // 检查租户是否存在
      const existingTenant = await db.get(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (existingTenant) {
        // 更新现有租户
        await db.run(
          'UPDATE tenants SET name = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, description, JSON.stringify(settings), tenantId]
        );
        console.log(`✅ 租户 ${tenantId} 更新成功`);
      } else {
        // 创建新租户
        await db.run(
          'INSERT INTO tenants (id, name, description, settings) VALUES (?, ?, ?, ?)',
          [tenantId, name, description, JSON.stringify(settings)]
        );
        console.log(`✅ 租户 ${tenantId} 创建成功`);
      }

      return await this.getTenant(tenantId);

    } catch (error) {
      console.error('❌ 创建或更新租户失败:', error);
      throw new Error(`租户操作失败: ${error.message}`);
    }
  }

  // 获取租户信息
  async getTenant(tenantId) {
    try {
      const db = await this.getDB();
      const tenant = await db.get(
        'SELECT * FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (!tenant) {
        return null;
      }

      // 解析设置JSON
      tenant.settings = JSON.parse(tenant.settings || '{}');
      
      return tenant;

    } catch (error) {
      console.error('❌ 获取租户信息失败:', error);
      throw new Error(`获取租户信息失败: ${error.message}`);
    }
  }

  // 获取所有租户列表
  async getAllTenants() {
    try {
      const db = await this.getDB();
      const tenants = await db.query(
        'SELECT id, name, description, created_at, updated_at, status FROM tenants ORDER BY updated_at DESC'
      );

      return tenants;

    } catch (error) {
      console.error('❌ 获取租户列表失败:', error);
      throw new Error(`获取租户列表失败: ${error.message}`);
    }
  }

  // 删除租户（软删除）
  async deleteTenant(tenantId) {
    try {
      console.log(`🗑️ 删除租户: ${tenantId}`);

      await this.db.beginTransaction();

      try {
        // 软删除租户
        await this.db.run(
          'UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['deleted', tenantId]
        );

        // 可选：同时删除相关数据（根据业务需求决定）
        // await this.db.run('DELETE FROM family_data WHERE tenant_id = ?', [tenantId]);
        // await this.db.run('DELETE FROM family_config WHERE tenant_id = ?', [tenantId]);
        // await this.db.run('DELETE FROM data_versions WHERE tenant_id = ?', [tenantId]);

        await this.db.commit();
        console.log(`✅ 租户 ${tenantId} 删除成功`);

        return { success: true, message: '租户删除成功' };

      } catch (error) {
        await this.db.rollback();
        throw error;
      }

    } catch (error) {
      console.error('❌ 删除租户失败:', error);
      throw new Error(`删除租户失败: ${error.message}`);
    }
  }

  // 保存租户配置
  async saveTenantConfig(tenantId, configKey, configValue) {
    try {
      console.log(`⚙️ 保存租户配置: ${tenantId} - ${configKey}`);

      const db = await this.getDB();
      // 使用 UPSERT 语法（SQLite 3.24+）
      await db.run(`
        INSERT INTO family_config (tenant_id, config_key, config_value) 
        VALUES (?, ?, ?)
        ON CONFLICT(tenant_id, config_key) 
        DO UPDATE SET config_value = ?, updated_at = CURRENT_TIMESTAMP
      `, [tenantId, configKey, configValue, configValue]);

      console.log(`✅ 配置保存成功: ${configKey}`);
      return { success: true };

    } catch (error) {
      console.error('❌ 保存租户配置失败:', error);
      throw new Error(`保存配置失败: ${error.message}`);
    }
  }

  // 获取租户配置
  async getTenantConfig(tenantId, configKey = null) {
    try {
      const db = await this.getDB();
      if (configKey) {
        // 获取特定配置
        const config = await db.get(
          'SELECT config_value FROM family_config WHERE tenant_id = ? AND config_key = ?',
          [tenantId, configKey]
        );
        return config ? config.config_value : null;
      } else {
        // 获取所有配置
        const configs = await db.query(
          'SELECT config_key, config_value FROM family_config WHERE tenant_id = ?',
          [tenantId]
        );
        
        // 转换为对象格式
        const configObj = {};
        configs.forEach(config => {
          configObj[config.config_key] = config.config_value;
        });
        
        return configObj;
      }

    } catch (error) {
      console.error('❌ 获取租户配置失败:', error);
      throw new Error(`获取配置失败: ${error.message}`);
    }
  }

  // 获取租户统计信息
  async getTenantStats(tenantId) {
    try {
      const db = await this.getDB();
      const stats = {};

      // 家谱数据统计
      const familyDataCount = await db.get(
        'SELECT COUNT(*) as count FROM family_data WHERE tenant_id = ?',
        [tenantId]
      );
      stats.familyDataCount = familyDataCount.count;

      // 配置项统计
      const configCount = await db.get(
        'SELECT COUNT(*) as count FROM family_config WHERE tenant_id = ?',
        [tenantId]
      );
      stats.configCount = configCount.count;

      // 数据版本统计
      const versionCount = await db.get(
        'SELECT COUNT(*) as count FROM data_versions WHERE tenant_id = ?',
        [tenantId]
      );
      stats.versionCount = versionCount.count;

      // 最后更新时间
      const lastUpdate = await db.get(`
        SELECT MAX(updated_at) as last_update 
        FROM (
          SELECT updated_at FROM family_data WHERE tenant_id = ?
          UNION ALL
          SELECT updated_at FROM family_config WHERE tenant_id = ?
        )
      `, [tenantId, tenantId]);
      stats.lastUpdate = lastUpdate.last_update;

      return stats;

    } catch (error) {
      console.error('❌ 获取租户统计失败:', error);
      throw new Error(`获取租户统计失败: ${error.message}`);
    }
  }

  // 初始化默认租户
  async initializeDefaultTenants() {
    try {
      console.log('🏗️ 初始化默认租户...');

      const defaultTenants = [
        {
          id: 'default',
          name: '默认族谱',
          description: '系统默认族谱，用于演示和测试',
          settings: {
            theme: 'default',
            privacy: 'private',
            features: ['ocr', 'export', 'search']
          }
        }
      ];

      for (const tenant of defaultTenants) {
        await this.createOrUpdateTenant(tenant.id, tenant);
      }

      console.log('✅ 默认租户初始化完成');

    } catch (error) {
      console.error('❌ 初始化默认租户失败:', error);
      throw error;
    }
  }
}

module.exports = new TenantService();
