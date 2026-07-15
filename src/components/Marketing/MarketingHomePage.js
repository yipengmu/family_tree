import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  GithubOutlined,
  LockOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { QRCode } from "antd";
import { Link, useNavigate } from "react-router-dom";
import BRAND from "../../constants/brand.js";
import { getCreatePath } from "../../utils/appRoutes.js";
import { trackEvent } from "../../utils/analytics.js";
import "./MarketingHomePage.css";

const MOBILE_CREATE_URL = "https://tree.tatababa.top/app/create?source=pc-home";

const memoryScenes = [
  {
    index: "01",
    title: "照片还在，名字却没人知道",
    copy: "一张老照片经过几次搬家，最后只剩“应该是太爷爷那一辈”的猜测。",
  },
  {
    index: "02",
    title: "记得名字，却不知道他怎样生活",
    copy: "职业、手艺、性格和走过的地方，常常没有进入传统的姓名与世系记录。",
  },
  {
    index: "03",
    title: "故事散在不同家人的记忆里",
    copy: "每个人知道一部分，却总想着以后再问、以后再整理。",
  },
];

const capabilities = [
  {
    label: "看家谱",
    title: "从关系里看懂一家人",
    copy: "浏览世系、搜索人物、聚焦支系，在名字之间找到清楚的代际脉络。",
  },
  {
    label: "续家谱",
    title: "知道多少，就先记下多少",
    copy: "从一位家人开始，继续补充父母、祖辈、儿女和人物资料。",
  },
  {
    label: "管家谱",
    title: "让家庭资料长期留得住",
    copy: "家谱默认私密保存，按家庭空间管理，并为导出、备份与迁移留出能力。",
  },
];

const trustItems = [
  {
    icon: <LockOutlined />,
    title: "默认私密",
    copy: "家谱不是公共社交资料。只有获得授权的家人才能访问家庭空间。",
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: "敏感信息受保护",
    copy: "在世人物、未成年人、住址和联系方式默认不公开。",
  },
  {
    icon: <CloudDownloadOutlined />,
    title: "数据可以带走",
    copy: "家庭资料应当能够导出、备份和迁移，不被单一平台锁住。",
  },
  {
    icon: <GithubOutlined />,
    title: "核心代码开源",
    copy: "支持自行部署。需要部署指引时，可关注“塔塔爸爸”并回复“开源”。",
  },
];

