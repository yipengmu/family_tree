import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import BRAND from "./constants/brand.js";
import BrandLogo from "./components/UI/BrandLogo.js";
import { shouldRedirectMobileHome } from "./utils/mobileEntry.js";
import "./RouterApp.css";

const MarketingHomePage = lazy(
  () => import("./components/Marketing/MarketingHomePage.js"),
);
const AppWorkspace = lazy(() => import("./App.js"));
const LoginPage = lazy(() => import("./components/Pages/LoginPage.js"));
const RegisterPage = lazy(() => import("./components/Pages/RegisterPage.js"));
const ResetPasswordPage = lazy(
  () => import("./components/Pages/ResetPasswordPage.js"),
);
const AdminAnalyticsPage = lazy(
  () => import("./components/Pages/AdminAnalyticsPage.js"),
);
const PublicSharePage = lazy(
  () => import("./components/Sharing/PublicSharePage.js"),
);

const RouteLoading = () => (
  <div className="route-loading" role="status" aria-live="polite">
    <span aria-hidden="true">
      <BrandLogo alt="" />
    </span>
    <p>正在打开谱里…</p>
  </div>
);

const HomeRoute = () => {
  const location = useLocation();

  if (shouldRedirectMobileHome(location.search)) {
    return <Navigate to="/app" replace />;
  }

  return <MarketingHomePage />;
};

const RouterApp = () => (
  <Router>
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/bi" element={<AdminAnalyticsPage />} />
        <Route path="/s/:token" element={<PublicSharePage />} />
        <Route path="/app/demo" element={<AppWorkspace demoMode />} />
        <Route path="/app/*" element={<AppWorkspace />} />
        <Route path="/tree" element={<Navigate to="/app" replace />} />
        <Route path="/create" element={<Navigate to="/app/create" replace />} />
        <Route
          path="/settings"
          element={<Navigate to="/app/settings" replace />}
        />
        <Route path="/mine" element={<Navigate to="/app/mine" replace />} />
        <Route path="/profile" element={<Navigate to="/app/mine" replace />} />
        <Route
          path="/discover"
          element={<Navigate to="/app/discover" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </Router>
);

export default RouterApp;
