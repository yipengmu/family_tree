import React from 'react';
import { 
  HomeOutlined, 
  EditOutlined, 
  TeamOutlined, 
  FolderOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined, 
  LoginOutlined, 
  LogoutOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import { Button, Dropdown, Space } from 'antd';
import TenantSelector from '../TenantSelector';
import './Sidebar.css';
import AuthService from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ activeItem = 'tree', onMenuClick, collapsed = false, onToggleCollapse, open = false, user = { name: '穆塔爸', avatar: '穆' } }) => {
  const navigate = useNavigate();
  const isAuthenticated = AuthService.isAuthenticated();
  const currentUser = isAuthenticated ? JSON.parse(localStorage.getItem('user')) : null;

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

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
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`} id="sidebar">
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
      
      {/* 用户信息与租户管理 - 精简底部区域 */}
      <div className="bottom-section">
        {/* 租户管理区域 */}
        <div className={`tenant-section ${collapsed ? 'collapsed' : ''}`}>
          <TenantSelector compact={collapsed} />
        </div>
        
        {/* 用户信息区域 - 集成登录者信息 */}
        <div className={`user-profile-sidebar ${collapsed ? 'collapsed' : ''}`}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight">
              <Button type="text" icon={<UserOutlined />} className="user-info-button">
                <Space>
                  <div className="user-avatar-sidebar">{currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}</div>
                  {!collapsed && (
                    <div className="user-info-sidebar">
                      <div className="user-name-sidebar">{currentUser?.name || currentUser?.email}</div>
                    </div>
                  )}
                </Space>
              </Button>
            </Dropdown>
          ) : (
            <div className="login-section">
              <Space>
                <Button 
                  icon={<LoginOutlined />} 
                  onClick={() => navigate('/login')}
                  size="small"
                >
                  登录
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => navigate('/register')}
                  size="small"
                >
                  注册
                </Button>
              </Space>
            </div>
          )}
        </div>
      </div>
      
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