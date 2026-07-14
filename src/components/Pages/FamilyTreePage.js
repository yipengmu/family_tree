import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FamilyTreeFlow from '../FamilyTreeFlow.js';
import FamilyJourneyPlayer from '../FamilyJourneyPlayer.js';
import AppLayout from '../Layout/AppLayout.js';
import { Button } from 'antd';
import './FamilyTreePage.css';
import tenantService from '../../services/tenantService.js';
import BRAND from '../../constants/brand.js';
import { buildFamilyJourney, filterFamilyByGeneration } from '../../utils/familyJourney.js';

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
  const [showMobileWelcome, setShowMobileWelcome] = useState(() => (
    typeof window !== 'undefined'
    && window.innerWidth <= 768
    && !localStorage.getItem('token')
    && localStorage.getItem('puli_mobile_welcome_seen') !== 'true'
  ));
  const familyTreeRef = useRef(null);
  const currentTenant = tenantService.getCurrentTenant();
  const familyName = currentTenant?.isDefault ? BRAND.demoFamilyName : (currentTenant?.name || '我的家谱');
  const isDemoFamily = currentTenant?.isDefault && !localStorage.getItem('token');
  const journey = useMemo(() => buildFamilyJourney(familyData), [familyData]);
  const [journeyStatus, setJourneyStatus] = useState('idle');
  const [journeyGeneration, setJourneyGeneration] = useState(null);
  const isJourneyActive = isDemoFamily && journeyStatus !== 'idle';
  const currentJourneyStep = useMemo(() => {
    if (!journey.steps.length) return null;
    return journey.steps.find((step) => step.generation === journeyGeneration)
      || journey.steps[journey.steps.length - 1];
  }, [journey.steps, journeyGeneration]);
  const displayedFamilyData = useMemo(() => {
    if (!isJourneyActive || !journeyGeneration) return familyData;
    return filterFamilyByGeneration(familyData, journeyGeneration);
  }, [familyData, isJourneyActive, journeyGeneration]);

  // 检查用户是否已登录
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

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

  // 处理创建家谱按钮点击
  const handleCreateMyFamilyTree = () => {
    // 检查用户是否已登录
    if (!isAuthenticated()) {
      if (onMenuClick) {
        onMenuClick('register');
      }
    } else {
      // 如果已登录，直接进入创建页面
      if (onMenuClick) {
        onMenuClick('create');
      }
    }
  };

  const dismissMobileWelcome = () => {
    localStorage.setItem('puli_mobile_welcome_seen', 'true');
    setShowMobileWelcome(false);
  };

  const startJourney = useCallback(() => {
    if (!journey.steps.length) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setJourneyGeneration(journey.maxGeneration);
      setJourneyStatus('complete');
      localStorage.setItem('puli_demo_journey_seen', 'true');
      return;
    }
    setJourneyGeneration(journey.minGeneration);
    setJourneyStatus('playing');
  }, [journey.maxGeneration, journey.minGeneration, journey.steps.length]);

  const finishJourney = useCallback(() => {
    setJourneyGeneration(journey.maxGeneration);
    setJourneyStatus('complete');
    localStorage.setItem('puli_demo_journey_seen', 'true');
  }, [journey.maxGeneration]);

  useEffect(() => {
    if (journeyStatus !== 'playing' || !currentJourneyStep) return undefined;
    const currentIndex = journey.steps.findIndex(
      (step) => step.generation === currentJourneyStep.generation
    );
    if (currentIndex >= journey.steps.length - 1) {
      finishJourney();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setJourneyGeneration(journey.steps[currentIndex + 1].generation);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [currentJourneyStep, finishJourney, journey.steps, journeyStatus]);

  useEffect(() => {
    if (
      !isDemoFamily
      || showMobileWelcome
      || !familyData.length
      || journeyStatus !== 'idle'
      || localStorage.getItem('puli_demo_journey_seen') === 'true'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) return undefined;

    const timer = window.setTimeout(startJourney, 1000);
    return () => window.clearTimeout(timer);
  }, [familyData.length, isDemoFamily, journeyStatus, showMobileWelcome, startJourney]);

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
        {showMobileWelcome && (
          <section className="mobile-welcome" aria-label="欢迎使用谱里">
            <div className="mobile-welcome-paper">
              <span className="mobile-welcome-seal">谱</span>
              <span className="mobile-welcome-kicker">年轻人的第一本数字家谱</span>
              <h1>让家人的名字<br />一代代留在谱里</h1>
              <p>从自己开始，十分钟建立三代家谱。默认私密。</p>
              <div className="mobile-welcome-steps" aria-label="创建步骤">
                <span><i>一</i> 添加自己</span>
                <b aria-hidden="true" />
                <span><i>二</i> 补充长辈</span>
                <b aria-hidden="true" />
                <span><i>三</i> 邀请家人</span>
              </div>
              <Button type="primary" size="large" block onClick={handleCreateMyFamilyTree}>免费创建我的家谱</Button>
              <div className="mobile-welcome-secondary">
                <button type="button" onClick={dismissMobileWelcome}>先看看作者家的示例家谱效果</button>
                <button type="button" onClick={() => onMenuClick?.('login')}>登录</button>
              </div>
            </div>
            <span className="mobile-welcome-privacy">◈ 家谱私密保存 · 数据可随时导出</span>
          </section>
        )}

        <section className="family-context-bar" aria-label="当前家谱信息">
          <div className="family-context-copy">
            <span className="family-context-kicker">世系总览</span>
            <h1>{familyName}</h1>
            <span className="family-context-meta">
              {familyData.length || 0} 位族人
              <i aria-hidden="true" />
              {statistics?.generationCount || statistics?.totalGenerations || '多'} 代相承
            </span>
          </div>
          <div className="family-context-actions">
            <span className="privacy-badge"><span aria-hidden="true">◈</span> 默认私密</span>
            {!localStorage.getItem('token') ? (
              <Button onClick={handleCreateMyFamilyTree} className="create-family-btn">
                创建我的家谱
              </Button>
            ) : (
              <Button onClick={() => onMenuClick && onMenuClick('create')} className="create-family-btn">
                续录族人
              </Button>
            )}
          </div>
        </section>

        {localStorage.getItem('token') && familyData.length === 0 && !loading && (
          <section className="mobile-empty-family">
            <span className="mobile-empty-kicker">从第一位族人开始</span>
            <h2>先把自己写进家谱</h2>
            <p>接着补充父母与祖辈，谱系会自动连接起来。</p>
            <ol>
              <li><span>1</span>录入自己</li>
              <li><span>2</span>补充父母</li>
              <li><span>3</span>继续向上续谱</li>
            </ol>
            <Button type="primary" block size="large" onClick={() => onMenuClick?.('create')}>录入第一位族人</Button>
          </section>
        )}

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
        <div className={`family-tree-wrapper ${isJourneyActive ? 'journey-active' : ''}`}>
          {isDemoFamily && currentJourneyStep && (
            <FamilyJourneyPlayer
              familyName={familyName}
              totalMembers={familyData.length}
              steps={journey.steps}
              status={journeyStatus}
              currentStep={currentJourneyStep}
              onStart={startJourney}
              onPause={() => setJourneyStatus('paused')}
              onResume={() => setJourneyStatus('playing')}
              onSkip={finishJourney}
              onRestart={startJourney}
              onClose={() => {
                setJourneyStatus('idle');
                setJourneyGeneration(null);
                localStorage.setItem('puli_demo_journey_seen', 'true');
              }}
              onSeek={(stepIndex) => {
                setJourneyStatus('paused');
                setJourneyGeneration(journey.steps[stepIndex].generation);
              }}
            />
          )}
          <ReactFlowProvider>
            <FamilyTreeFlow
              ref={familyTreeRef}
              familyData={displayedFamilyData}
              loading={loading}
              error={error}
              onDataUpdate={handleTreeDataUpdate}
              presentationMode={isJourneyActive}
              presentationStep={journeyGeneration}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </AppLayout>
  );
};

export default FamilyTreePage;
