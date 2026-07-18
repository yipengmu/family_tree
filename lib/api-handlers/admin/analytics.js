import prisma from "../../prisma.js";
import {
  authenticateRequest,
  requireAdmin,
  sendAuthError,
} from "../../auth.js";

const TIME_ZONE = "Asia/Shanghai";
const DEFAULT_RANGE_DAYS = 30;
const ACTIVE_EVENTS = [
  "app_view",
  "family_tree_view",
  "creator_view",
  "family_created_success",
  "first_person_saved",
  "first_relationship_created",
  "third_generation_connected",
  "fourth_generation_connected",
  "person_created_success",
  "person_updated_success",
  "story_created_success",
  "story_published_success",
];
const ACTIVATION_EVENTS = ["family_created_success", "first_person_saved"];
const ENTRY_EVENTS = ["homepage_view", "app_view", "app_create_open"];
const FRICTION_EVENTS = [
  "family_save_failed",
  "ancestor_save_failed",
  "story_save_failed",
];
const RECOVERY_EVENTS = [
  "family_created_success",
  "first_person_saved",
  "first_relationship_created",
  "third_generation_connected",
  "fourth_generation_connected",
  "person_created_success",
  "story_created_success",
];
const FUNNEL_STEPS = [
  { key: "homepage_view", events: ["homepage_view"] },
  { key: "app_create_open", events: ["app_create_open"] },
  { key: "registration_complete", events: ["registration_complete"] },
  {
    key: "family_created_success",
    events: ["family_created_success", "first_person_saved"],
  },
  { key: "first_relationship_created", events: ["first_relationship_created"] },
  {
    key: "fourth_generation_connected",
    events: ["fourth_generation_connected"],
  },
];

const asDate = (value) => {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const parseDate = (dateText) => {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const shiftDate = (dateText, offset) => {
  const date = parseDate(dateText);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDate(date);
};

const getTodayInShanghai = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getRange = (req) => {
  const to = asDate(req.query?.to) || getTodayInShanghai();
  const requestedFrom = asDate(req.query?.from);
  const from = requestedFrom || shiftDate(to, -(DEFAULT_RANGE_DAYS - 1));
  if (parseDate(from) > parseDate(to)) {
    return { from: shiftDate(to, -(DEFAULT_RANGE_DAYS - 1)), to };
  }
  return { from, to };
};

const getUtcBoundary = (dateText) => `${dateText}T00:00:00+08:00`;

const quoteHogql = (value) => `'${String(value).replaceAll("'", "\\'")}'`;

const parseQueryRows = (payload) => {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  if (!columns.length) return rows;
  return rows.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]])),
  );
};

