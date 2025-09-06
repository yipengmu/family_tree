/**
 * 数据状态监控组件
 * 用于实时显示数据状态和调试信息
 */

import React from 'react';
import { Card, Tag, Typography, Space, Collapse, Alert } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

const DataStateMonitor = ({ data, title = "数据状态监控" }) => {
  // 分析数据状态
  const analyzeData = (data) => {
    if (!data) {
      return {
        status: 'empty',
        message: '数据为空',
        details: { count: 0, type: 'undefined' }
      };
    }

    if (!Array.isArray(data)) {
      return {
        status: 'error',
        message: '数据不是数组格式',
        details: { count: 0, type: typeof data, value: data }
      };
    }

    if (data.length === 0) {
      return {
        status: 'empty',
        message: '数据数组为空',
        details: { count: 0, type: 'array' }
      };
    }

    // 检查数据完整性
    const requiredFields = ['id', 'name', 'g_rank', 'sex'];
    const firstRecord = data[0];
    const missingFields = requiredFields.filter(field => !firstRecord.hasOwnProperty(field));
    
    const stats = {
      count: data.length,
      type: 'array',
      hasRequiredFields: missingFields.length === 0,
      missingFields,
      fields: Object.keys(firstRecord),
      sampleRecord: firstRecord
    };

    if (missingFields.length > 0) {
      return {
        status: 'warning',
        message: `数据缺少必需字段: ${missingFields.join(', ')}`,
        details: stats
      };
    }

    return {
      status: 'success',
      message: `数据正常 (${data.length} 条记录)`,
      details: stats
    };
  };

  const analysis = analyzeData(data);

  // 渲染状态标签
  const renderStatusTag = (status) => {
    switch (status) {
      case 'success':
        return <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>;
      case 'warning':
        return <Tag color="warning" icon={<ExclamationCircleOutlined />}>警告</Tag>;
      case 'error':
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>错误</Tag>;
      default:
        return <Tag color="default" icon={<InfoCircleOutlined />}>空数据</Tag>;
    }
  };

  // 渲染数据详情
  const renderDataDetails = (details) => {
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>记录数量: </Text>
          <Text>{details.count}</Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>数据类型: </Text>
          <Text code>{details.type}</Text>
        </div>
        
        {details.fields && (
          <div style={{ marginBottom: 8 }}>
            <Text strong>字段列表: </Text>
            <div style={{ marginTop: 4 }}>
              {details.fields.map(field => (
                <Tag key={field} size="small" style={{ margin: '2px' }}>
                  {field}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {details.missingFields && details.missingFields.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <Text strong>缺少字段: </Text>
            <div style={{ marginTop: 4 }}>
              {details.missingFields.map(field => (
                <Tag key={field} color="red" size="small" style={{ margin: '2px' }}>
                  {field}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染示例数据
  const renderSampleData = (sampleRecord) => {
    if (!sampleRecord) return null;

    return (
      <div>
        <Text strong>第一条记录示例:</Text>
        <div style={{ 
          marginTop: 8, 
          padding: 12, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <pre>{JSON.stringify(sampleRecord, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <InfoCircleOutlined />
          <span>{title}</span>
          {renderStatusTag(analysis.status)}
        </Space>
      }
    >
      {/* 状态消息 */}
      <Alert
        message={analysis.message}
        type={analysis.status === 'success' ? 'success' : 
              analysis.status === 'warning' ? 'warning' : 
              analysis.status === 'error' ? 'error' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 详细信息 */}
      <Collapse size="small">
        <Panel header="数据详情" key="details">
          {renderDataDetails(analysis.details)}
        </Panel>
        
        {analysis.details.sampleRecord && (
          <Panel header="示例数据" key="sample">
            {renderSampleData(analysis.details.sampleRecord)}
          </Panel>
        )}
        
        <Panel header="完整数据" key="full">
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px',
            backgroundColor: '#f5f5f5',
            padding: 12,
            borderRadius: 4
          }}>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </Panel>
      </Collapse>

      {/* 使用提示 */}
      <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
        <Text type="secondary">
          💡 此组件实时监控数据状态，帮助调试数据传递问题
        </Text>
      </div>
    </Card>
  );
};

export default DataStateMonitor;
