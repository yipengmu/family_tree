import React, { useState, useEffect } from 'react';
import { Layout, Alert, Tabs, message } from 'antd';
import { TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { validateFamilyData } from './utils/familyTreeUtils.js';
import dbJson from './data/familyData.js';
import FamilyTreePage from './components/Pages/FamilyTreePage.js';
import SettingsPage from './components/Pages/SettingsPage.js';
import CreatorPage from './components/Pages/CreatorPage.js';
import DiscoverPage from './components/Pages/DiscoverPage.js';
import TenantSelector from './components/TenantSelector.js';
import familyDataService from './services/familyDataService.js';
import tenantService from './services/tenantService.js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Pages/LoginPage.js';
import RegisterPage from './components/Pages/RegisterPage.js';
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

  // 检查是否为游客模式
  const isGuestMode = () => {
    return !isAuthenticated() && localStorage.getItem('guest_mode') === 'true';
  };

  // 处理菜单点击
  const handleMenuClick = (menuKey) => {
    // 如果用户未登录且不在游客模式，且点击的是需要登录的功能，则跳转到登录页
    if (!isAuthenticated() && menuKey !== 'tree' && menuKey !== 'discover') {
      setCurrentPage('login-required');
      return;
    }
    
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

    // 加载家谱数据 - 优化：优先使用缓存，后台异步更新
    const loadFamilyData = async (tenantId = null) => {
      try {
        const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
        console.log(`📖 [App] 加载家谱数据 - 租户: ${currentTenantId}`);

        // 首先尝试从内存缓存快速加载（不等待数据库）
        const cachedData = await familyDataService.getFamilyData(false, currentTenantId);
        
        // 立即设置缓存数据并停止loading状态，提升用户体验
        if (cachedData && cachedData.length > 0) {
          setFamilyData(cachedData);
          const result = validateFamilyData(cachedData);
          setValidationResult(result);
          setLoading(false);
          console.log(`⚡ [App] 使用缓存数据快速显示 (${cachedData.length} 条记录)`);
        }

        // 然后在后台异步更新数据
        try {
          // 尝试从数据库获取最新数据（不阻塞UI）
          const response = await fetch(`http://localhost:3003/api/family-data/${currentTenantId}`, {
            // 设置较短的超时时间避免长时间等待
            signal: AbortSignal.timeout(3000) // 3秒超时
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
              console.log(`✅ [App] 从数据库获取最新数据 (${result.data.length} 条记录)`);
              
              // 验证新数据
              const validation = validateFamilyData(result.data);
              
              // 更新状态，只在数据确实变化时才更新
              if (JSON.stringify(result.data) !== JSON.stringify(cachedData)) {
                setFamilyData(result.data);
                setValidationResult(validation);
                console.log('🔄 [App] 数据已更新到最新版本');
              }
            }
          }
        } catch (dbError) {
          console.log(`📝 [App] 数据库连接超时或失败，使用本地缓存:`, dbError.message);
          // 数据库连接失败时，仍使用已缓存的数据
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        setError(err.message);
        message.error(`加载家谱数据失败: ${err.message}`);
        setLoading(false);
      }
    };

    // 初始化应用
    const initializeApp = async () => {
      // 如果用户未登录，设置为游客模式
      if (!isAuthenticated()) {
        localStorage.setItem('guest_mode', 'true');
        
        // 设置默认租户为穆家家谱
        const defaultTenant = {
          id: 'default',
          name: '穆家家谱 (游客模式)',
          description: '默认家谱数据 - 游客模式',
          createdAt: new Date().toISOString(),
          isDefault: true,
        };
        tenantService.setCurrentTenant(defaultTenant);
        setCurrentTenant(defaultTenant);
      } else {
        // 用户已登录，移除游客模式标识
        localStorage.removeItem('guest_mode');
        
        // 获取当前租户
        const tenant = tenantService.getCurrentTenant();
        setCurrentTenant(tenant);
      }

      // 先快速加载本地数据，不阻塞UI
      try {
        // 使用默认数据快速填充，避免长时间loading
        const defaultData = await familyDataService.loadOriginalFamilyData('default');
        if (defaultData && defaultData.length > 0) {
          setFamilyData(defaultData);
          const result = validateFamilyData(defaultData);
          setValidationResult(result);
          // 不立即设置loading为false，而是等待从数据库加载完成或超时
        }
      } catch (err) {
        console.error('初始化默认数据失败:', err);
      }

      // 在后台加载最新数据
      await loadFamilyData('default');
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



  // 显示加载状态 - 优化：即使在后台加载时也允许用户交互
  if (loading && familyData.length === 0) {
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
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              （首次加载可能需要一些时间）
            </div>
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
        // 如果用户未登录，显示登录提示
        if (!isAuthenticated()) {
          return (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '16px'
            }}>
              <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>需要登录</h2>
              <p>此功能需要登录才能使用</p>
              <button 
                onClick={() => setCurrentPage('login')}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                前往登录
              </button>
            </div>
          );
        }
        return <SettingsPage {...commonProps} />;
      case 'create':
        // 如果用户未登录，引导注册
        if (!isAuthenticated()) {
          return (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '16px'
            }}>
              <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>创建您的家谱</h2>
              <p>要创建您自己的家谱，请先注册账号</p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setCurrentPage('login')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  登录
                </button>
                <button 
                  onClick={() => setCurrentPage('register')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#52c41a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  注册
                </button>
              </div>
            </div>
          );
        }
        return <CreatorPage {...commonProps} />;
      case 'discover':
        return <DiscoverPage {...commonProps} />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'login-required':
        return (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '16px'
          }}>
            <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>需要登录</h2>
            <p>此功能需要登录才能使用</p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setCurrentPage('login')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                登录
              </button>
              <button 
                onClick={() => setCurrentPage('register')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#52c41a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                注册
              </button>
            </div>
          </div>
        );
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

// 受保护的路由组件 - 现在只对特定路由进行保护
function ProtectedRoute({ children, requireAuth = true }) {
  const isAuthenticated = !!localStorage.getItem('token');
  
  // 如果不需要认证或者已认证，直接显示内容
  if (!requireAuth || isAuthenticated) {
    return children;
  }
  
  // 如果需要认证但未登录，重定向到主页（游客模式）
  return <Navigate to="/" />;
}

// 应用根组件
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={
          <ProtectedRoute requireAuth={false}>
            <MainApp />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;