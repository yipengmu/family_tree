const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../data/family_tree.db');
    this.initialized = false;
  }

  async init() {
    // 确保数据目录存在
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 连接数据库
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite数据库连接成功');
          try {
            await this.createTables();
            resolve();
          } catch (tableErr) {
            reject(tableErr);
          }
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      // 租户表
      const createTenantsTable = `
        CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          settings TEXT DEFAULT '{}',
          status TEXT DEFAULT 'active'
        )
      `;

      // 家谱数据表
      const createFamilyDataTable = `
        CREATE TABLE IF NOT EXISTS family_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          person_id TEXT NOT NULL,
          name TEXT NOT NULL,
          g_rank INTEGER NOT NULL,
          rank_index INTEGER NOT NULL,
          g_father_id TEXT,
          g_mother_id TEXT,
          sex TEXT DEFAULT 'MAN',
          adoption TEXT DEFAULT 'none',
          official_position TEXT,
          summary TEXT,
          birth_date TEXT,
          death_date TEXT,
          spouse TEXT,
          location TEXT,
          formal_name TEXT,
          id_card TEXT,
          face_img TEXT,
          photos TEXT,
          household_info TEXT,
          home_page TEXT,
          childrens TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id),
          UNIQUE(tenant_id, person_id)
        )
      `;

      // 家谱配置表
      const createFamilyConfigTable = `
        CREATE TABLE IF NOT EXISTS family_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          config_key TEXT NOT NULL,
          config_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id),
          UNIQUE(tenant_id, config_key)
        )
      `;

      // 数据版本表（用于同步和备份）
      const createDataVersionTable = `
        CREATE TABLE IF NOT EXISTS data_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          data_snapshot TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        )
      `;

      // 执行建表语句
      this.db.serialize(() => {
        this.db.run(createTenantsTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createFamilyDataTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createFamilyConfigTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createDataVersionTable, (err) => {
          if (err) return reject(err);
        });

        // 创建索引
        this.db.run('CREATE INDEX IF NOT EXISTS idx_family_data_tenant ON family_data(tenant_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_family_data_rank ON family_data(tenant_id, g_rank)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_family_config_tenant ON family_config(tenant_id)', (err) => {
          if (err) return reject(err);
          console.log('✅ 数据库表结构初始化完成');
          resolve();
        });
      });
    });
  }

  // 获取数据库实例
  getDB() {
    return this.db;
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库失败:', err.message);
        } else {
          console.log('✅ 数据库连接已关闭');
        }
      });
    }
  }

  // 执行查询
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 执行单条查询
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 执行更新/插入
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // 开始事务
  beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  // 提交事务
  commit() {
    return this.run('COMMIT');
  }

  // 回滚事务
  rollback() {
    return this.run('ROLLBACK');
  }
}

// 单例模式
let instance = null;

async function getDatabase() {
  if (!instance) {
    instance = new Database();
    await instance.init();
  }
  return instance;
}

module.exports = getDatabase;
