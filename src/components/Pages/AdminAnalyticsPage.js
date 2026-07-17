import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Spin, Tag } from "antd";
import { ReloadOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import BRAND from "../../constants/brand.js";
import "./AdminAnalyticsPage.css";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateInput = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const shiftDate = (dateText, offset) => {
  const date = new Date(`${dateText}T00:00:00+08:00`);
  return toDateInput(new Date(date.getTime() + offset * DAY_MS));
};

const formatNumber = (value) =>
  new Intl.NumberFormat("zh-CN").format(Number(value || 0));

const formatPercent = (value) =>
  value === null || value === undefined ? "—" : `${value}%`;

const eventLabels = {
  homepage_view: "官网访问",
  app_create_open: "开始创建",
  registration_complete: "注册成功",
  family_created_success: "首次保存家谱",
  first_person_saved: "首次保存家谱（旧事件）",
  first_relationship_created: "建立首个关系",
  fourth_generation_connected: "连接第四代",
};

const EmptyState = ({ children }) => (
  <div className="admin-analytics-empty">{children}</div>
);

function MetricCard({ label, value, hint, tone = "warm" }) {
  return (
    <article className={`admin-metric-card admin-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const today = useMemo(() => toDateInput(new Date()), []);
  const [range, setRange] = useState({ from: shiftDate(today, -29), to: today });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true, state: { returnTo: "/admin/analytics" } });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(range).toString();
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";
      const response = await fetch(`${apiBaseUrl}/api/admin/analytics?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true, state: { returnTo: "/admin/analytics" } });
          return;
        }
        throw new Error(payload.error || "无法读取管理员报表");
      }
      setReport(payload);
    } catch (loadError) {
      setError(loadError.message || "无法读取管理员报表");
    } finally {
      setLoading(false);
    }
  }, [navigate, range]);

  useEffect(() => {
    document.title = `数据分析后台｜${BRAND.name}`;
    loadReport();
  }, [loadReport]);

  const database = report?.database || {};
  const posthog = report?.posthog || {};
  const dailyActiveUsers = posthog.dailyActiveUsers || [];
  const lastSevenDays = dailyActiveUsers.slice(-7);
  const averageDau = lastSevenDays.length
    ? Math.round(lastSevenDays.reduce((sum, day) => sum + day.users, 0) / lastSevenDays.length)
    : null;
  const maxDau = Math.max(...dailyActiveUsers.map((day) => day.users), 1);
  const funnel = posthog.funnel || [];
  const maxFunnelUsers = Math.max(...funnel.map((step) => step.users), 1);

  return (
    <main className="admin-analytics-page">
      <header className="admin-analytics-header">
        <div>
          <div className="admin-analytics-kicker"><LockOutlined /> 管理员后台</div>
          <h1>产品活跃与建谱转化</h1>
          <p>看清用户从注册、首次建谱到持续补录的真实路径。</p>
        </div>
        <div className="admin-analytics-header-actions">
          <span className="admin-analytics-private">仅管理员可见</span>
          <Button icon={<ReloadOutlined />} onClick={loadReport} loading={loading}>刷新</Button>
          <Button onClick={() => navigate("/app")}>返回产品</Button>
        </div>
      </header>

      <section className="admin-analytics-toolbar" aria-label="报表筛选">
        <div className="admin-range-presets">
          {[7, 30, 90].map((days) => {
            const selected = range.from === shiftDate(today, -(days - 1)) && range.to === today;
            return (
              <button
                className={selected ? "is-selected" : ""}
                key={days}
                type="button"
                onClick={() => setRange({ from: shiftDate(today, -(days - 1)), to: today })}
              >
                近 {days} 天
              </button>
            );
          })}
        </div>
        <label>开始日期 <input type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>结束日期 <input type="date" value={range.to} min={range.from} max={today} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label>
        <span className="admin-range-timezone">时间口径：北京时间</span>
      </section>

      {error ? <Alert type="error" showIcon message={error} className="admin-analytics-alert" /> : null}
      {loading && !report ? (
        <div className="admin-analytics-loading"><Spin size="large" /><span>正在汇总数据…</span></div>
      ) : report ? (
        <>
          <section className="admin-metric-grid">
            <MetricCard label="注册账号" value={formatNumber(database.registeredUsers)} hint={`区间新增 ${formatNumber(database.newRegistrations)}`} />
            <MetricCard label="已激活建谱用户" value={formatNumber(database.activatedCreators)} hint={`区间新增 ${formatNumber(database.newActivations)}`} tone="green" />
            <MetricCard label="当前有效家谱" value={formatNumber(database.activePersonalSpaces)} hint="排除穆氏示范/迁移家谱" tone="blue" />
            <MetricCard label="当前节点数" value={formatNumber(database.currentNodeCount)} hint={`平均每位创建者 ${database.averageNodesPerCreator || 0} 个`} tone="gold" />
            <MetricCard label="近 7 日平均 DAU" value={posthog.configured && !posthog.error && averageDau !== null ? formatNumber(averageDau) : "—"} hint="按核心业务事件去重" tone="purple" />
          </section>

          <section className="admin-analytics-grid admin-analytics-grid-wide">
            <article className="admin-panel admin-panel-large">
              <div className="admin-panel-heading"><div><span className="admin-panel-eyebrow">DAU 趋势</span><h2>每日业务活跃用户</h2></div><Tag color={posthog.configured && !posthog.error ? "green" : "default"}>{posthog.configured && !posthog.error ? "PostHog 已连接" : "等待埋点配置"}</Tag></div>
              {posthog.error ? <Alert type="warning" showIcon message="PostHog 暂时不可用" description={posthog.error} /> : posthog.configured ? <div className="admin-dau-chart">{dailyActiveUsers.map((day) => <div className="admin-dau-column" key={day.date} title={`${day.date}：${day.users} 人`}><div className="admin-dau-bar" style={{ height: `${Math.max((day.users / maxDau) * 100, day.users ? 8 : 2)}%` }} /><span>{day.date.slice(5)}</span></div>)}</div> : <EmptyState>配置服务端 PostHog 查询密钥后，这里会显示 DAU、漏斗和留存。</EmptyState>}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><span className="admin-panel-eyebrow">当前结构</span><h2>家谱规模分布</h2></div></div>
              <div className="admin-bucket-list">{(database.nodesByBucket || []).map((bucket) => <div className="admin-bucket-row" key={bucket.key}><div><span>{bucket.label}</span><small>{bucket.spaces} 个家谱</small></div><strong>{formatNumber(bucket.nodes)}</strong></div>)}</div>
            </article>
          </section>

          <section className="admin-analytics-grid admin-analytics-grid-wide">
            <article className="admin-panel admin-panel-large">
              <div className="admin-panel-heading"><div><span className="admin-panel-eyebrow">核心转换路径</span><h2>从访问到第四代连接</h2></div><span className="admin-panel-note">人数为去重用户</span></div>
              {posthog.error ? <EmptyState>PostHog 查询失败，无法计算漏斗。</EmptyState> : posthog.configured ? <div className="admin-funnel-list">{funnel.map((step) => <div className="admin-funnel-row" key={step.event}><div className="admin-funnel-label"><span>{step.order}</span><strong>{eventLabels[step.event] || step.event}</strong></div><div className="admin-funnel-track"><i style={{ width: `${Math.max((step.users / maxFunnelUsers) * 100, step.users ? 3 : 0)}%` }} /></div><b>{formatNumber(step.users)}</b><small>{step.order === 1 ? "基准" : `${step.rate}%`}</small></div>)}</div> : <EmptyState>配置 PostHog 后显示真实转化漏斗。</EmptyState>}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><span className="admin-panel-eyebrow">数据库事实</span><h2>区间新增</h2></div></div>
              <div className="admin-fact-list"><div><span>新注册账号</span><strong>{formatNumber(database.newRegistrations)}</strong></div><div><span>首次成功建谱</span><strong>{formatNumber(database.newActivations)}</strong></div><div><span>当前节点总量</span><strong>{formatNumber(database.currentNodeCount)}</strong></div></div>
            </article>
          </section>

          <section className="admin-panel admin-retention-panel">
            <div className="admin-panel-heading"><div><span className="admin-panel-eyebrow">留存 Cohort</span><h2>首次建谱后的回访</h2></div><span className="admin-panel-note">D1 / D7 / D30 仅统计已到期 cohort</span></div>
            {posthog.error || !posthog.configured ? <EmptyState>配置 PostHog 后显示基于首次成功建谱的留存。</EmptyState> : posthog.retention?.length ? <div className="admin-retention-table-wrap"><table className="admin-retention-table"><thead><tr><th>建谱日期</th><th>用户数</th><th>D1</th><th>D7</th><th>D30</th></tr></thead><tbody>{posthog.retention.map((cohort) => <tr key={cohort.cohortDate}><td>{cohort.cohortDate}</td><td>{formatNumber(cohort.users)}</td><td>{formatPercent(cohort.d1)}</td><td>{formatPercent(cohort.d7)}</td><td>{formatPercent(cohort.d30)}</td></tr>)}</tbody></table></div> : <EmptyState>当前区间还没有可计算的建谱 cohort。</EmptyState>}
          </section>

          <details className="admin-definitions">
            <summary>查看数据口径与排除规则</summary>
            <dl><div><dt>激活建谱</dt><dd>{report.definitions.activation}</dd></div><div><dt>当前节点</dt><dd>{report.definitions.currentNodes}</dd></div><div><dt>DAU</dt><dd>{report.definitions.activeUser}</dd></div><div><dt>留存</dt><dd>{report.definitions.retention}</dd></div><div><dt>排除租户</dt><dd>{report.definitions.excludedTenantIds.join("、")}</dd></div></dl>
          </details>
          <p className="admin-analytics-footnote">数据生成于 {new Date(report.generatedAt).toLocaleString("zh-CN")} · 当前节点是存量快照，不代表历史累计新增节点。</p>
        </>
      ) : null}
    </main>
  );
}

export default AdminAnalyticsPage;
