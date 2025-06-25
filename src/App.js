import { useState, useEffect } from 'react';
import { Layout, Alert } from 'antd';
import { ReactFlowProvider } from 'reactflow';
import FamilyTreeFlow from './components/FamilyTreeFlow';
import { validateFamilyData } from './utils/familyTreeUtils';
import dbJson from './data/familyData.js';
import './App.css';

const { Content } = Layout;

function App() {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

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

    // 模拟数据加载过程
    const loadData = async () => {
      try {
        setLoading(true);

        // 使用本地数据（从dbjson.js导入）
        // 如果需要从API获取数据，可以在这里添加fetch逻辑
        const data = dbJson || [];

        // 验证数据完整性
        const validation = validateFamilyData(data);
        setValidationResult(validation);

        if (!validation.isValid) {
          console.warn('数据验证发现问题:', validation.issues);
        }

        setFamilyData(data);
        setError(null);
      } catch (err) {
        console.error('加载家谱数据失败:', err);
        setError(err.message || '加载数据时发生未知错误');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      window.removeEventListener('error', handleResizeObserverError);
    };
  }, []);

  return (
    <Layout className="app-layout">


      <Content className="app-content">
        {/* 数据验证警告 */}
        {validationResult && !validationResult.isValid && (
          <Alert
            message="数据验证警告"
            description={`发现 ${validationResult.issues.length} 个数据问题，可能影响显示效果`}
            type="warning"
            showIcon
            closable
            style={{ margin: '16px 16px 0 16px' }}
          />
        )}

        {/* 家谱可视化组件 */}
        <ReactFlowProvider>
          <FamilyTreeFlow
            familyData={familyData}
            loading={loading}
            error={error}
          />
        </ReactFlowProvider>
      </Content>
    </Layout>
  );
}

export default App;