const MarketingHomePage = () => {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const authenticated = Boolean(localStorage.getItem("token"));
  const createPath = getCreatePath(authenticated);
  const createState = useMemo(
    () => ({ from: "/", returnTo: "/app/create" }),
    [],
  );

  useEffect(() => {
    document.title = `${BRAND.name}｜${BRAND.tagline}`;
    trackEvent("homepage_view");
  }, []);

  useEffect(() => {
    if (!createPanelOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCreatePanelOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [createPanelOpen]);

  const beginCreate = (source) => {
    trackEvent("hero_create_click", { source });
    setNavOpen(false);

    if (window.matchMedia("(max-width: 768px)").matches) {
      trackEvent("app_create_open", { source, device: "mobile" });
      navigate(createPath, { state: createState });
      return;
    }

    setCreatePanelOpen(true);
  };

  const openDemo = (source) => {
    trackEvent("demo_view_click", { source });
    setNavOpen(false);
  };

  const recordCommunityIntent = (intent) => {
    trackEvent(
      intent === "open-source"
        ? "wechat_open_source_intent"
        : "wechat_co_creation_intent",
      { source: "homepage" },
    );
    setNavOpen(false);
  };

  return (
    <div className="marketing-site">
      <a className="site-skip-link" href="#main-content">
        跳到主要内容
      </a>

      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" to="/" aria-label="谱里官网首页">
            <span className="site-brand-seal" aria-hidden="true">
              {BRAND.seal}
            </span>
            <span>
              <strong>{BRAND.name}</strong>
              <small>{BRAND.tagline}</small>
            </span>
          </Link>

          <button
            className="site-menu-button"
            type="button"
            aria-label={navOpen ? "关闭导航" : "打开导航"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>

          <nav
            className={`site-nav ${navOpen ? "is-open" : ""}`}
            aria-label="官网导航"
          >
            <a href="#why" onClick={() => setNavOpen(false)}>
              为什么记录
            </a>
            <a href="#start" onClick={() => setNavOpen(false)}>
              如何开始
            </a>
            <a href="#product" onClick={() => setNavOpen(false)}>
              产品能力
            </a>
          </nav>

          <div className="site-header-actions">
            <Link to="/login" state={{ from: "/", returnTo: "/app" }}>
              登录
            </Link>
            <button type="button" onClick={() => beginCreate("header")}>
              {authenticated ? "进入我的家谱" : "免费创建"}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="site-hero" aria-labelledby="hero-title">
          <div className="site-hero-copy">
            <span className="site-kicker">{BRAND.tagline}</span>
            <h1 id="hero-title">
              别让家人的名字和故事，
              <em>散落在记忆里</em>
            </h1>
            <p>
              从自己开始，逐步记录父母、祖辈和更远的家族脉络。知道多少记多少，让孩子知道我们从哪里来。
            </p>
            <div className="site-hero-actions">
              <button
                className="site-button site-button-primary"
                type="button"
                onClick={() => beginCreate("hero")}
              >
                {authenticated ? "继续整理我的家谱" : "免费创建我的家谱"}
                <ArrowRightOutlined />
              </button>
              <Link
                className="site-button site-button-secondary"
                to="/app/demo"
                onClick={() => openDemo("hero")}
              >
                看看一份真实家谱
              </Link>
            </div>
            <ul className="site-trust-line" aria-label="产品承诺">
              <li>
                <CheckOutlined /> 默认私密
              </li>
              <li>
                <CheckOutlined /> 数据可带走
              </li>
              <li>
                <CheckOutlined /> 核心代码开源
              </li>
            </ul>
          </div>

          <div
            className="site-hero-visual"
            aria-label="四代家庭关系与人物记忆示意"
          >
            <div className="archive-stamp">家庭档案 · 持续补充</div>
            <div className="family-map" aria-hidden="true">
              <div className="family-generation generation-one">
                <span>爷爷</span>
                <span>奶奶</span>
                <span>外公</span>
                <span>外婆</span>
              </div>
              <div className="family-generation generation-two">
                <span>父亲</span>
                <span>母亲</span>
              </div>
              <div className="family-generation generation-three">
                <span className="is-focus">从我开始</span>
              </div>
              <div className="family-generation generation-four">
                <span>儿女</span>
              </div>
            </div>
            <article className="archive-memory-card">
              <span>家人讲述 · 待继续整理</span>
              <h2>曾祖父不只是族谱上的一个名字</h2>
              <ul>
                <li>读《毛选》</li>
                <li>做过兽医</li>
                <li>会木工，也会制作木箍桶</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="site-section site-memory-section" id="why">
          <div className="site-section-heading">
            <span className="site-kicker">为什么现在开始</span>
            <h2>家族记忆，很少在某一天突然消失</h2>
            <p>
              它只是随着一次次“以后再问”，慢慢无人知晓。现在开始，不需要一次写完整。
            </p>
          </div>
          <div className="memory-scene-grid">
            {memoryScenes.map((scene) => (
              <article className="memory-scene" key={scene.index}>
                <span>{scene.index}</span>
                <h3>{scene.title}</h3>
                <p>{scene.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="site-section site-paths-section" id="start">
          <div className="site-section-heading is-centered">
            <span className="site-kicker">两种家庭，同一个方向</span>
            <h2>无论有没有一本现成的家谱，都可以开始</h2>
          </div>
          <div className="family-path-grid">
            <article className="family-path is-primary">
              <span className="path-label">多数年轻人的开始</span>
              <h3>从零建立，先记录身边四代</h3>
              <p>
                从本人开始，上到父母与祖父母，下到儿女。先连接一位家人，就有了第一条真实的家庭关系。
              </p>
              <div className="path-generations" aria-label="四代家庭范围示意">
                <span>祖父母</span>
                <i aria-hidden="true" />
                <span>父母</span>
                <i aria-hidden="true" />
                <span>自己</span>
                <i aria-hidden="true" />
                <span>儿女</span>
              </div>
              <button type="button" onClick={() => beginCreate("path-zero")}>
                从自己开始 <ArrowRightOutlined />
              </button>
            </article>
            <article className="family-path">
              <span className="path-label">已有纸谱或资料</span>
              <h3>承接已有族谱，保存超长世系</h3>
              <p>
                把纸谱、Excel、照片和长辈记忆逐步连接起来。穆氏示范谱展示长代际族谱的浏览上限。
              </p>
              <div className="long-genealogy-line" aria-hidden="true">
                {Array.from({ length: 13 }, (_, index) => (
                  <i key={index} />
                ))}
              </div>
              <Link to="/app/demo" onClick={() => openDemo("path-long")}>
                浏览穆氏示范谱 <ArrowRightOutlined />
              </Link>
            </article>
          </div>

          <div className="two-step-start">
            <div>
              <span className="site-kicker">几分钟开始，而不是一次完成</span>
              <h2>第一版家谱，只需要两步</h2>
              <p>先留下一个可靠的起点，以后再和家人一起慢慢补充。</p>
            </div>
            <ol>
              <li>
                <span>一</span>
                <div>
                  <strong>先把自己写进家谱</strong>
                  <small>姓名就是第一份家谱的起点</small>
                </div>
              </li>
              <li>
                <span>二</span>
                <div>
                  <strong>再连接一位父母或家人</strong>
                  <small>看到第一条属于自己的家庭关系</small>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="site-section site-product-section" id="product">
          <div className="site-section-heading">
            <span className="site-kicker">现在可以做到</span>
            <h2>看家谱、续家谱、管家谱</h2>
            <p>从一份可以看见的成果开始，再把它变成能够多年维护的家庭档案。</p>
          </div>
          <div className="capability-grid">
            {capabilities.map((capability, index) => (
              <article className="capability-card" key={capability.label}>
                <span className="capability-number">0{index + 1}</span>
                <strong>{capability.label}</strong>
                <h3>{capability.title}</h3>
                <p>{capability.copy}</p>
              </article>
            ))}
          </div>

          <div className="product-trust" id="trust">
            <div className="product-trust-heading">
              <span className="site-kicker">资料属于家庭，而不是平台</span>
              <h2>放心记录，也能随时带走</h2>
              <p>
                家庭资料默认私密；AI 和 OCR 只帮助整理草稿，不能替家人确认事实。
              </p>
            </div>
            <div className="trust-grid">
              {trustItems.map((item) => (
                <article key={item.title}>
                  <span className="trust-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="trust-ai-note">
              <BookOutlined /> AI 和 OCR
              只能帮助整理草稿，不能自动替家人确认事实。
            </p>
          </div>
        </section>

        <section className="site-story-section" id="story">
          <div className="site-story-inner">
            <div className="story-quote">
              <span className="site-kicker">第一位深度用户</span>
              <blockquote>
                “我做谱里，不是因为先看到了一个软件机会，而是因为开始询问父亲以后，才发现普通人的一生里，有那么多值得留下的细节。”
              </blockquote>
              <p>
                我知道了曾祖父读《毛选》、做过兽医、会木工，也会制作家用木箍桶；也知道奶奶年轻时曾在老家教过小学。
              </p>
              <p>
                如果没有人问起和记下，这些经历可能不会出现在任何一份家谱里。我会先长期记录自己的家庭，再邀请更多家庭一起共创。
              </p>
            </div>
            <div className="story-records" aria-label="家庭口述记录示意">
              <article>
                <span>01 · 一门手艺</span>
                <strong>会做木工与木箍桶</strong>
                <small>父亲讲述的曾祖父</small>
              </article>
              <article>
                <span>02 · 一份工作</span>
                <strong>在乡间做过兽医</strong>
                <small>普通生活也值得被记下</small>
              </article>
              <article>
                <span>03 · 一段经历</span>
                <strong>年轻时在老家教小学</strong>
                <small>奶奶的人生片段</small>
              </article>
            </div>
          </div>
          <div className="story-next-step">
            <div>
              <span className="site-status-tag">正在共创</span>
              <strong>让名字，慢慢长出生平</strong>
              <p>
                把照片、工作、手艺和家人讲述，整理成可以逐年补充的家庭记录。
              </p>
            </div>
            <a href="#wechat" onClick={() => recordCommunityIntent("family")}>
              参与共创 <ArrowRightOutlined />
            </a>
          </div>
        </section>

        <section className="site-section wechat-section" id="wechat">
          <div className="wechat-card">
            <div className="wechat-copy">
              <span className="site-kicker">种子用户共创</span>
              <h2>这份家谱，会先从真实家庭里长出来</h2>
              <p>
                关注公众号“塔塔爸爸”，告诉我你家现在有哪些资料、最想先记录谁。产品会在真实使用中继续完善。
              </p>
              <button type="button" onClick={() => beginCreate("final-cta")}>
                {authenticated ? "继续整理我的家谱" : "免费创建我的家谱"}
                <ArrowRightOutlined />
              </button>
              <div className="wechat-keywords">
                <span>
                  回复 <strong>家谱</strong>
                  <small>加入家谱种子用户共创</small>
                </span>
                <span>
                  回复 <strong>开源</strong>
                  <small>获取部署指引与交流支持</small>
                </span>
              </div>
            </div>
            <div className="wechat-qr">
              <img
                src="/assets/tatababa-wechat-qr.jpg"
                alt="塔塔爸爸微信公众号二维码"
                width="430"
                height="430"
              />
              <strong>微信扫码关注“塔塔爸爸”</strong>
              <small>无法扫码时，可在微信搜索公众号名称</small>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <Link className="site-brand" to="/">
            <span className="site-brand-seal" aria-hidden="true">
              {BRAND.seal}
            </span>
            <span>
              <strong>{BRAND.name}</strong>
              <small>让家人的名字和故事，留在谱里</small>
            </span>
          </Link>
          <p>公益、私密、可带走的数字家庭档案。</p>
        </div>
        <nav aria-label="页脚导航">
          <Link to="/app/demo" onClick={() => openDemo("footer")}>
            穆氏示范家谱
          </Link>
          <Link to="/login">登录</Link>
          <a
            href="https://github.com/yipengmu/family_tree"
            target="_blank"
            rel="noreferrer"
            onClick={() => recordCommunityIntent("open-source")}
          >
            GitHub 源码
          </a>
          <a href="#trust">隐私与数据原则</a>
        </nav>
        <small>© 2026 谱里 · tree.tatababa.top</small>
      </footer>

      <button
        className="site-mobile-create"
        type="button"
        onClick={() => beginCreate("mobile-sticky")}
      >
        {authenticated ? "进入我的家谱" : "免费创建我的家谱"}
      </button>

      {createPanelOpen && (
        <div
          className="create-panel-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreatePanelOpen(false);
          }}
        >
          <section
            className="create-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-panel-title"
          >
            <button
              className="create-panel-close"
              type="button"
              aria-label="关闭"
              onClick={() => setCreatePanelOpen(false)}
              autoFocus
            >
              <CloseOutlined />
            </button>
            <span className="site-kicker">更适合在手机上开始</span>
            <h2 id="create-panel-title">扫码，把第一位家人写进谱里</h2>
            <p>
              用手机浏览器或微信扫码打开创建页面，之后可以在任意设备继续整理。
            </p>
            <div className="create-product-qr">
              <QRCode
                value={MOBILE_CREATE_URL}
                size={190}
                color="#173f38"
                bgColor="#fffdf7"
                bordered={false}
              />
            </div>
            <Link
              className="site-button site-button-primary"
              to={createPath}
              state={createState}
              onClick={() => {
                trackEvent("app_create_open", {
                  source: "desktop-panel",
                  device: "desktop",
                });
                setCreatePanelOpen(false);
              }}
            >
              在电脑上继续
              <ArrowRightOutlined />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
};

export default MarketingHomePage;
