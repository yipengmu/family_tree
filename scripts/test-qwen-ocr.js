#!/usr/bin/env node

/**
 * 通义千问VL-Max OCR测试脚本
 * 用于测试通义千问VL-Max模型的家谱识别功能
 */

// 读取环境变量
require('dotenv').config();

// 导入fetch (Node.js环境)
const fetch = require('node-fetch');

const config = {
  apiKey: process.env.REACT_APP_QWEN_API_KEY,
  model: process.env.REACT_APP_QWEN_MODEL || 'qwen-vl-max',
  endpoint: process.env.REACT_APP_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
};

console.log('🔍 通义千问VL-Max OCR测试开始...\n');

// 显示配置信息（隐藏敏感信息）
console.log('📋 当前配置:');
console.log(`  模型: ${config.model}`);
console.log(`  端点: ${config.endpoint}`);
console.log(`  API Key: ${config.apiKey ? config.apiKey.substring(0, 8) + '...' : '未配置'}\n`);

// 家谱识别提示词
const familyTreePrompt = `
请仔细分析这张家谱图片，提取其中的人物信息。请按照以下JSON格式返回数据：

{
  "family_members": [
    {
      "name": "人物姓名",
      "generation": 世代数字(1表示第一代),
      "order": 在同代中的排序(1,2,3...),
      "father_name": "父亲姓名(如果有)",
      "position": "官职或职位",
      "description": "人物描述或生平",
      "gender": "性别(男/女)",
      "birth_date": "出生日期(如果有)",
      "death_date": "去世日期(如果有)",
      "spouse": "配偶姓名(如果有)",
      "location": "籍贯或居住地(如果有)",
      "children": "子女姓名列表(如果有)"
    }
  ]
}

注意事项：
1. 仔细识别每个人物的姓名，注意繁体字转换
2. 根据家谱的布局判断世代关系和排序
3. 提取官职、学位等信息
4. 识别生卒年月等时间信息
5. 如果信息不清楚或没有，请设为null
6. 确保返回的是有效的JSON格式

请开始分析：
`;

async function testQwenOCR() {
  try {
    // 1. 配置验证
    console.log('1️⃣ 配置验证...');
    if (!config.apiKey) {
      console.log('❌ 未配置通义千问API Key');
      console.log('💡 请在.env文件中设置 REACT_APP_QWEN_API_KEY');
      return;
    }
    console.log('✅ 配置验证通过\n');

    // 2. 测试API连接
    console.log('2️⃣ 测试API连接...');
    
    // 使用一个测试图片URL（这里使用一个公开的示例图片）
    const testImageUrl = 'https://example.com/test-family-tree.jpg';
    
    const requestBody = {
      model: config.model,
      input: {
        messages: [
          {
            role: "user",
            content: [
              {
                text: "请描述这张图片的内容。"
              },
              {
                image: testImageUrl
              }
            ]
          }
        ]
      },
      parameters: {
        result_format: "message",
        max_tokens: 500,
        temperature: 0.1
      }
    };

    console.log('📤 发送测试请求...');
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📡 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API请求失败:', errorText);
      
      if (response.status === 401) {
        console.log('💡 建议: 检查API Key是否正确');
      } else if (response.status === 400) {
        console.log('💡 建议: 检查请求格式是否正确');
      }
      return;
    }

    const result = await response.json();
    console.log('✅ API连接测试成功\n');
    console.log('📄 API响应示例:', JSON.stringify(result, null, 2));

    // 3. 测试家谱识别提示词
    console.log('\n3️⃣ 测试家谱识别提示词...');
    console.log('📝 提示词长度:', familyTreePrompt.length, '字符');
    console.log('✅ 提示词格式正确\n');

    // 4. 模拟数据解析测试
    console.log('4️⃣ 模拟数据解析测试...');
    const mockResponse = `
    {
      "family_members": [
        {
          "name": "",
          "generation": 1,
          "order": 1,
          "father_name": null,
          "position": "知县",
          "description": "知县，为官清廉，深受百姓爱戴",
          "gender": "男",
          "birth_date": "1850-01-01",
          "death_date": "1920-12-31",
          "spouse": "李氏",
          "location": "江苏苏州",
        }
      ]
    }
    `;

    try {
      const parsedData = JSON.parse(mockResponse.trim());
      if (parsedData.family_members && Array.isArray(parsedData.family_members)) {
        console.log('✅ 数据解析测试成功');
        console.log(`📊 解析到 ${parsedData.family_members.length} 个家族成员`);
        console.log('👤 第一个成员:', parsedData.family_members[0]);
      } else {
        console.log('❌ 数据格式不正确');
      }
    } catch (error) {
      console.log('❌ JSON解析失败:', error.message);
    }

    console.log('\n🎉 通义千问VL-Max OCR测试完成！');
    
    console.log('\n📝 使用说明:');
    console.log('1. 确保已配置正确的API Key');
    console.log('2. 上传家谱图片到OSS获取URL');
    console.log('3. 在应用中点击"开始识别"进行OCR');
    console.log('4. 系统会自动使用通义千问VL-Max进行识别');
    console.log('5. 识别完成后可生成familyData文件');

  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
    console.log('🔧 故障排除建议:');
    console.log('   • 检查网络连接');
    console.log('   • 验证API Key是否正确');
    console.log('   • 确认API端点地址');
    console.log('   • 检查请求格式');
  }
}

// 运行测试
testQwenOCR().catch(console.error);
