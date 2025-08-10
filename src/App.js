import { useState, useEffect } from 'react';
import { Layout, Alert, Tabs, Card, Typography, Space, Button, List, Switch, Divider, Tag, Modal, message } from 'antd';
import { TeamOutlined, SettingOutlined, InfoCircleOutlined, SearchOutlined, EyeOutlined, MobileOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from 'reactflow';
import FamilyTreeFlow from './components/FamilyTreeFlow';
import { validateFamilyData } from './utils/familyTreeUtils';
import dbJson from './data/familyData.js';
import './App.css';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// 检测是否为移动端
const isMobile = () => {
  return window.innerWidth <= 768;
};

// 设置页面组件
const SettingsPage = () => {
  const [settings, setSettings] = useState({
    showSearchHistory: true,
    autoCollapse: true,
    showGenerationNumbers: true,
    enableMobileOptimization: true,
    showNodeDetails: true
  });
  const [aboutVisible, setAboutVisible] = useState(false);

  // 更新设置
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    message.success('设置已更新');
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

  return (
    <div style={{
      height: '100%',
      background: '#f5f5f5',
      overflow: 'auto',
      paddingBottom: '80px' // 为底部Tab留出空间
    }}>
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* 租户信息 */}
        <Card style={{ marginBottom: '16px', borderRadius: '12px' }}>
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
        <Card title="显示设置" style={{ marginBottom: '16px', borderRadius: '12px' }}>
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
                style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <List.Item.Meta
                  avatar={<span style={{ color: '#1890ff', fontSize: '18px' }}>{item.icon}</span>}
                  title={<span style={{ fontWeight: 500 }}>{item.title}</span>}
                  description={<span style={{ color: '#666', fontSize: '13px' }}>{item.description}</span>}
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 数据统计 */}
        <Card title="数据统计" style={{ marginBottom: '16px', borderRadius: '12px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Text type="secondary">家族成员总数</Text>
              <br />
              <Text strong style={{ fontSize: 18 }}>689 人</Text>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Text type="secondary">传承代数</Text>
              <br />
              <Text strong style={{ fontSize: 18 }}>20 代</Text>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Text type="secondary">数据版本</Text>
              <br />
              <Text strong>v0.2.0</Text>
            </div>
          </Space>
        </Card>

        {/* 视图控制 */}
        <Card title="视图控制" style={{ marginBottom: '16px', borderRadius: '12px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {viewControlItems.map((item) => (
              <Button
                key={item.key}
                block
                icon={<SettingOutlined />}
                onClick={item.action}
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                    {item.description}
                  </div>
                </div>
              </Button>
            ))}
          </Space>
        </Card>

        {/* 操作按钮 */}
        <Card style={{ borderRadius: '12px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              block
              icon={<InfoCircleOutlined />}
              onClick={() => setAboutVisible(true)}
              style={{ height: '48px', borderRadius: '8px' }}
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
  );
};

function App() {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [mobile, setMobile] = useState(isMobile());

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setMobile(isMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // 处理ResizeObserver错误
    const handleResizeObserverError = (e) => {
      if (e.message && e.message.includes('ResizeObserver loop completed')) {
        // 忽略ResizeObserver的循环错误，这不会影响功能
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener('error', handleResizeObserverError);

    // 模拟数据加载过程
    const loadData = async () => {
      try {
        setLoading(true);

        // 使用本地数据（从dbjson.js导入）
        // 如果需要从API获取数据，可以在这里添加fetch逻辑
        const data = dbJson || [];

        // 验证数据完整性
        const validation = validateFamilyData(data);
        setValidationResult(validation);

        if (!validation.isValid) {
          console.warn('数据验证发现问题:', validation.issues);
        }

        setFamilyData(data);
        setError(null);
      } catch (err) {
        console.error('加载家谱数据失败:', err);
        setError(err.message || '加载数据时发生未知错误');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      window.removeEventListener('error', handleResizeObserverError);
    };
  }, []);



  // 显示加载状态
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f0f2f5'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>🌳</div>
            <div>正在加载家谱数据...</div>
          </div>
        </Content>
      </Layout>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f0f2f5'
        }}>
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            style={{ maxWidth: '400px' }}
          />
        </Content>
      </Layout>
    );
  }

  // 移动端使用底部Tab导航
  if (mobile) {
    const tabItems = [
      {
        key: 'tree',
        label: '家谱',
        icon: <TeamOutlined />,
        children: (
          <div style={{
            height: '100%',
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* 数据验证警告 */}
            {validationResult && !validationResult.isValid && (
              <Alert
                message="数据验证警告"
                description={`发现 ${validationResult.issues?.length || 0} 个数据问题，可能影响显示效果`}
                type="warning"
                showIcon
                closable
                style={{
                  margin: '8px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000
                }}
              />
            )}

            {/* 原有家谱组件 - 完整功能 */}
            <ReactFlowProvider>
              <FamilyTreeFlow
                familyData={familyData}
                loading={loading}
                error={error}
              />
            </ReactFlowProvider>
          </div>
        )
      },
      {
        key: 'settings',
        label: '设置',
        icon: <SettingOutlined />,
        children: <SettingsPage />
      }
    ];

    return (
      <div className="App mobile-layout">
        <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
          <Content style={{ height: '100%', padding: 0, overflow: 'hidden' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              tabPosition="bottom"
              size="large"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              tabBarStyle={{
                backgroundColor: '#f7f7f7', /* 微信浅灰背景 */
                borderTop: '0.5px solid #e5e5e5', /* 微信风格细边框 */
                margin: 0,
                padding: 0,
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                height: '56px', /* 微信Tab高度 */
                boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05)' /* 更轻的阴影 */
              }}
            />
          </Content>
        </Layout>
      </div>
    );
  }

  // PC端保持原有布局 - 完整的家谱功能
  return (
    <div className="App desktop-layout">
      <ReactFlowProvider>
        <Layout style={{ height: '100vh' }}>
          <Content style={{
            position: 'relative',
            background: '#f0f2f5'
          }}>
            {/* 数据验证警告 */}
            {validationResult && !validationResult.isValid && (
              <Alert
                message="数据验证警告"
                description={`发现 ${validationResult.issues?.length || 0} 个数据问题，可能影响显示效果`}
                type="warning"
                showIcon
                closable
                style={{ margin: '16px' }}
              />
            )}

            {/* 原有家谱组件 - 完整功能 */}
            <FamilyTreeFlow
              familyData={familyData}
              loading={loading}
              error={error}
            />
          </Content>
        </Layout>
      </ReactFlowProvider>
    </div>
  );
}

export default App;
