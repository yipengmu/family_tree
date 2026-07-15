import React from "react";
import { HomeOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import FamilySearchBar from "../UI/FamilySearchBar.js";
import "./MainContent.css";
import BRAND from "../../constants/brand.js";
import { OFFICIAL_SITE_PATH } from "../../utils/mobileEntry.js";

const MainContent = ({
  children,
  familyData = [],
  nodes = [],
  statistics = null,
  onSearch,
  onSearchSelect,
  sidebarCollapsed = false,
  showSearch = true,
}) => {
  return (
    <main
      className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${showSearch ? "" : "no-search"}`}
    >
      {/* 顶部导航栏 - 简化为仅搜索功能 */}
      <header className={`header ${showSearch ? "" : "no-search"}`}>
        <div className="mobile-header-identity" aria-label={BRAND.name}>
          <span>{BRAND.seal}</span>
          <b>{BRAND.name}</b>
        </div>
        <div className="header-brandline">
          <span className="header-eyebrow">{BRAND.tagline}</span>
          <span className="header-divider" aria-hidden="true" />
          <span className="header-privacy">私密 · 可导出</span>
        </div>
        {/* 搜索栏 */}
        {showSearch && (
          <div className="header-search">
            <FamilySearchBar
              familyData={familyData}
              nodes={nodes}
              statistics={statistics}
              onSearch={onSearch}
              onSelect={onSearchSelect}
              placeholder="搜索姓名、字辈或居住地"
              showStatus={true}
              style={{ flex: 1, maxWidth: "100%" }}
            />
          </div>
        )}
        <Link
          className="mobile-official-link"
          to={OFFICIAL_SITE_PATH}
          aria-label="打开谱里产品官网"
          title="产品官网"
        >
          <HomeOutlined />
        </Link>
      </header>

      {/* 主要内容区域 */}
      <div className="content-container">{children}</div>
    </main>
  );
};

export default MainContent;
