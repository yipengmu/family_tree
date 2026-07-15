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
import { Link, useNavigate } from "react-router-dom";
import BRAND from "../../constants/brand.js";
import { getAppPath, getCreatePath } from "../../utils/appRoutes.js";
import { trackEvent } from "../../utils/analytics.js";
import "./MarketingHomePage.css";

const memoryScenes = [
  {
    index: "01",
    title: "照片还在，名字却没人知道",
    copy: "搬过几次家，照片里的人只剩一句“应该是太爷爷那一辈”。",
  },
  {
    index: "02",
    title: "记得名字，不知道他怎样生活",
    copy: "职业、手艺和走过的地方，常常没有被记下来。",
  },
  {
    index: "03",
    title: "故事散在不同家人的记忆里",
    copy: "每个人知道一部分，却总想着以后再整理。",
  },
];

const capabilities = [
  {
    label: "看家谱",
    title: "从关系里看懂一家人",
    copy: "浏览世系、搜索人物，在名字之间看清代际关系。",
  },
  {
    label: "续家谱",
    title: "知道多少，就先记下多少",
    copy: "从一位家人开始，再补充关系、照片和经历。",
  },
  {
    label: "管家谱",
    title: "让家庭资料长期留得住",
    copy: "默认私密保存，并为导出、备份与迁移留出能力。",
  },
];

const trustItems = [
  {
    icon: <LockOutlined />,
    title: "默认私密",
    copy: "只有获得授权的家人才能访问家庭空间。",
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: "敏感信息受保护",
    copy: "在世人物、未成年人和联系方式默认不公开。",
  },
  {
    icon: <CloudDownloadOutlined />,
    title: "数据可以带走",
    copy: "支持导出、备份和迁移，不被单一平台锁住。",
  },
  {
    icon: <GithubOutlined />,
    title: "核心代码开源",
    copy: "支持自行部署，回复“开源”可获取指引。",
  },
];

const pageSections = [
  { id: "overview", label: "首页" },
  { id: "why", label: "为什么记录" },
  { id: "start", label: "如何开始" },
  { id: "product", label: "产品与信任" },
  { id: "story", label: "故事与共创" },
];

const MarketingHomePage = () => {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(pageSections[0].id);
  const authenticated = Boolean(localStorage.getItem("token"));
  const createPath = getCreatePath(authenticated);
  const createState = useMemo(
    () => ({ from: "/", returnTo: "/app/create" }),
    [],
  );
  const appHomeState = useMemo(() => ({ from: "/" }), []);

  useEffect(() => {
    document.title = `${BRAND.name}｜${BRAND.tagline}`;
    trackEvent("homepage_view");
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      const readingLine = Math.min(window.innerHeight * 0.34, 320);
      let currentSection = pageSections[0].id;

      pageSections.forEach(({ id }) => {
        const section = document.getElementById(id);

        if (section && section.getBoundingClientRect().top <= readingLine) {
          currentSection = id;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const jumpToSection = (event, id) => {
    event.preventDefault();
    const section = document.getElementById(id);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    section?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    setActiveSection(id);
    setNavOpen(false);
  };

  const beginCreate = (source) => {
    const device = window.matchMedia("(max-width: 768px)").matches
      ? "mobile"
      : "desktop";

    trackEvent("hero_create_click", { source });
    trackEvent("app_create_open", { source, device });
    setNavOpen(false);
    navigate(createPath, { state: createState });
  };

  const openMyFamily = (source) => {
    const device = window.matchMedia("(max-width: 768px)").matches
      ? "mobile"
      : "desktop";

    trackEvent("app_create_open", { source, device });
    setNavOpen(false);
    navigate(getAppPath("tree"), { state: appHomeState });
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
            <Link
              className="site-header-login"
              to="/login"
              state={{ from: "/", returnTo: "/app" }}
            >
              登录
            </Link>
            <button
              className="site-header-create"
              type="button"
              onClick={() => beginCreate("header")}
            >
              {authenticated ? "进入我的家谱" : "免费创建"}
              <ArrowRightOutlined />
            </button>
          </div>
        </div>
      </header>

      <aside className="site-page-progress" aria-label="页面阅读进度">
        <span className="site-progress-title">页面导航</span>
        <nav>
          {pageSections.map((section, index) => {
            const isActive = activeSection === section.id;

            return (
              <a
                className={isActive ? "is-active" : ""}
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => jumpToSection(event, section.id)}
                key={section.id}
              >
                <span className="site-progress-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="site-progress-copy">{section.label}</span>
              </a>
            );
          })}
        </nav>
        <small>
          {String(
            pageSections.findIndex(({ id }) => id === activeSection) + 1,
          ).padStart(2, "0")}
          /{String(pageSections.length).padStart(2, "0")}
        </small>
      </aside>

      <main id="main-content">
        <section
          className="site-hero"
          id="overview"
          aria-labelledby="hero-title"
        >
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
              它只是随着一次次“以后再问”，慢慢无人知晓。好在现在开始，还来得及。
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
              <p>从本人开始，先连接一位家人，再慢慢补充身边四代。</p>
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
              <p>把纸谱、Excel、照片和长辈记忆逐步数字化、检索和补充。</p>
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
              <p>默认私密、敏感信息受保护；AI 只整理草稿，不替家人确认事实。</p>
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
                询问父亲后，我才知道曾祖父做过兽医、会木工，奶奶年轻时还教过小学。普通生活，也值得留给下一代。
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
              <p>把照片、经历和家人讲述，整理成可逐年补充的记录。</p>
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
                关注“塔塔爸爸”，告诉我们你最想先记录谁，一起把产品做得更适合真实家庭。
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
        onClick={() =>
          authenticated
            ? openMyFamily("mobile-sticky")
            : beginCreate("mobile-sticky")
        }
      >
        {authenticated ? "进入我的家谱" : "免费创建我的家谱"}
      </button>
    </div>
  );
};

export default MarketingHomePage;
