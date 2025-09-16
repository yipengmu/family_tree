import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Typography, Divider, message } from 'antd';
import { ReloadOutlined, DatabaseOutlined, CloudOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * 数据同步状态组件
 * 用于显示和验证创作页面与族谱页面的数据同步状态
 */
const DataSyncStatus = ({ currentTenant, onRefresh }) => {
  const [syncStatus, setSyncStatus] = useState({
    databaseData: null,
    cacheData: null,
    lastSync: null,
    isLoading: false,
    error: null
  });

  // 检查数据同步状态
  const checkSyncStatus = async () => {
    if (!currentTenant?.id) {
      setSyncStatus(prev => ({ ...prev, error: '' }));
      return;
    }

    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. 获取数据库中的数据
      const dbResponse = await fetch(`http://localhost:3003/api/family-data/${currentTenant.id}`);
      const dbResult = await dbResponse.json();
      const databaseData = dbResult.success ? dbResult.data : [];

      // 2. 获取缓存中的数据
      let cacheData = [];
      try {
        const familyDataService = (await import('../services/familyDataService')).default;
        cacheData = await familyDataService.getFamilyData(false, currentTenant.id);
      } catch (cacheError) {
        console.warn('获取缓存数据失败:', cacheError);
      }

      // 3. 更新状态
      setSyncStatus({
        databaseData,
        cacheData,
        lastSync: new Date().toISOString(),
        isLoading: false,
        error: null
      });

      console.log('📊 数据同步状态检查完成:', {
        database: databaseData.length,
        cache: cacheData.length,
        tenant: currentTenant.id
      });

    } catch (error) {
      console.error('检查同步状态失败:', error);
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  // 强制刷新缓存
  const forceRefreshCache = async () => {
    try {
      message.loading('正在刷新缓存...', 0);
      
      // 清除缓存
      const familyDataService = (await import('../services/familyDataService')).default;
      familyDataService.clearAllCache();
      
      const cacheManager = (await import('../utils/cacheManager')).default;
      cacheManager.remove(`family_data_${currentTenant.id}`);
      cacheManager.remove(`tenant_${currentTenant.id}_family_data`);
      
      // 触发全局刷新
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('familyDataUpdated', {
          detail: {
            tenantId: currentTenant.id,
            timestamp: new Date().toISOString()
          }
        }));
      }
      
      // 重新检查状态
      await checkSyncStatus();
      
      message.destroy();
      message.success('缓存刷新成功');
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      message.destroy();
      message.error(`刷新缓存失败: ${error.message}`);
    }
  };

  // 组件挂载时检查状态
  useEffect(() => {
    checkSyncStatus();
  }, [currentTenant?.id]);

  // 监听数据更新事件
  useEffect(() => {
    const handleDataUpdate = () => {
      setTimeout(checkSyncStatus, 500); // 延迟检查，确保数据已更新
    };

    window.addEventListener('familyDataUpdated', handleDataUpdate);
    return () => window.removeEventListener('familyDataUpdated', handleDataUpdate);
  }, []);

  const { databaseData, cacheData, lastSync, isLoading, error } = syncStatus;

  // 判断数据是否同步
  const isDataSynced = databaseData && cacheData && 
    databaseData.length === cacheData.length;

  const getSyncStatusTag = () => {
    if (error) {
      return <Tag color="red" icon={<ExclamationCircleOutlined />}>同步错误</Tag>;
    }
    if (isLoading) {
      return <Tag color="blue">检查中...</Tag>;
    }
    if (isDataSynced) {
      return <Tag color="green" icon={<CheckCircleOutlined />}>已同步</Tag>;
    }
    return <Tag color="orange" icon={<ExclamationCircleOutlined />}>未同步</Tag>;
  };

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          <span>数据同步状态</span>
          {getSyncStatusTag()}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={checkSyncStatus}
            loading={isLoading}
          >
            检查状态
          </Button>
          <Button 
            size="small" 
            type="primary"
            icon={<CloudOutlined />} 
            onClick={forceRefreshCache}
          >
            刷新缓存
          </Button>
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      {error ? (
        <Text type="danger">错误: {error}</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space split={<Divider type="vertical" />}>
            <Space>
              <DatabaseOutlined style={{ color: '#1890ff' }} />
              <Text>数据库: {databaseData ? databaseData.length : '-'} 条</Text>
            </Space>
            <Space>
              <CloudOutlined style={{ color: '#52c41a' }} />
              <Text>缓存: {cacheData ? cacheData.length : '-'} 条</Text>
            </Space>
            <Space>
              <Text type="secondary">
                租户: {currentTenant?.name || currentTenant?.id || '-'}
              </Text>
            </Space>
          </Space>
          
          {lastSync && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最后检查: {new Date(lastSync).toLocaleString()}
            </Text>
          )}
          
          {!isDataSynced && databaseData && cacheData && (
            <Text type="warning" style={{ fontSize: '12px' }}>
              ⚠️ 数据不同步，建议刷新缓存
            </Text>
          )}
        </Space>
      )}
    </Card>
  );
};

export default DataSyncStatus;
