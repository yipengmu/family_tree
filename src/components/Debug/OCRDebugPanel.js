/**
 * OCR调试面板
 * 用于调试OCR识别和数据填充问题
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, Collapse, Tag, Divider } from 'antd';
import { 
  BugOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import ocrService from '../../services/ocrService';
import qwenOcrService from '../../services/qwenOcrService';
import familyDataGenerator from '../../services/familyDataGenerator';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const OCRDebugPanel = ({ imageUrls = [], tenantId = 'default', onDataGenerated }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState([]);

  // 添加日志
  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      type,
      message,
      data
    };
    setLogs(prev => [...prev, logEntry]);
    console.log(`[OCR Debug ${timestamp}] ${type.toUpperCase()}: ${message}`, data);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 测试OCR识别流程
  const testOCRFlow = async () => {
    setTesting(true);
    clearLogs();
    
    try {
      addLog('info', '开始OCR测试流程');
      addLog('info', `图片数量: ${imageUrls.length}`, imageUrls);
      addLog('info', `租户ID: ${tenantId}`);

      // 1. 检查OCR配置
      addLog('info', '检查OCR配置...');
      const configValidation = ocrService.validateConfig();
      addLog('info', 'OCR配置验证结果', configValidation);
      addLog('info', `当前使用服务: ${configValidation.preferredService}`);

      // 2. 执行OCR识别
      addLog('info', '执行OCR识别...');
      const startTime = Date.now();
      
      const result = await ocrService.recognizeFamilyTree(imageUrls, tenantId);
      
      const duration = Date.now() - startTime;
      addLog('success', `OCR识别完成 (耗时: ${duration}ms)`);
      addLog('success', `识别到 ${result?.length || 0} 条记录`, result);

      // 3. 验证数据格式
      addLog('info', '验证数据格式...');
      if (result && result.length > 0) {
        const firstRecord = result[0];
        const requiredFields = ['id', 'name', 'g_rank', 'sex'];
        const missingFields = requiredFields.filter(field => !firstRecord.hasOwnProperty(field));
        
        if (missingFields.length === 0) {
          addLog('success', '数据格式验证通过');
        } else {
          addLog('warning', `数据格式警告: 缺少字段 ${missingFields.join(', ')}`);
        }

        addLog('info', '第一条记录示例', firstRecord);
      } else {
        addLog('warning', '未生成任何数据记录');
      }

      // 4. 设置调试信息
      setDebugInfo({
        timestamp: new Date().toISOString(),
        imageCount: imageUrls.length,
        tenantId,
        configValidation,
        result,
        duration,
        dataValid: result && result.length > 0
      });

      // 5. 生成familyData文件
      if (result && result.length > 0) {
        addLog('info', '生成familyData文件...');
        try {
          const fileResult = await familyDataGenerator.generateFamilyDataFile(
            result,
            tenantId,
            { suffix: 'debug-test', autoDownload: false }
          );

          if (fileResult.success) {
            addLog('success', `familyData文件生成成功: ${fileResult.fileName}`);
            addLog('info', '文件统计信息', fileResult.stats);
          } else {
            addLog('error', `文件生成失败: ${fileResult.error}`);
          }
        } catch (error) {
          addLog('error', `文件生成异常: ${error.message}`);
        }
      }

      // 6. 回调通知父组件
      if (onDataGenerated && result) {
        addLog('info', '通知父组件数据已生成');
        onDataGenerated(result);
      }

    } catch (error) {
      addLog('error', `OCR测试失败: ${error.message}`, error);
      console.error('OCR测试失败:', error);
    } finally {
      setTesting(false);
    }
  };

  // 生成测试数据
  const generateTestData = async () => {
    try {
      addLog('info', '生成测试数据...');
      const testData = qwenOcrService.getMockOCRData(3, tenantId);
      addLog('success', `生成了 ${testData.length} 条测试数据`, testData);

      if (onDataGenerated) {
        onDataGenerated(testData);
      }
    } catch (error) {
      addLog('error', `生成测试数据失败: ${error.message}`, error);
    }
  };

  // 生成并下载familyData文件
  const generateAndDownloadFile = async () => {
    try {
      addLog('info', '开始生成familyData文件...');

      // 先生成测试数据
      const testData = qwenOcrService.getMockOCRData(5, tenantId);
      addLog('info', `使用 ${testData.length} 条测试数据生成文件`);

      const fileResult = await familyDataGenerator.generateFamilyDataFile(
        testData,
        tenantId,
        {
          suffix: 'qwen-demo',
          autoDownload: true // 自动下载
        }
      );

      if (fileResult.success) {
        addLog('success', `文件生成并下载成功: ${fileResult.fileName}`);
        addLog('info', '文件统计', fileResult.stats);
      } else {
        addLog('error', `文件生成失败: ${fileResult.error}`);
      }
    } catch (error) {
      addLog('error', `生成文件异常: ${error.message}`, error);
    }
  };

  // 渲染日志条目
  const renderLogEntry = (log) => {
    const getIcon = (type) => {
      switch (type) {
        case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case 'error': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'warning': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
        default: return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      }
    };

    return (
      <div key={log.id} style={{ marginBottom: 8, padding: 8, backgroundColor: '#fafafa', borderRadius: 4 }}>
        <Space>
          {getIcon(log.type)}
          <Text strong>{log.timestamp}</Text>
          <Text>{log.message}</Text>
        </Space>
        {log.data && (
          <div style={{ marginTop: 4, marginLeft: 24 }}>
            <Text code style={{ fontSize: '12px' }}>
              {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
            </Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      title={
        <Space>
          <BugOutlined />
          <span>OCR调试面板</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            loading={testing}
            onClick={testOCRFlow}
            disabled={imageUrls.length === 0}
          >
            测试OCR流程
          </Button>
          <Button onClick={generateTestData}>
            生成测试数据
          </Button>
          <Button
            type="default"
            onClick={generateAndDownloadFile}
            style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
          >
            生成文件并下载
          </Button>
          <Button onClick={clearLogs}>
            清空日志
          </Button>
        </Space>
      }
    >
      {/* 当前状态 */}
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="调试信息"
          description={
            <div>
              <div>图片数量: {imageUrls.length}</div>
              <div>租户ID: {tenantId}</div>
              <div>环境: {process.env.REACT_APP_ENV || 'production'}</div>
            </div>
          }
          type="info"
          showIcon
        />
      </div>

      {/* 测试结果 */}
      {debugInfo && (
        <Card size="small" title="最新测试结果" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>测试时间: </Text>
              <Text>{new Date(debugInfo.timestamp).toLocaleString()}</Text>
            </div>
            <div>
              <Text strong>处理时长: </Text>
              <Text>{debugInfo.duration}ms</Text>
            </div>
            <div>
              <Text strong>数据状态: </Text>
              {debugInfo.dataValid ? (
                <Tag color="success">有效 ({debugInfo.result?.length || 0} 条记录)</Tag>
              ) : (
                <Tag color="error">无效</Tag>
              )}
            </div>
            <div>
              <Text strong>配置状态: </Text>
              {debugInfo.configValidation?.isValid ? (
                <Tag color="success">正常</Tag>
              ) : (
                <Tag color="warning">使用模拟数据</Tag>
              )}
            </div>
          </Space>
        </Card>
      )}

      {/* 实时日志 */}
      <Collapse defaultActiveKey={['logs']}>
        <Panel header={`实时日志 (${logs.length})`} key="logs">
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <Text type="secondary">暂无日志，点击"测试OCR流程"开始调试</Text>
            ) : (
              logs.map(renderLogEntry)
            )}
          </div>
        </Panel>
      </Collapse>

      {/* 使用说明 */}
      <Divider />
      <div>
        <Title level={5}>使用说明</Title>
        <ul>
          <li><strong>测试OCR流程:</strong> 完整测试从图片识别到数据生成的整个流程</li>
          <li><strong>生成测试数据:</strong> 直接生成模拟数据用于测试表格显示</li>
          <li><strong>实时日志:</strong> 查看详细的执行过程和数据流</li>
          <li><strong>数据验证:</strong> 自动检查生成的数据格式是否正确</li>
        </ul>
      </div>
    </Card>
  );
};

export default OCRDebugPanel;
