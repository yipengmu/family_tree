import React from 'react';
import FamilySearchBar from '../UI/FamilySearchBar';
import './MainContent.css';

const MainContent = ({
  children,
  user = { name: '穆塔爸', avatar: '穆' },
  familyData = [],
  nodes = [],
  statistics = null,
  onSearch,
  onSearchSelect
}) => {
  return (
    <main className="main-content">
      {/* 顶部搜索栏 */}
      <header className="header">
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

        <div className="user-profile">
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-logout">Log out</div>
          </div>
          <div className="user-avatar">{user.avatar}</div>
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
