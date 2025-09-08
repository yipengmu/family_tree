/**
 * 服务状态检查组件
 * 检查代理服务器和OCR服务的状态
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, Spin, Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const ServiceStatusChecker = () => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState({
    proxyServer: null,
    qwenConfig: null,
    lastCheck: null
  });

  // 检查服务状态
  const checkServiceStatus = async () => {
    setChecking(true);
    
    const newStatus = {
      proxyServer: null,
      qwenConfig: null,
      lastCheck: new Date().toLocaleTimeString()
    };

    try {
      // 1. 检查通义千问配置
      console.log('🔍 检查通义千问配置...');
      const qwenApiKey = process.env.REACT_APP_QWEN_API_KEY;
      
      if (qwenApiKey) {
        newStatus.qwenConfig = {
          status: 'success',
          message: `API Key已配置 (${qwenApiKey.substring(0, 8)}...)`,
          hasKey: true
        };
      } else {
        newStatus.qwenConfig = {
          status: 'error',
          message: '未配置通义千问API Key',
          hasKey: false
        };
      }

      // 2. 检查代理服务器
      console.log('🔍 检查代理服务器...');
      try {
        const proxyUrl = process.env.REACT_APP_PROXY_ENDPOINT || 'http://localhost:3001/api/qwen/ocr';
        const healthUrl = proxyUrl.replace('/api/qwen/ocr', '/health');
        
        const response = await fetch(healthUrl, {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          newStatus.proxyServer = {
            status: 'success',
            message: '代理服务器运行正常',
            data: data,
            url: healthUrl
          };
        } else {
          newStatus.proxyServer = {
            status: 'error',
            message: `代理服务器响应异常: ${response.status}`,
            url: healthUrl
          };
        }
      } catch (proxyError) {
        newStatus.proxyServer = {
          status: 'error',
          message: '代理服务器未启动或无法访问',
          error: proxyError.message,
          url: 'http://localhost:3001'
        };
      }

    } catch (error) {
      console.error('❌ 状态检查失败:', error);
    } finally {
      setStatus(newStatus);
      setChecking(false);
    }
  };

  // 组件加载时自动检查
  useEffect(() => {
    checkServiceStatus();
  }, []);

  // 渲染状态标签
  const renderStatusTag = (status) => {
    switch (status) {
      case 'success':
        return <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>;
      case 'error':
        return <Tag color="error" icon={<CloseCircleOutlined />}>异常</Tag>;
      case 'warning':
        return <Tag color="warning" icon={<ExclamationCircleOutlined />}>警告</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 启动代理服务器的说明
  const renderProxyStartInstructions = () => (
    <Alert
      message="代理服务器未启动"
      description={
        <div>
          <p>请在新的终端窗口中运行以下命令启动代理服务器：</p>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            margin: '8px 0'
          }}>
            npm run test-proxy
          </div>
          <p>或者：</p>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            margin: '8px 0'
          }}>
            node test-proxy-startup.js
          </div>
          <p>启动后，您应该看到类似输出：</p>
          <div style={{ 
            backgroundColor: '#f0f0f0', 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontSize: '12px',
            margin: '8px 0'
          }}>
            ✅ 测试代理服务器已启动: http://localhost:3001
          </div>
        </div>
      }
      type="warning"
      showIcon
      style={{ marginTop: 16 }}
    />
  );

  return (
    <Card 
      title={
        <Space>
          <span>服务状态检查</span>
          {status.lastCheck && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最后检查: {status.lastCheck}
            </Text>
          )}
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />}
          loading={checking}
          onClick={checkServiceStatus}
        >
          刷新状态
        </Button>
      }
    >
      {checking ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在检查服务状态...</Text>
          </div>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 通义千问配置状态 */}
          <Card size="small" title="通义千问配置">
            <Space>
              {status.qwenConfig && renderStatusTag(status.qwenConfig.status)}
              <Text>{status.qwenConfig?.message || '检查中...'}</Text>
            </Space>
            {status.qwenConfig?.status === 'error' && (
              <Alert
                message="配置问题"
                description="请在.env文件中设置 REACT_APP_QWEN_API_KEY"
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Card>

          {/* 代理服务器状态 */}
          <Card size="small" title="代理服务器">
            <Space>
              {status.proxyServer && renderStatusTag(status.proxyServer.status)}
              <Text>{status.proxyServer?.message || '检查中...'}</Text>
            </Space>
            {status.proxyServer?.url && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">服务地址: </Text>
                <Text code>{status.proxyServer.url}</Text>
              </div>
            )}
            {status.proxyServer?.data && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">服务信息: </Text>
                <Text>{status.proxyServer.data.service}</Text>
              </div>
            )}
            {status.proxyServer?.status === 'error' && renderProxyStartInstructions()}
          </Card>

          {/* 整体状态 */}
          <div style={{ textAlign: 'center' }}>
            {status.proxyServer?.status === 'success' && status.qwenConfig?.status === 'success' ? (
              <Alert
                message="所有服务正常"
                description="现在可以正常使用OCR识别功能"
                type="success"
                showIcon
              />
            ) : (
              <Alert
                message="服务异常"
                description="请根据上述提示修复问题后再使用OCR功能"
                type="error"
                showIcon
              />
            )}
          </div>
        </Space>
      )}
    </Card>
  );
};

export default ServiceStatusChecker;
