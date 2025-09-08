/**
 * 通义千问API测试组件
 * 用于直接测试通义千问VL-Max API的连接和响应
 */

import React, { useState } from 'react';
import { Card, Button, Input, Alert, Typography, Space, Spin } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const QwenAPITester = () => {
  const [testing, setTesting] = useState(false);
  const [testImageUrl, setTestImageUrl] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  // 获取配置信息
  const getConfig = () => {
    return {
      apiKey: process.env.REACT_APP_QWEN_API_KEY,
      model: process.env.REACT_APP_QWEN_MODEL || 'qwen-vl-max',
      endpoint: process.env.REACT_APP_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    };
  };

  // 测试通义千问API
  const testQwenAPI = async () => {
    if (!testImageUrl.trim()) {
      setError('请输入图片URL');
      return;
    }

    setTesting(true);
    setError(null);
    setApiResponse(null);

    try {
      const config = getConfig();
      
      if (!config.apiKey) {
        throw new Error('未配置通义千问API Key');
      }

      console.log('🚀 开始测试通义千问API...');
      console.log('🔑 API Key:', config.apiKey.substring(0, 8) + '...');
      console.log('🖼️ 测试图片:', testImageUrl);

      const requestBody = {
        model: config.model,
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  text: `请仔细分析这张家谱图片，提取其中的人物信息。请严格按照以下JSON数组格式返回数据，不要添加任何其他文字说明：

[
  {
    "id": 数字ID(从1开始递增),
    "name": "人物姓名",
    "g_rank": 世代数字(1表示第一代),
    "rank_index": 在同代中的排序(1,2,3...),
    "g_father_id": 父亲的ID(如果是第一代则为0),
    "official_position": "官职或职位(如'明·禀膳生赠宁津主簿')",
    "summary": "人物描述或生平简介",
    "adoption": "none",
    "sex": "性别('MAN'或'WOMAN')",
    "g_mother_id": null,
    "birth_date": "出生日期(如果有)",
    "id_card": null,
    "face_img": null,
    "photos": null,
    "household_info": null,
    "spouse": "配偶姓名(如果有)",
    "home_page": null,
    "dealth": "如果已故则为'dealth'，否则为null",
    "formal_name": "正式姓名(如果有)",
    "location": "籍贯或居住地(如果有)",
    "childrens": "子女姓名列表，用逗号分隔(如果有)"
  }
]

请开始分析并直接返回JSON数组：`
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
          max_tokens: 1000,
          temperature: 0.1
        }
      };

      console.log('📤 发送请求:', requestBody);

      const startTime = Date.now();
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify(requestBody)
      });

      const duration = Date.now() - startTime;
      console.log(`📡 响应时间: ${duration}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API请求失败:', errorText);
        throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ API响应成功:', result);

      setApiResponse({
        success: true,
        duration,
        data: result,
        content: result.output?.choices?.[0]?.message?.content || '无内容'
      });

    } catch (err) {
      console.error('❌ 测试失败:', err);
      setError(err.message);
      setApiResponse({
        success: false,
        error: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const config = getConfig();

  return (
    <Card title="通义千问API测试工具">
      {/* 配置状态 */}
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="配置状态"
          description={
            <div>
              <div>API Key: {config.apiKey ? `已配置 (${config.apiKey.substring(0, 8)}...)` : '未配置'}</div>
              <div>模型: {config.model}</div>
              <div>端点: {config.endpoint}</div>
            </div>
          }
          type={config.apiKey ? 'success' : 'error'}
          showIcon
        />
      </div>

      {/* 测试输入 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>测试图片URL</Title>
        <Input
          placeholder="请输入要测试的图片URL（支持OSS链接）"
          value={testImageUrl}
          onChange={(e) => setTestImageUrl(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <Text type="secondary">
          提示: 可以使用Step1上传到OSS的图片URL进行测试
        </Text>
      </div>

      {/* 测试按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={testing}
          onClick={testQwenAPI}
          disabled={!config.apiKey || !testImageUrl.trim()}
        >
          {testing ? '测试中...' : '测试API'}
        </Button>
      </div>

      {/* 错误显示 */}
      {error && (
        <Alert
          message="测试失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 响应结果 */}
      {apiResponse && (
        <Card size="small" title="API响应结果">
          {apiResponse.success ? (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong>测试成功</Text>
                  <Text type="secondary">响应时间: {apiResponse.duration}ms</Text>
                </Space>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>识别内容:</Title>
                <div style={{ 
                  padding: 12, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 4,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <Text>{apiResponse.content}</Text>
                </div>
              </div>

              <div>
                <Title level={5}>完整响应:</Title>
                <TextArea
                  value={JSON.stringify(apiResponse.data, null, 2)}
                  rows={10}
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
            </div>
          ) : (
            <div>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text strong>测试失败</Text>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="danger">{apiResponse.error}</Text>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 使用说明 */}
      <Card size="small" title="使用说明" style={{ marginTop: 16 }}>
        <ul>
          <li>确保已在.env文件中配置REACT_APP_QWEN_API_KEY</li>
          <li>输入有效的图片URL（建议使用OSS上传后的URL）</li>
          <li>点击"测试API"按钮进行测试</li>
          <li>查看API响应内容，验证识别效果</li>
          <li>如果测试成功，说明通义千问API配置正确</li>
        </ul>
      </Card>
    </Card>
  );
};

export default QwenAPITester;
