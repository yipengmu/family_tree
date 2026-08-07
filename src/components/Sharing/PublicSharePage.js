import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  EyeOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Result, Spin, message } from "antd";
import BrandLogo from "../UI/BrandLogo.js";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import ShareOverview from "./ShareOverview.js";
import SharePageHeader from "./SharePageHeader.js";
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

  const copyShareLink = async () => {
    const shareUrl = share?.shareUrl || window.location.href;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(shareUrl);
      trackEvent("share_link_copied", { method: "clipboard" });
      message.success("分享链接已复制");
    } catch {
      message.warning("当前浏览器不支持自动复制，请从地址栏复制链接");
    }
  };

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
  const viewerBoundary = (
    <section
      className="public-share-viewer-boundary"
      aria-labelledby="viewer-boundary-title"
    >
      <div className="public-share-boundary-heading">
        <span>你的查看边界</span>
        <h2 id="viewer-boundary-title">你正在以查看者身份浏览</h2>
        <p>这是一份由家谱整理者主动发布、发布时固定的 7 天只读快照。</p>
      </div>
      <div className="public-share-boundary-grid">
        <article>
          <EyeOutlined />
          <div>
            <b>你可以看到</b>
            <p>人物姓名、性别、代际、亲属关系和生存状态分类</p>
          </div>
        </article>
        <article>
          <LockOutlined />
          <div>
            <b>这里不会公开</b>
            <p>照片、生日、住址、联系方式、人物故事和原始资料</p>
          </div>
        </article>
        <article>
          <SafetyCertificateOutlined />
          <div>
            <b>你不能操作</b>
            <p>不能编辑家谱，也不会因为打开链接而成为家庭成员</p>
          </div>
        </article>
      </div>
      <div className="public-share-product-entry">
        <span>这份家谱由一位家人在「谱里」整理完成</span>
        <Link
          to="/register"
          state={createState}
          onClick={() =>
            trackEvent("public_share_create_clicked", { placement: "boundary" })
          }
        >
          我也想从自己开始建一份
        </Link>
      </div>
    </section>
  );

  return (
    <main className="public-share-page">
      <SharePageHeader onShare={copyShareLink} />

      <ShareOverview
        afterHero={viewerBoundary}
        eyebrow="家人主动分享 · 7 天只读"
        familyName={snapshot.familyName}
        familyData={snapshot.people}
        stats={stats}
        treeHint="拖动查看家族分支；这份页面只能查看，不能修改。"
        treeTitle="这位家人整理的世系"
      />

      <section
        className="public-share-values"
        aria-labelledby="family-value-title"
      >
        <div className="public-share-value-intro">
          <span>这份成果如何开始</span>
          <h2 id="family-value-title">一棵家谱，可以由一个人先开始</h2>
          <p>不用等资料全部齐全，先把知道的人和关系连起来。</p>
        </div>
        <div className="public-share-value-cards">
          <article>
            <b>从两个人开始</b>
            <p>先记录自己，再连接一位父母或长辈。</p>
          </article>
          <article>
            <b>不知道也能留空</b>
            <p>姓名和资料可以待考，之后再慢慢补充。</p>
          </article>
          <article>
            <b>始终由家庭掌控</b>
            <p>默认私密，只有整理者主动发布才对外可见。</p>
          </article>
        </div>
      </section>

      <section className="public-share-cta">
        <span>看完这份家谱，也可以为自己的家人留一份</span>
        <h2>从自己开始，连起第一段家庭关系</h2>
        <p>不需要懂修谱，也不需要一次填完；两个人就能看到第一棵树。</p>
        <div>
          <Link
            to="/register"
            state={createState}
            onClick={() =>
              trackEvent("public_share_create_clicked", { placement: "final" })
            }
          >
            <Button type="primary" size="large">
              免费创建我家的家谱
            </Button>
          </Link>
          <Link to="/?from=share">
            <Button size="large">了解「谱里」</Button>
          </Link>
        </div>
      </section>

      <footer className="public-share-footer">
        「谱里」 ： 看家谱，续家谱，管家谱
      </footer>
    </main>
  );
}
