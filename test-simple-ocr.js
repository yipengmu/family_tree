/**
 * 简单的OCR测试
 */

const fetch = require('node-fetch');

async function testSimpleOCR() {
  console.log('🧪 简单OCR测试');
  
  try {
    const response = await fetch('http://localhost:3003/api/qwen/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: ['https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg'],
        tenantId: 'simple-test'
      }),
      timeout: 60000
    });

    console.log('响应状态:', response.status);
    const result = await response.json();
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testSimpleOCR();
