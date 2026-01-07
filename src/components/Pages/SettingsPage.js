import React, { useState } from 'react';
import { Card, Typography, Space, Button, List, Switch, Divider, Tag, Modal, message } from 'antd';
import { 
  TeamOutlined, 
  SettingOutlined, 
  InfoCircleOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  MobileOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import AppLayout from '../Layout/AppLayout.js';
import './SettingsPage.css';

const { Title, Text, Paragraph } = Typography;

const SettingsPage = ({ activeMenuItem = 'settings', onMenuClick }) => {
  const [settings, setSettings] = useState({
    showSearchHistory: true,
    autoCollapse: true,
    showGenerationNumbers: true,
    enableMobileOptimization: true,
    showNodeDetails: true
  });
  const [aboutVisible, setAboutVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // 更新设置
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    message.success('设置已更新');
  };

  // 重置家谱数据
  const resetFamilyData = async () => {
    Modal.confirm({
      title: '确认重置家谱数据',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>此操作将：</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li>清除当前数据库中的所有家谱数据</li>
            <li>基于原始 familyData.js 文件重新加载默认数据</li>
            <li>清除所有前端缓存</li>
            <li>重新初始化内存中的数据</li>
          </ul>
          <p style={{ color: '#f5222d', fontSize: '12px', marginTop: '12px' }}>
            ⚠️ 此操作不可逆，请确认后再操作！
          </p>
        </div>
      ),
      okText: '确认重置',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await performDataReset();
      }
    });
  };

  // 执行数据重置
  const performDataReset = async () => {
    setResetLoading(true);
    try {
      console.log('🔄 开始重置家谱数据...');
      
      // 1. 调用后端API重置数据库数据
      const response = await fetch('http://localhost:3003/api/reinit-default-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: 重置失败`);
      }

      console.log('✅ 后端数据重置成功:', result.message);

      // 2. 清除前端所有相关缓存
      try {
        // 清除前端服务的内存缓存
        const familyDataService = (await import('../../services/familyDataService')).default;
        familyDataService.clearAllCache();

        console.log('🗑️ 已清除所有前端内存缓存');
      } catch (cacheError) {
        console.warn('清除缓存时出现警告:', cacheError);
      }

      // 3. 触发全局数据刷新事件
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('familyDataUpdated', {
          detail: {
            tenantId: 'default',
            action: 'reset',
            timestamp: new Date().toISOString()
          }
        }));
      }

      message.success('家谱数据重置成功！页面将自动刷新以加载最新数据');
      
      // 4. 延迟刷新页面，确保用户看到成功消息
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ 重置家谱数据失败:', error);
      message.error(`重置失败: ${error.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  // 设置项配置
  const settingItems = [
    {
      key: 'showSearchHistory',
      title: '显示搜索历史',
      description: '在搜索页面显示历史搜索记录',
      icon: <SearchOutlined />,
      value: settings.showSearchHistory
    },
    {
      key: 'autoCollapse',
      title: '智能折叠',
      description: '自动折叠第3代以后的家族成员',
      icon: <EyeOutlined />,
      value: settings.autoCollapse
    },
    {
      key: 'showGenerationNumbers',
      title: '显示代数',
      description: '在节点上显示代数信息',
      icon: <TeamOutlined />,
      value: settings.showGenerationNumbers
    },
    {
      key: 'enableMobileOptimization',
      title: '移动端优化',
      description: '启用移动端专用的交互优化',
      icon: <MobileOutlined />,
      value: settings.enableMobileOptimization
    },
    {
      key: 'showNodeDetails',
      title: '节点详情',
      description: '点击节点时显示详细信息',
      icon: <InfoCircleOutlined />,
      value: settings.showNodeDetails
    }
  ];

  // 视图控制选项
  const viewControlItems = [
    {
      key: 'viewMode',
      title: '视图模式',
      description: '切换完整模式和聚焦模式',
      type: 'button',
      action: () => message.info('视图模式切换功能')
    },
    {
      key: 'resetView',
      title: '重置视图',
      description: '恢复到默认视图位置和缩放',
      type: 'button',
      action: () => message.info('视图重置功能')
    },
    {
      key: 'exportData',
      title: '导出数据',
      description: '导出家谱数据为JSON格式',
      type: 'button',
      action: () => message.info('数据导出功能')
    }
  ];

  // 数据管理选项
  const dataManagementItems = [
    {
      key: 'resetData',
      title: '重置家谱数据',
      description: '基于原始 familyData.js 重置所有数据',
      type: 'danger',
      action: resetFamilyData
    }
  ];

  return (
    <AppLayout
      activeMenuItem={activeMenuItem}
      onMenuClick={onMenuClick}
    >
      <div className="settings-page">
        <div className="settings-container">
          {/* 租户信息 */}
          <Card className="settings-card">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0 }}>
                  穆氏家族
                </Title>
                <Tag color="blue">muff</Tag>
              </div>
              <Text type="secondary">现代化的家族谱系管理平台</Text>
            </Space>
          </Card>

          {/* 显示设置 */}
          <Card title="显示设置" className="settings-card">
            <List
              dataSource={settingItems}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Switch
                      checked={item.value}
                      onChange={(checked) => updateSetting(item.key, checked)}
                    />
                  ]}
                  className="settings-list-item"
                >
                  <List.Item.Meta
                    avatar={<span className="settings-icon">{item.icon}</span>}
                    title={<span className="settings-title">{item.title}</span>}
                    description={<span className="settings-description">{item.description}</span>}
                  />
                </List.Item>
              )}
            />
          </Card>

          {/* 数据统计 */}
          <Card title="数据统计" className="settings-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div className="stat-item">
                <Text type="secondary">家族成员总数</Text>
                <br />
                <Text strong style={{ fontSize: 18 }}>689 人</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="stat-item">
                <Text type="secondary">传承代数</Text>
                <br />
                <Text strong style={{ fontSize: 18 }}>20 代</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="stat-item">
                <Text type="secondary">数据版本</Text>
                <br />
                <Text strong>v0.2.0</Text>
              </div>
            </Space>
          </Card>

          {/* 视图控制 */}
          <Card title="视图控制" className="settings-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {viewControlItems.map((item) => (
                <Button
                  key={item.key}
                  block
                  icon={<SettingOutlined />}
                  onClick={item.action}
                  className="control-button"
                >
                  <div>
                    <div className="control-title">{item.title}</div>
                    <div className="control-description">
                      {item.description}
                    </div>
                  </div>
                </Button>
              ))}
            </Space>
          </Card>

          {/* 数据管理 */}
          <Card title="数据管理" className="settings-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {dataManagementItems.map((item) => (
                <Button
                  key={item.key}
                  block
                  icon={<ReloadOutlined />}
                  onClick={item.action}
                  loading={resetLoading}
                  danger={item.type === 'danger'}
                  className="control-button"
                  style={{
                    borderColor: item.type === 'danger' ? '#ff4d4f' : undefined,
                    backgroundColor: item.type === 'danger' ? '#fff2f0' : undefined
                  }}
                >
                  <div>
                    <div className="control-title">{item.title}</div>
                    <div className="control-description">
                      {item.description}
                    </div>
                  </div>
                </Button>
              ))}
            </Space>
          </Card>

          {/* 操作按钮 */}
          <Card className="settings-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                block
                icon={<InfoCircleOutlined />}
                onClick={() => setAboutVisible(true)}
                className="about-button"
              >
                关于应用
              </Button>
            </Space>
          </Card>
        </div>

        {/* 关于对话框 */}
        <Modal
          title="关于家谱系统"
          open={aboutVisible}
          onCancel={() => setAboutVisible(false)}
          footer={[
            <Button key="close" onClick={() => setAboutVisible(false)}>
              关闭
            </Button>
          ]}
        >
          <Space direction="vertical" size="middle">
            <div>
              <Title level={4}>家谱系统 v0.2.0</Title>
              <Paragraph>
                现代化的家族谱系管理平台，支持移动端底部Tab导航、可视化展示、智能搜索等功能。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>技术栈</Title>
              <Text>
                React 18 + Ant Design 5 + React Flow + Node.js + MongoDB
              </Text>
            </div>

            <div>
              <Title level={5}>功能特性</Title>
              <ul style={{ paddingLeft: 20 }}>
                <li>🌳 完整的家谱可视化展示</li>
                <li>🔍 强大的搜索和筛选功能</li>
                <li>👥 多用户协作管理</li>
                <li>📱 响应式设计，支持移动端</li>
                <li>🔒 安全的数据隔离和权限控制</li>
              </ul>
            </div>
          </Space>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
