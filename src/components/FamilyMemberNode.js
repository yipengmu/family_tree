import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Tag, Avatar, Tooltip } from 'antd';
import { UserOutlined, ManOutlined, WomanOutlined, CrownOutlined } from '@ant-design/icons';
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
    summary
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

  // 根据代数生成颜色
  const getGenerationColor = (generation) => {
    const colors = [
      '#f50', '#2db7f5', '#87d068', '#108ee9', '#f56a00',
      '#722ed1', '#13c2c2', '#52c41a', '#1890ff', '#fa541c',
      '#eb2f96', '#faad14', '#a0d911', '#fa8c16', '#d4b106',
      '#096dd9', '#36cfc9', '#73d13d', '#40a9ff', '#ffc53d'
    ];
    return colors[(generation - 1) % colors.length];
  };

  // 格式化显示文本
  const formatDisplayText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // 构建工具提示内容
  const getTooltipContent = () => {
    return (
      <div className="family-member-tooltip">
        <div><strong>姓名:</strong> {name}</div>
        <div><strong>第{rank}代</strong> (排行第{rankIndex})</div>
        {officialPosition && (
          <div><strong>职位:</strong> {officialPosition}</div>
        )}
        {birthDate && (
          <div><strong>生日:</strong> {birthDate}</div>
        )}
        {death && (
          <div><strong>状态:</strong> 已故</div>
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
        <Card
          size="small"
          className="member-card"
          style={{
            borderColor: getGenerationColor(rank),
            borderWidth: selected ? 3 : 1,
          }}
          bodyStyle={{ padding: '8px 12px' }}
        >
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
              <div className="name-text" title={name}>
                {formatDisplayText(name, 8)}
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
            {death && (
              <Tag color="default" size="small">已故</Tag>
            )}
            {location && (
              <Tag color="blue" size="small">
                {formatDisplayText(location, 6)}
              </Tag>
            )}
          </div>
        </Card>
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
