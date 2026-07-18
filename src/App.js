import React, { useState, useEffect } from "react";
import { Layout, Alert, Button, message } from "antd";
import { validateFamilyData } from "./utils/familyTreeUtils.js";
import FamilyTreePage from "./components/Pages/FamilyTreePage.js";
import SettingsPage from "./components/Pages/SettingsPage.js";
import CreatorPage from "./components/Pages/CreatorPage.js";
import DiscoverPage from "./components/Pages/DiscoverPage.js";
import PersonProfilePage from "./components/Pages/PersonProfilePage.js";
import PersonEditPage from "./components/Pages/PersonEditPage.js";
import FamilySharePage from "./components/Sharing/FamilySharePage.js";
import familyDataService from "./services/familyDataService.js";
import tenantService from "./services/tenantService.js";
import { useLocation, useNavigate } from "react-router-dom";
import MyPage from "./components/Pages/MyPage.js";
import BRAND from "./constants/brand.js";
import {
  getAppPageFromPath,
  getAppPath,
  getPersonIdFromPath,
  getPersonProfilePath,
  getPersonEditPath,
} from "./utils/appRoutes.js";
import { trackEvent } from "./utils/analytics.js";
// 导入测试工具（开发环境自动运行）

import "./App.css";

const { Content } = Layout;

const DEMO_TENANT = {
  id: "default",
  name: BRAND.demoFamilyName,
  description: "公开示范家谱 · 游客只读",
  isDefault: true,
  isGuest: true,
};

// 检测是否为移动端
const isMobile = () => {
  return window.innerWidth <= 768;
};

