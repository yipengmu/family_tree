/**
 * OSS连接诊断组件
 * 用于测试和诊断OSS连接问题
 */

import React, { useState } from 'react';
import { Card, Button, Alert, Spin, Typography, Collapse, Tag, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  BugOutlined
} from '@ant-design/icons';
import OSSConnectionTester from '../../utils/ossConnectionTester';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const OSSConnectionDiagnostic = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // 获取OSS配置
  const getOSSConfig = () => {
    return {
      region: process.env.REACT_APP_OSS_REGION,
      bucket: process.env.REACT_APP_OSS_BUCKET,
      accessKeyId: process.env.REACT_APP_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.REACT_APP_OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.REACT_APP_OSS_ENDPOINT,
      secure: true
    };
  };

  // 执行诊断测试
  const runDiagnostic = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      const config = getOSSConfig();
      const tester = new OSSConnectionTester(config);
      const diagnosticResults = await tester.runFullDiagnostic();
      setResults(diagnosticResults);
    } catch (err) {
      setError(`诊断过程中发生错误: ${err.message}`);
      console.error('诊断错误:', err);
    } finally {
      setTesting(false);
    }
  };

  // 渲染测试结果状态
  const renderTestStatus = (test) => {
    if (test.success) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>通过</Tag>;
    } else {
      return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>;
    }
  };

  // 渲染测试详情
  const renderTestDetails = (test) => {
    return (
      <div style={{ marginTop: 8 }}>
        {test.details.map((detail, index) => (
          <div key={index} style={{ marginBottom: 4 }}>
            <Text type={detail.includes('❌') ? 'danger' : detail.includes('⚠️') ? 'warning' : 'secondary'}>
              {detail}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  // 渲染建议
  const renderRecommendations = (recommendations) => {
    return (
      <div>
        {recommendations.map((rec, index) => (
          <Paragraph key={index} style={{ marginBottom: 8 }}>
            <Text>{rec}</Text>
          </Paragraph>
        ))}
      </div>
    );
  };

  return (
    <Card 
      title={
        <Space>
          <BugOutlined />
          <span>OSS连接诊断工具</span>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          loading={testing}
          onClick={runDiagnostic}
        >
          {testing ? '诊断中...' : '开始诊断'}
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Paragraph>
          此工具可以帮助诊断OSS连接问题，包括配置验证、网络连接、认证测试和上传功能测试。
        </Paragraph>
        
        {error && (
          <Alert
            message="诊断失败"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
      </div>

      {testing && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在执行连接诊断，请稍候...</Text>
          </div>
        </div>
      )}

      {results && (
        <div>
          {/* 配置信息 */}
          <Card size="small" title="当前配置" style={{ marginBottom: 16 }}>
            <div>
              <Text strong>区域: </Text>
              <Text code>{results.config.region}</Text>
            </div>
            <div>
              <Text strong>存储桶: </Text>
              <Text code>{results.config.bucket}</Text>
            </div>
            <div>
              <Text strong>Endpoint: </Text>
              <Text code>{results.config.endpoint}</Text>
            </div>
            <div>
              <Text strong>AccessKey ID: </Text>
              <Text code>{results.config.accessKeyId}</Text>
            </div>
            <div>
              <Text strong>AccessKey Secret: </Text>
              <Text code>{results.config.hasSecret ? '已配置' : '未配置'}</Text>
            </div>
          </Card>

          {/* 测试结果 */}
          <Card size="small" title="测试结果" style={{ marginBottom: 16 }}>
            <Collapse>
              {Object.entries(results.tests).map(([key, test]) => (
                <Panel 
                  key={key}
                  header={
                    <Space>
                      <span>{test.name}</span>
                      {renderTestStatus(test)}
                    </Space>
                  }
                >
                  {renderTestDetails(test)}
                </Panel>
              ))}
            </Collapse>
          </Card>

          {/* 修复建议 */}
          {results.recommendations.length > 0 && (
            <Card size="small" title="修复建议">
              {renderRecommendations(results.recommendations)}
            </Card>
          )}

          {/* 整体状态 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {Object.values(results.tests).every(test => test.success) ? (
              <Alert
                message="所有测试通过"
                description="OSS连接配置正常，可以正常使用上传功能"
                type="success"
                showIcon
              />
            ) : (
              <Alert
                message="发现问题"
                description="部分测试未通过，请根据上述建议进行修复"
                type="warning"
                showIcon
              />
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <Card size="small" title="使用说明" style={{ marginTop: 16 }}>
        <ul>
          <li><strong>配置验证:</strong> 检查OSS配置项是否完整和正确</li>
          <li><strong>网络连接:</strong> 测试到阿里云服务的网络连通性</li>
          <li><strong>OSS服务可达性:</strong> 检查OSS服务端点是否可访问</li>
          <li><strong>认证测试:</strong> 验证AccessKey是否有效和权限是否正确</li>
          <li><strong>上传测试:</strong> 实际测试文件上传功能</li>
        </ul>
        
        <Alert
          message="注意"
          description="诊断过程中会创建和删除一个测试文件，不会影响现有数据"
          type="info"
          showIcon
          style={{ marginTop: 12 }}
        />
      </Card>
    </Card>
  );
};

export default OSSConnectionDiagnostic;
