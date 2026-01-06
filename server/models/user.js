const getDatabase = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = {
  // 创建用户表
  async initializeTable() {
    const dbInstance = await getDatabase();
    const db = dbInstance.getDB();
    
    return new Promise((resolve, reject) => {
      const createUserTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME,
          wechat_openid VARCHAR(64) UNIQUE
        )
      `;
      
      db.run(createUserTable, (err) => {
        if (err) {
          console.error('创建用户表失败:', err);
          reject(err);
        } else {
          console.log('✅ 用户表创建成功或已存在');
          resolve();
        }
      });
    });
  },

  // 创建用户
  async create(userData) {
    const dbInstance = await getDatabase();
    const db = dbInstance.getDB();
    const { username, email, password } = userData;
    
    // 对密码进行哈希加密
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, password_hash],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
    
    // 获取新创建的用户信息
    const newUser = await this.findById(result.id);
    return newUser;
  },

  // 根据邮箱查找用户
  async findByEmail(email) {
    const dbInstance = await getDatabase();
    const db = dbInstance.getDB();
    
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    return user;
  },

  // 根据ID查找用户
  async findById(id) {
    const dbInstance = await getDatabase();
    const db = dbInstance.getDB();
    
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, email, is_active, created_at, last_login_at FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    return user;
  },

  // 更新最后登录时间
  async updateLastLogin(userId) {
    const dbInstance = await getDatabase();
    const db = dbInstance.getDB();
    
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  // 验证密码
  async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }
};

module.exports = User;