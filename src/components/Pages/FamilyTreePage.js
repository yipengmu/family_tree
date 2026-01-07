import React, { useState, useRef, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FamilyTreeFlow from '../FamilyTreeFlow.js';
import AppLayout from '../Layout/AppLayout.js';
import './FamilyTreePage.css';

const FamilyTreePage = ({
  familyData,
  loading,
  error,
  activeMenuItem = 'tree',
  onMenuClick
}) => {
  // 状态管理
  const [nodes, setNodes] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const familyTreeRef = useRef(null);

  // 从FamilyTreeFlow接收数据的回调
  const handleTreeDataUpdate = useCallback((treeNodes, treeStatistics) => {
    setNodes(treeNodes);
    setStatistics(treeStatistics);
  }, []);

  // 搜索处理函数
  const handleSearch = useCallback((query) => {
    console.log('搜索:', query);
    // 调用FamilyTreeFlow的搜索方法
    if (familyTreeRef.current && familyTreeRef.current.handleSearch) {
      familyTreeRef.current.handleSearch(query);
    }
  }, []);

  const handleSearchSelect = useCallback((value, option) => {
    console.log('选择搜索结果:', value, option);
    // 调用FamilyTreeFlow的搜索选择方法
    if (familyTreeRef.current && familyTreeRef.current.handleSearchSelect) {
      familyTreeRef.current.handleSearchSelect(value, option);
    }
  }, []);

  return (
    <AppLayout
      activeMenuItem={activeMenuItem}
      onMenuClick={onMenuClick}
      familyData={familyData}
      nodes={nodes}
      statistics={statistics}
      onSearch={handleSearch}
      onSearchSelect={handleSearchSelect}
    >
      <div className="family-tree-page">
        {/* 显示加载状态 */}
        {loading && familyData.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌳</div>
              <div>正在加载家谱数据...</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                （数据来自缓存，后台同步更新）
              </div>
            </div>
          </div>
        )}

        {/* 家谱组件容器 */}
        <div className="family-tree-wrapper">
          <ReactFlowProvider>
            <FamilyTreeFlow
              ref={familyTreeRef}
              familyData={familyData}
              loading={loading}
              error={error}
              onDataUpdate={handleTreeDataUpdate}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </AppLayout>
  );
};

export default FamilyTreePage;