async function queryPostHog(query) {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  const configuredHost =
    process.env.POSTHOG_API_HOST ||
    process.env.POSTHOG_HOST ||
    "https://eu.posthog.com";
  const host = configuredHost
    .replace(/\/$/, "")
    .replace("eu.i.posthog.com", "eu.posthog.com")
    .replace("us.i.posthog.com", "us.posthog.com");
  const response = await fetch(
    `${host}/api/projects/${encodeURIComponent(projectId)}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
        refresh: "blocking",
      }),
    },
  );

  if (!response.ok) throw new Error(`PostHog 查询失败（${response.status}）`);
  const payload = await response.json();
  if (payload?.query_status?.error) {
    throw new Error(payload.query_status.error_message || "PostHog 查询失败");
  }
  return parseQueryRows(payload);
}

const toNumber = (value) => Number(value || 0);

const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return round(value, value >= 60 ? 0 : 1);
};

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!local || !domain) return "";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, Math.min(5, local.length - visible.length)))}@${domain}`;
};

const getExcludedTenantIds = () =>
  (process.env.ANALYTICS_EXCLUDED_TENANT_IDS || "default,user_1")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const emptyByDay = (from, to) => {
  const days = [];
  for (
    let cursor = parseDate(from);
    cursor <= parseDate(to);
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    days.push(formatDate(cursor));
  }
  return days;
};

const formatShanghaiDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

const countByDay = (dates, records) => {
  const counts = Object.fromEntries(dates.map((date) => [date, 0]));
  records.forEach((record) => {
    const date = formatShanghaiDate(record);
    if (date in counts) counts[date] += 1;
  });
  return dates.map((date) => ({ date, count: counts[date] }));
};

async function getDatabaseMetrics(range) {
  const excludedTenantIds = getExcludedTenantIds();
  const start = new Date(getUtcBoundary(range.from));
  const end = new Date(getUtcBoundary(shiftDate(range.to, 1)));
  const [registeredUsers, usersInRange, tenants] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      where: { created_at: { gte: start, lt: end } },
      select: { created_at: true },
    }),
    prisma.tenant.findMany({
      where: {
        status: "active",
        AND: [
          { id: { notIn: excludedTenantIds } },
          { id: { startsWith: "user_" } },
        ],
        memberships: { some: { status: "ACTIVE", role: "OWNER" } },
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        memberships: {
          where: { status: "ACTIVE", role: "OWNER" },
          select: {
            user_id: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                created_at: true,
                last_login_at: true,
              },
            },
          },
        },
        familyData: {
          select: {
            g_rank: true,
            g_father_id: true,
            g_mother_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        dataVersions: {
          orderBy: { created_at: "asc" },
          take: 1,
          select: { created_at: true },
        },
        _count: {
          select: {
            memberships: true,
            memories: true,
            mediaAssets: true,
            events: true,
            dataVersions: true,
          },
        },
      },
    }),
  ]);

  const days = emptyByDay(range.from, range.to);
  const activations = tenants
    .filter((tenant) => tenant.familyData.length > 0)
    .map((tenant) => ({
      tenant,
      activatedAt:
        tenant.dataVersions[0]?.created_at || tenant.familyData[0]?.created_at,
    }))
    .filter(({ activatedAt }) => activatedAt);
  const owners = new Set(
    activations.flatMap(({ tenant }) =>
      tenant.memberships.map(({ user_id }) => user_id),
    ),
  );
  const currentNodeCount = tenants.reduce(
    (sum, tenant) => sum + tenant.familyData.length,
    0,
  );
  const bucketDefinitions = [
    { key: "1", label: "1 个节点", matches: (count) => count === 1 },
    {
      key: "2-5",
      label: "2–5 个节点",
      matches: (count) => count >= 2 && count <= 5,
    },
    {
      key: "6-20",
      label: "6–20 个节点",
      matches: (count) => count >= 6 && count <= 20,
    },
    { key: "21+", label: "21 个以上", matches: (count) => count >= 21 },
  ];
  const nodesByBucket = bucketDefinitions.map((bucket) => {
    const spaces = tenants.filter((tenant) =>
      bucket.matches(tenant.familyData.length),
    );
    return {
      key: bucket.key,
      label: bucket.label,
      spaces: spaces.length,
      nodes: spaces.reduce((sum, tenant) => sum + tenant.familyData.length, 0),
    };
  });
  const activationDates = activations.map(({ activatedAt }) => activatedAt);
  const familySpaces = tenants
    .filter((tenant) => tenant.familyData.length > 0)
    .map((tenant) => {
      const owner = tenant.memberships[0]?.user;
      const ranks = tenant.familyData
        .map((person) => Number(person.g_rank))
        .filter(Number.isFinite);
      const minRank = ranks.length ? Math.min(...ranks) : 0;
      const generations = [...new Set(ranks)].sort((a, b) => a - b);
      const generationPreview = generations.slice(0, 6).map((rank) => ({
        rank,
        count: ranks.filter((value) => value === rank).length,
      }));
      const relationshipCount = tenant.familyData.filter(
        (person) => person.g_father_id || person.g_mother_id,
      ).length;
      const lastContentUpdate = tenant.familyData.reduce(
        (latest, person) =>
          person.updated_at > latest ? person.updated_at : latest,
        tenant.updated_at,
      );
      return {
        tenantId: tenant.id,
        title: tenant.name || "未命名家谱",
        creator: owner
          ? {
              userId: owner.id,
              displayName: owner.username || `用户 ${owner.id}`,
              maskedEmail: maskEmail(owner.email),
              registeredAt: owner.created_at,
              lastLoginAt: owner.last_login_at,
            }
          : null,
        createdAt: tenant.created_at,
        activatedAt:
          tenant.dataVersions[0]?.created_at ||
          tenant.familyData[0]?.created_at,
        updatedAt: lastContentUpdate,
        nodeCount: tenant.familyData.length,
        generationCount: generations.length,
        generationSpan: generations.length
          ? `${minRank}–${Math.max(...generations)} 代`
          : "—",
        relationshipCount,
        memberCount: tenant._count.memberships,
        storyCount: tenant._count.events,
        draftCount: tenant._count.memories,
        mediaCount: tenant._count.mediaAssets,
        versionCount: tenant._count.dataVersions,
        generationPreview,
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return {
    registeredUsers,
    activePersonalSpaces: activations.length,
    registeredPersonalSpaces: tenants.length,
    activatedCreators: owners.size,
    currentNodeCount,
    averageNodesPerCreator: owners.size
      ? Number((currentNodeCount / owners.size).toFixed(1))
      : 0,
    newRegistrations: usersInRange.length,
    newActivations: activationDates.filter(
      (activatedAt) => activatedAt >= start && activatedAt < end,
    ).length,
    registrationsByDay: countByDay(
      days,
      usersInRange.map((user) => user.created_at),
    ),
    activationsByDay: countByDay(
      days,
      activationDates.filter(
        (activatedAt) => activatedAt >= start && activatedAt < end,
      ),
    ),
    nodesByBucket,
    familySpaces,
  };
}

const rowsToDateMap = (rows) =>
  Object.fromEntries(
    rows.map((row) => [
      String(row.date),
      { users: toNumber(row.users), events: toNumber(row.events) },
    ]),
  );

const calculateRetention = (rows, from, to) => {
  const activationByUser = new Map();
  const activeByDate = new Map();
  rows.forEach((row) => {
    const date = String(row.date);
    const user = String(row.actor_id || row.distinct_id);
    if (ACTIVATION_EVENTS.includes(row.event)) {
      const current = activationByUser.get(user);
      if (!current || date < current) activationByUser.set(user, date);
    }
    if (ACTIVE_EVENTS.includes(row.event)) {
      if (!activeByDate.has(date)) activeByDate.set(date, new Set());
      activeByDate.get(date).add(user);
    }
  });
  const cohorts = new Map();
  activationByUser.forEach((date, user) => {
    if (date < from || date > to) return;
    if (!cohorts.has(date)) cohorts.set(date, new Set());
    cohorts.get(date).add(user);
  });
  const allCohorts = [...cohorts.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cohortDate, users]) => {
      const cohortUsers = [...users];
      const getRetention = (offset) => {
        const target = shiftDate(cohortDate, offset);
        if (target > to) return null;
        const activeUsers = activeByDate.get(target) || new Set();
        return cohortUsers.length
          ? Math.round(
              (cohortUsers.filter((user) => activeUsers.has(user)).length /
                cohortUsers.length) *
                100,
            )
          : 0;
      };
      return {
        cohortDate,
        users: cohortUsers.length,
        d1: getRetention(1),
        d7: getRetention(7),
        d30: getRetention(30),
      };
    });
  const average = {};
  [1, 7, 30].forEach((day) => {
    const key = `d${day}`;
    const eligible = allCohorts.filter((cohort) => cohort[key] !== null);
    const users = eligible.reduce((sum, cohort) => sum + cohort.users, 0);
    average[key] = users
      ? round(
          eligible.reduce(
            (sum, cohort) => sum + cohort[key] * cohort.users,
            0,
          ) / users,
        )
      : null;
  });
  return { cohorts: allCohorts.slice(0, 14), average };
};

