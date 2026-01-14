import React from 'react';
import { Layout, Menu, Button, Dropdown, Space } from 'antd';
import { UserOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/authService.js';

const { Header } = Layout;

const TopNavbar = ({ currentPage, onMenuClick }) => {
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
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      label: '设置',
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
      label: '家谱',
      onClick: () => onMenuClick('tree')
    }
  ];

  return (
    <Header className="header" style={{ 
      background: '#fff', 
      padding: '0 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div className="logo" style={{ 
        fontSize: '18px', 
        fontWeight: 'bold',
        color: '#1890ff',
        cursor: 'pointer'
      }} onClick={() => navigate('/')}>
        穆氏家谱
      </div>
      
      <Menu
        mode="horizontal"
        selectedKeys={[currentPage]}
        items={menuItems}
        style={{ flex: 1, minWidth: 0, border: 'none' }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button type="text" icon={<UserOutlined />}>
              <Space>
                {currentUser?.name || currentUser?.email}
              </Space>
            </Button>
          </Dropdown>
        ) : (
          <Space>
            <Button 
              icon={<LoginOutlined />} 
              onClick={() => navigate('/login')}
            >
              登录
            </Button>
          </Space>
        )}
      </div>
    </Header>
  );
};

export default TopNavbar;