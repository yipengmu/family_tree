import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import { Button, Card, Slider, Input, Select, Space, Typography, Spin, Alert, Drawer, Divider, AutoComplete, Switch } from 'antd';
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
import muLogo from '../res/img/mulogo.png';
import {
  convertToReactFlowData,
  getLayoutedElements,
  filterByRank,
  getFamilyStatistics,
  searchWithPathTree
} from '../utils/familyTreeUtils';
import searchHistoryManager from '../utils/searchHistory';
import familyDataService from '../services/familyDataService';
import {
  applySmartCollapse,
  getCurrentUser,
  getCollapseStats,
  hasCollapsedChildren
} from '../utils/familyTreeCollapse';

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
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const [isShowingAll, setIsShowingAll] = useState(true); // 默认显示全部
  const [searchTargetPerson, setSearchTargetPerson] = useState(null); // 搜索的目标人员

  const [showAlert, setShowAlert] = useState(true); // 控制提示显示
  const [searchOptions, setSearchOptions] = useState([]); // 搜索建议选项
  const [searchInputValue, setSearchInputValue] = useState(''); // 搜索输入框的值
  const searchTimeoutRef = useRef(null); // 搜索节流定时器
  const reactFlowInstanceRef = useRef(null); // ReactFlow实例引用
  const [isMobile, setIsMobile] = useState(false); // 移动端检测
  const [isDrawerVisible, setIsDrawerVisible] = useState(false); // 抽屉状态
  const [isNodeDraggable, setIsNodeDraggable] = useState(false); // 节点拖拽开关，默认关闭
  const [isNameProtectionEnabled, setIsNameProtectionEnabled] = useState(false); // 在世人员姓名保护开关，默认关闭

  // 智能折叠相关状态
  const [currentUser, setCurrentUser] = useState(getCurrentUser(familyData));
  const [collapseStats, setCollapseStats] = useState(null);
  const [isSmartCollapseEnabled, setIsSmartCollapseEnabled] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set()); // 用户手动展开的节点

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

  // 处理ResizeObserver错误
  useEffect(() => {
    const handleResizeObserverError = (e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        // 忽略这个特定的错误，它不会影响功能
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener('error', handleResizeObserverError);
    return () => window.removeEventListener('error', handleResizeObserverError);
  }, []);

  // 当数据变化时更新当前用户
  useEffect(() => {
    if (familyData && familyData.length > 0) {
      const realCurrentUser = getCurrentUser(familyData);
      setCurrentUser(realCurrentUser);
      console.log('👤 当前用户:', realCurrentUser);
    }
  }, [familyData]);

  // 当智能折叠模式切换时重置展开节点
  useEffect(() => {
    setExpandedNodes(new Set());
  }, [isSmartCollapseEnabled, isShowingAll]);

  // 理想的默认视图参数（基于穆茂节点的最佳显示效果）
  const idealViewParams = useMemo(() => {
    if (isMobile) {
      return {
        zoom: 0.8,           // 移动端更小的缩放比例
        centerOffsetX: 50,   // 移动端更小的偏移
        centerOffsetY: 20,   // 移动端更小的偏移
        topPadding: 5        // 移动端减少顶部留白，从10减少到5
      };
    }
    return {
      zoom: 0.7,           // PC端缩小缩放比例，从1.2减少到0.7，以显示3行内容
      centerOffsetX: 100,  // 节点中心偏移
      centerOffsetY: 120,  // 增加Y偏移，从40增加到120，让根节点在上方1/3位置
      topPadding: 10       // 桌面端减少顶部留白，从20减少到10
    };
  }, [isMobile]);

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!familyData || familyData.length === 0) return null;
    return getFamilyStatistics(familyData);
  }, [familyData]);

  // 调试：检查第20代成员显示状态
  const debug20thGeneration = useCallback(() => {
    const gen20Members = familyData.filter(person => person.g_rank === 20);
    console.log('=== 第20代成员显示状态检查 ===');
    gen20Members.forEach(member => {
      const isAlive = member.dealth === 'alive';
      const protectedName = isAlive && member.name.length > 1 ?
        (() => {
          const annotationMatch = member.name.match(/（[^）]*）/);
          let baseName = member.name;
          let annotation = '';

          if (annotationMatch) {
            annotation = annotationMatch[0];
            baseName = member.name.replace(annotation, '');
          }

          if (baseName.length > 1) {
            const protectedBase = baseName.slice(0, -1) + '*';
            if (annotation && protectedBase.length > 1) {
              return protectedBase.slice(0, -1) + annotation + protectedBase.slice(-1);
            }
            return protectedBase;
          }
          return member.name;
        })() : member.name;

      console.log(`ID: ${member.id}, 原名: "${member.name}", 显示名: "${protectedName}", 状态: ${isAlive ? '在世' : '已故'}, 父亲ID: ${member.g_father_id}`);
    });
    console.log('=== 检查完成 ===');
  }, [familyData]);

  // 处理数据转换和布局
  const processData = useCallback(() => {
    if (!familyData || familyData.length === 0) return;

    // 防抖处理，避免快速连续调用
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      let filteredData;
      let targetPerson = null;

    // 应用搜索（优先处理搜索逻辑）
    if (searchTerm.trim()) {
      const searchResult = searchWithPathTree(familyData, searchTerm);
      filteredData = searchResult.pathTreeData;
      targetPerson = searchResult.targetPerson;
      setSearchTargetPerson(targetPerson);

      // 聚焦模式下，如果搜索目标是最后3代人员，应用智能折叠展开最后3代
      if (!isShowingAll && targetPerson && isSmartCollapseEnabled) {
        const maxGeneration = Math.max(...familyData.map(p => p.g_rank));
        const lastThreeGenerations = [maxGeneration - 2, maxGeneration - 1, maxGeneration];

        if (lastThreeGenerations.includes(targetPerson.g_rank)) {
          console.log(`🎯 聚焦模式搜索：目标在第${targetPerson.g_rank}代（最后3代），应用智能折叠`);

          filteredData = applySmartCollapse(familyData, {
            currentUser,
            collapseAfterGeneration: 3,
            showAllGenerations: false,
            isFocusMode: true,
            searchTargetPerson: targetPerson
          }, expandedNodes);
        }
      }

      console.log('🔍 搜索结果:', {
        searchTerm,
        searchResults: searchResult.searchResults,
        targetPerson,
        pathTreeDataCount: filteredData.length,
        isFocusMode: !isShowingAll,
        appliedSmartCollapse: !isShowingAll && targetPerson && isSmartCollapseEnabled
      });
    } else {
      // 没有搜索时，根据模式处理数据
      if (isShowingAll) {
        // 完整模式：应用智能折叠
        if (isSmartCollapseEnabled) {
          filteredData = applySmartCollapse(familyData, {
            currentUser,
            collapseAfterGeneration: 3,
            showAllGenerations: false,
            isFocusMode: false,
            searchTargetPerson: null
          }, expandedNodes);

          // 计算折叠统计
          const stats = getCollapseStats(familyData, filteredData, currentUser);
          setCollapseStats(stats);

          console.log('🌳 智能折叠统计:', stats);
        } else {
          // 显示全部数据
          filteredData = familyData;
          setCollapseStats(null);
        }
      } else {
        // 聚焦模式：应用智能折叠（支持最后3代展开逻辑）
        if (isSmartCollapseEnabled) {
          filteredData = applySmartCollapse(familyData, {
            currentUser,
            collapseAfterGeneration: 3,
            showAllGenerations: false,
            isFocusMode: true,
            searchTargetPerson: searchTargetPerson
          }, expandedNodes);

          // 计算折叠统计
          const stats = getCollapseStats(familyData, filteredData, currentUser);
          setCollapseStats(stats);

          console.log('🎯 聚焦模式智能折叠统计:', stats);
        } else {
          // 聚焦模式：应用代数筛选
          filteredData = filterByRank(familyData, generationRange[0], generationRange[1]);
          setCollapseStats(null);
        }
      }
      setSearchTargetPerson(null);
    }

    // 转换为React Flow数据格式，并标记有被折叠子节点的节点
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowData(
      filteredData,
      familyData,
      isShowingAll && isSmartCollapseEnabled,
      { isNameProtectionEnabled }
    );

    // 应用布局
    const layoutedNodes = getLayoutedElements(newNodes, newEdges, layoutDirection);

    setNodes(layoutedNodes);
    setEdges(newEdges);

    // 移除自动fitView，避免展开节点时视角跳转

    // 调试第20代成员显示
    debug20thGeneration();
    }, 100); // 100ms防抖延迟
  }, [familyData, searchTerm, generationRange, layoutDirection, setNodes, setEdges, isShowingAll, isSmartCollapseEnabled, currentUser, expandedNodes, debug20thGeneration, isNameProtectionEnabled, searchTargetPerson]);

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

  // 确保根节点穆茂在画布正中心
  useEffect(() => {
    if (nodes.length > 0 && !searchTerm && isShowingAll) {
      const timer = setTimeout(() => {
        const reactFlow = reactFlowInstanceRef.current;
        if (reactFlow) {
          // 找到根节点穆茂
          const rootNode = nodes.find(node =>
            node.data.rank === 1 && (node.data.name === '穆茂' || node.data.id === 1)
          );

          if (rootNode) {
            console.log('🎯 找到根节点穆茂，设置画布正中心:', rootNode.position);

            // 直接将根节点设置为画布中心，不使用偏移
            reactFlow.setCenter(rootNode.position.x, rootNode.position.y + 200, {
              zoom: isMobile ? 0.6 : 0.7,
              duration: 800
            });

            console.log('✅ 根节点穆茂已设置为画布正中心');
          } else {
            console.log('⚠️ 未找到根节点穆茂，使用fitView');
            reactFlow.fitView({
              padding: isMobile ? 0.15 : 0.2,
              duration: 800
            });
          }
        }
      }, 600); // 稍微延长等待时间确保节点完全渲染

      return () => clearTimeout(timer);
    }
  }, [nodes, searchTerm, isShowingAll, isMobile]);

  // 加载搜索历史
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await searchHistoryManager.getSearchHistory();

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

  // 移除自动视图调整，避免展开节点时跳转

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

  // 计算节点信息面板的位置
  const calculatePanelPosition = useCallback((node) => {
    const panelWidth = 320;
    const panelHeight = 450;
    const offset = 20; // 与节点的间距

    // 获取当前视口信息
    const viewport = reactFlowInstanceRef.current?.getViewport();
    if (!viewport) return { left: node.position.x + 200, top: node.position.y };

    // 计算节点在屏幕上的实际位置
    const nodeScreenX = node.position.x * viewport.zoom + viewport.x;
    const nodeScreenY = node.position.y * viewport.zoom + viewport.y;

    // 获取容器尺寸
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // 默认在节点右侧
    let left = nodeScreenX + 150; // 节点宽度约150px
    let top = nodeScreenY;

    // 如果右侧空间不够，放在左侧
    if (left + panelWidth > containerWidth - offset) {
      left = nodeScreenX - panelWidth - offset;
    }

    // 如果左侧也不够，居中显示
    if (left < offset) {
      left = (containerWidth - panelWidth) / 2;
    }

    // 垂直位置调整，确保不超出屏幕
    top = Math.max(offset, Math.min(top - panelHeight / 2, containerHeight - panelHeight - offset));

    return { left, top };
  }, []);

  // 处理节点点击
  const onNodeClick = useCallback((_, node) => {
    console.log('节点点击:', node.data.name);

    // 检查是否是智能折叠模式下的被折叠节点
    if (isShowingAll && isSmartCollapseEnabled) {
      const nodeId = node.data.id;
      const visibleData = nodes.map(n => n.data);
      const hasHiddenChildren = hasCollapsedChildren(nodeId, familyData, visibleData);

      if (hasHiddenChildren) {
        // 展开节点时清除之前选中的节点
        setSelectedNode(null);
        setPanelPosition({ left: 0, top: 0 });
        const newExpandedNodes = new Set(expandedNodes);
        newExpandedNodes.add(nodeId);
        setExpandedNodes(newExpandedNodes);
        console.log(`🔓 展开节点: ${node.data.name} (ID: ${nodeId})`);
        return;
      }
    }

    // 显示节点详情并计算面板位置
    const position = calculatePanelPosition(node);
    setPanelPosition(position);
    setSelectedNode(node);
  }, [isShowingAll, isSmartCollapseEnabled, familyData, nodes, expandedNodes, calculatePanelPosition]);

  // 重置视图
  const resetView = useCallback(() => {
    setSearchTerm('');
    setSearchTargetPerson(null);
    const maxGen = statistics?.generations || 20;
    setGenerationRange([1, maxGen]); // 重置为完整家谱
    setSelectedNode(null);
    setPanelPosition({ left: 0, top: 0 });
    setIsShowingAll(true);

    // 延迟执行fitView，确保数据更新完成
    setTimeout(() => {
      fitView({
        padding: isMobile ? 0.1 : 0.2,
        duration: 500,
        minZoom: isMobile ? 0.4 : 0.5,
        maxZoom: isMobile ? 1.5 : 1.2
      });
    }, 300);
  }, [statistics, fitView, isMobile]);

  // 强制刷新数据
  const forceRefreshData = useCallback(async () => {
    try {
      console.log('🔄 开始强制刷新数据...');

      // 调用数据服务的强制刷新方法
      await familyDataService.forceRefreshAll();

      // 触发页面重新加载以获取最新数据
      window.location.reload();

    } catch (error) {
      console.error('❌ 数据刷新失败:', error);
      // 可以在这里添加错误提示
    }
  }, []);

  // 聚焦第1代祖上（穆茂）
  const focusOnFounder = useCallback(() => {
    setGenerationRange([1, 1]);
    setSearchTerm('');
    setSearchTargetPerson(null);
    setIsShowingAll(false);
    setShowAlert(true); // 重新显示提示
  }, []);

  // 当节点更新且处于聚焦模式时，自动聚焦到穆茂
  // 移除自动聚焦到穆茂的逻辑，避免展开节点时跳转

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

  // 处理搜索选择
  const handleSearchSelect = useCallback((searchValue) => {
    handleSearchSubmit(searchValue);
  }, [handleSearchSubmit]);

  // 处理搜索输入
  const handleSearchInput = useCallback((value) => {
    handleSearchWithThrottle(value);
  }, [handleSearchWithThrottle]);

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
      {/* 统一导航栏 */}
      <div className="unified-navbar">
        <div className="navbar-left">
          <div className="logo">
            <img
              src={muLogo}
              alt="穆氏家族logo"
              style={{
                height: '32px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
          <div className="title">
            <h1>穆氏宗谱</h1>
            <span className="subtitle">家族传承 · 血脉相连</span>
          </div>
        </div>

        <div className="navbar-right">
          {/* 状态信息 */}
          <div className="status-info">
            <div className="status-indicator">
              {searchTargetPerson ? (
                <span className="status-badge search">搜索路径</span>
              ) : isShowingAll ? (
                isSmartCollapseEnabled ? (
                  <span className="status-badge smart">智能折叠</span>
                ) : (
                  <span className="status-badge complete">完整模式</span>
                )
              ) : (
                <span className="status-badge focus">聚焦模式</span>
              )}
            </div>
            <div className="count-info">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {nodes.length}/{statistics?.totalMembers || familyData.length}人
              </Text>
            </div>
          </div>

          {/* 搜索功能 */}
          <div className="search-section">
            <AutoComplete
              value={searchInputValue}
              options={searchOptions}
              onSelect={handleSearchSelect}
              onSearch={handleSearchInput}
              placeholder="搜索家族成员..."
              style={{ width: 200 }}
              allowClear
            >
              <Input
                prefix={<SearchOutlined />}
                onPressEnter={handleSearchSubmit}
              />
            </AutoComplete>
          </div>

          {/* 快速切换 */}
          <div className="quick-actions">
            <Button
              type={isShowingAll ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => {
                // 防抖处理模式切换
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                }

                searchTimeoutRef.current = setTimeout(() => {
                  const newShowingAll = !isShowingAll;
                  setIsShowingAll(newShowingAll);

                  // 如果切换到完整模式，定位到根节点
                  if (newShowingAll) {
                    setTimeout(() => {
                      const reactFlow = reactFlowInstanceRef.current;
                      if (reactFlow && familyData.length > 0) {
                        // 找到根节点（g_father_id为0或null的节点）
                        const rootNode = familyData.find(person =>
                          person.g_father_id === 0 || !person.g_father_id
                        );

                        if (rootNode) {
                          const rootFlowNode = reactFlow.getNode(rootNode.id.toString());
                          if (rootFlowNode) {
                            // 保持当前缩放比例，定位到根节点
                            const currentZoom = reactFlow.getZoom();
                            reactFlow.setCenter(
                              rootFlowNode.position.x,
                              rootFlowNode.position.y,
                              { zoom: currentZoom, duration: 500 }
                            );
                            console.log(`🎯 定位到根节点: ${rootNode.name}`);
                          }
                        }
                      }
                    }, 200); // 等待数据处理完成
                  }
                }, 50);
              }}
              size="small"
            >
              {isShowingAll ? '完整' : '聚焦'}
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={resetView}
              size="small"
              title="重置视图"
            />

            <Button
              icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              size="small"
              title={isFullscreen ? '退出全屏' : '全屏显示'}
            />

            <Button
              icon={<MoreOutlined />}
              onClick={() => setIsDrawerVisible(true)}
              size="small"
              title="更多设置"
            />
          </div>
        </div>
      </div>

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





      {/* 更多操作抽屉 */}
      <Drawer
        title="更多设置"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
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

          {/* 智能折叠控制 */}
          <div className="drawer-section">
            <h4>智能折叠</h4>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>启用智能折叠</span>
                <Button
                  size="small"
                  type={isSmartCollapseEnabled ? 'primary' : 'default'}
                  onClick={() => setIsSmartCollapseEnabled(!isSmartCollapseEnabled)}
                >
                  {isSmartCollapseEnabled ? '已启用' : '已禁用'}
                </Button>
              </div>

              {collapseStats && (
                <div style={{ fontSize: '11px', color: '#666', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div>当前用户: {collapseStats.currentUser.name} (第{collapseStats.currentUser.g_rank}代)</div>
                  <div>显示: {collapseStats.totalCollapsed} 人</div>
                  <div>隐藏: {collapseStats.totalHidden} 人 ({collapseStats.collapseRatio}%)</div>
                </div>
              )}
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

          {/* 交互设置 */}
          <div className="drawer-section">
            <h4>交互设置</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>节点拖拽</span>
                <Switch
                  checked={isNodeDraggable}
                  onChange={setIsNodeDraggable}
                  size="small"
                />
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                开启后可以自由拖拽移动节点位置
              </Text>
            </Space>
          </div>

          <Divider />

          {/* 隐私设置 */}
          <div className="drawer-section">
            <h4>隐私设置</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>在世人员姓名保护</span>
                <Switch
                  checked={isNameProtectionEnabled}
                  onChange={setIsNameProtectionEnabled}
                  size="small"
                />
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                开启后在世人员姓名最后一个字用*号替代
              </Text>
            </Space>
          </div>

          <Divider />

          {/* 开发工具 */}
          <div className="drawer-section">
            <h4>开发工具</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                onClick={forceRefreshData}
                block
                icon={<ReloadOutlined />}
                type="primary"
              >
                强制刷新数据
              </Button>
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
          onNodesChange={isNodeDraggable ? onNodesChange : undefined}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          nodeTypes={nodeTypes}
          nodesDraggable={isNodeDraggable}
          nodesConnectable={false}
          elementsSelectable={isNodeDraggable}
          connectionLineType={ConnectionLineType.Straight}
          defaultEdgeOptions={{
            type: 'straight',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: 'hsl(215.4 16.3% 46.9%)',
            },
            style: {
              strokeWidth: 2,
              stroke: 'hsl(215.4 16.3% 46.9%)',
            },
          }}
          proOptions={{ hideAttribution: true }}
          minZoom={isMobile ? 0.3 : 0.2}
          maxZoom={isMobile ? 2 : 3}
          defaultViewport={{
            x: 0,
            y: 0,
            zoom: isMobile ? 0.4 : 0.6  // PC端稍微增加默认缩放，从0.5增加到0.6，以便显示3行
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
          selectNodesOnDrag={false}
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />

          {/* 浮动操作提示 - 移动端隐藏 */}
          {!isShowingAll && !isMobile && (
            <Panel position="bottom-center">
              <div className="floating-hint">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 可以缩放、拖拽浏览 • 点击节点查看详情 • 使用上方按钮查看完整家谱
                </Text>
              </div>
            </Panel>
          )}

          {/* 选中节点信息面板 - 动态定位 */}
          {selectedNode && (
            <div
              style={{
                position: 'fixed',
                left: `${panelPosition.left}px`,
                top: `${panelPosition.top}px`,
                zIndex: 1000,
                pointerEvents: 'auto'
              }}
            >
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
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-50%)' // 垂直居中对齐节点
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
                    onClick={() => {
                      setSelectedNode(null);
                      setPanelPosition({ left: 0, top: 0 });
                    }}
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
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export default FamilyTreeFlow;
