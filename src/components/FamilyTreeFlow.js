import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
} from 'reactflow';
import { Button, Card, Slider, Input, Select, Space, Typography, Spin, Alert, Drawer, Divider, AutoComplete } from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  FullscreenOutlined,
  EyeOutlined,
  CompressOutlined,
  MoreOutlined,
  SettingOutlined
} from '@ant-design/icons';

import FamilyMemberNode from './FamilyMemberNode';
import {
  convertToReactFlowData,
  getLayoutedElements,
  filterByRank,
  getFamilyStatistics,
  searchWithPathTree
} from '../utils/familyTreeUtils';
import searchHistoryManager from '../utils/searchHistory';

import 'reactflow/dist/style.css';
import './FamilyTreeFlow.css';

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
  const [generationRange, setGenerationRange] = useState([1, 20]); // 默认显示完整家谱
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isShowingAll, setIsShowingAll] = useState(true); // 默认显示全部
  const [searchTargetPerson, setSearchTargetPerson] = useState(null); // 搜索的目标人员
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 抽屉状态
  const [showAlert, setShowAlert] = useState(true); // 控制提示显示
  // eslint-disable-next-line no-unused-vars
  const [searchHistory, setSearchHistory] = useState([]); // 搜索历史
  const [searchOptions, setSearchOptions] = useState([]); // 搜索建议选项
  const [searchInputValue, setSearchInputValue] = useState(''); // 搜索输入框的值
  const searchTimeoutRef = useRef(null); // 搜索节流定时器
  const [isMobile, setIsMobile] = useState(false); // 移动端检测
  const { fitView, setCenter, getViewport, getNodes } = useReactFlow();

  // 移动端检测
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 理想的默认视图参数（基于穆茂节点的最佳显示效果）
  const idealViewParams = useMemo(() => {
    if (isMobile) {
      return {
        zoom: 0.8,           // 移动端更小的缩放比例
        centerOffsetX: 50,   // 移动端更小的偏移
        centerOffsetY: 20,   // 移动端更小的偏移
        topPadding: 10       // 移动端更小的留白
      };
    }
    return {
      zoom: 1.2,
      centerOffsetX: 100,  // 节点中心偏移
      centerOffsetY: 40,   // 节点中心偏移
      topPadding: 20       // 顶部留白
    };
  }, [isMobile]);

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!familyData || familyData.length === 0) return null;
    return getFamilyStatistics(familyData);
  }, [familyData]);

  // 处理数据转换和布局
  const processData = useCallback(() => {
    if (!familyData || familyData.length === 0) return;

    let filteredData;
    let targetPerson = null;

    // 应用搜索（优先处理搜索逻辑）
    if (searchTerm.trim()) {
      const searchResult = searchWithPathTree(familyData, searchTerm);
      filteredData = searchResult.pathTreeData;
      targetPerson = searchResult.targetPerson;
      setSearchTargetPerson(targetPerson);

      console.log('🔍 搜索结果:', {
        searchTerm,
        searchResults: searchResult.searchResults,
        targetPerson,
        pathTreeDataCount: filteredData.length
      });
    } else {
      // 没有搜索时，应用代数筛选
      filteredData = filterByRank(familyData, generationRange[0], generationRange[1]);
      setSearchTargetPerson(null);
    }

    // 转换为React Flow数据格式
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowData(filteredData);

    // 应用布局
    const layoutedNodes = getLayoutedElements(newNodes, newEdges, layoutDirection);

    setNodes(layoutedNodes);
    setEdges(newEdges);
  }, [familyData, searchTerm, generationRange, layoutDirection, setNodes, setEdges]);

  // 添加日志功能
  const logViewportInfo = useCallback(() => {
    const viewport = getViewport();
    const currentNodes = getNodes();
    const founderNode = currentNodes.find(node =>
      node.data.rank === 1 && (node.data.name === '穆茂' || node.data.id === 1)
    );

    console.log('=== ReactFlow 视图参数日志 ===');
    console.log('当前视口:', viewport);
    console.log('穆茂节点信息:', founderNode);
    if (founderNode) {
      console.log('穆茂节点位置:', founderNode.position);
      console.log('穆茂节点数据:', founderNode.data);
    }
    console.log('总节点数:', currentNodes.length);
    console.log('当前代数范围:', generationRange);
    console.log('是否显示全部:', isShowingAll);
    console.log('========================');
  }, [getViewport, getNodes, generationRange, isShowingAll]);

  // 应用理想的默认视图（以穆茂为中心，顶部居中，合适缩放）
  const applyIdealDefaultView = useCallback(() => {
    // 延迟执行，确保节点已经渲染
    const timer = setTimeout(() => {
      const currentNodes = getNodes();
      const founderNode = currentNodes.find(node =>
        node.data.rank === 1 && (node.data.name === '穆茂' || node.data.id === 1)
      );

      if (founderNode && founderNode.position) {
        console.log('🎯 应用理想默认视图 - 以穆茂为中心', isMobile ? '(移动端)' : '(桌面端)');
        console.log('穆茂节点位置:', founderNode.position);

        // 计算理想的视图中心点（穆茂在顶部居中，有留白）
        const idealCenterX = founderNode.position.x + idealViewParams.centerOffsetX;
        const idealCenterY = founderNode.position.y + idealViewParams.centerOffsetY + idealViewParams.topPadding;

        console.log('设置理想中心点:', {
          x: idealCenterX,
          y: idealCenterY,
          zoom: idealViewParams.zoom,
          isMobile
        });

        setCenter(idealCenterX, idealCenterY, {
          zoom: idealViewParams.zoom,
          duration: isMobile ? 600 : 1000 // 移动端更快的动画
        });

        // 记录应用后的视图状态
        setTimeout(() => {
          logViewportInfo();
        }, 1200);
      } else {
        console.log('⚠️ 未找到穆茂节点，使用默认fitView');
        fitView({
          padding: 0.2,
          duration: 1000,
          minZoom: 0.8,
          maxZoom: 1.5
        });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [getNodes, setCenter, fitView, idealViewParams, logViewportInfo, isMobile]);

  // 当数据或筛选条件改变时重新处理数据
  useEffect(() => {
    processData();
  }, [processData]);

  // 加载搜索历史
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await searchHistoryManager.getSearchHistory();
        setSearchHistory(history);

        // 构建搜索建议选项
        const options = history.map((record, index) => ({
          value: record.searchTerm,
          key: `${record.searchTerm}-${record.timestamp}-${index}`, // 使用唯一key
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{record.searchTerm}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>
                {record.resultCount}个结果
              </span>
            </div>
          )
        }));
        setSearchOptions(options);
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 当节点更新且为完整模式时，应用理想的默认视图
  useEffect(() => {
    if (isShowingAll && nodes.length > 0 && familyData && familyData.length > 0 && !searchTargetPerson) {
      applyIdealDefaultView();
    }
  }, [nodes.length, isShowingAll, familyData, applyIdealDefaultView, searchTargetPerson]);

  // 当搜索到目标人员时，自动聚焦到该人员
  useEffect(() => {
    if (searchTargetPerson && nodes.length > 0) {
      const timer = setTimeout(() => {
        const targetNode = nodes.find(node =>
          node.data.id === searchTargetPerson.id
        );

        if (targetNode && targetNode.position) {
          console.log('🎯 聚焦到搜索目标:', searchTargetPerson.name, isMobile ? '(移动端)' : '(桌面端)');
          console.log('目标节点位置:', targetNode.position);

          // 将视图中心设置到目标节点
          const centerX = targetNode.position.x + idealViewParams.centerOffsetX;
          const centerY = targetNode.position.y + idealViewParams.centerOffsetY;

          setCenter(centerX, centerY, {
            zoom: idealViewParams.zoom,
            duration: isMobile ? 600 : 800 // 移动端更快的动画
          });

          // 同时选中该节点以高亮显示
          setSelectedNode(targetNode);

          console.log('设置搜索目标中心点:', {
            x: centerX,
            y: centerY,
            zoom: idealViewParams.zoom,
            isMobile
          });
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [searchTargetPerson, nodes, setCenter, idealViewParams, isMobile]);

  // 自动关闭提示
  useEffect(() => {
    if (!isShowingAll && !searchTargetPerson && generationRange[0] === 1 && generationRange[1] === 1 && !searchTerm && showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 2000); // 2秒后自动关闭

      return () => clearTimeout(timer);
    }
  }, [isShowingAll, searchTargetPerson, generationRange, searchTerm, showAlert]);

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
    setSearchTargetPerson(null);
    const maxGen = statistics?.generations || 20;
    setGenerationRange([1, maxGen]); // 重置为完整家谱
    setSelectedNode(null);
    setIsShowingAll(true);
  }, [statistics]);

  // 聚焦第1代祖上（穆茂）
  const focusOnFounder = useCallback(() => {
    setGenerationRange([1, 1]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(false);
    setShowAlert(true); // 重新显示提示
  }, []);

  // 当节点更新且处于聚焦模式时，自动聚焦到穆茂
  useEffect(() => {
    if (!isShowingAll && generationRange[0] === 1 && generationRange[1] === 1 && nodes.length > 0) {
      // 延迟执行，确保布局完成
      const timer = setTimeout(() => {
        // 找到穆茂节点（第1代，通常id为1）
        const founderNode = nodes.find(node =>
          node.data.rank === 1 && (node.data.name === '穆茂' || node.data.id === 1)
        );

        if (founderNode && founderNode.position) {
          console.log('🎯 聚焦到穆茂节点');
          console.log('节点位置:', founderNode.position);

          // 使用理想参数设置中心点
          const centerX = founderNode.position.x + idealViewParams.centerOffsetX;
          const centerY = founderNode.position.y + idealViewParams.centerOffsetY + idealViewParams.topPadding;

          console.log('设置中心点:', {
            x: centerX,
            y: centerY,
            zoom: idealViewParams.zoom
          });

          // 将视图中心设置到穆茂节点
          setCenter(centerX, centerY, {
            zoom: idealViewParams.zoom,
            duration: 800
          });

          // 同时选中该节点以高亮显示
          setSelectedNode(founderNode);

          // 延迟记录最终视图状态
          setTimeout(() => {
            logViewportInfo();
          }, 1000);
        } else {
          console.log('⚠️ 未找到穆茂节点，执行fitView');
          // 如果找不到具体节点，至少适应视图
          fitView({
            padding: 0.3,
            duration: 800,
            minZoom: 0.8,
            maxZoom: 1.5
          });

          setTimeout(() => {
            logViewportInfo();
          }, 1000);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [nodes, isShowingAll, generationRange, setCenter, fitView, logViewportInfo, idealViewParams]);

  // 快速切换到前三代
  const showFirstThreeGenerations = useCallback(() => {
    setGenerationRange([1, 3]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(false);
  }, []);

  // 快速切换到最后三代
  const showLastThreeGenerations = useCallback(() => {
    const maxGen = statistics?.generations || 20;
    setGenerationRange([Math.max(1, maxGen - 2), maxGen]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(false);
  }, [statistics]);

  // 显示全部家谱
  const showAllGenerations = useCallback(() => {
    const maxGen = statistics?.generations || 20;
    setGenerationRange([1, maxGen]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(true);
  }, [statistics]);

  // 回到聚焦模式（聚焦第1代）
  const backToFocusMode = useCallback(() => {
    setGenerationRange([1, 1]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(false);
    setShowAlert(true); // 重新显示提示
    // 聚焦逻辑由useEffect处理
  }, []);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 执行实际搜索（带历史记录）
  const performSearch = useCallback(async (value) => {
    setSearchTerm(value);

    // 搜索时切换到相应模式
    if (value.trim()) {
      setIsShowingAll(false); // 搜索时进入聚焦模式

      // 记录搜索历史
      try {
        const searchResult = searchWithPathTree(familyData, value);
        await searchHistoryManager.addSearchRecord(
          value,
          searchResult.searchResults.length,
          searchResult.targetPerson
        );

        // 重新加载搜索历史
        const updatedHistory = await searchHistoryManager.getSearchHistory();
        setSearchHistory(updatedHistory);

        // 更新搜索建议选项
        const options = updatedHistory.map((record, index) => ({
          value: record.searchTerm,
          key: `${record.searchTerm}-${record.timestamp}-${index}`, // 使用唯一key
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{record.searchTerm}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>
                {record.resultCount}个结果
              </span>
            </div>
          )
        }));
        setSearchOptions(options);
      } catch (error) {
        console.error('记录搜索历史失败:', error);
      }
    }
  }, [familyData]);

  // 节流搜索处理
  const handleSearchWithThrottle = useCallback((value) => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 立即更新输入框的值
    setSearchInputValue(value);

    // 如果输入为空，立即清除搜索
    if (!value.trim()) {
      setSearchTerm('');
      setSearchTargetPerson(null);
      return;
    }

    // 设置新的定时器，500ms后执行搜索
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 500);
  }, [performSearch]);

  // 处理搜索框的回车和选择
  const handleSearchSubmit = useCallback((value) => {
    // 清除定时器，立即执行搜索
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(value);
  }, [performSearch]);

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
      {/* 智能提示 */}
      {searchTargetPerson && (
        <Alert
          message={`🔍 搜索路径模式 - ${searchTargetPerson.name}`}
          description={
            <span>
              当前显示从 <strong>{searchTargetPerson.name}</strong> 到祖上 <strong>穆茂</strong> 的完整路径树，
              包含路径上的所有祖先和相关家族成员。清空搜索可返回完整家谱。
            </span>
          }
          type="success"
          showIcon
          closable
          style={{
            margin: '16px 24px 0 24px',
            borderRadius: '12px',
            border: '1px solid hsl(142.1 76.2% 36.3%)',
            background: 'hsl(142.1 76.2% 96%)'
          }}
        />
      )}

      {!isShowingAll && !searchTargetPerson && generationRange[0] === 1 && generationRange[1] === 1 && !searchTerm && showAlert && (
        <Alert
          message="💡 当前聚焦第1代祖上"
          description={
            <span>
              这是聚焦模式，显示家族创始人。
              点击下方 <strong>"查看完整家谱"</strong> 按钮可浏览全部 {statistics?.totalMembers || 0} 位家族成员。
            </span>
          }
          type="info"
          showIcon
          closable
          onClose={() => setShowAlert(false)}
          style={{
            margin: '16px 24px 0 24px',
            borderRadius: '12px',
            border: '1px solid hsl(214.3 31.8% 91.4%)',
            background: 'hsl(210 40% 98%)'
          }}
        />
      )}

      {/* 后台管理风格控制面板 */}
      <div className="admin-control-panel">
        <div className="control-main-row">
          {/* 左侧：搜索和主要操作 */}
          <div className="control-left">
            <AutoComplete
              options={searchOptions}
              style={{ width: 240 }}
              value={searchInputValue}
              onSearch={handleSearchWithThrottle}
              onSelect={handleSearchSubmit}
              placeholder="搜索家族成员..."
              allowClear
              onChange={(value) => {
                if (!value) {
                  setSearchInputValue('');
                  setSearchTerm('');
                  setSearchTargetPerson(null);
                } else {
                  handleSearchWithThrottle(value);
                }
              }}
            >
              <Input
                prefix={<SearchOutlined />}
                onPressEnter={(e) => handleSearchSubmit(e.target.value)}
                style={{ paddingLeft: '30px' }}
              />
            </AutoComplete>

            {/* 主要操作按钮 */}
            {isShowingAll ? (
              <Button
                type="primary"
                icon={<CompressOutlined />}
                onClick={backToFocusMode}
              >
                聚焦祖上
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={showAllGenerations}
              >
                查看完整家谱
              </Button>
            )}
          </div>

          {/* 中间：留空，保持简洁 */}
          <div className="control-center">
            {/* 保持中间区域简洁 */}
          </div>

          {/* 右侧：状态信息和操作按钮 */}
          <div className="control-right">
            <Space size="middle">
              {/* 状态指示 */}
              <div className="status-indicator">
                {searchTargetPerson ? (
                  <span className="status-badge search">搜索路径</span>
                ) : isShowingAll ? (
                  <span className="status-badge complete">完整模式</span>
                ) : (
                  <span className="status-badge focus">聚焦模式</span>
                )}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                  {nodes.length}/{statistics?.totalMembers || 0}人
                </Text>
              </div>

              {/* 重置按钮 */}
              <Button
                icon={<ReloadOutlined />}
                onClick={resetView}
                size="small"
                title="重置到默认状态"
              >
                重置
              </Button>

              {/* 全屏按钮 */}
              <Button
                icon={<FullscreenOutlined />}
                onClick={toggleFullscreen}
                type={isFullscreen ? 'primary' : 'default'}
                size="small"
                title={isFullscreen ? '退出全屏' : '进入全屏'}
              />

              {/* 更多操作 */}
              <Button
                icon={<MoreOutlined />}
                onClick={() => setIsDrawerOpen(true)}
                size="small"
                title="更多设置"
              >
                更多
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 更多操作抽屉 */}
      <Drawer
        title="更多设置"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={360}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <div className="drawer-content">
          {/* 快速切换 */}
          <div className="drawer-section">
            <h4>快速切换</h4>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                onClick={focusOnFounder}
                block
                size="small"
              >
                聚焦祖上 (第1代)
              </Button>
              <Button
                onClick={showFirstThreeGenerations}
                block
                size="small"
              >
                前三代 (第1-3代)
              </Button>
              <Button
                onClick={showLastThreeGenerations}
                block
                size="small"
              >
                最后三代
              </Button>
            </Space>
          </div>

          <Divider />

          {/* 代数筛选 */}
          <div className="drawer-section">
            <h4>代数筛选</h4>
            <div className="generation-filter-drawer">
              <Slider
                range
                min={1}
                max={statistics?.generations || 20}
                value={generationRange}
                onChange={handleGenerationChange}
                tooltip={{
                  formatter: (value) => `第${value}代`
                }}
              />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                当前显示：第{generationRange[0]}-{generationRange[1]}代
              </Text>
            </div>
          </div>

          <Divider />

          {/* 布局设置 */}
          <div className="drawer-section">
            <h4>布局方向</h4>
            <Select
              value={layoutDirection}
              onChange={handleLayoutDirectionChange}
              style={{ width: '100%' }}
            >
              <Option value="TB">从上到下</Option>
              <Option value="BT">从下到上</Option>
              <Option value="LR">从左到右</Option>
              <Option value="RL">从右到左</Option>
            </Select>
          </div>

          <Divider />

          {/* 开发工具 */}
          <div className="drawer-section">
            <h4>开发工具</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                onClick={logViewportInfo}
                block
                icon={<SettingOutlined />}
              >
                记录视图参数
              </Button>
              <Button
                onClick={applyIdealDefaultView}
                block
                icon={<SettingOutlined />}
              >
                应用理想视图
              </Button>
            </Space>
          </div>

          <Divider />

          {/* 统计信息 */}
          <div className="drawer-section">
            <h4>统计信息</h4>
            {statistics && (
              <div className="statistics-grid">
                <div className="stat-item">
                  <span className="stat-label">总人数</span>
                  <span className="stat-value">{statistics.totalMembers}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">代数</span>
                  <span className="stat-value">{statistics.generations}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">男性</span>
                  <span className="stat-value male">{statistics.maleCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">女性</span>
                  <span className="stat-value female">{statistics.femaleCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Drawer>

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
          minZoom={isMobile ? 0.3 : 0.2}
          maxZoom={isMobile ? 2 : 3}
          defaultViewport={{
            x: 0,
            y: 0,
            zoom: isMobile ? 0.6 : 0.8
          }}
          fitViewOptions={{
            padding: isMobile ? 0.1 : 0.2,
            includeHiddenNodes: false,
            minZoom: isMobile ? 0.4 : 0.5,
            maxZoom: isMobile ? 1.5 : 1.2
          }}
          // 移动端优化配置
          panOnDrag={true}
          panOnScroll={!isMobile} // 移动端禁用滚轮平移
          panOnScrollMode={isMobile ? 'free' : 'vertical'}
          zoomOnScroll={!isMobile} // 移动端禁用滚轮缩放
          zoomOnPinch={isMobile} // 移动端启用双指缩放
          zoomOnDoubleClick={true}
          preventScrolling={isMobile} // 移动端防止页面滚动
          elementsSelectable={true}
          selectNodesOnDrag={false}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors = [
                'hsl(221.2 83.2% 53.3%)', 'hsl(142.1 76.2% 36.3%)', 'hsl(262.1 83.3% 57.8%)',
                'hsl(346.8 77.2% 49.8%)', 'hsl(24.6 95% 53.1%)', 'hsl(47.9 95.8% 53.1%)',
                'hsl(173.4 58.9% 39.1%)', 'hsl(270.7 91% 65.1%)', 'hsl(0 84.2% 60.2%)',
                'hsl(20.5 90.2% 48.2%)', 'hsl(142.1 70.6% 45.3%)', 'hsl(217.2 91.2% 59.8%)'
              ];
              return colors[(node.data.rank - 1) % colors.length];
            }}
            nodeStrokeWidth={2}
            zoomable
            pannable
          />
          <Background variant="dots" gap={12} size={1} />

          {/* 浮动操作提示 */}
          {!isShowingAll && (
            <Panel position="bottom-center">
              <div className="floating-hint">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 可以缩放、拖拽浏览 • 点击节点查看详情 • 使用上方按钮查看完整家谱
                </Text>
              </div>
            </Panel>
          )}

          {/* 选中节点信息面板 */}
          {selectedNode && (
            <Panel position="top-right">
              <Card
                title={selectedNode.data.name}
                size="small"
                style={{
                  width: 320,
                  maxHeight: 450,
                  overflow: 'auto',
                  background: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(214.3 31.8% 91.4%)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                styles={{
                  header: {
                    background: 'hsl(210 40% 98%)',
                    borderBottom: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '12px 12px 0 0',
                    color: 'hsl(222.2 84% 4.9%)',
                    fontWeight: 600
                  },
                  body: {
                    background: 'hsl(0 0% 100%)',
                    color: 'hsl(222.2 84% 4.9%)'
                  }
                }}
                extra={
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setSelectedNode(null)}
                    style={{
                      color: 'hsl(215.4 16.3% 46.9%)',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </Button>
                }
              >
                <div className="selected-node-info">
                  <p style={{ color: 'hsl(222.2 84% 4.9%)', marginBottom: '12px' }}>
                    <strong>第{selectedNode.data.rank}代</strong> (排行第{selectedNode.data.rankIndex})
                  </p>
                  {selectedNode.data.officialPosition && (
                    <p style={{ color: 'hsl(222.2 84% 4.9%)', marginBottom: '8px' }}>
                      <strong>职位:</strong> {selectedNode.data.officialPosition}
                    </p>
                  )}
                  {selectedNode.data.birthDate && (
                    <p style={{ color: 'hsl(222.2 84% 4.9%)', marginBottom: '8px' }}>
                      <strong>生日:</strong> {selectedNode.data.birthDate}
                    </p>
                  )}
                  {selectedNode.data.location && (
                    <p style={{ color: 'hsl(222.2 84% 4.9%)', marginBottom: '8px' }}>
                      <strong>地点:</strong> {selectedNode.data.location}
                    </p>
                  )}
                  {selectedNode.data.summary && (
                    <div style={{ marginTop: '12px' }}>
                      <strong style={{ color: 'hsl(222.2 84% 4.9%)' }}>简介:</strong>
                      <p style={{
                        marginTop: 6,
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: 'hsl(215.4 16.3% 46.9%)',
                        background: 'hsl(210 40% 98%)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid hsl(214.3 31.8% 91.4%)'
                      }}>
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