const normalizeDevice = (value) => {
  const device = String(value || "").toLowerCase();
  if (device.includes("mobile") || device.includes("phone")) return "mobile";
  if (device.includes("tablet") || device.includes("ipad")) return "tablet";
  if (device.includes("desktop") || device.includes("web")) return "desktop";
  return "unknown";
};

const buildBehaviorMetrics = (rows, range) => {
  const start = new Date(getUtcBoundary(range.from));
  const end = new Date(getUtcBoundary(shiftDate(range.to, 1)));
  const rangedRows = rows
    .map((row) => ({ ...row, time: new Date(row.timestamp) }))
    .filter((row) => row.time >= start && row.time < end)
    .sort((a, b) => a.time - b.time);
  const byUser = new Map();
  rangedRows.forEach((row) => {
    const user = String(row.actor_id || row.distinct_id);
    if (!byUser.has(user)) byUser.set(user, []);
    byUser.get(user).push(row);
  });

  const completions = FUNNEL_STEPS.map(() => []);
  byUser.forEach((events) => {
    let cursor = -1;
    let sequenceBroken = false;
    FUNNEL_STEPS.forEach((step, index) => {
      if (sequenceBroken) return;
      const matched = events.find(
        (event) =>
          event.time >= new Date(cursor) &&
          step.events.includes(String(event.event)),
      );
      if (!matched) {
        sequenceBroken = true;
        return;
      }
      completions[index].push({
        user: String(matched.actor_id || matched.distinct_id),
        time: matched.time,
      });
      cursor = matched.time.getTime();
    });
  });
  const firstUsers = completions[0].length;
  const funnel = FUNNEL_STEPS.map((step, index) => {
    const users = completions[index].length;
    const previousUsers = index ? completions[index - 1].length : users;
    const previousTimes = index
      ? new Map(completions[index - 1].map((item) => [item.user, item.time]))
      : new Map();
    const transitionMinutes = index
      ? completions[index]
          .filter((item) => previousTimes.has(item.user))
          .map((item) => (item.time - previousTimes.get(item.user)) / 60000)
      : [];
    return {
      event: step.key,
      order: index + 1,
      users,
      rate: firstUsers ? round((users / firstUsers) * 100) : 0,
      stepRate: previousUsers ? round((users / previousUsers) * 100) : 0,
      lostUsers: Math.max(previousUsers - users, 0),
      medianMinutes: median(transitionMinutes),
    };
  });

  const latestDeviceByUser = new Map();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    visits: 0,
    users: new Set(),
  }));
  rangedRows.forEach((row) => {
    const user = String(row.actor_id || row.distinct_id);
    if (ACTIVE_EVENTS.includes(String(row.event))) {
      latestDeviceByUser.set(user, normalizeDevice(row.device));
    }
    if (ENTRY_EVENTS.includes(String(row.event))) {
      const hour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: TIME_ZONE,
          hour: "2-digit",
          hourCycle: "h23",
        }).format(row.time),
      );
      hourly[hour].visits += 1;
      hourly[hour].users.add(user);
    }
  });
  const deviceCounts = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
  latestDeviceByUser.forEach((device) => {
    deviceCounts[device] += 1;
  });
  const deviceTotal = latestDeviceByUser.size;
  const devices = Object.entries(deviceCounts).map(([device, users]) => ({
    device,
    users,
    rate: deviceTotal ? round((users / deviceTotal) * 100) : 0,
  }));

  const frictionGroups = new Map();
  const observationEnd = new Date(Math.min(end.getTime(), Date.now()));
  rangedRows
    .filter(
      (row) =>
        FRICTION_EVENTS.includes(String(row.event)) &&
        observationEnd - row.time >= 10 * 60 * 1000,
    )
    .forEach((row) => {
      const user = String(row.actor_id || row.distinct_id);
      const key = `${row.event}|${row.stage || "unknown"}|${row.reason || "unknown"}`;
      if (!frictionGroups.has(key)) {
        frictionGroups.set(key, {
          event: String(row.event),
          stage: String(row.stage || "unknown"),
          reason: String(row.reason || "unknown"),
          occurrences: 0,
          users: new Set(),
          quickLossUsers: new Set(),
          recoveredUsers: new Set(),
        });
      }
      const group = frictionGroups.get(key);
      group.occurrences += 1;
      group.users.add(user);
      const later =
        byUser.get(user)?.filter((candidate) => candidate.time > row.time) ||
        [];
      const recovered = later.some(
        (candidate) =>
          candidate.time - row.time <= 10 * 60 * 1000 &&
          RECOVERY_EVENTS.includes(String(candidate.event)),
      );
      const stayed = later.some(
        (candidate) =>
          candidate.time - row.time <= 10 * 60 * 1000 &&
          ACTIVE_EVENTS.includes(String(candidate.event)),
      );
      if (recovered) group.recoveredUsers.add(user);
      if (!stayed) group.quickLossUsers.add(user);
    });
  const friction = [...frictionGroups.values()]
    .map((group) => ({
      event: group.event,
      stage: group.stage,
      reason: group.reason,
      occurrences: group.occurrences,
      users: group.users.size,
      quickLossUsers: group.quickLossUsers.size,
      quickLossRate: group.users.size
        ? round((group.quickLossUsers.size / group.users.size) * 100)
        : 0,
      recoveredUsers: group.recoveredUsers.size,
    }))
    .sort(
      (a, b) =>
        b.quickLossUsers - a.quickLossUsers || b.occurrences - a.occurrences,
    );

  return {
    funnel,
    devices,
    hourlyTraffic: hourly.map((item) => ({
      hour: item.hour,
      visits: item.visits,
      users: item.users.size,
    })),
    friction,
  };
};

