import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Spin, Tag } from "antd";
import {
  ClockCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
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

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "—";

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "< 1 分钟";
  if (minutes < 60) return `${minutes} 分钟`;
  if (minutes < 24 * 60) return `${(minutes / 60).toFixed(1)} 小时`;
  return `${(minutes / 1440).toFixed(1)} 天`;
};

const eventLabels = {
  homepage_view: "访问官网",
  app_create_open: "进入创建",
  registration_complete: "完成注册",
  family_created_success: "首次保存家谱",
  first_person_saved: "首次保存家谱（旧事件）",
  first_relationship_created: "建立首个关系",
  fourth_generation_connected: "连接第四代",
  family_save_failed: "保存家谱失败",
  ancestor_save_failed: "补录祖辈失败",
  story_save_failed: "保存故事失败",
};

const reasonLabels = {
  network: "网络或服务不可用",
  conflict: "版本冲突",
  validation: "填写内容未通过校验",
  unauthorized: "登录或权限失效",
  unknown: "其他未分类错误",
};

const stageLabels = {
  activation: "首次建谱",
  editing: "继续补录",
  paternal_guide: "父系引导",
  story: "人物故事",
  unknown: "未标记环节",
};

const deviceLabels = {
  mobile: "手机",
  desktop: "电脑",
  tablet: "平板",
  unknown: "未知终端",
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

function FamilyThumbnail({ generations = [] }) {
  const maxCount = Math.max(...generations.map((item) => item.count), 1);
  return (
    <div className="admin-family-thumbnail" aria-label="匿名家谱世代结构缩略图">
      {generations.length ? (
        generations.map((generation, index) => (
          <div className="admin-family-generation" key={generation.rank}>
            <div>
              {Array.from({ length: Math.min(generation.count, 5) }).map(
                (_, nodeIndex) => (
                  <i key={nodeIndex} />
                ),
              )}
            </div>
            {index < generations.length - 1 ? <span /> : null}
            <small style={{ opacity: 0.55 + generation.count / maxCount / 2 }}>
              {generation.rank} 代
            </small>
          </div>
        ))
      ) : (
        <span className="admin-family-thumbnail-empty">暂无结构</span>
      )}
    </div>
  );
}

function FamilySpaceCard({ space }) {
  return (
    <article className="admin-family-card">
      <FamilyThumbnail generations={space.generationPreview} />
      <div className="admin-family-card-body">
        <div className="admin-family-card-heading">
          <div>
            <span className="admin-space-id">{space.tenantId}</span>
            <h3>{space.title}</h3>
          </div>
          <Tag color={space.nodeCount >= 6 ? "green" : "gold"}>
            {space.nodeCount >= 6 ? "持续补录" : "初建阶段"}
          </Tag>
        </div>
        <div className="admin-creator-line">
          <UserOutlined />
          <strong>{space.creator?.displayName || "未识别创建者"}</strong>
          {space.creator?.maskedEmail ? (
            <span>{space.creator.maskedEmail}</span>
          ) : null}
        </div>
        <dl className="admin-family-details">
          <div>
            <dt>人物</dt>
            <dd>{space.nodeCount}</dd>
          </div>
          <div>
            <dt>世代</dt>
            <dd>{space.generationSpan}</dd>
          </div>
          <div>
            <dt>关系</dt>
            <dd>{space.relationshipCount}</dd>
          </div>
          <div>
            <dt>故事</dt>
            <dd>{space.storyCount}</dd>
          </div>
          <div>
            <dt>素材</dt>
            <dd>{space.mediaCount}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>{space.versionCount}</dd>
          </div>
        </dl>
        <div className="admin-family-dates">
          <span>创建 {formatDate(space.createdAt)}</span>
          <span>最近更新 {formatDate(space.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const today = useMemo(() => toDateInput(new Date()), []);
  const [range, setRange] = useState({
    from: shiftDate(today, -29),
    to: today,
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true, state: { returnTo: "/bi" } });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(range).toString();
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";
      const response = await fetch(
        `${apiBaseUrl}/api/admin/analytics?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true, state: { returnTo: "/bi" } });
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
    document.title = `用户旅程分析｜${BRAND.name}`;
    loadReport();
  }, [loadReport]);

  const database = report?.database || {};
  const posthog = report?.posthog || {};
  const dailyActiveUsers = posthog.dailyActiveUsers || [];
  const lastSevenDays = dailyActiveUsers.slice(-7);
  const averageDau = lastSevenDays.length
    ? Math.round(
        lastSevenDays.reduce((sum, day) => sum + day.users, 0) /
          lastSevenDays.length,
      )
    : null;
  const maxDau = Math.max(...dailyActiveUsers.map((day) => day.users), 1);
  const funnel = posthog.funnel || [];
  const maxFunnelUsers = Math.max(...funnel.map((step) => step.users), 1);
  const slowestStep = funnel
    .slice(1)
    .filter((step) => step.medianMinutes !== null)
    .sort((a, b) => b.medianMinutes - a.medianMinutes)[0];
  const weakestStep = funnel
    .slice(1)
    .sort((a, b) => a.stepRate - b.stepRate)[0];
  const maxHourlyVisits = Math.max(
    ...(posthog.hourlyTraffic || []).map((hour) => hour.visits),
    1,
  );

  return (
    <main className="admin-analytics-page">
      <header className="admin-analytics-header">
        <div>
          <div className="admin-analytics-kicker">
            <LockOutlined /> 管理员后台 · 用户旅程 BI
          </div>
          <h1>看见用户卡在哪里</h1>
          <p>
            把每一份真实家谱，与创建、流失、访问和回访行为放在同一条分析链路里。
          </p>
        </div>
        <div className="admin-analytics-header-actions">
          <span className="admin-analytics-private">
            最小化展示账号与家谱数据
          </span>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadReport}
            loading={loading}
          >
            刷新
          </Button>
          <Button onClick={() => navigate("/app")}>返回产品</Button>
        </div>
      </header>

      <section className="admin-analytics-toolbar" aria-label="报表筛选">
        <div className="admin-range-presets">
          {[7, 30, 90].map((days) => {
            const selected =
              range.from === shiftDate(today, -(days - 1)) &&
              range.to === today;
            return (
              <button
                className={selected ? "is-selected" : ""}
                key={days}
                type="button"
                onClick={() =>
                  setRange({ from: shiftDate(today, -(days - 1)), to: today })
                }
              >
                近 {days} 天
              </button>
            );
          })}
        </div>
        <label>
          开始日期{" "}
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(event) =>
              setRange((current) => ({ ...current, from: event.target.value }))
            }
          />
        </label>
        <label>
          结束日期{" "}
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={today}
            onChange={(event) =>
              setRange((current) => ({ ...current, to: event.target.value }))
            }
          />
        </label>
        <span className="admin-range-timezone">北京时间</span>
      </section>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          className="admin-analytics-alert"
        />
      ) : null}
      {loading && !report ? (
        <div className="admin-analytics-loading">
          <Spin size="large" />
          <span>正在汇总用户旅程…</span>
        </div>
      ) : report ? (
        <>
          <section className="admin-metric-grid">
            <MetricCard
              label="注册账号"
              value={formatNumber(database.registeredUsers)}
              hint={`区间新增 ${formatNumber(database.newRegistrations)}`}
            />
            <MetricCard
              label="已激活建谱用户"
              value={formatNumber(database.activatedCreators)}
              hint={`区间新增 ${formatNumber(database.newActivations)}`}
              tone="green"
            />
            <MetricCard
              label="当前有效家谱"
              value={formatNumber(database.activePersonalSpaces)}
              hint="排除示范与迁移空间"
              tone="blue"
            />
            <MetricCard
              label="平均家谱人物"
              value={formatNumber(database.averageNodesPerCreator)}
              hint={`当前共 ${formatNumber(database.currentNodeCount)} 人物`}
              tone="gold"
            />
            <MetricCard
              label="近 7 日平均 DAU"
              value={
                posthog.configured && !posthog.error && averageDau !== null
                  ? formatNumber(averageDau)
                  : "—"
              }
              hint="核心业务事件去重"
              tone="purple"
            />
          </section>

          <section className="admin-section-heading">
            <div>
              <span>产品明细</span>
              <h2>谁在创建怎样的家谱</h2>
            </div>
            <p>
              结构缩略图不展示人物姓名和照片；账号仅保留管理员识别所需信息。
            </p>
          </section>
          <section className="admin-family-grid">
            {(database.familySpaces || []).length ? (
              database.familySpaces.map((space) => (
                <FamilySpaceCard key={space.tenantId} space={space} />
              ))
            ) : (
              <EmptyState>当前还没有已激活的个人家谱。</EmptyState>
            )}
          </section>

          <section className="admin-section-heading">
            <div>
              <span>漏斗与流失</span>
              <h2>哪里慢，哪里掉，哪里最难</h2>
            </div>
            <Tag
              color={posthog.configured && !posthog.error ? "green" : "default"}
            >
              {posthog.configured && !posthog.error
                ? "行为数据已连接"
                : "等待行为数据"}
            </Tag>
          </section>
          {posthog.configured && !posthog.error ? (
            <div className="admin-insight-strip">
              <div>
                <span>最低环节转化</span>
                <strong>
                  {weakestStep
                    ? `${eventLabels[weakestStep.event]} · ${formatPercent(weakestStep.stepRate)}`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>耗时最长环节</span>
                <strong>
                  {slowestStep
                    ? `${eventLabels[slowestStep.event]} · ${formatDuration(slowestStep.medianMinutes)}`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>快速流失口径</span>
                <strong>失败后 10 分钟无核心行为</strong>
              </div>
            </div>
          ) : null}
          <section className="admin-analytics-grid admin-analytics-grid-wide">
            <article className="admin-panel admin-panel-large">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-panel-eyebrow">顺序漏斗</span>
                  <h2>从访问到连接第四代</h2>
                </div>
                <span className="admin-panel-note">同一用户严格按顺序完成</span>
              </div>
              {posthog.error ? (
                <Alert
                  type="warning"
                  showIcon
                  message="行为分析暂时不可用"
                  description={posthog.error}
                />
              ) : posthog.configured ? (
                <div className="admin-funnel-list">
                  {funnel.map((step) => (
                    <div className="admin-funnel-row" key={step.event}>
                      <div className="admin-funnel-label">
                        <span>{step.order}</span>
                        <strong>{eventLabels[step.event] || step.event}</strong>
                      </div>
                      <div className="admin-funnel-track">
                        <i
                          style={{
                            width: `${Math.max((step.users / maxFunnelUsers) * 100, step.users ? 3 : 0)}%`,
                          }}
                        />
                      </div>
                      <b>{formatNumber(step.users)}</b>
                      <small>
                        {step.order === 1
                          ? "基准"
                          : `${formatPercent(step.stepRate)} · 流失 ${step.lostUsers}`}
                      </small>
                      <em>
                        <ClockCircleOutlined />{" "}
                        {step.order === 1
                          ? "—"
                          : formatDuration(step.medianMinutes)}
                      </em>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>
                  配置服务端 PostHog 查询后显示严格顺序漏斗、环节耗时与流失。
                </EmptyState>
              )}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-panel-eyebrow">困难信号</span>
                  <h2>失败后快速流失</h2>
                </div>
                <span className="admin-panel-note">按用户去重</span>
              </div>
              {posthog.configured && !posthog.error ? (
                (posthog.friction || []).length ? (
                  <div className="admin-friction-list">
                    {posthog.friction.map((item) => (
                      <div key={`${item.event}-${item.stage}-${item.reason}`}>
                        <strong>{eventLabels[item.event] || item.event}</strong>
                        <span>
                          {stageLabels[item.stage] || item.stage} ·{" "}
                          {reasonLabels[item.reason] || item.reason}
                        </span>
                        <b>
                          {item.quickLossUsers} 人{" "}
                          <small>快速流失 {item.quickLossRate}%</small>
                        </b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>
                    区间内暂无失败事件。新失败埋点产生数据后会在这里归因。
                  </EmptyState>
                )
              ) : (
                <EmptyState>连接行为数据后显示真实困难与快速流失。</EmptyState>
              )}
            </article>
          </section>

          <section className="admin-section-heading">
            <div>
              <span>访问与留存</span>
              <h2>用户何时来，用什么来，还会不会回来</h2>
            </div>
          </section>
          <section className="admin-analytics-grid admin-analytics-grid-wide">
            <article className="admin-panel admin-panel-large">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-panel-eyebrow">活跃趋势</span>
                  <h2>每日业务活跃用户</h2>
                </div>
              </div>
              {posthog.configured && !posthog.error ? (
                <div className="admin-dau-chart">
                  {dailyActiveUsers.map((day) => (
                    <div
                      className="admin-dau-column"
                      key={day.date}
                      title={`${day.date}：${day.users} 人`}
                    >
                      <div
                        className="admin-dau-bar"
                        style={{
                          height: `${Math.max((day.users / maxDau) * 100, day.users ? 8 : 2)}%`,
                        }}
                      />
                      <span>{day.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>连接行为数据后显示每日活跃趋势。</EmptyState>
              )}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-panel-eyebrow">终端分布</span>
                  <h2>活跃用户最后使用终端</h2>
                </div>
              </div>
              {posthog.configured && !posthog.error ? (
                <div className="admin-device-list">
                  {(posthog.devices || []).map((item) => (
                    <div key={item.device}>
                      <span>{deviceLabels[item.device] || item.device}</span>
                      <div>
                        <i style={{ width: `${item.rate}%` }} />
                      </div>
                      <strong>
                        {item.users} · {item.rate}%
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>连接行为数据后显示终端分布。</EmptyState>
              )}
            </article>
          </section>

          <section className="admin-panel admin-hourly-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-eyebrow">进入时段</span>
                <h2>一天 24 小时的访问分布</h2>
              </div>
              <span className="admin-panel-note">
                官网访问、打开产品与进入创建
              </span>
            </div>
            {posthog.configured && !posthog.error ? (
              <div className="admin-hourly-chart">
                {(posthog.hourlyTraffic || []).map((item) => (
                  <div
                    key={item.hour}
                    title={`${item.hour}:00 · ${item.visits} 次进入 · ${item.users} 人`}
                  >
                    <i
                      style={{
                        height: `${Math.max((item.visits / maxHourlyVisits) * 100, item.visits ? 8 : 2)}%`,
                      }}
                    />
                    <span>
                      {item.hour % 3 === 0
                        ? `${String(item.hour).padStart(2, "0")}:00`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>连接行为数据后显示访问时段。</EmptyState>
            )}
          </section>

          <section className="admin-panel admin-retention-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-eyebrow">留存 Cohort</span>
                <h2>首次建谱后的回访</h2>
              </div>
              <span className="admin-panel-note">仅统计已到期 cohort</span>
            </div>
            {posthog.configured && !posthog.error ? (
              <>
                <div className="admin-retention-summary">
                  <MetricCard
                    label="平均 D1 留存"
                    value={formatPercent(posthog.retentionAverage?.d1)}
                    hint="建谱次日再次活跃"
                    tone="green"
                  />
                  <MetricCard
                    label="平均 D7 留存"
                    value={formatPercent(posthog.retentionAverage?.d7)}
                    hint="建谱第 7 日再次活跃"
                    tone="blue"
                  />
                  <MetricCard
                    label="平均 D30 留存"
                    value={formatPercent(posthog.retentionAverage?.d30)}
                    hint="建谱第 30 日再次活跃"
                    tone="purple"
                  />
                </div>
                {posthog.retention?.length ? (
                  <div className="admin-retention-table-wrap">
                    <table className="admin-retention-table">
                      <thead>
                        <tr>
                          <th>首次建谱日期</th>
                          <th>用户数</th>
                          <th>D1</th>
                          <th>D7</th>
                          <th>D30</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posthog.retention.map((cohort) => (
                          <tr key={cohort.cohortDate}>
                            <td>{cohort.cohortDate}</td>
                            <td>{formatNumber(cohort.users)}</td>
                            <td>{formatPercent(cohort.d1)}</td>
                            <td>{formatPercent(cohort.d7)}</td>
                            <td>{formatPercent(cohort.d30)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>当前区间还没有可计算的建谱 cohort。</EmptyState>
                )}
              </>
            ) : (
              <EmptyState>
                连接行为数据后显示平均留存与 cohort 明细。
              </EmptyState>
            )}
          </section>

          <details className="admin-definitions">
            <summary>查看数据口径、隐私与排除规则</summary>
            <dl>
              <div>
                <dt>激活建谱</dt>
                <dd>{report.definitions.activation}</dd>
              </div>
              <div>
                <dt>家谱明细</dt>
                <dd>{report.definitions.familySpaces}</dd>
              </div>
              <div>
                <dt>顺序漏斗</dt>
                <dd>{report.definitions.funnel}</dd>
              </div>
              <div>
                <dt>快速流失</dt>
                <dd>{report.definitions.quickLoss}</dd>
              </div>
              <div>
                <dt>留存</dt>
                <dd>{report.definitions.retention}</dd>
              </div>
              <div>
                <dt>排除租户</dt>
                <dd>{report.definitions.excludedTenantIds.join("、")}</dd>
              </div>
            </dl>
          </details>
          <p className="admin-analytics-footnote">
            数据生成于 {new Date(report.generatedAt).toLocaleString("zh-CN")} ·
            当前节点是存量快照，不代表历史累计新增节点。
          </p>
        </>
      ) : null}
    </main>
  );
}

export default AdminAnalyticsPage;
