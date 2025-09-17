import React from 'react';
import { 
  HomeOutlined, 
  EditOutlined, 
  TeamOutlined, 
  FolderOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  MenuOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import './Sidebar.css';

const Sidebar = ({ activeItem = 'tree', onMenuClick, collapsed = false, onToggleCollapse }) => {
  const menuItems = [
    {
      key: 'tree',
      icon: <HomeOutlined />,
      label: '族谱',
      path: '/'
    },
    {
      key: 'create',
      icon: <EditOutlined />,
      label: '数据管理',
      path: '/create'
    },
    // {
    //   key: 'discover',
    //   icon: <TeamOutlined />,
    //   label: '发现',
    //   path: '/discover'
    // },
    // {
    //   key: 'events',
    //   icon: <FolderOutlined />,
    //   label: '大事',
    //   path: '/'
    // },
    // {
    //   key: 'analytics',
    //   icon: <BarChartOutlined />,
    //   label: '数据',
    //   path: '/'
    // },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      path: '/settings'
    }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      {/* Logo */}
      <div className="logo">
        <div className="logo-icon">穆</div>
        {!collapsed && <div className="logo-text">穆氏族谱</div>}
      </div>
      
      {/* 导航菜单 */}
      <nav>
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li 
              key={item.key} 
              className={`nav-item ${activeItem === item.key ? 'active' : ''}`}
            >
              <button
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  onMenuClick && onMenuClick(item.key);
                }}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon">
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* 精巧的收起按钮 - 位于侧边栏右边缘 */}
      <div className="collapse-toggle">
        <button 
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