async function getPostHogMetrics(range) {
  if (!process.env.POSTHOG_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return {
      configured: false,
      reason: "未配置 POSTHOG_API_KEY 或 POSTHOG_PROJECT_ID",
    };
  }
  const queryStart = shiftDate(range.from, -30);
  const queryEnd = shiftDate(range.to, 1);
  const dailyRows = await queryPostHog(`
    SELECT toDate(toTimeZone(timestamp, '${TIME_ZONE}')) AS date,
      countDistinct(distinct_id) AS users, count() AS events
    FROM events
    WHERE timestamp >= toDateTime(${quoteHogql(getUtcBoundary(range.from))})
      AND timestamp < toDateTime(${quoteHogql(getUtcBoundary(shiftDate(range.to, 1)))})
      AND event IN (${ACTIVE_EVENTS.map(quoteHogql).join(", ")})
    GROUP BY date ORDER BY date
  `);
  const funnelEvents = [
    ...new Set(FUNNEL_STEPS.flatMap((step) => step.events)),
  ];
  const allEvents = [...new Set([...ACTIVE_EVENTS, ...funnelEvents])];
  const behaviorEvents = [
    ...new Set([...allEvents, ...ENTRY_EVENTS, ...FRICTION_EVENTS]),
  ];
  const behaviorQuery = (actorExpression) => `
      SELECT timestamp, toDate(toTimeZone(timestamp, '${TIME_ZONE}')) AS date,
        ${actorExpression} AS actor_id, event,
        coalesce(nullIf(toString(properties.device), ''), nullIf(toString(properties.$device_type), ''), 'unknown') AS device,
        toString(properties.stage) AS stage, toString(properties.reason) AS reason
      FROM events
      WHERE timestamp >= toDateTime(${quoteHogql(getUtcBoundary(queryStart))})
        AND timestamp < toDateTime(${quoteHogql(getUtcBoundary(queryEnd))})
        AND event IN (${behaviorEvents.map(quoteHogql).join(", ")})
      ORDER BY timestamp
    `;
  let behaviorRows;
  try {
    behaviorRows = await queryPostHog(behaviorQuery("person_id"));
  } catch {
    behaviorRows = await queryPostHog(behaviorQuery("distinct_id"));
  }
  const dailyByDate = rowsToDateMap(dailyRows || []);
  const dailyActiveUsers = emptyByDay(range.from, range.to).map((date) => ({
    date,
    users: dailyByDate[date]?.users || 0,
    events: dailyByDate[date]?.events || 0,
  }));
  const behavior = buildBehaviorMetrics(behaviorRows || [], range);
  const retention = calculateRetention(
    behaviorRows || [],
    range.from,
    range.to,
  );
  return {
    configured: true,
    dailyActiveUsers,
    ...behavior,
    retention: retention.cohorts,
    retentionAverage: retention.average,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  try {
    const user = authenticateRequest(req);
    await requireAdmin(prisma, user.userId);
    const range = getRange(req);
    const [database, posthog] = await Promise.all([
      getDatabaseMetrics(range),
      getPostHogMetrics(range).catch((error) => ({
        configured: true,
        error: error.message,
      })),
    ]);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      range: { ...range, timeZone: TIME_ZONE },
      database,
      posthog,
      definitions: {
        activation: "用户自己的私有家谱空间首次成功保存至少 1 个正式节点",
        currentNodes:
          "排除穆氏示范/迁移家谱后的个人家谱空间中，当前 FamilyData 节点数",
        activeUser: "当天发生至少一个核心产品业务事件的去重用户",
        retention:
          "以首次成功保存家谱当天为 cohort，按 D1/D7/D30 再次发生业务行为计算",
        familySpaces:
          "仅管理员可见最小账号标识与匿名家谱结构；不返回人物姓名、照片、联系方式或家谱正文",
        funnel:
          "同一用户按事件实际发生顺序逐步完成；环节转化率以上一步人数为基数",
        quickLoss: "发生脱敏失败事件后 10 分钟内未再发生核心业务行为的去重用户",
        excludedTenantIds: getExcludedTenantIds(),
      },
    });
  } catch (error) {
    console.error("管理员分析报表请求失败:", error);
    return sendAuthError(res, error);
  }
}

export { buildBehaviorMetrics, calculateRetention, maskEmail };
