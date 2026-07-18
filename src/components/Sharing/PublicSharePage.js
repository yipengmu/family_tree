import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClockCircleOutlined } from "@ant-design/icons";
import { Button, Result, Spin } from "antd";
import BrandLogo from "../UI/BrandLogo.js";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import PublicFamilyTree from "./PublicFamilyTree.js";
import "./PublicSharePage.css";

const updateMeta = (selector, attribute, value) => {
  const element = document.querySelector(selector);
  if (!element) return () => {};
  const previous = element.getAttribute(attribute);
  element.setAttribute(attribute, value);
  return () => element.setAttribute(attribute, previous || "");
};

export default function PublicSharePage() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [share, setShare] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const previousTitle = document.title;
    const restoreRobots = updateMeta(
      'meta[name="robots"]',
      "content",
      "noindex,nofollow,noarchive",
    );
    const restoreCanonical = updateMeta(
      'link[rel="canonical"]',
      "href",
      "https://tree.tatababa.top/",
    );
    document.title = "家人分享的家谱｜谱里";
    return () => {
      document.title = previousTitle;
      restoreRobots();
      restoreCanonical();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    shareService
      .getPublic(token)
      .then((result) => {
        if (!active) return;
        setSnapshot(result.snapshot);
        setShare(result.share);
        document.title = `${result.snapshot.familyName}｜限时分享｜谱里`;
        trackEvent("public_share_viewed", { result: "success" });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "分享链接已失效");
        trackEvent("public_share_viewed", { result: "unavailable" });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!share?.expiresAt) return undefined;
    const delay = Math.max(0, new Date(share.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      setSnapshot(null);
      setError("这份家谱分享已经到期");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [share?.expiresAt]);

  useEffect(() => {
    if (!share?.expiresAt || new Date(share.expiresAt).getTime() > now) return;
    setSnapshot(null);
    setError("这份家谱分享已经到期");
  }, [now, share?.expiresAt]);

  const createState = { from: `/s/${token}`, returnTo: "/app/create" };

  if (loading) {
    return (
      <main className="public-share-state" role="status">
        <BrandLogo alt="谱里" />
        <Spin size="large" />
        <p>正在打开家人分享的家谱…</p>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="public-share-state">
        <Result
          status="info"
          title={error || "分享链接已失效"}
          subTitle="家谱网页分享仅在发布后的 7 天内有效。你仍然可以从自己开始，创建一份属于家人的家谱。"
          extra={[
            <Link key="create" to="/register" state={createState}>
              <Button type="primary" size="large">
                免费创建我的家谱
              </Button>
            </Link>,
            <Link key="home" to="/?from=share">
              <Button size="large">了解谱里</Button>
            </Link>,
          ]}
        />
      </main>
    );
  }

  const stats = snapshot.stats || {};
  return (
    <main className="public-share-page">
      <header className="public-share-header">
        <Link
          to="/?from=share"
          className="public-share-brand"
          aria-label="了解谱里"
        >
          <BrandLogo alt="" />
          <span>
            <strong>谱里</strong>
            <small>年轻人的第一份家谱</small>
          </span>
        </Link>
        <div className="public-share-expiry">
          <ClockCircleOutlined />
          <strong>7 天后过期</strong>
        </div>
      </header>

      <section className="public-share-hero">
        <span className="public-share-eyebrow">家人主动发布的只读家谱</span>
        <h1>{snapshot.familyName}</h1>
        <p>沿着姓名与关系，看见家庭代代延续。</p>
        <div className="public-share-stats" aria-label="家谱摘要">
          <span>
            <strong>{stats.memberCount || 0}</strong>
            <small>谱中人物</small>
          </span>
          <span>
            <strong>{stats.generationCount || 0}</strong>
            <small>记录代数</small>
          </span>
          <span>
            <strong>{stats.relationshipCount || 0}</strong>
            <small>家庭关系</small>
          </span>
        </div>
      </section>

      <section className="public-share-tree-section">
        <div className="public-share-section-heading">
          <div>
            <span>世系总览</span>
            <h2>家谱树状图</h2>
          </div>
          <p>拖动查看分支，使用图谱侧边按钮缩放或全屏。</p>
        </div>
        <PublicFamilyTree familyData={snapshot.people} />
      </section>

      <section
        className="public-share-values"
        aria-labelledby="family-value-title"
      >
        <div className="public-share-value-intro">
          <span>为什么记录</span>
          <h2 id="family-value-title">家谱保存的不只是姓名</h2>
          <p>看见关系，留住记忆，传给家人。</p>
        </div>
        <div className="public-share-value-cards">
          <article>
            <b>看见关系</b>
            <p>理解代际与亲缘。</p>
          </article>
          <article>
            <b>留住记忆</b>
            <p>先记录知道的姓名。</p>
          </article>
          <article>
            <b>传给家人</b>
            <p>让家人以后看得懂。</p>
          </article>
        </div>
      </section>

      <section className="public-share-cta">
        <span>从自己开始就能建立第一份家谱</span>
        <h2>也为你的家人，留下一棵看得见的家谱</h2>
        <p>第一版不需要完整。先记录自己，再连接一位父母或长辈。</p>
        <div>
          <Link
            to="/register"
            state={createState}
            onClick={() =>
              trackEvent("public_share_create_clicked", { placement: "final" })
            }
          >
            <Button type="primary" size="large">
              免费创建我的家谱
            </Button>
          </Link>
          <Link to="/?from=share">
            <Button size="large">了解谱里</Button>
          </Link>
        </div>
      </section>

      <footer className="public-share-footer">
        谱里 · 看家谱，续家谱，管家谱
      </footer>
    </main>
  );
}
