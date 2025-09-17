import React from 'react';
import FamilySearchBar from '../UI/FamilySearchBar';
import TenantSelector from '../TenantSelector';
import './MainContent.css';

const MainContent = ({
  children,
  user = { name: '穆塔爸', avatar: '穆' },
  familyData = [],
  nodes = [],
  statistics = null,
  onSearch,
  onSearchSelect,
  sidebarCollapsed = false
}) => {
  return (
    <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 顶部导航栏 - 租户选择器移至右上角 */}
      <header className="header">
        {/* 左侧：搜索栏 */}
        <div className="header-left">
          <FamilySearchBar
            familyData={familyData}
            nodes={nodes}
            statistics={statistics}
            onSearch={onSearch}
            onSelect={onSearchSelect}
            placeholder="搜索族谱成员..."
            showStatus={true}
            style={{ flex: 1, maxWidth: 400 }}
          />
        </div>

        {/* 右侧：租户选择器 */}
        <div className="header-right">
          <TenantSelector />
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="content-container">
        {children}
      </div>
    </main>
  );
};

export default MainContent;
