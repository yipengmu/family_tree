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
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import AppLayout from '../Layout/AppLayout.js';
import tenantService from '../../services/tenantService.js';
import BRAND from '../../constants/brand.js';
import './SettingsPage.css';

const { Title, Text, Paragraph } = Typography;

const SettingsPage = ({ activeMenuItem = 'settings', onMenuClick, familyData = [] }) => {
  const tenant = tenantService.getCurrentTenant();
  const canManagePrivacy = tenant?.role === 'OWNER';
  const [privacy, setPrivacy] = useState(() => ({
    living: {
      birthDate: tenant?.privacy?.living?.birthDate || tenant?.settings?.privacy?.living?.birthDate || 'YEAR',
      location: tenant?.privacy?.living?.location || tenant?.settings?.privacy?.living?.location || 'HIDDEN',
      sensitiveFields: tenant?.privacy?.living?.sensitiveFields || tenant?.settings?.privacy?.living?.sensitiveFields || 'HIDDEN',
    },
  }));
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const settingsKey = `puli_settings_${tenant?.id || 'default'}`;
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(settingsKey)) || {
        showSearchHistory: true,
        autoCollapse: true,
        showGenerationNumbers: true,
        enableMobileOptimization: true,
        showNodeDetails: true
      };
    } catch {
      return { showSearchHistory: true, autoCollapse: true, showGenerationNumbers: true, enableMobileOptimization: true, showNodeDetails: true };
    }
  });
  const [aboutVisible, setAboutVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // 更新设置
  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(settingsKey, JSON.stringify(next));
      return next;
    });
    message.success('设置已更新');
  };

  const updatePrivacy = async (key, value) => {
    const next = { ...privacy, living: { ...privacy.living, [key]: value } };
    setPrivacy(next);
    setPrivacyBusy(true);
    try {
      await tenantService.updatePrivacySettings(next);
      message.success('字段隐私设置已保存');
    } catch (error) {
      setPrivacy(privacy);
      message.error(error.message);
    } finally {
      setPrivacyBusy(false);
    }
  };

  const clearLocalCache = async () => {
    setResetLoading(true);
    try {
      const familyDataService = (await import('../../services/familyDataService')).default;
      familyDataService.clearAllCache();
      message.success('本机缓存已清除，在线家谱数据不受影响');
    } finally {
      setResetLoading(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ tenant, familyData, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tenant?.name || '我的家谱'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      action: exportData
    }
  ];

  // 数据管理选项
  const dataManagementItems = [
    {
      key: 'clearCache',
      title: '清除本机缓存',
      description: '不会删除云端家谱数据',
      type: 'normal',
      action: clearLocalCache
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
                  {tenant?.name || '我的家谱'}
                </Title>
                <Tag color="green">默认私密</Tag>
              </div>
              <Text type="secondary">只有受邀成员可以查看和续录</Text>
            </Space>
          </Card>

          <Card title="字段隐私" className="settings-card" extra={<SafetyCertificateOutlined style={{ color: 'var(--pine)' }} />}>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              家谱默认私密。这里控制非 Owner/Editor 看到的人物字段；原始资料仍保存在你的家谱空间。
            </Paragraph>
            <List
              dataSource={[
                {
                  key: 'birthDate',
                  title: '在世人物只显示出生年份',
                  description: '访客和普通成员不会看到完整出生日期',
                  checked: privacy.living.birthDate !== 'FULL',
                  value: privacy.living.birthDate === 'FULL' ? 'FULL' : 'YEAR',
                },
                {
                  key: 'location',
                  title: '隐藏在世人物居住地',
                  description: '避免住址和当前生活地点被扩散',
                  checked: privacy.living.location === 'HIDDEN',
                  value: privacy.living.location === 'HIDDEN' ? 'HIDDEN' : 'FAMILY',
                },
                {
                  key: 'sensitiveFields',
                  title: '隐藏证件、住址和照片字段',
                  description: '仅 Owner/Editor 默认可见，普通成员不返回这些字段',
                  checked: privacy.living.sensitiveFields !== 'FAMILY',
                  value: privacy.living.sensitiveFields === 'FAMILY' ? 'FAMILY' : 'HIDDEN',
                },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Switch
                      key={item.key}
                      checked={item.checked}
                      loading={privacyBusy}
                      disabled={!canManagePrivacy}
                      onChange={(checked) => updatePrivacy(item.key, item.key === 'birthDate' ? (checked ? 'YEAR' : 'FULL') : item.key === 'location' ? (checked ? 'HIDDEN' : 'FAMILY') : (checked ? 'HIDDEN' : 'FAMILY'))}
                    />,
                  ]}
                  className="settings-list-item"
                >
                  <List.Item.Meta
                    avatar={<span className="settings-icon"><SafetyCertificateOutlined /></span>}
                    title={<span className="settings-title">{item.title}</span>}
                    description={<span className="settings-description">{item.description}{!canManagePrivacy && '（仅 Owner 可修改）'}</span>}
                  />
                </List.Item>
              )}
            />
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
                <Text strong style={{ fontSize: 18 }}>{familyData.length} 人</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="stat-item">
                <Text type="secondary">传承代数</Text>
                <br />
                <Text strong style={{ fontSize: 18 }}>{new Set(familyData.map((person) => person.g_rank).filter(Boolean)).size} 代</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="stat-item">
                <Text type="secondary">数据版本</Text>
                <br />
                <Text strong>自动保存版本记录</Text>
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
          title={`关于${BRAND.name}`}
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
              <Title level={4}>{BRAND.name}数字家谱</Title>
              <Paragraph>
                {BRAND.description} 家谱默认私密，数据可以随时导出。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>技术栈</Title>
              <Text>
                React 18 + Ant Design 5 + React Flow + Prisma + PostgreSQL
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
