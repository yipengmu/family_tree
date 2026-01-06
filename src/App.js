import React, { useState, useEffect } from 'react';
import { Layout, Alert, Tabs, message } from 'antd';
import { TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { validateFamilyData } from './utils/familyTreeUtils';
import dbJson from './data/familyData.js';
import FamilyTreePage from './components/Pages/FamilyTreePage';
import SettingsPage from './components/Pages/SettingsPage';
import CreatorPage from './components/Pages/CreatorPage';
import DiscoverPage from './components/Pages/DiscoverPage';
import TenantSelector from './components/TenantSelector';
import familyDataService from './services/familyDataService';
import tenantService from './services/tenantService';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Pages/LoginPage';
import RegisterPage from './components/Pages/RegisterPage';
// 导入测试工具（开发环境自动运行）

import './App.css';

const { Content } = Layout;

// 检测是否为移动端
const isMobile = () => {
  return window.innerWidth <= 768;
};

// 主应用组件
function MainApp() {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [mobile, setMobile] = useState(isMobile());
  const [currentPage, setCurrentPage] = useState('tree'); // 新增页面状态
  const [currentTenant, setCurrentTenant] = useState(null);

  // 检查用户是否已登录
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

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

    // 加载家谱数据
    const loadFamilyData = async (tenantId = null) => {
      try {
        setLoading(true);
        setError(null);

        const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
        console.log(`📖 [App] 加载家谱数据 - 租户: ${currentTenantId}`);

        // 优先从数据库加载数据
        let data = [];
        try {
          const response = await fetch(`http://localhost:3003/api/family-data/${currentTenantId}`);
          const result = await response.json();

          if (response.ok && result.success && result.data && result.data.length > 0) {
            data = result.data;
            console.log(`✅ [App] 从数据库加载 ${data.length} 条记录`);
          } else {
            console.log(`📝 [App] 数据库无数据，使用本地服务`);
            // 如果数据库没有数据，使用原有的familyDataService
            // 对默认租户强制刷新，确保加载最新数据
            const forceRefresh = currentTenantId === 'default' || 
                               currentTenantId === process.env.REACT_APP_DEFAULT_TENANT_ID;
            console.log(`🔄 [App] ${forceRefresh ? '强制刷新' : '常规加载'}家谱数据`);
            data = await familyDataService.getFamilyData(forceRefresh, currentTenantId);
          }
        } catch (dbError) {
          console.log(`📝 [App] 数据库连接失败，使用本地服务:`, dbError.message);
          // 如果数据库连接失败，使用原有的familyDataService
          // 对默认租户强制刷新，确保加载最新数据
          const forceRefresh = currentTenantId === 'default' || 
                             currentTenantId === process.env.REACT_APP_DEFAULT_TENANT_ID;
          console.log(`🔄 [App] ${forceRefresh ? '强制刷新' : '常规加载'}家谱数据`);
          data = await familyDataService.getFamilyData(forceRefresh, currentTenantId);
        }

        // 验证数据
        const result = validateFamilyData(data);
        setValidationResult(result);

        if (result.isValid) {
          setFamilyData(data);
        } else {
          console.warn('数据验证失败:', result.issues);
          setFamilyData(data); // 即使验证失败也加载数据，但会显示警告
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        setError(err.message);
        message.error(`加载家谱数据失败: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // 初始化应用
    const initializeApp = async () => {
      // 获取当前租户
      const tenant = tenantService.getCurrentTenant();
      setCurrentTenant(tenant);

      // 加载数据
      await loadFamilyData(tenant.id);
    };

    initializeApp();

    // 监听租户切换事件
    const unsubscribe = tenantService.onTenantChange(async (tenant) => {
      setCurrentTenant(tenant);
      await loadFamilyData(tenant.id);
    });

    // 监听家谱数据更新事件
    const handleFamilyDataUpdated = async (event) => {
      const { tenantId } = event.detail;
      const currentTenantId = tenantService.getCurrentTenant().id;

      // 如果更新的是当前租户的数据，重新加载
      if (tenantId === currentTenantId) {
        console.log('🔄 [App] 检测到家谱数据更新，重新加载...');
        await loadFamilyData(tenantId);
      }
    };

    window.addEventListener('familyDataUpdated', handleFamilyDataUpdated);

    return () => {
      window.removeEventListener('error', handleResizeObserverError);
      window.removeEventListener('familyDataUpdated', handleFamilyDataUpdated);
      unsubscribe();
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
        return <CreatorPage {...commonProps} />;
      case 'discover':
        return <DiscoverPage {...commonProps} />;
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

  // 移动端也使用AppLayout组件，但简化菜单
  if (mobile) {
    return (
      <div className="App mobile-layout">
        {renderCurrentPage()}
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

// 受保护的路由组件
function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
}

// 应用根组件
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;