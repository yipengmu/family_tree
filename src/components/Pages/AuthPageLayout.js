import React from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Card, Typography } from "antd";
import { Link } from "react-router-dom";
import BRAND from "../../constants/brand.js";
import BrandLogo from "../UI/BrandLogo.js";
import "./AuthPageLayout.css";

const { Title, Text } = Typography;

const AuthPageLayout = ({
  backLabel,
  onBack,
  title,
  subtitle,
  children,
  footer,
}) => (
  <div className="auth-page">
    <header className="auth-topbar">
      <Link className="auth-brand" to="/" aria-label="谱里官网首页">
        <span className="auth-brand-seal" aria-hidden="true">
          <BrandLogo alt="" />
        </span>
        <span className="auth-brand-copy">
          <strong>{BRAND.name}</strong>
          <small>{BRAND.tagline}</small>
        </span>
      </Link>

      <button
        type="button"
        className="auth-back-button"
        onClick={onBack}
        aria-label={backLabel}
      >
        <ArrowLeftOutlined />
        <span>{backLabel}</span>
      </button>
    </header>

    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="auth-intro-title">
        <span className="auth-kicker">看家谱 · 续家谱 · 管家谱</span>
        <h1 id="auth-intro-title">
          从一个名字开始，
          <br />
          留住一家人的故事
        </h1>
        <p>
          先记录自己，再慢慢连接父母、祖辈和家人的生活片段。第一版不需要完整，知道多少就记多少。
        </p>

        <div className="auth-family-preview" aria-hidden="true">
          <span>祖辈</span>
          <span>父母</span>
          <span className="is-current">从我开始</span>
        </div>

        <div className="auth-trust-list" aria-label="产品承诺">
          <span>默认私密</span>
          <span>数据可带走</span>
          <span>核心代码开源</span>
        </div>
      </section>

      <Card className="auth-card">
        <div className="auth-heading">
          <Title level={2}>{title}</Title>
          <Text type="secondary">{subtitle}</Text>
        </div>

        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </Card>
    </main>
  </div>
);

export default AuthPageLayout;
