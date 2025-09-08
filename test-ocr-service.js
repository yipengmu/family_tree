/**
 * 测试OCR服务是否正确配置为只使用通义千问
 */

// 模拟环境变量
process.env.REACT_APP_QWEN_API_KEY = 'sk-1db5ff853f264069b67a7b74761578d2';

// 导入OCR服务
const path = require('path');
const fs = require('fs');

// 检查OCR服务文件内容
const ocrServicePath = path.join(__dirname, 'src/services/ocrService.js');
const ocrServiceContent = fs.readFileSync(ocrServicePath, 'utf8');

console.log('🔍 检查OCR服务配置...\n');

// 检查是否还有火山引擎相关代码
const volcanoReferences = [
  '火山引擎',
  'volcengine',
  'VOLC_',
  'accessKeyId',
  'secretAccessKey',
  'volcEndpoint'
];

let hasVolcanoCode = false;
volcanoReferences.forEach(ref => {
  if (ocrServiceContent.includes(ref)) {
    console.log(`❌ 发现火山引擎相关代码: ${ref}`);
    hasVolcanoCode = true;
  }
});

if (!hasVolcanoCode) {
  console.log('✅ 已清理所有火山引擎相关代码');
}

// 检查是否包含通义千问相关代码
const qwenReferences = [
  'qwenOcrService',
  'QWEN_API_KEY',
  '通义千问'
];

let hasQwenCode = false;
qwenReferences.forEach(ref => {
  if (ocrServiceContent.includes(ref)) {
    console.log(`✅ 包含通义千问相关代码: ${ref}`);
    hasQwenCode = true;
  }
});

if (!hasQwenCode) {
  console.log('❌ 缺少通义千问相关代码');
}

// 检查CreatorPage是否使用正确的方法名
const creatorPagePath = path.join(__dirname, 'src/components/Pages/CreatorPage.js');
const creatorPageContent = fs.readFileSync(creatorPagePath, 'utf8');

if (creatorPageContent.includes('runVolcengineOCR')) {
  console.log('❌ CreatorPage仍在使用runVolcengineOCR方法');
} else if (creatorPageContent.includes('runQwenOCR')) {
  console.log('✅ CreatorPage已更新为使用runQwenOCR方法');
} else {
  console.log('⚠️ CreatorPage中未找到OCR调用方法');
}

console.log('\n📊 检查结果:');
console.log(`  火山引擎代码清理: ${hasVolcanoCode ? '❌ 未完成' : '✅ 已完成'}`);
console.log(`  通义千问代码集成: ${hasQwenCode ? '✅ 已完成' : '❌ 未完成'}`);

if (!hasVolcanoCode && hasQwenCode) {
  console.log('\n🎉 OCR服务已成功配置为只使用通义千问VL-Max！');
  console.log('\n📝 下一步:');
  console.log('1. 启动代理服务器: npm run test-proxy');
  console.log('2. 启动前端应用: npm start');
  console.log('3. 测试OCR识别功能');
} else {
  console.log('\n⚠️ 配置可能存在问题，请检查上述错误');
}
