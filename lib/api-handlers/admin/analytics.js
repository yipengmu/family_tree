import prisma from '../../prisma.js';
import {
  authenticateRequest,
  requireAdmin,
  sendAuthError,
} from '../../auth.js';

const TIME_ZONE = 'Asia/Shanghai';
const DEFAULT_RANGE_DAYS = 30;
const ACTIVE_EVENTS = [
  'app_view',
  'family_tree_view',
  'creator_view',
  'family_created_success',
  'first_person_saved',
  'first_relationship_created',
  'third_generation_connected',
  'fourth_generation_connected',
  'person_created_success',
  'person_updated_success',
  'story_created_success',
  'story_published_success',
];
const ACTIVATION_EVENTS = ['family_created_success', 'first_person_saved'];
const FUNNEL_STEPS = [
  { key: 'homepage_view', events: ['homepage_view'] },
  { key: 'app_create_open', events: ['app_create_open'] },
  { key: 'registration_complete', events: ['registration_complete'] },
  { key: 'family_created_success', events: ['family_created_success', 'first_person_saved'] },
  { key: 'first_relationship_created', events: ['first_relationship_created'] },
  { key: 'fourth_generation_connected', events: ['fourth_generation_connected'] },
];

const asDate = (value) => {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const parseDate = (dateText) => {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const shiftDate = (dateText, offset) => {
  const date = parseDate(dateText);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDate(date);
};

const getTodayInShanghai = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
    process.env.POSTHOG_API_HOST || process.env.POSTHOG_HOST || 'https://eu.posthog.com';
  const host = configuredHost
    .replace(/\/$/, '')
    .replace('eu.i.posthog.com', 'eu.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com');
  const response = await fetch(
    `${host}/api/projects/${encodeURIComponent(projectId)}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { kind: 'HogQLQuery', query },
        refresh: 'blocking',
      }),
    },
  );

  if (!response.ok) throw new Error(`PostHog 查询失败（${response.status}）`);
  const payload = await response.json();
  if (payload?.query_status?.error) {
    throw new Error(payload.query_status.error_message || 'PostHog 查询失败');
  }
  return parseQueryRows(payload);
}

const toNumber = (value) => Number(value || 0);

const getExcludedTenantIds = () =>
  (process.env.ANALYTICS_EXCLUDED_TENANT_IDS || 'default,user_1')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const emptyByDay = (from, to) => {
  const days = [];
  for (let cursor = parseDate(from); cursor <= parseDate(to); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(formatDate(cursor));
  }
  return days;
};

const formatShanghaiDate = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
        status: 'active',
        AND: [
          { id: { notIn: excludedTenantIds } },
          { id: { startsWith: 'user_' } },
        ],
        memberships: { some: { status: 'ACTIVE', role: 'OWNER' } },
      },
      select: {
        id: true,
        memberships: {
          where: { status: 'ACTIVE', role: 'OWNER' },
          select: { user_id: true },
        },
        familyData: { select: { created_at: true } },
        dataVersions: {
          orderBy: { created_at: 'asc' },
          take: 1,
          select: { created_at: true },
        },
      },
    }),
  ]);

  const days = emptyByDay(range.from, range.to);
  const activations = tenants
    .filter((tenant) => tenant.familyData.length > 0)
    .map((tenant) => ({
      tenant,
      activatedAt: tenant.dataVersions[0]?.created_at || tenant.familyData[0]?.created_at,
    }))
    .filter(({ activatedAt }) => activatedAt);
  const owners = new Set(
    activations.flatMap(({ tenant }) => tenant.memberships.map(({ user_id }) => user_id)),
  );
  const currentNodeCount = tenants.reduce((sum, tenant) => sum + tenant.familyData.length, 0);
  const bucketDefinitions = [
    { key: '1', label: '1 个节点', matches: (count) => count === 1 },
    { key: '2-5', label: '2–5 个节点', matches: (count) => count >= 2 && count <= 5 },
    { key: '6-20', label: '6–20 个节点', matches: (count) => count >= 6 && count <= 20 },
    { key: '21+', label: '21 个以上', matches: (count) => count >= 21 },
  ];
  const nodesByBucket = bucketDefinitions.map((bucket) => {
    const spaces = tenants.filter((tenant) => bucket.matches(tenant.familyData.length));
    return {
      key: bucket.key,
      label: bucket.label,
      spaces: spaces.length,
      nodes: spaces.reduce((sum, tenant) => sum + tenant.familyData.length, 0),
    };
  });
  const activationDates = activations.map(({ activatedAt }) => activatedAt);
  return {
    registeredUsers,
    activePersonalSpaces: activations.length,
    registeredPersonalSpaces: tenants.length,
    activatedCreators: owners.size,
    currentNodeCount,
    averageNodesPerCreator: owners.size ? Number((currentNodeCount / owners.size).toFixed(1)) : 0,
    newRegistrations: usersInRange.length,
    newActivations: activationDates.filter((activatedAt) => activatedAt >= start && activatedAt < end).length,
    registrationsByDay: countByDay(days, usersInRange.map((user) => user.created_at)),
    activationsByDay: countByDay(days, activationDates.filter((activatedAt) => activatedAt >= start && activatedAt < end)),
    nodesByBucket,
  };
}

const rowsToDateMap = (rows) =>
  Object.fromEntries(rows.map((row) => [String(row.date), { users: toNumber(row.users), events: toNumber(row.events) }]));

const calculateRetention = (rows, from, to) => {
  const activationByUser = new Map();
  const activeByDate = new Map();
  rows.forEach((row) => {
    const date = String(row.date);
    const user = String(row.distinct_id);
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
  return [...cohorts.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([cohortDate, users]) => {
      const cohortUsers = [...users];
      const getRetention = (offset) => {
        const target = shiftDate(cohortDate, offset);
        if (target > to) return null;
        const activeUsers = activeByDate.get(target) || new Set();
        return cohortUsers.length
          ? Math.round((cohortUsers.filter((user) => activeUsers.has(user)).length / cohortUsers.length) * 100)
          : 0;
      };
      return { cohortDate, users: cohortUsers.length, d1: getRetention(1), d7: getRetention(7), d30: getRetention(30) };
    });
};

async function getPostHogMetrics(range) {
  if (!process.env.POSTHOG_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return { configured: false, reason: '未配置 POSTHOG_API_KEY 或 POSTHOG_PROJECT_ID' };
  }
  const queryStart = shiftDate(range.from, -30);
  const queryEnd = shiftDate(range.to, 1);
  const dailyRows = await queryPostHog(`
    SELECT toDate(toTimeZone(timestamp, '${TIME_ZONE}')) AS date,
      countDistinct(distinct_id) AS users, count() AS events
    FROM events
    WHERE timestamp >= toDateTime(${quoteHogql(getUtcBoundary(range.from))})
      AND timestamp < toDateTime(${quoteHogql(getUtcBoundary(shiftDate(range.to, 1)))})
      AND event IN (${ACTIVE_EVENTS.map(quoteHogql).join(', ')})
    GROUP BY date ORDER BY date
  `);
  const funnelEvents = [...new Set(FUNNEL_STEPS.flatMap((step) => step.events))];
  const funnelRows = await queryPostHog(`
    SELECT event, countDistinct(distinct_id) AS users
    FROM events
    WHERE timestamp >= toDateTime(${quoteHogql(getUtcBoundary(range.from))})
      AND timestamp < toDateTime(${quoteHogql(getUtcBoundary(shiftDate(range.to, 1)))})
      AND event IN (${funnelEvents.map(quoteHogql).join(', ')})
    GROUP BY event
  `);
  const allEvents = [...new Set([...ACTIVE_EVENTS, ...funnelEvents])];
  const retentionRows = await queryPostHog(`
    SELECT toDate(toTimeZone(timestamp, '${TIME_ZONE}')) AS date, distinct_id, event
    FROM events
    WHERE timestamp >= toDateTime(${quoteHogql(getUtcBoundary(queryStart))})
      AND timestamp < toDateTime(${quoteHogql(getUtcBoundary(queryEnd))})
      AND event IN (${allEvents.map(quoteHogql).join(', ')})
    GROUP BY date, distinct_id, event
  `);
  const dailyByDate = rowsToDateMap(dailyRows || []);
  const dailyActiveUsers = emptyByDay(range.from, range.to).map((date) => ({
    date,
    users: dailyByDate[date]?.users || 0,
    events: dailyByDate[date]?.events || 0,
  }));
  const funnelCounts = Object.fromEntries((funnelRows || []).map((row) => [String(row.event), toNumber(row.users)]));
  const firstFunnelCount = funnelCounts[FUNNEL_STEPS[0].key] || funnelCounts[FUNNEL_STEPS[0].events[0]] || 0;
  const funnel = FUNNEL_STEPS.map((step, index) => {
    const users = step.events.reduce((sum, event) => sum + (funnelCounts[event] || 0), 0);
    return {
      event: step.key,
      users,
      rate: firstFunnelCount ? Number((users / firstFunnelCount * 100).toFixed(1)) : 0,
    order: index + 1,
    };
  });
  return {
    configured: true,
    dailyActiveUsers,
    funnel,
    retention: calculateRetention(retentionRows || [], range.from, range.to),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const user = authenticateRequest(req);
    await requireAdmin(prisma, user.userId);
    const range = getRange(req);
    const [database, posthog] = await Promise.all([
      getDatabaseMetrics(range),
      getPostHogMetrics(range).catch((error) => ({ configured: true, error: error.message })),
    ]);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      range: { ...range, timeZone: TIME_ZONE },
      database,
      posthog,
      definitions: {
        activation: '用户自己的私有家谱空间首次成功保存至少 1 个正式节点',
        currentNodes: '排除穆氏示范/迁移家谱后的个人家谱空间中，当前 FamilyData 节点数',
        activeUser: '当天发生至少一个核心产品业务事件的去重用户',
        retention: '以首次成功保存家谱当天为 cohort，按 D1/D7/D30 再次发生业务行为计算',
        excludedTenantIds: getExcludedTenantIds(),
      },
    });
  } catch (error) {
    console.error('管理员分析报表请求失败:', error);
    return sendAuthError(res, error);
  }
}
