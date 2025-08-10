import { useState, useEffect } from 'react';
import { Layout, Alert, Tabs } from 'antd';
import { TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { validateFamilyData } from './utils/familyTreeUtils';
import dbJson from './data/familyData.js';
import FamilyTreePage from './components/Pages/FamilyTreePage';
import SettingsPage from './components/Pages/SettingsPage';
import CreatePage from './components/Pages/CreatePage';
import './App.css';

const { Content } = Layout;

// 检测是否为移动端
const isMobile = () => {
  return window.innerWidth <= 768;
};

function App() {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [mobile, setMobile] = useState(isMobile());
  const [currentPage, setCurrentPage] = useState('tree'); // 新增页面状态

  // 处理菜单点击
  const handleMenuClick = (menuKey) => {
    setCurrentPage(menuKey);
  };

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
          background: '#f8fafc'
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
          background: '#f8fafc'
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

  // 根据当前页面渲染不同组件
  const renderCurrentPage = () => {
    const commonProps = {
      onMenuClick: handleMenuClick,
      activeMenuItem: currentPage
    };

    switch (currentPage) {
      case 'tree':
        return (
          <FamilyTreePage
            {...commonProps}
            familyData={familyData}
            loading={loading}
            error={error}
            validationResult={validationResult}
          />
        );
      case 'settings':
        return <SettingsPage {...commonProps} />;
      case 'create':
        return <CreatePage {...commonProps} />;
      case 'discover':
      case 'events':
      case 'analytics':
        return (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '16px'
          }}>
            <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>功能开发中</h2>
            <p>该功能正在开发中，敬请期待...</p>
          </div>
        );
      default:
        return (
          <FamilyTreePage
            {...commonProps}
            familyData={familyData}
            loading={loading}
            error={error}
            validationResult={validationResult}
          />
        );
    }
  };

  // 移动端使用底部Tab导航
  if (mobile) {
    const tabItems = [
      {
        key: 'tree',
        label: '家谱',
        icon: <TeamOutlined />,
        children: (
          <FamilyTreePage
            familyData={familyData}
            loading={loading}
            error={error}
            validationResult={validationResult}
          />
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
        <Layout style={{ height: '100vh', background: '#f8fafc' }}>
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
                backgroundColor: '#f7f7f7',
                borderTop: '0.5px solid #e5e5e5',
                margin: 0,
                padding: 0,
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                height: '56px',
                boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05)'
              }}
            />
          </Content>
        </Layout>
      </div>
    );
  }

  // PC端使用新的布局系统
  return (
    <div className="App desktop-layout">
      {renderCurrentPage()}
    </div>
  );
}

export default App;
