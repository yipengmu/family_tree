#!/usr/bin/env node

/**
 * OSS连接测试脚本
 * 用于快速测试和诊断OSS连接问题
 */

console.log('🚀 脚本开始执行...');

const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');

// 读取环境变量
require('dotenv').config();

console.log('📦 依赖加载完成...');

const config = {
  region: process.env.REACT_APP_OSS_REGION,
  bucket: process.env.REACT_APP_OSS_BUCKET,
  accessKeyId: process.env.REACT_APP_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.REACT_APP_OSS_ACCESS_KEY_SECRET,
  endpoint: process.env.REACT_APP_OSS_ENDPOINT,
  secure: true
};

console.log('🔍 OSS连接测试开始...\n');

// 显示配置信息（隐藏敏感信息）
console.log('📋 当前配置:');
console.log(`  Region: ${config.region}`);
console.log(`  Bucket: ${config.bucket}`);
console.log(`  Endpoint: ${config.endpoint}`);
console.log(`  AccessKey ID: ${config.accessKeyId ? config.accessKeyId.substring(0, 8) + '...' : '未配置'}`);
console.log(`  AccessKey Secret: ${config.accessKeySecret ? '已配置' : '未配置'}\n`);

async function testConnection() {
  try {
    // 1. 配置验证
    console.log('1️⃣ 配置验证...');
    const missingConfig = [];
    if (!config.region) missingConfig.push('REACT_APP_OSS_REGION');
    if (!config.bucket) missingConfig.push('REACT_APP_OSS_BUCKET');
    if (!config.accessKeyId) missingConfig.push('REACT_APP_OSS_ACCESS_KEY_ID');
    if (!config.accessKeySecret) missingConfig.push('REACT_APP_OSS_ACCESS_KEY_SECRET');
    
    if (missingConfig.length > 0) {
      console.log('❌ 配置不完整，缺少:', missingConfig.join(', '));
      return;
    }
    console.log('✅ 配置验证通过\n');

    // 2. 创建OSS客户端（使用优化配置）
    console.log('2️⃣ 创建OSS客户端...');
    const client = new OSS({
      ...config,
      timeout: 120000, // 120秒超时
      // 连接池配置
      agent: {
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 10,
        maxFreeSockets: 10,
        timeout: 120000,
        freeSocketTimeout: 30000,
      }
    });
    console.log('✅ OSS客户端创建成功\n');

    // 3. 测试认证
    console.log('3️⃣ 测试认证...');
    const startTime = Date.now();
    try {
      const bucketInfo = await client.getBucketInfo();
      const duration = Date.now() - startTime;
      console.log(`✅ 认证成功 (耗时: ${duration}ms)`);
      console.log(`   Bucket: ${bucketInfo.bucket.name}`);
      console.log(`   区域: ${bucketInfo.bucket.region}\n`);
    } catch (error) {
      console.log(`❌ 认证失败: ${error.message}`);
      if (error.code === 'InvalidAccessKeyId') {
        console.log('💡 建议: 检查AccessKey ID是否正确');
      } else if (error.code === 'SignatureDoesNotMatch') {
        console.log('💡 建议: 检查AccessKey Secret是否正确');
      } else if (error.code === 'NoSuchBucket') {
        console.log('💡 建议: 检查Bucket名称是否正确');
      }
      return;
    }

    // 4. 测试上传
    console.log('4️⃣ 测试上传...');
    const testContent = `OSS连接测试 - ${new Date().toISOString()}`;
    const testKey = `family-tree/test/connection-test-${Date.now()}.txt`;
    
    try {
      const uploadStart = Date.now();
      await client.put(testKey, Buffer.from(testContent));
      const uploadDuration = Date.now() - uploadStart;
      console.log(`✅ 上传测试成功 (耗时: ${uploadDuration}ms)`);
      
      // 立即删除测试文件
      await client.delete(testKey);
      console.log('🗑️ 测试文件已清理\n');
      
      if (uploadDuration > 10000) {
        console.log('⚠️ 上传速度较慢，可能影响用户体验');
        console.log('💡 建议: 检查网络环境或考虑使用CDN加速\n');
      }
    } catch (error) {
      console.log(`❌ 上传测试失败: ${error.message}`);
      
      if (error.code === 'ConnectionTimeoutError') {
        console.log('💡 这是您遇到的问题！连接超时解决方案:');
        console.log('   • 检查网络连接是否稳定');
        console.log('   • 尝试更换网络环境（如使用手机热点）');
        console.log('   • 确认防火墙或代理设置');
        console.log('   • 代码已更新，增加了重试机制和更长的超时时间');
      } else if (error.code === 'RequestTimeoutError') {
        console.log('💡 建议: 请求超时，稍后重试');
      }
      return;
    }

    // 5. 性能测试
    console.log('5️⃣ 性能测试...');
    const performanceTests = [];
    
    for (let i = 0; i < 3; i++) {
      const testStart = Date.now();
      try {
        await client.getBucketInfo();
        const testDuration = Date.now() - testStart;
        performanceTests.push(testDuration);
      } catch (error) {
        console.log(`❌ 性能测试 ${i + 1} 失败: ${error.message}`);
      }
    }
    
    if (performanceTests.length > 0) {
      const avgDuration = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
      console.log(`✅ 平均响应时间: ${Math.round(avgDuration)}ms`);
      
      if (avgDuration > 3000) {
        console.log('⚠️ 响应时间较长，可能影响用户体验');
        console.log('💡 建议: 考虑使用更近的OSS区域或CDN加速');
      }
    }

    console.log('\n🎉 所有测试完成！OSS连接正常。');
    console.log('\n📝 已应用的优化:');
    console.log('   • 增加超时时间到120秒');
    console.log('   • 添加连接池配置');
    console.log('   • 实现重试机制');
    console.log('   • 改进错误处理');

  } catch (error) {
    console.log(`❌ 测试过程中发生错误: ${error.message}`);
    console.log('\n🔧 故障排除建议:');
    console.log('   • 检查网络连接');
    console.log('   • 验证OSS配置');
    console.log('   • 确认防火墙设置');
    console.log('   • 尝试更换网络环境');
  }
}

// 运行测试
testConnection().catch(console.error);
