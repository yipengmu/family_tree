import React from "react";
import {
  HomeOutlined,
  EditOutlined,
  SettingOutlined,
  LoginOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";
import TenantSelector from "../TenantSelector.js";
import "./Sidebar.css";
import AuthService from "../../services/authService.js";
import { Link, useNavigate } from "react-router-dom";
import BRAND from "../../constants/brand.js";

const Sidebar = ({
  activeItem = "tree",
  onMenuClick,
  collapsed = false,
  onToggleCollapse,
  open = false,
  demoMode = false,
}) => {
  const navigate = useNavigate();
  const isAuthenticated = AuthService.isAuthenticated();
  const currentUser = isAuthenticated
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "profile",
      label: "个人资料",
      icon: <ProfileOutlined />,
      onClick: () => navigate("/app/mine"),
    },
    {
      key: "settings",
      label: "家谱设置",
      icon: <SettingOutlined />,
      onClick: () => navigate("/app/settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "退出登录",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: "tree",
      icon: <HomeOutlined />,
      label: "看家谱",
      path: "/app",
    },
    {
      key: "create",
      icon: <EditOutlined />,
      label: "续家谱",
      path: "/app/create",
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
      key: "settings",
      icon: <SettingOutlined />,
      label: "家谱设置",
      path: "/app/settings",
    },
  ];

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""}`}
      id="sidebar"
    >
      {/* Logo */}
      <Link
        className="logo logo-home-link"
        to="/"
        aria-label="返回谱里产品官网"
      >
        <div className="logo-icon" aria-hidden="true">
          <img src="/puli-logo.png" alt="" />
        </div>
        {!collapsed && (
          <div className="logo-copy">
            <div className="logo-text">{BRAND.name}</div>
            <div className="logo-subtitle">数字家谱</div>
          </div>
        )}
      </Link>

      {/* 导航菜单 */}
      <nav>
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li
              key={item.key}
              className={`nav-item ${activeItem === item.key ? "active" : ""}`}
            >
              <button
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  onMenuClick && onMenuClick(item.key);
                }}
                title={collapsed ? item.label : ""}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 用户信息与租户管理 - 精简底部区域 */}
      <div className="bottom-section">
        {!collapsed && (
          <div className="privacy-note">
            <span className="privacy-dot" />
            家谱默认私密保存
          </div>
        )}
        {/* 租户管理区域 */}
        {demoMode ? (
          !collapsed && (
            <div className="demo-tenant-note">
              <strong>{BRAND.demoFamilyName}</strong>
              <span>公开示范 · 只读</span>
            </div>
          )
        ) : (
          <div className={`tenant-section ${collapsed ? "collapsed" : ""}`}>
            <TenantSelector compact={collapsed} />
          </div>
        )}

        {/* 用户信息区域 - 集成登录者信息 */}
        <div className={`user-profile-sidebar ${collapsed ? "collapsed" : ""}`}>
          {isAuthenticated ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={["click"]}
              placement="topRight"
            >
              <div type="text" className="user-info-button">
                <Space>
                  <div className="user-avatar-sidebar">
                    {currentUser?.name?.charAt(0) ||
                      currentUser?.email?.charAt(0) ||
                      "U"}
                  </div>
                  {!collapsed && (
                    <div className="user-info-sidebar">
                      <div className="user-name-sidebar">
                        {currentUser?.name || currentUser?.email}
                      </div>
                    </div>
                  )}
                </Space>
              </div>
            </Dropdown>
          ) : (
            <div className="login-section">
              <Space>
                <Button
                  icon={<LoginOutlined />}
                  onClick={() => navigate("/login")}
                  size="small"
                >
                  登录
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
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
