import React from "react";
import {
  CloudDownloadOutlined,
  LockOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";
import AppLayout from "../Layout/AppLayout.js";
import TenantSelector from "../TenantSelector.js";
import AuthService from "../../services/authService.js";
import tenantService from "../../services/tenantService.js";
import BRAND from "../../constants/brand.js";
import "./MyPage.css";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const MyPage = ({ activeMenuItem = "mine", onMenuClick, familyData = [] }) => {
  const authenticated = AuthService.isAuthenticated();
  const user = readStoredUser();
  const tenant = tenantService.getCurrentTenant();

  const exportFamilyData = () => {
    if (!familyData.length) {
      message.info("家谱中还没有可导出的族人资料");
      return;
    }
    const blob = new Blob(
      [
        JSON.stringify(
          { tenant, familyData, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      {
        type: "application/json;charset=utf-8",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tenant?.name || "我的家谱"}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success("家谱数据已导出");
  };

  const logout = () => {
    AuthService.logout();
    window.location.assign("/");
  };

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className={`my-page ${!authenticated ? "my-page-guest" : ""}`}>
        <header className="my-page-header">
          <span className="my-page-seal"><img src="/puli-logo.png" alt="谱里" /></span>
          <div>
            <p>我的谱里</p>
            <h1>
              {authenticated
                ? user?.name || user?.email || "家谱整理者"
                : "把家人的名字留在一起"}
            </h1>
          </div>
        </header>

        {!authenticated ? (
          <section className="my-guest-card">
            <span className="my-card-kicker">默认私密</span>
            <h2>{BRAND.tagline}</h2>
            <p>从自己开始，记下父母与祖辈</p>
            <Button
              type="primary"
              block
              size="large"
              onClick={() => onMenuClick?.("register")}
            >
              免费创建家谱
            </Button>
            <Button type="text" block onClick={() => onMenuClick?.("login")}>
              已有账号，去登录
            </Button>
          </section>
        ) : (
          <>
            <section className="my-family-card">
              <div className="my-family-card-top">
                <div>
                  <span className="my-card-kicker">当前家谱</span>
                  <h2>{tenant?.name || "我的家谱"}</h2>
                </div>
                <span className="my-private-pill">
                  <LockOutlined /> 私密
                </span>
              </div>
              <div className="my-family-stats">
                <div>
                  <strong>{familyData.length}</strong>
                  <span>位族人</span>
                </div>
                <div>
                  <strong>
                    {new Set(
                      familyData.map((person) => person.g_rank).filter(Boolean),
                    ).size || 0}
                  </strong>
                  <span>代相承</span>
                </div>
              </div>
              <TenantSelector />
            </section>

            <section className="my-menu-card" aria-label="家谱管理">
              <button type="button" onClick={() => onMenuClick?.("settings")}>
                <span className="my-menu-icon">
                  <SettingOutlined />
                </span>
                <span>
                  <strong>家谱设置</strong>
                  <small>隐私、数据与家谱概况</small>
                </span>
                <RightOutlined />
              </button>
              <button type="button" onClick={exportFamilyData}>
                <span className="my-menu-icon">
                  <CloudDownloadOutlined />
                </span>
                <span>
                  <strong>导出家谱</strong>
                  <small>下载备份，随时带走</small>
                </span>
                <RightOutlined />
              </button>
              <button
                type="button"
                onClick={() => message.info("成员邀请将在下一阶段开放")}
              >
                <span className="my-menu-icon">
                  <TeamOutlined />
                </span>
                <span>
                  <strong>家族成员</strong>
                  <small>邀请家人一起续谱</small>
                </span>
                <RightOutlined />
              </button>
              <button
                type="button"
                onClick={() => message.info("家谱默认私密，在世人物信息受保护")}
              >
                <span className="my-menu-icon">
                  <SafetyCertificateOutlined />
                </span>
                <span>
                  <strong>隐私与安全</strong>
                  <small>了解谁可以看到哪些资料</small>
                </span>
                <RightOutlined />
              </button>
            </section>

            <button type="button" className="my-logout-button" onClick={logout}>
              退出登录
            </button>
          </>
        )}

        <p className="my-page-footnote">让孩子知道家族从哪里来</p>
      </div>
    </AppLayout>
  );
};

export default MyPage;
