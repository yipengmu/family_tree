import React from 'react';
import { 
  HomeOutlined, 
  EditOutlined, 
  TeamOutlined, 
  FolderOutlined, 
  BarChartOutlined, 
  SettingOutlined 
} from '@ant-design/icons';
import './Sidebar.css';

const Sidebar = ({ activeItem = 'tree', onMenuClick }) => {
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
      label: '创作',
      path: '/create'
    },
    {
      key: 'discover',
      icon: <TeamOutlined />,
      label: '发现',
      path: '/discover'
    },
    {
      key: 'events',
      icon: <FolderOutlined />,
      label: '大事',
      path: '/'
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: '数据',
      path: '/'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      path: '/settings'
    }
  ];

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="logo">
        <div className="logo-icon"></div>
        <div className="logo-text">穆氏族谱</div>
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
              >
                <span className="nav-icon">
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