// 主应用组件
function MainApp({ demoMode = false }) {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [mobile, setMobile] = useState(isMobile());
  const location = useLocation();
  const navigate = useNavigate();
  const pageFromPath = () => getAppPageFromPath(location.pathname);
  const [currentPage, setCurrentPage] = useState(pageFromPath);
  const [currentTenant, setCurrentTenant] = useState(null);

  // 检查用户是否已登录
  const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    return !!token;
  };

  // 处理菜单点击
  const handleMenuClick = (menuKey) => {
    if (!isAuthenticated() && menuKey === "create") {
      navigate("/login", {
        state: { from: location.pathname, returnTo: "/app/create" },
      });
      return;
    }
    // 如果用户未登录且不在游客模式，且点击的是需要登录的功能，则跳转到登录页
    if (
      !isAuthenticated() &&
      !["tree", "discover", "mine", "login", "register"].includes(menuKey)
    ) {
      navigate("/login", {
        state: {
          from: location.pathname,
          returnTo: getAppPath(menuKey),
        },
      });
      return;
    }

    if (menuKey === "login" || menuKey === "register") {
      navigate(`/${menuKey}`, { state: { from: location.pathname } });
      return;
    }

    navigate(getAppPath(menuKey));
  };

  const openPersonProfile = (personId, options = {}) => {
    navigate(getPersonProfilePath(personId, options));
  };

  const openPersonEdit = (personId) => {
    navigate(getPersonEditPath(personId));
  };

  const startPaternalGuide = () => {
    navigate("/app/create?guide=paternal");
  };

  useEffect(() => {
    setCurrentPage(pageFromPath());
  }, [location.pathname]);

  useEffect(() => {
    document.title = demoMode ? `${BRAND.demoFamilyName}` : `我的家谱`;
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;
    trackEvent("app_view", {
      page: currentPage,
      device: mobile ? "mobile" : "desktop",
    });
  }, [currentPage, demoMode, mobile]);

  useEffect(() => {
    if (!isAuthenticated() && currentPage === "create") {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname, returnTo: "/app/create" },
      });
    }
  }, [currentPage, navigate]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setMobile(isMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // 处理ResizeObserver错误
    const handleResizeObserverError = (e) => {
      if (e.message && e.message.includes("ResizeObserver loop completed")) {
        // 忽略ResizeObserver的循环错误，这不会影响功能
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener("error", handleResizeObserverError);

    // 加载家谱数据 - 优化：优先使用缓存，后台异步更新
    const loadFamilyData = async (tenantId = null) => {
      try {
        setAuthExpired(false);
        const currentTenantId = tenantId || tenantService.getCurrentTenant().id;
        console.log(`📖 [App] 加载家谱数据 - 租户: ${currentTenantId}`);

        // 游客示范谱优先走持久缓存/内置快照，绝不让网络请求阻塞产品入口。
        // 网络只在后台更新，且该分支不会被已登录用户触发。
        if (
          !isAuthenticated() &&
          familyDataService.isGuestDemoContext(currentTenantId)
        ) {
          const snapshot =
            await familyDataService.getGuestDemoSnapshot(currentTenantId);
          if (snapshot?.length) {
            setFamilyData(snapshot);
            setValidationResult(validateFamilyData(snapshot));
            setLoading(false);
          }

          void familyDataService
            .refreshGuestDemoData(currentTenantId)
            .then((latestData) => {
              if (
                latestData &&
                JSON.stringify(latestData) !== JSON.stringify(snapshot)
              ) {
                setFamilyData(latestData);
                setValidationResult(validateFamilyData(latestData));
              }
            });
          return;
        }

        // 只读取内存缓存；没有缓存时让后续请求直接完成首次加载，避免首屏重复请求。
        const cachedData =
          familyDataService.getCachedFamilyData(currentTenantId);

        // 立即设置缓存数据并停止loading状态，提升用户体验
        if (cachedData && cachedData.length > 0) {
          setFamilyData(cachedData);
          const result = validateFamilyData(cachedData);
          setValidationResult(result);
          setLoading(false);
          console.log(
            `⚡ [App] 使用缓存数据快速显示 (${cachedData.length} 条记录)`,
          );
        }

        // 无缓存时只请求一次；已有缓存时才后台强制刷新。
        const latestData = await familyDataService.getFamilyData(
          Boolean(cachedData),
          currentTenantId,
        );
        if (
          latestData &&
          JSON.stringify(latestData) !== JSON.stringify(cachedData)
        ) {
          setFamilyData(latestData);
          setValidationResult(validateFamilyData(latestData));
        }
        setLoading(false);
      } catch (err) {
        // 已有可用缓存时，后台刷新失败不应让首屏退回错误页。
        if (familyDataService.getCachedFamilyData(tenantId)) {
          console.warn("后台刷新家谱数据失败，继续使用缓存:", err);
          setLoading(false);
          return;
        }
        console.error("加载数据失败:", err);
        const isAuthError =
          err?.isAuthError || err?.status === 401 || err?.status === 403;
        const errorMessage = isAuthError
          ? "登录状态已过期，请重新登录后继续查看家谱。"
          : err.message;
        setAuthExpired(isAuthError);
        setError(errorMessage);
        message.error(`加载家谱数据失败: ${errorMessage}`);
        setLoading(false);
      }
    };

    // 初始化应用
    const initializeApp = async () => {
      if (demoMode) {
        if (!isAuthenticated()) localStorage.setItem("guest_mode", "true");
        setCurrentTenant(DEMO_TENANT);
        await loadFamilyData(DEMO_TENANT.id);
        return;
      }

      // 如果用户未登录，设置为游客模式
      if (!isAuthenticated()) {
        localStorage.setItem("guest_mode", "true");

        // 设置默认租户为穆家家谱
        const defaultTenant = {
          ...DEMO_TENANT,
          createdAt: new Date().toISOString(),
        };
        tenantService.setCurrentTenant(defaultTenant);
        setCurrentTenant(defaultTenant);
      } else {
        // 用户已登录，移除游客模式标识
        localStorage.removeItem("guest_mode");

        // 获取当前租户
        const tenant = tenantService.getCurrentTenant();
        setCurrentTenant(tenant);
      }

      const initialTenantId = tenantService.getCurrentTenant().id;

      // 创建页有自己的数据初始化和 loading 状态。不要让 MainApp 先加载整份家谱，
      // 否则首次打开 /app/create 会被家谱请求阻塞，且 CreatorPage 会再次读取同一份数据。
      if (currentPage === "create") {
        setLoading(false);
        return;
      }

      // 游客读取示范家谱；登录用户直接读取自己上次使用的家谱，避免短暂泄露示范数据或错租户编辑。
      if (isAuthenticated()) {
        // 私有租户的数据库读取不应阻塞工作区骨架；FamilyTreePage 会显示局部加载层，
        // 数据返回后再填充内容，避免冷启动/数据库连接延迟把整个过渡页卡住。
        setLoading(false);
        void loadFamilyData(initialTenantId);
        return;
      }

      await loadFamilyData(initialTenantId);
    };

    initializeApp();

    // 监听租户切换事件
    const unsubscribe = demoMode
      ? () => {}
      : tenantService.onTenantChange(async (tenant) => {
          setCurrentTenant(tenant);
          await loadFamilyData(tenant.id);
        });

    // 监听家谱数据更新事件
    const handleFamilyDataUpdated = async (event) => {
      const { tenantId } = event.detail;
      const currentTenantId = demoMode
        ? DEMO_TENANT.id
        : tenantService.getCurrentTenant().id;

      // 如果更新的是当前租户的数据，重新加载
      if (tenantId === currentTenantId) {
        console.log("🔄 [App] 检测到家谱数据更新，重新加载...");
        await loadFamilyData(tenantId);
      }
    };

    window.addEventListener("familyDataUpdated", handleFamilyDataUpdated);

    return () => {
      window.removeEventListener("error", handleResizeObserverError);
      window.removeEventListener("familyDataUpdated", handleFamilyDataUpdated);
      unsubscribe();
    };
  }, [currentPage, demoMode]);

  // 显示加载状态 - 优化：即使在后台加载时也允许用户交互
  if (loading && familyData.length === 0) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "16px" }}>🌳</div>
            <div>正在加载家谱数据...</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              （首次加载可能需要一些时间）
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            action={
              authExpired ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    navigate("/login", {
                      replace: true,
                      state: {
                        from: location.pathname,
                        returnTo: location.pathname,
                      },
                    })
                  }
                >
                  重新登录
                </Button>
              ) : null
            }
            style={{ maxWidth: "400px" }}
          />
        </Content>
      </Layout>
    );
  }

  // 根据当前页面渲染不同组件
  const renderCurrentPage = () => {
    const commonProps = {
      onMenuClick: handleMenuClick,
      activeMenuItem: currentPage,
    };

    switch (currentPage) {
      case "tree":
        return (
          <FamilyTreePage
            {...commonProps}
            familyData={familyData}
            loading={loading}
            error={error}
            validationResult={validationResult}
            currentTenant={currentTenant}
            demoMode={demoMode}
            onOpenPersonProfile={openPersonProfile}
            onOpenPersonEdit={openPersonEdit}
            onStartPaternalGuide={startPaternalGuide}
          />
        );
      case "share":
        if (!isAuthenticated()) {
          return (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              <h2 style={{ color: "#1e293b", marginBottom: "16px" }}>
                需要登录
              </h2>
              <p>分享家谱需要先登录。</p>
              <Button type="primary" onClick={() => handleMenuClick("login")}>
                前往登录
              </Button>
            </div>
          );
        }
        return (
          <FamilySharePage
            familyName={
              currentTenant?.isDefault
                ? BRAND.demoFamilyName
                : currentTenant?.name || "我的家谱"
            }
            familyData={familyData}
            currentTenant={currentTenant}
            onBack={() => navigate("/app")}
          />
        );
      case "person": {
        const personId = getPersonIdFromPath(location.pathname);
        const person = familyData.find(
          (item) => String(item.person_id ?? item.id) === String(personId),
        );

        if (!person) {
          return (
            <PersonProfilePage
              person={null}
              familyData={familyData}
              onMenuClick={handleMenuClick}
              onBack={() => navigate("/app")}
            />
          );
        }

        return (
          <PersonProfilePage
            person={person}
            familyData={familyData}
            onMenuClick={handleMenuClick}
            onBack={() => navigate("/app")}
            onEdit={() => navigate(getPersonEditPath(personId))}
            initialStoryOpen={
              new URLSearchParams(location.search).get("capture") === "1"
            }
          />
        );
      }
      case "person-edit": {
        const personId = getPersonIdFromPath(location.pathname);
        const person = familyData.find(
          (item) => String(item.person_id ?? item.id) === String(personId),
        );
        return (
          <PersonEditPage
            person={person}
            familyData={familyData}
            onMenuClick={handleMenuClick}
            onBack={() => navigate(getPersonProfilePath(personId))}
          />
        );
      }
      case "settings":
        // 如果用户未登录，显示登录提示
        if (!isAuthenticated()) {
          return (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              <h2 style={{ color: "#1e293b", marginBottom: "16px" }}>
                需要登录
              </h2>
              <p>此功能需要登录才能使用</p>
              <button
                onClick={() => handleMenuClick("login")}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "#1890ff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                前往登录
              </button>
            </div>
          );
        }
        return <SettingsPage {...commonProps} familyData={familyData} />;
      case "mine":
        return <MyPage {...commonProps} familyData={familyData} />;
      case "create":
        // 如果用户未登录，引导注册
        if (!isAuthenticated()) {
          return (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              <h2 style={{ color: "#1e293b", marginBottom: "16px" }}>
                创建您的家谱
              </h2>
              <p>要创建您自己的家谱，请先注册账号</p>
              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => handleMenuClick("login")}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1890ff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  登录
                </button>
                <button
                  onClick={() => handleMenuClick("register")}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#52c41a",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  注册
                </button>
              </div>
            </div>
          );
        }
        return (
          <CreatorPage
            {...commonProps}
            familyData={familyData}
            onOpenPersonProfile={openPersonProfile}
            onOpenPersonEdit={openPersonEdit}
            openPaternalGuide={
              new URLSearchParams(location.search).get("guide") === "paternal"
            }
          />
        );
      case "discover":
        return <DiscoverPage {...commonProps} />;
      case "login-required":
        return (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "16px",
            }}
          >
            <h2 style={{ color: "#1e293b", marginBottom: "16px" }}>需要登录</h2>
            <p>此功能需要登录才能使用</p>
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => handleMenuClick("login")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#1890ff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                登录
              </button>
              <button
                onClick={() => handleMenuClick("register")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#52c41a",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                注册
              </button>
            </div>
          </div>
        );
      case "events":
      case "analytics":
        return (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "16px",
            }}
          >
            <h2 style={{ color: "#1e293b", marginBottom: "16px" }}>
              功能开发中
            </h2>
            <p>该功能正在开发中，敬请期待...</p>
          </div>
        );
      default:
        return (
          <FamilyTreePage
            {...commonProps}
            familyData={familyData}
            loading={loading}
            error={error}
            validationResult={validationResult}
            currentTenant={currentTenant}
            demoMode={demoMode}
            onOpenPersonProfile={openPersonProfile}
            onStartPaternalGuide={startPaternalGuide}
          />
        );
    }
  };

  // 移动端也使用AppLayout组件，但简化菜单
  if (mobile) {
    return <div className="App mobile-layout">{renderCurrentPage()}</div>;
  }

  // PC端使用新的布局系统
  return <div className="App desktop-layout">{renderCurrentPage()}</div>;
}

export default MainApp;
