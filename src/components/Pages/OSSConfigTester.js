import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Alert, Descriptions, Tag, message, Tabs } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import uploadService from '../services/uploadService';
import OSSConnectionDiagnostic from '../Debug/OSSConnectionDiagnostic';

const OSSConfigTester = () => {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);

  // 获取OSS配置信息
  const getOSSConfig = () => {
    return {
      region: process.env.REACT_APP_OSS_REGION,
      bucket: process.env.REACT_APP_OSS_BUCKET,
      accessKeyId: process.env.REACT_APP_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.REACT_APP_OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.REACT_APP_OSS_ENDPOINT,
    };
  };

  // 验证配置格式
  const validateConfig = (config) => {
    const issues = [];
    
    if (!config.region) {
      issues.push({ type: 'error', message: '缺少 REACT_APP_OSS_REGION 配置' });
    } else if (!config.region.startsWith('oss-')) {
      issues.push({ type: 'error', message: 'Region 格式错误，应该以 "oss-" 开头' });
    }
    
    if (!config.bucket) {
      issues.push({ type: 'error', message: '缺少 REACT_APP_OSS_BUCKET 配置' });
    }
    
    if (!config.accessKeyId) {
      issues.push({ type: 'error', message: '缺少 REACT_APP_OSS_ACCESS_KEY_ID 配置' });
    } else if (config.accessKeyId.length !== 24) {
      issues.push({ type: 'warning', message: `AccessKey ID 长度异常: ${config.accessKeyId.length}/24` });
    }
    
    if (!config.accessKeySecret) {
      issues.push({ type: 'error', message: '缺少 REACT_APP_OSS_ACCESS_KEY_SECRET 配置' });
    } else if (config.accessKeySecret.length !== 30) {
      issues.push({ type: 'warning', message: `AccessKey Secret 长度异常: ${config.accessKeySecret.length}/30` });
    }
    
    if (config.endpoint && !config.endpoint.startsWith('https://')) {
      issues.push({ type: 'warning', message: '建议使用 HTTPS endpoint' });
    }
    
    return issues;
  };

  // 测试OSS连接
  const testOSSConnection = async () => {
    setTesting(true);
    const config = getOSSConfig();
    const issues = validateConfig(config);
    
    const results = {
      config,
      issues,
      connectionTest: null,
      bucketTest: null,
      uploadTest: null
    };

    try {
      // 测试基本连接
      if (uploadService.ossClient) {
        console.log('🔍 测试OSS连接...');
        
        try {
          // 测试获取bucket信息
          const bucketInfo = await uploadService.ossClient.getBucketInfo();
          results.bucketTest = {
            success: true,
            message: '成功获取bucket信息',
            data: bucketInfo.bucket
          };
          console.log('✅ Bucket信息获取成功:', bucketInfo.bucket);
        } catch (error) {
          results.bucketTest = {
            success: false,
            message: `Bucket测试失败: ${error.message}`,
            error: error.code || error.name
          };
          console.error('❌ Bucket测试失败:', error);
        }

        try {
          // 测试列出对象（不需要上传权限）
          const listResult = await uploadService.ossClient.list({
            prefix: 'family-tree/',
            'max-keys': 1
          });
          results.connectionTest = {
            success: true,
            message: '连接测试成功',
            data: `找到 ${listResult.objects?.length || 0} 个对象`
          };
          console.log('✅ 连接测试成功');
        } catch (error) {
          results.connectionTest = {
            success: false,
            message: `连接测试失败: ${error.message}`,
            error: error.code || error.name
          };
          console.error('❌ 连接测试失败:', error);
        }

        // 如果基本连接成功，测试上传一个小文件
        if (results.connectionTest?.success) {
          try {
            const testContent = 'OSS connection test';
            const testKey = `family-tree/test/connection-test-${Date.now()}.txt`;
            
            await uploadService.ossClient.put(testKey, Buffer.from(testContent));
            
            // 立即删除测试文件
            await uploadService.ossClient.delete(testKey);
            
            results.uploadTest = {
              success: true,
              message: '上传测试成功'
            };
            console.log('✅ 上传测试成功');
          } catch (error) {
            results.uploadTest = {
              success: false,
              message: `上传测试失败: ${error.message}`,
              error: error.code || error.name
            };
            console.error('❌ 上传测试失败:', error);
          }
        }
      } else {
        results.connectionTest = {
          success: false,
          message: 'OSS客户端未初始化',
          error: 'CLIENT_NOT_INITIALIZED'
        };
      }
    } catch (error) {
      console.error('测试过程中发生错误:', error);
    }

    setTestResults(results);
    setTesting(false);
  };

  // 组件加载时自动测试
  useEffect(() => {
    testOSSConnection();
  }, []);

  const renderStatus = (test) => {
    if (!test) return <Tag color="default">未测试</Tag>;
    if (test.success) return <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>;
    return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>;
  };

  const config = getOSSConfig();

  return (
    <div style={{ margin: '20px', maxWidth: '1200px' }}>
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: '基础测试',
          children: (
            <Card title="OSS 配置诊断">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* 配置信息 */}
        <div>
          <h4>当前配置</h4>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Region">{config.region || '未配置'}</Descriptions.Item>
            <Descriptions.Item label="Bucket">{config.bucket || '未配置'}</Descriptions.Item>
            <Descriptions.Item label="Endpoint">{config.endpoint || '使用默认'}</Descriptions.Item>
            <Descriptions.Item label="AccessKey ID">
              {config.accessKeyId ? `${config.accessKeyId.substring(0, 8)}...` : '未配置'}
            </Descriptions.Item>
            <Descriptions.Item label="AccessKey Secret">
              {config.accessKeySecret ? '已配置' : '未配置'}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* 配置验证结果 */}
        {testResults?.issues && testResults.issues.length > 0 && (
          <div>
            <h4>配置问题</h4>
            {testResults.issues.map((issue, index) => (
              <Alert
                key={index}
                type={issue.type}
                message={issue.message}
                style={{ marginBottom: '8px' }}
                showIcon
              />
            ))}
          </div>
        )}

        {/* 连接测试结果 */}
        <div>
          <h4>连接测试</h4>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Bucket信息">
              {renderStatus(testResults?.bucketTest)}
              {testResults?.bucketTest?.message && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  {testResults.bucketTest.message}
                </div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="连接状态">
              {renderStatus(testResults?.connectionTest)}
              {testResults?.connectionTest?.message && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  {testResults.connectionTest.message}
                </div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="上传测试">
              {renderStatus(testResults?.uploadTest)}
              {testResults?.uploadTest?.message && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  {testResults.uploadTest.message}
                </div>
              )}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* 错误详情 */}
        {testResults && (
          <div>
            <h4>详细信息</h4>
            {testResults.bucketTest?.error && (
              <Alert
                type="error"
                message={`Bucket错误: ${testResults.bucketTest.error}`}
                description={testResults.bucketTest.message}
                style={{ marginBottom: '8px' }}
              />
            )}
            {testResults.connectionTest?.error && (
              <Alert
                type="error"
                message={`连接错误: ${testResults.connectionTest.error}`}
                description={testResults.connectionTest.message}
                style={{ marginBottom: '8px' }}
              />
            )}
            {testResults.uploadTest?.error && (
              <Alert
                type="error"
                message={`上传错误: ${testResults.uploadTest.error}`}
                description={testResults.uploadTest.message}
                style={{ marginBottom: '8px' }}
              />
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div>
          <Space>
            <Button 
              type="primary" 
              loading={testing}
              onClick={testOSSConnection}
            >
              重新测试
            </Button>
            <Button 
              onClick={() => {
                console.log('OSS配置:', config);
                console.log('测试结果:', testResults);
                message.info('详细信息已输出到控制台');
              }}
            >
              查看详情
            </Button>
          </Space>
        </div>

        {/* 修复建议 */}
        {testResults?.issues && testResults.issues.length > 0 && (
          <Alert
            type="info"
            message="修复建议"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>检查 .env 文件中的OSS配置是否正确</li>
                <li>确认AccessKey ID和Secret是否有效</li>
                <li>验证bucket名称是否存在且可访问</li>
                <li>检查bucket权限设置（建议设为"公共读"）</li>
                <li>确认CORS规则已正确配置</li>
              </ul>
            }
          />
        )}
              </Space>
            </Card>
          )
        },
        {
          key: '2',
          label: '高级诊断',
          children: <OSSConnectionDiagnostic />
        }
      ]} />
    </div>
  );
};

export default OSSConfigTester;
