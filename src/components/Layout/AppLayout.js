import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import './AppLayout.css';

const AppLayout = ({
  children,
  activeMenuItem = 'tree',
  onMenuClick,
  familyData = [],
  nodes = [],
  statistics = null,
  onSearch,
  onSearchSelect
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 桌面端侧边栏收起状态
  const [currentUser] = useState({
    name: '穆塔爸',
    avatar: '穆'
  });

  const handleMenuClick = (menuKey) => {
    console.log('Menu clicked:', menuKey);
    if (onMenuClick) {
      onMenuClick(menuKey);
    }
    setSidebarOpen(false); // 移动端点击后关闭侧边栏
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 桌面端侧边栏收起切换
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-layout">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar
          activeItem={activeMenuItem}
          onMenuClick={handleMenuClick}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          user={currentUser}
        />
      </div>

      {/* 主要内容 */}
      <MainContent
        user={currentUser}
        familyData={familyData}
        nodes={nodes}
        statistics={statistics}
        onSearch={onSearch}
        onSearchSelect={onSearchSelect}
        sidebarCollapsed={sidebarCollapsed}
      >
        {/* 移动端菜单按钮 */}
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
        >
          <span>1</span>
          <span>2</span>
          <span></span>
        </button>

        {children}
      </MainContent>
    </div>
  );
};

export default AppLayout;
