/**
 * 启动脚本 - 同时启动前端和后端服务
 * 支持代理配置以解决跨域问题
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动家谱创作工具...');

// 检查是否有代理参数
const args = process.argv.slice(2);
const useProxy = args.includes('--proxy') || args.includes('-p');

if (useProxy) {
  console.log('🔌 使用代理模式启动...');
  
  // 启动后端服务
  const server = spawn('node', ['server/app.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  server.on('error', (err) => {
    console.error('❌ 后端服务启动失败:', err);
  });

  // 等待后端服务启动后，再启动前端
  setTimeout(() => {
    const frontend = spawn('npx', ['serve', '-s', 'build'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    frontend.on('error', (err) => {
      console.error('❌ 前端服务启动失败:', err);
      console.log('💡 提示: 请先运行 npm run build 构建项目');
    });
  }, 3000); // 等待3秒让后端服务启动
} else {
  console.log('⚡ 开发模式启动...');
  
  // 启动后端服务
  const server = spawn('node', ['server/app.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  server.on('error', (err) => {
    console.error('❌ 后端服务启动失败:', err);
  });

  // 启动前端开发服务器
  const frontend = spawn('npm', ['start'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      // 设置代理以解决跨域问题
      PROXY: 'http://localhost:3003'
    }
  });

  frontend.on('error', (err) => {
    console.error('❌ 前端开发服务启动失败:', err);
  });
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务...');
  process.exit(0);
});