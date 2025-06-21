import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import { Button, Card, Slider, Input, Select, Space, Typography, Spin, Alert } from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  FullscreenOutlined
} from '@ant-design/icons';

import FamilyMemberNode from './FamilyMemberNode';
import { 
  convertToReactFlowData, 
  getLayoutedElements, 
  filterByRank,
  searchFamilyMembers,
  getFamilyStatistics
} from '../utils/familyTreeUtils';

import 'reactflow/dist/style.css';
import './FamilyTreeFlow.css';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

// 定义节点类型
const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const FamilyTreeFlow = ({ familyData, loading = false, error = null }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [generationRange, setGenerationRange] = useState([1, 20]);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!familyData || familyData.length === 0) return null;
    return getFamilyStatistics(familyData);
  }, [familyData]);

  // 处理数据转换和布局
  const processData = useCallback(() => {
    if (!familyData || familyData.length === 0) return;

    // 应用筛选
    let filteredData = filterByRank(familyData, generationRange[0], generationRange[1]);
    
    // 应用搜索
    if (searchTerm.trim()) {
      filteredData = searchFamilyMembers(filteredData, searchTerm);
    }

    // 转换为React Flow数据格式
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowData(filteredData);
    
    // 应用布局
    const layoutedNodes = getLayoutedElements(newNodes, newEdges, layoutDirection);
    
    setNodes(layoutedNodes);
    setEdges(newEdges);
  }, [familyData, searchTerm, generationRange, layoutDirection, setNodes, setEdges]);

  // 当数据或筛选条件改变时重新处理数据
  useEffect(() => {
    processData();
  }, [processData]);

  // 处理连接
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 处理节点点击
  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  // 重置视图
  const resetView = useCallback(() => {
    setSearchTerm('');
    setGenerationRange([1, statistics?.generations || 20]);
    setSelectedNode(null);
  }, [statistics]);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 处理搜索
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // 处理代数范围变化
  const handleGenerationChange = useCallback((value) => {
    setGenerationRange(value);
  }, []);

  // 处理布局方向变化
  const handleLayoutDirectionChange = useCallback((value) => {
    setLayoutDirection(value);
  }, []);

  if (loading) {
    return (
      <div className="family-tree-loading">
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在加载家谱数据...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  if (!familyData || familyData.length === 0) {
    return (
      <Alert
        message="暂无数据"
        description="没有找到家谱数据"
        type="info"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  return (
    <div className={`family-tree-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* 控制面板 */}
      <Card className="control-panel" size="small">
        <div className="control-row">
          <Space wrap>
            <Search
              placeholder="搜索家族成员..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchTerm('')}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
            
            <div className="generation-filter">
              <Text strong style={{ marginRight: 8 }}>
                <FilterOutlined /> 代数范围:
              </Text>
              <Slider
                range
                min={1}
                max={statistics?.generations || 20}
                value={generationRange}
                onChange={handleGenerationChange}
                style={{ width: 150 }}
                tooltip={{
                  formatter: (value) => `第${value}代`
                }}
              />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                第{generationRange[0]}-{generationRange[1]}代
              </Text>
            </div>

            <Select
              value={layoutDirection}
              onChange={handleLayoutDirectionChange}
              style={{ width: 120 }}
            >
              <Option value="TB">从上到下</Option>
              <Option value="BT">从下到上</Option>
              <Option value="LR">从左到右</Option>
              <Option value="RL">从右到左</Option>
            </Select>

            <Button icon={<ReloadOutlined />} onClick={resetView}>
              重置
            </Button>
            
            <Button 
              icon={<FullscreenOutlined />} 
              onClick={toggleFullscreen}
              type={isFullscreen ? 'primary' : 'default'}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
        </div>

        {/* 统计信息 */}
        {statistics && (
          <div className="statistics-row">
            <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
              <Text type="secondary">
                总人数: <Text strong>{statistics.totalMembers}</Text>
              </Text>
              <Text type="secondary">
                代数: <Text strong>{statistics.generations}</Text>
              </Text>
              <Text type="secondary">
                男性: <Text strong style={{ color: '#1890ff' }}>{statistics.maleCount}</Text>
              </Text>
              <Text type="secondary">
                女性: <Text strong style={{ color: '#eb2f96' }}>{statistics.femaleCount}</Text>
              </Text>
              <Text type="secondary">
                当前显示: <Text strong>{nodes.length}</Text> 人
              </Text>
            </Space>
          </div>
        )}
      </Card>

      {/* React Flow 图表 */}
      <div className="flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        >
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const colors = ['#f50', '#2db7f5', '#87d068', '#108ee9', '#f56a00'];
              return colors[(node.data.rank - 1) % colors.length];
            }}
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
          <Background variant="dots" gap={12} size={1} />
          
          {/* 选中节点信息面板 */}
          {selectedNode && (
            <Panel position="top-right">
              <Card 
                title={selectedNode.data.name}
                size="small"
                style={{ width: 300, maxHeight: 400, overflow: 'auto' }}
                extra={
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={() => setSelectedNode(null)}
                  >
                    ×
                  </Button>
                }
              >
                <div className="selected-node-info">
                  <p><strong>第{selectedNode.data.rank}代</strong> (排行第{selectedNode.data.rankIndex})</p>
                  {selectedNode.data.officialPosition && (
                    <p><strong>职位:</strong> {selectedNode.data.officialPosition}</p>
                  )}
                  {selectedNode.data.birthDate && (
                    <p><strong>生日:</strong> {selectedNode.data.birthDate}</p>
                  )}
                  {selectedNode.data.location && (
                    <p><strong>地点:</strong> {selectedNode.data.location}</p>
                  )}
                  {selectedNode.data.summary && (
                    <div>
                      <strong>简介:</strong>
                      <p style={{ marginTop: 4, fontSize: '12px', lineHeight: 1.4 }}>
                        {selectedNode.data.summary}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export default FamilyTreeFlow;
