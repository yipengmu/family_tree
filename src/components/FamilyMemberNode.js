import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Tag, Avatar, Tooltip } from 'antd';
import { UserOutlined, ManOutlined, WomanOutlined, CrownOutlined, PlusOutlined } from '@ant-design/icons';
import './FamilyMemberNode.css';

const FamilyMemberNode = ({ data, selected }) => {
  const {
    name,
    rank,
    rankIndex,
    officialPosition,
    sex,
    birthDate,
    death,
    location,
    summary,
    hasCollapsedChildren,
    isNameProtectionEnabled = false // 姓名保护开关，默认关闭
  } = data;

  // 根据性别选择图标和颜色
  const getGenderIcon = () => {
    if (sex === 'MAN') {
      return <ManOutlined style={{ color: '#1890ff' }} />;
    } else if (sex === 'WOMAN') {
      return <WomanOutlined style={{ color: '#eb2f96' }} />;
    }
    return <UserOutlined />;
  };

  // 根据代数生成颜色 - 使用现代化配色
  const getGenerationColor = (generation) => {
    const colors = [
      'hsl(221.2 83.2% 53.3%)', // blue
      'hsl(142.1 76.2% 36.3%)', // green
      'hsl(262.1 83.3% 57.8%)', // purple
      'hsl(346.8 77.2% 49.8%)', // red
      'hsl(24.6 95% 53.1%)', // orange
      'hsl(47.9 95.8% 53.1%)', // yellow
      'hsl(173.4 58.9% 39.1%)', // teal
      'hsl(270.7 91% 65.1%)', // violet
      'hsl(0 84.2% 60.2%)', // rose
      'hsl(20.5 90.2% 48.2%)', // amber
      'hsl(142.1 70.6% 45.3%)', // emerald
      'hsl(217.2 91.2% 59.8%)', // sky
      'hsl(316.7 77.4% 59.8%)', // pink
      'hsl(12.2 84.7% 60.8%)', // red-orange
      'hsl(159.6 84.1% 39.4%)', // cyan
      'hsl(280.4 89.1% 67.1%)', // fuchsia
      'hsl(43.3 96.4% 56.3%)', // lime
      'hsl(198.4 93.2% 59.6%)', // light-blue
      'hsl(339.6 82.2% 51.6%)', // crimson
      'hsl(35.5 91.7% 32.9%)'  // brown
    ];
    return colors[(generation - 1) % colors.length];
  };

  // 格式化显示文本
  const formatDisplayText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // 保护在世人员姓名（最后一个字用*号替代）
  const getProtectedName = (originalName) => {
    if (!originalName) return '';

    // 检查是否为在世人员（只有"alive"才代表在世，null代表已故）
    const isAlive = death === 'alive';

    // 如果姓名保护开关关闭，直接返回原名
    if (!isNameProtectionEnabled) {
      return originalName;
    }

    if (isAlive && originalName.length > 1) {
      // 处理包含注音符号的姓名，如"穆垠（yin）彤"
      // 先提取注音部分
      const annotationMatch = originalName.match(/（[^）]*）/);
      let baseName = originalName;
      let annotation = '';

      if (annotationMatch) {
        annotation = annotationMatch[0];
        baseName = originalName.replace(annotation, '');
      }

      // 对基础姓名进行保护（最后一个字用*替代）
      if (baseName.length > 1) {
        const protectedBase = baseName.slice(0, -1) + '*';
        // 如果有注音，将注音加在倒数第二个字后面
        if (annotation && protectedBase.length > 1) {
          return protectedBase.slice(0, -1) + annotation + protectedBase.slice(-1);
        }
        return protectedBase;
      }
    }

    return originalName;
  };

  // 获取生存状态显示
  const getLifeStatus = () => {
    if (death === 'alive') {
      return { text: '在世', color: 'success' };
    } else if (death === null || death === 'dealth') {
      return { text: '已故', color: 'default' };
    }
    return null;
  };

  // 构建工具提示内容
  const getTooltipContent = () => {
    const lifeStatus = getLifeStatus();
    const displayName = getProtectedName(name);

    return (
      <div className="family-member-tooltip">
        <div><strong>姓名:</strong> {displayName}</div>
        <div><strong>第{rank}代</strong> (排行第{rankIndex})</div>
        {lifeStatus && (
          <div><strong>状态:</strong> {lifeStatus.text}</div>
        )}
        {officialPosition && (
          <div><strong>职位:</strong> {officialPosition}</div>
        )}
        {birthDate && (
          <div><strong>生日:</strong> {birthDate}</div>
        )}
        {location && (
          <div><strong>地点:</strong> {location}</div>
        )}
        {summary && (
          <div><strong>简介:</strong> {formatDisplayText(summary, 100)}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`family-member-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={false}
      />
      
      <Tooltip title={getTooltipContent()} placement="right">
        <div style={{ position: 'relative' }}>
          <Card
            size="small"
            className={`member-card ${hasCollapsedChildren ? 'has-collapsed-children' : ''}`}
            style={{
              borderColor: getGenerationColor(rank),
              borderWidth: selected ? 3 : 1,
              cursor: hasCollapsedChildren ? 'pointer' : 'default'
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            {/* 折叠提示图标 - 移到Card外部 */}
          <div className="member-header">
            <Avatar
              size="small"
              icon={getGenderIcon()}
              style={{
                backgroundColor: sex === 'MAN' ? '#1890ff' : '#eb2f96',
                marginRight: 8
              }}
            />
            <div className="member-name">
              <div className="name-text" title={getProtectedName(name)}>
                {formatDisplayText(getProtectedName(name), 8)}
              </div>
              <div className="generation-info">
                <Tag
                  color={getGenerationColor(rank)}
                  size="small"
                  style={{ margin: 0, fontSize: '10px' }}
                >
                  第{rank}代
                </Tag>
              </div>
            </div>
          </div>
          
          {officialPosition && (
            <div className="member-position">
              <CrownOutlined style={{ marginRight: 4, color: '#faad14' }} />
              <span className="position-text">
                {formatDisplayText(officialPosition, 15)}
              </span>
            </div>
          )}
          
          <div className="member-meta">
            {(() => {
              const lifeStatus = getLifeStatus();
              return lifeStatus && (
                <Tag color={lifeStatus.color} size="small">
                  {lifeStatus.text}
                </Tag>
              );
            })()}
            {location && (
              <Tag color="blue" size="small">
                {formatDisplayText(location, 6)}
              </Tag>
            )}
          </div>
        </Card>

        {/* 折叠提示图标 - 底部中间 */}
        {hasCollapsedChildren && (
          <div className="collapse-indicator-bottom">
            <PlusOutlined style={{
              color: '#1890ff',
              fontSize: '12px'
            }} />
          </div>
        )}
        </div>
      </Tooltip>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </div>
  );
};

export default memo(FamilyMemberNode);
