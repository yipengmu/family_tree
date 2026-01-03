/**
 * 测试新的时间戳格式
 */

// 获取精简时间戳的工具函数
function getTimestamp() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

console.log('测试新的时间戳格式:');
console.log(`[${getTimestamp()}] 这是一条测试日志`);
console.log(`[${getTimestamp()}] 🔧 服务初始化...`);
console.log(`[${getTimestamp()}] 📤 发送请求...`);
console.log(`[${getTimestamp()}] ✅ 请求成功`);
console.log(`[${getTimestamp()}] ❌ 请求失败`);

console.log('\n对比旧格式:');
console.log(`[${new Date().toISOString()}] 这是旧的ISO时间戳格式`);

console.log('\n新格式优势:');
console.log('- 更简洁，只显示时分秒和毫秒');
console.log('- 便于快速定位问题发生的时间');
console.log('- 减少日志行长度，提高可读性');
