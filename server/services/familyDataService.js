const getDatabase = require('../models/database');

class FamilyDataService {
  constructor() {
    this.db = null;
  }

  async getDB() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  // 保存家谱数据到数据库
  async saveFamilyData(tenantId, familyData) {
    try {
      console.log(`📊 开始保存家谱数据到数据库，租户: ${tenantId}, 数据条数: ${familyData.length}`);

      const db = await this.getDB();
      await db.beginTransaction();

      try {
        // 1. 删除该租户的现有数据
        await db.run('DELETE FROM family_data WHERE tenant_id = ?', [tenantId]);
        console.log(`🗑️ 已清理租户 ${tenantId} 的现有数据`);

        // 2. 插入新数据
        const insertSQL = `
          INSERT INTO family_data (
            tenant_id, person_id, name, g_rank, rank_index, g_father_id, g_mother_id,
            sex, adoption, official_position, summary, birth_date, death_date,
            spouse, location, formal_name, id_card, face_img, photos,
            household_info, home_page, childrens
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let savedCount = 0;
        for (const person of familyData) {
          const params = [
            tenantId,
            person.id || person.person_id,
            person.name,
            person.g_rank,
            person.rank_index || 1,
            person.g_father_id || null,
            person.g_mother_id || null,
            person.sex || 'MAN',
            person.adoption || 'none',
            person.official_position || '',
            person.summary || '',
            person.birth_date || null,
            person.dealth === 'alive' ? null : person.dealth, // 处理death_date字段
            person.spouse || null,
            person.location || '',
            person.formal_name || person.name,
            person.id_card || null,
            person.face_img || null,
            person.photos || null,
            person.household_info || null,
            person.home_page || null,
            person.childrens || null
          ];

          await db.run(insertSQL, params);
          savedCount++;
        }

        // 3. 创建数据版本快照
        await this.createDataSnapshot(tenantId, familyData, `保存 ${savedCount} 条家谱记录`);

        await db.commit();
        console.log(`✅ 成功保存 ${savedCount} 条家谱数据到数据库`);
        
        return {
          success: true,
          savedCount,
          message: `成功保存 ${savedCount} 条家谱记录`
        };

      } catch (error) {
        await db.rollback();
        throw error;
      }

    } catch (error) {
      console.error('❌ 保存家谱数据失败:', error);
      throw new Error(`保存家谱数据失败: ${error.message}`);
    }
  }

  // 获取家谱数据
  async getFamilyData(tenantId) {
    try {
      console.log(`📖 获取租户 ${tenantId} 的家谱数据`);

      const db = await this.getDB();

      const sql = `
        SELECT
          person_id as id,
          name,
          g_rank,
          rank_index,
          g_father_id,
          g_mother_id,
          sex,
          adoption,
          official_position,
          summary,
          birth_date,
          death_date as dealth,
          spouse,
          location,
          formal_name,
          id_card,
          face_img,
          photos,
          household_info,
          home_page,
          childrens,
          created_at,
          updated_at
        FROM family_data
        WHERE tenant_id = ?
        ORDER BY g_rank, rank_index, id
      `;

      const rows = await db.query(sql, [tenantId]);
      
      // 处理数据格式
      const familyData = rows.map(row => ({
        ...row,
        key: `person_${row.id}`,
        dealth: row.dealth || null, // null表示去世，'alive'表示在世
        g_father_id: row.g_father_id || 0,
        g_mother_id: row.g_mother_id || null
      }));

      console.log(`✅ 获取到 ${familyData.length} 条家谱记录`);
      return familyData;

    } catch (error) {
      console.error('❌ 获取家谱数据失败:', error);
      throw new Error(`获取家谱数据失败: ${error.message}`);
    }
  }

  // 创建数据快照
  async createDataSnapshot(tenantId, data, description = '') {
    try {
      // 获取当前最大版本号
      const maxVersionRow = await this.db.get(
        'SELECT MAX(version_number) as max_version FROM data_versions WHERE tenant_id = ?',
        [tenantId]
      );
      
      const nextVersion = (maxVersionRow?.max_version || 0) + 1;
      
      // 保存数据快照
      await this.db.run(
        'INSERT INTO data_versions (tenant_id, version_number, data_snapshot, description) VALUES (?, ?, ?, ?)',
        [tenantId, nextVersion, JSON.stringify(data), description]
      );

      console.log(`📸 创建数据快照 v${nextVersion}: ${description}`);
      return nextVersion;

    } catch (error) {
      console.error('❌ 创建数据快照失败:', error);
      throw error;
    }
  }

  // 获取数据版本历史
  async getDataVersions(tenantId, limit = 10) {
    try {
      const sql = `
        SELECT version_number, description, created_at
        FROM data_versions 
        WHERE tenant_id = ? 
        ORDER BY version_number DESC 
        LIMIT ?
      `;

      const versions = await this.db.query(sql, [tenantId, limit]);
      return versions;

    } catch (error) {
      console.error('❌ 获取数据版本失败:', error);
      throw error;
    }
  }

  // 恢复到指定版本
  async restoreToVersion(tenantId, versionNumber) {
    try {
      console.log(`🔄 恢复租户 ${tenantId} 数据到版本 ${versionNumber}`);

      // 获取指定版本的数据
      const versionRow = await this.db.get(
        'SELECT data_snapshot FROM data_versions WHERE tenant_id = ? AND version_number = ?',
        [tenantId, versionNumber]
      );

      if (!versionRow) {
        throw new Error(`版本 ${versionNumber} 不存在`);
      }

      const snapshotData = JSON.parse(versionRow.data_snapshot);
      
      // 保存数据（这会创建新的快照）
      await this.saveFamilyData(tenantId, snapshotData);
      
      console.log(`✅ 成功恢复到版本 ${versionNumber}`);
      return snapshotData;

    } catch (error) {
      console.error('❌ 恢复数据版本失败:', error);
      throw error;
    }
  }

  // 获取家谱统计信息
  async getFamilyStats(tenantId) {
    try {
      const stats = {};

      // 总人数
      const totalRow = await this.db.get(
        'SELECT COUNT(*) as total FROM family_data WHERE tenant_id = ?',
        [tenantId]
      );
      stats.totalPeople = totalRow.total;

      // 按世代统计
      const generationRows = await this.db.query(
        'SELECT g_rank, COUNT(*) as count FROM family_data WHERE tenant_id = ? GROUP BY g_rank ORDER BY g_rank',
        [tenantId]
      );
      stats.byGeneration = generationRows;

      // 按性别统计
      const genderRows = await this.db.query(
        'SELECT sex, COUNT(*) as count FROM family_data WHERE tenant_id = ? GROUP BY sex',
        [tenantId]
      );
      stats.byGender = genderRows;

      // 最新更新时间
      const lastUpdateRow = await this.db.get(
        'SELECT MAX(updated_at) as last_update FROM family_data WHERE tenant_id = ?',
        [tenantId]
      );
      stats.lastUpdate = lastUpdateRow.last_update;

      return stats;

    } catch (error) {
      console.error('❌ 获取家谱统计失败:', error);
      throw error;
    }
  }

  // 搜索家谱成员
  async searchFamilyMembers(tenantId, keyword) {
    try {
      const sql = `
        SELECT person_id as id, name, g_rank, official_position, summary, location
        FROM family_data 
        WHERE tenant_id = ? 
        AND (name LIKE ? OR official_position LIKE ? OR summary LIKE ? OR location LIKE ?)
        ORDER BY g_rank, rank_index
      `;

      const searchTerm = `%${keyword}%`;
      const results = await this.db.query(sql, [tenantId, searchTerm, searchTerm, searchTerm, searchTerm]);
      
      return results;

    } catch (error) {
      console.error('❌ 搜索家谱成员失败:', error);
      throw error;
    }
  }
}

module.exports = new FamilyDataService();
