/**
 * 一键启动脚本 - 自动启动代理服务器和前端
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 一键启动家谱OCR系统...\n');

// 启动代理服务器
console.log('📡 启动代理服务器...');
const proxy = spawn('node', ['start-proxy-only.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// 等待2秒后启动前端
setTimeout(() => {
  console.log('\n🖥️ 启动前端应用...');
  const frontend = spawn('npm', ['start'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });

  // 处理退出
  process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务...');
    proxy.kill();
    frontend.kill();
    process.exit(0);
  });

}, 2000);

console.log('\n📋 服务信息:');
console.log('  代理服务器: http://localhost:3001');
console.log('  前端应用: http://localhost:3000');
console.log('\n按 Ctrl+C 停止所有服务');
