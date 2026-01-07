/**
 * 部署检查脚本
 * 用于检查线上环境的配置是否正确
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始检查部署配置...');

// 检查 .env 文件是否存在
const envFile = path.join(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  console.log('✅ .env 文件存在');
  
  // 检查 .env 文件内容
  const envContent = fs.readFileSync(envFile, 'utf8');
  const hasJwtSecret = envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=your_secure_jwt_secret_key_here');
  
  if (hasJwtSecret) {
    console.log('✅ JWT_SECRET 已配置');
  } else {
    console.warn('⚠️ JWT_SECRET 未配置或使用默认值 - 请在线上环境中设置安全的JWT密钥');
  }
} else {
  console.warn('⚠️ .env 文件不存在 - 请创建 .env 文件并配置环境变量');
}

// 检查 package.json 中的 proxy 配置
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
if (packageJson.proxy) {
  console.log(`✅ 前端代理配置: ${packageJson.proxy}`);
} else {
  console.log('ℹ️ 前端未配置代理');
}

// 检查数据库文件是否存在
const dbPath = path.join(__dirname, '../server/data/family_tree.db');
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`✅ 数据库文件存在，大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
  console.warn('⚠️ 数据库文件不存在: server/data/family_tree.db');
}

// 检查线上域名是否在CORS配置中
const appJsPath = path.join(__dirname, '../server/app.js');
if (fs.existsSync(appJsPath)) {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const hasTatababaTop = appJsContent.includes('www.tatababa.top') || appJsContent.includes('tatababa.top');
  
  if (hasTatababaTop) {
    console.log('✅ CORS配置中包含线上域名');
  } else {
    console.warn('⚠️ CORS配置中未找到线上域名 tatababa.top 或 www.tatababa.top');
  }
}

// 检查 Node.js 版本
const nodeVersion = process.version;
console.log(`✅ Node.js 版本: ${nodeVersion}`);

// 检查依赖是否安装
try {
  execSync('npm list', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
  console.log('✅ 依赖已安装');
} catch (error) {
  console.warn('⚠️ 依赖可能未正确安装');
}

console.log('\n📋 部署检查完成');
console.log('\n💡 建议:');
console.log('1. 确保 .env 文件中设置了 JWT_SECRET');
console.log('2. 确保服务器使用 HTTPS 协议');
console.log('3. 确保 CORS 配置包含您的线上域名');
console.log('4. 确保数据库文件路径正确且有读写权限');