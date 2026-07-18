import QRCode from "qrcode";
import BRAND from "../constants/brand.js";
import { isPersonAlive } from "./personLifeStatus.js";
import {
  convertToReactFlowData,
  getLayoutedElements,
} from "./familyTreeUtils.js";

export const SHARE_POSTER_WIDTH = 1080;
export const SHARE_ENTRY_URL =
  "https://tree.tatababa.top/app?from=share-poster";

const COLORS = {
  paper: "#f4efe4",
  paperLight: "#fffdf8",
  ink: "#2f2b25",
  inkSoft: "#756b5d",
  pine: "#184f43",
  cinnabar: "#9a3f2f",
  gold: "#c9a55f",
  hairline: "#d8cdbb",
};

const FONT_SERIF = '"Songti SC", "STSong", "SimSun", serif';
const FONT_SANS = 'system-ui, -apple-system, "PingFang SC", sans-serif';

const normalizeText = (value) => String(value || "").trim();

const getPersonId = (person) => String(person?.person_id ?? person?.id ?? "");

export const isShareProtectedPerson = (person = {}) => {
  if (isPersonAlive(person)) return true;
  if (person.alive === false) return false;

  const deathValue = person.death_date ?? person.dealth;
  return !deathValue || deathValue === "alive";
};

const protectedName = (person) => {
  const name = normalizeText(person?.name);
  const surname = Array.from(name)[0];
  return surname ? `${surname}氏家人` : "一位家人";
};

export const getPosterPersonName = (person, hideProtectedNames = true) => {
  if (hideProtectedNames && isShareProtectedPerson(person)) {
    return protectedName(person);
  }
  return normalizeText(person?.name) || "姓名待考";
};

const numericGeneration = (person) => {
  const value = Number(person?.g_rank);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const numericRankIndex = (person) => {
  const value = Number(person?.rank_index);
  return Number.isFinite(value) && value > 0 ? value : 999;
};

const isEmptyRelationId = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  value === 0 ||
  value === "0";

const getRelationId = (value) =>
  isEmptyRelationId(value) ? "" : String(value);

const selectGenerationGroups = (groups, limit = 6) => {
  if (groups.length <= limit) return groups;
  const headCount = Math.ceil(limit / 2);
  const tailCount = Math.floor(limit / 2);
  return [
    ...groups.slice(0, headCount),
    { key: "ellipsis", label: "…", people: [], omitted: true },
    ...groups.slice(-tailCount),
  ];
};

const buildPosterTree = (people, hideProtectedNames) => {
  const sortedPeople = people
    .map((person) => ({
      raw: person,
      id: getPersonId(person),
      generation: numericGeneration(person),
      rankIndex: numericRankIndex(person),
      fatherId: getRelationId(person?.g_father_id),
      motherId: getRelationId(person?.g_mother_id),
    }))
    .filter((person) => person.id)
    .sort((left, right) => {
      if (left.generation === null && right.generation !== null) return 1;
      if (right.generation === null && left.generation !== null) return -1;
      if (left.generation !== right.generation) {
        return (left.generation || 999) - (right.generation || 999);
      }
      return left.rankIndex - right.rankIndex;
    });
  const byId = new Map(sortedPeople.map((person) => [person.id, person]));
  const childrenByParent = new Map();

  sortedPeople.forEach((person) => {
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId || !byId.has(parentId)) return;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(person.id);
    });
  });

  const roots = sortedPeople.filter(
    (person) =>
      (!person.fatherId || !byId.has(person.fatherId)) &&
      (!person.motherId || !byId.has(person.motherId)),
  );
  const queue = roots.length
    ? roots.map((person) => person.id)
    : sortedPeople.map((person) => person.id);
  const selectedIds = [];
  const selected = new Set();

  while (queue.length && selectedIds.length < 14) {
    const id = queue.shift();
    if (!id || selected.has(id) || !byId.has(id)) continue;
    selected.add(id);
    selectedIds.push(id);
    (childrenByParent.get(id) || [])
      .map((childId) => byId.get(childId))
      .filter(Boolean)
      .sort((left, right) => {
        if (left.generation !== right.generation) {
          return (left.generation || 999) - (right.generation || 999);
        }
        return left.rankIndex - right.rankIndex;
      })
      .forEach((child) => queue.push(child.id));
  }

  const selectedPeople = selectedIds.map((id) => {
    const person = byId.get(id);
    return {
      ...person.raw,
      id: person.id,
      name: getPosterPersonName(person.raw, hideProtectedNames),
    };
  });

  // 分享图必须沿用主家谱的节点转换和布局规则，避免分享页重新发明一套
  // “看起来像家谱”的关系算法。隐私裁剪只改显示名，不改关系与坐标。
  const flowData = convertToReactFlowData(
    selectedPeople,
    selectedPeople,
    false,
    {
      isMobile: true,
      isNameProtectionEnabled: false,
      useFounderLabels: false,
    },
  );
  const layoutedNodes = getLayoutedElements(
    flowData.nodes,
    flowData.edges,
    "TB",
  );
  const nodes = layoutedNodes.map((node) => ({
    id: String(node.id),
    name: node.data.name,
    generation: Number(node.data.rank) || null,
    rankIndex: Number(node.data.rankIndex) || 999,
    gender: node.data.sex || "",
    x: node.position.x,
    y: node.position.y,
  }));
  const edges = flowData.edges.map((edge) => ({
    from: String(edge.source),
    to: String(edge.target),
  }));

  return {
    nodes,
    edges,
    omittedCount: Math.max(0, sortedPeople.length - nodes.length),
  };
};

export const buildFamilyPosterModel = ({
  familyName,
  familyData = [],
  hideProtectedNames = true,
}) => {
  const people = Array.isArray(familyData) ? familyData : [];
  const groupMap = new Map();

  people.forEach((person) => {
    const generation = numericGeneration(person);
    const key = generation === null ? "unknown" : String(generation);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        generation,
        label: generation === null ? "代际待考" : `第 ${generation} 代`,
        people: [],
      });
    }
    groupMap.get(key).people.push({
      id: getPersonId(person),
      name: getPosterPersonName(person, hideProtectedNames),
    });
  });

  const allGroups = Array.from(groupMap.values()).sort((left, right) => {
    if (left.generation === null) return 1;
    if (right.generation === null) return -1;
    return left.generation - right.generation;
  });
  const knownGenerations = allGroups.filter(
    (group) => group.generation !== null,
  );

  return {
    kind: "family",
    familyName: normalizeText(familyName) || "我的家谱",
    memberCount: people.length,
    generationCount: knownGenerations.length,
    firstGeneration: knownGenerations[0]?.generation ?? null,
    lastGeneration:
      knownGenerations[knownGenerations.length - 1]?.generation ?? null,
    groups: selectGenerationGroups(allGroups).map((group) => ({
      ...group,
      people: group.people.slice(0, 4),
      hiddenCount: Math.max(0, group.people.length - 4),
    })),
    tree: buildPosterTree(people, hideProtectedNames),
    hideProtectedNames,
  };
};

const safePublishedEvents = (events) =>
  (Array.isArray(events) ? events : []).filter(
    (event) =>
      event &&
      event.status !== "DRAFT" &&
      event.visibility !== "PRIVATE" &&
      normalizeText(event.narrative || event.title),
  );

export const buildPersonPosterModel = ({
  person,
  events = [],
  includeLifeFacts = false,
  includeStories = true,
  includePortrait = false,
}) => {
  const publishedEvents = includeStories
    ? safePublishedEvents(events).slice(0, 8)
    : [];
  const lifeFacts = [];

  if (includeLifeFacts && person?.birth_date) {
    lifeFacts.push(`生于 ${person.birth_date}`);
  }
  if (includeLifeFacts && person?.location) {
    lifeFacts.push(normalizeText(person.location));
  }
  if (person?.official_position) {
    lifeFacts.push(normalizeText(person.official_position));
  }

  return {
    kind: "person",
    name: normalizeText(person?.name) || "姓名待考",
    generationLabel: person?.g_rank ? `第 ${person.g_rank} 代` : "家谱成员",
    summary: normalizeText(person?.summary).slice(0, 360),
    lifeFacts,
    portraitUrl: includePortrait ? normalizeText(person?.face_img) : "",
    events: publishedEvents.map((event) => ({
      id: String(event.id || ""),
      title: normalizeText(event.title) || "一段家人往事",
      timeText: normalizeText(event.timeText) || "时间待考",
      location: normalizeText(event.location),
      narrative: normalizeText(event.narrative).slice(0, 900),
      isHighlight: event.isHighlight === true,
    })),
    omittedEventCount: Math.max(0, safePublishedEvents(events).length - 8),
    sensitive: isShareProtectedPerson(person),
  };
};

const traceRoundRect = (context, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const roundRect = (context, x, y, width, height, radius, fill, stroke) => {
  traceRoundRect(context, x, y, width, height, radius);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }
};

const wrapText = (context, text, maxWidth) => {
  const paragraphs = normalizeText(text).split(/\n+/);
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    let line = "";
    Array.from(paragraph).forEach((character) => {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push("");
  });

  return lines;
};

const drawWrappedText = (
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = Infinity,
) => {
  const lines = wrapText(context, text, maxWidth);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let finalLine = visible[visible.length - 1];
    while (finalLine && context.measureText(`${finalLine}…`).width > maxWidth) {
      finalLine = finalLine.slice(0, -1);
    }
    visible[visible.length - 1] = `${finalLine}…`;
  }
  visible.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return y + visible.length * lineHeight;
};

const createCanvas = (height) => {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_POSTER_WIDTH;
  canvas.height = height;
  return canvas;
};

const drawPaperBackground = (context, height) => {
  context.fillStyle = COLORS.paper;
  context.fillRect(0, 0, SHARE_POSTER_WIDTH, height);

  const glow = context.createRadialGradient(120, 100, 0, 120, 100, 680);
  glow.addColorStop(0, "rgba(24,79,67,0.12)");
  glow.addColorStop(1, "rgba(24,79,67,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, SHARE_POSTER_WIDTH, 760);

  context.strokeStyle = "rgba(117,107,93,0.09)";
  context.lineWidth = 1;
  for (let y = 36; y < height; y += 44) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(SHARE_POSTER_WIDTH, y);
    context.stroke();
  }
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const drawQrFooter = async (context, height, label) => {
  const qrDataUrl = await QRCode.toDataURL(SHARE_ENTRY_URL, {
    width: 224,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: COLORS.pine, light: "#fffdf8" },
  });
  const qrImage = await loadImage(qrDataUrl);
  const footerTop = height - 350;

  context.strokeStyle = COLORS.hairline;
  context.beginPath();
  context.moveTo(72, footerTop);
  context.lineTo(1008, footerTop);
  context.stroke();

  context.fillStyle = COLORS.ink;
  context.font = `600 34px ${FONT_SERIF}`;
  context.fillText(label, 72, footerTop + 76);
  context.fillStyle = COLORS.inkSoft;
  context.font = `24px ${FONT_SANS}`;
  context.fillText(
    "长按识别二维码，来「谱里」记录你的家人",
    72,
    footerTop + 126,
  );
  context.fillText("tree.tatababa.top", 72, footerTop + 172);
  context.fillStyle = COLORS.cinnabar;
  context.font = `600 24px ${FONT_SERIF}`;
  context.fillText(`${BRAND.name}：${BRAND.tagline}`, 72, footerTop + 236);
  context.drawImage(qrImage, 776, footerTop + 42, 232, 232);

  context.fillStyle = "rgba(47,43,37,0.46)";
  context.font = `20px ${FONT_SANS}`;
  context.fillText(
    "图片由「谱里」在本机生成，不代表家谱已公开",
    72,
    height - 52,
  );
};

const measurePersonPosterHeight = (model) => {
  let height = 980;
  if (model.summary) height += 190;
  model.events.forEach((event) => {
    const estimatedLines = Math.max(2, Math.ceil(event.narrative.length / 27));
    height += 210 + Math.min(estimatedLines, 12) * 42;
  });
  if (!model.events.length) height += 120;
  return Math.min(Math.max(height + 350, 1600), 10500);
};

// 为初祖绘制可爱的小皇冠，金色三尖带宝石样式，与家谱tab的皇冠风格保持一致
const drawCrown = (context, centerX, bottomY, size = 15) => {
  const w = size * 2.2;
  const h = size * 1.2;
  const left = centerX - w / 2;
  const bandH = h * 0.42;
  const bandTop = bottomY - bandH;

  context.save();
  context.fillStyle = COLORS.gold;
  context.beginPath();
  context.moveTo(left, bottomY);
  context.lineTo(left, bandTop);
  context.lineTo(left + w * 0.22, bandTop - h * 0.5);
  context.lineTo(left + w * 0.5, bandTop - h * 0.92);
  context.lineTo(left + w * 0.78, bandTop - h * 0.5);
  context.lineTo(left + w, bandTop);
  context.lineTo(left + w, bottomY);
  context.closePath();
  context.fill();

  context.fillStyle = "#fff4d6";
  const r = Math.max(2.5, size * 0.16);
  context.beginPath();
  context.arc(left, bandTop, r, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(left + w * 0.5, bandTop - h * 0.92, r, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(left + w, bandTop, r, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const drawFamilyTreePreview = (context, model, startY) => {
  const tree = model.tree || { nodes: [], edges: [], omittedCount: 0 };
  if (!tree.nodes.length) {
    context.fillStyle = COLORS.inkSoft;
    context.font = `28px ${FONT_SERIF}`;
    context.fillText("第一位家人，正在等待写进家谱。", 96, startY + 68);
    return startY + 160;
  }

  const groups = Array.from(
    tree.nodes
      .reduce((map, node) => {
        const key =
          node.generation === null ? "unknown" : String(node.generation);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(node);
        return map;
      }, new Map())
      .entries(),
  )
    .sort(([leftKey], [rightKey]) => {
      if (leftKey === "unknown") return 1;
      if (rightKey === "unknown") return -1;
      return Number(leftKey) - Number(rightKey);
    })
    .slice(0, 5);
  const visibleIds = new Set(
    groups.flatMap(([, nodes]) => nodes.map((node) => node.id)),
  );
  const positions = new Map();
  const treeLeft = 72;
  const treeWidth = 936;
  const rowGap = 182;
  const cardWidth = 238;
  const cardHeight = 94;

  const visibleNodes = groups.flatMap(([, groupNodes]) =>
    groupNodes.slice(0, 3),
  );
  const layoutXs = visibleNodes.map((node) => Number(node.x) || 0);
  const minLayoutX = Math.min(...layoutXs, 0);
  const maxLayoutX = Math.max(...layoutXs, 0);
  const layoutWidth = Math.max(1, maxLayoutX - minLayoutX);

  groups.forEach(([, nodes], rowIndex) => {
    nodes.slice(0, 3).forEach((node) => {
      const normalizedX = ((Number(node.x) || 0) - minLayoutX) / layoutWidth;
      const x = treeLeft + normalizedX * (treeWidth - cardWidth);
      const y = startY + rowIndex * rowGap;
      positions.set(node.id, { x, y, width: cardWidth, height: cardHeight });
    });
  });

  context.save();
  context.strokeStyle = "rgba(201,165,95,0.82)";
  context.lineWidth = 4;
  tree.edges.forEach((edge) => {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) return;
    const parent = positions.get(edge.from);
    const child = positions.get(edge.to);
    if (!parent || !child) return;
    const parentX = parent.x + parent.width / 2;
    const parentY = parent.y + parent.height;
    const childX = child.x + child.width / 2;
    const childY = child.y;
    const midY = parentY + (childY - parentY) / 2;
    context.beginPath();
    context.moveTo(parentX, parentY);
    context.lineTo(parentX, midY);
    context.lineTo(childX, midY);
    context.lineTo(childX, childY);
    context.stroke();
  });
  context.restore();

  groups.forEach(([generationKey, nodes], rowIndex) => {
    const generationLabel =
      generationKey === "unknown" ? "代际待考" : `第 ${generationKey} 代`;
    const y = startY + rowIndex * rowGap;
    context.fillStyle = COLORS.cinnabar;
    context.font = `600 22px ${FONT_SANS}`;
    context.fillText(generationLabel, 84, y - 20);

    nodes.slice(0, 3).forEach((node) => {
      const position = positions.get(node.id);
      if (!position) return;
      roundRect(
        context,
        position.x,
        position.y,
        position.width,
        position.height,
        18,
        "rgba(255,253,248,0.94)",
        COLORS.hairline,
      );
      context.fillStyle = COLORS.pine;
      context.font = `600 30px ${FONT_SERIF}`;
      drawWrappedText(
        context,
        node.name,
        position.x + 24,
        position.y + 42,
        position.width - 48,
        36,
        1,
      );
      context.fillStyle = COLORS.inkSoft;
      context.font = `20px ${FONT_SANS}`;
      context.fillText("家谱成员", position.x + 24, position.y + 74);
      // 皇冠已移除，保持界面清爽
      // if (rowIndex === 0) {
      //   drawCrown(context, position.x + position.width / 2, position.y - 8, 15);
      // }
    });
  });

  let bottom = startY + groups.length * rowGap - 44;
  const hiddenInRows = groups.reduce(
    (sum, [, nodes]) => sum + Math.max(0, nodes.length - 3),
    0,
  );
  const omittedCount = tree.omittedCount + hiddenInRows;
  if (omittedCount > 0) {
    context.fillStyle = COLORS.inkSoft;
    context.font = `24px ${FONT_SANS}`;
    context.fillText(
      `另有 ${omittedCount} 位家人留在完整家谱中`,
      72,
      bottom + 44,
    );
    bottom += 74;
  }
  return bottom + 24;
};

export const renderFamilyPoster = async (options) => {
  const model = buildFamilyPosterModel(options);
  const treeRowCount = Math.max(
    1,
    new Set(
      (model.tree?.nodes || []).map((node) => node.generation ?? "unknown"),
    ).size,
  );
  const height = Math.max(1840, 1240 + Math.min(treeRowCount, 5) * 182);
  const canvas = createCanvas(height);
  const context = canvas.getContext("2d");
  drawPaperBackground(context, height);

  // 把标题、说明和人数卡收进同一块轻纸张面板，减少头部割裂感。
  roundRect(
    context,
    48,
    104,
    984,
    486,
    30,
    "rgba(255,253,248,0.58)",
    "rgba(216,205,187,0.72)",
  );

  context.fillStyle = COLORS.cinnabar;
  context.font = `600 24px ${FONT_SANS}`;
  context.fillText("我的家庭世系", 72, 178);
  context.fillStyle = COLORS.ink;
  context.font = `600 66px ${FONT_SERIF}`;
  drawWrappedText(context, model.familyName, 72, 258, 936, 78, 2);

  context.fillStyle = COLORS.inkSoft;
  context.font = `24px ${FONT_SANS}`;
  context.fillText("从你的名字开始，看见家人如何连成一棵树", 72, 326);

  // 印章式品牌标记，让分享图在社交场景里仍然保留“家谱册页”的识别感。
  context.save();
  context.strokeStyle = "rgba(154,63,47,0.7)";
  context.lineWidth = 3;
  traceRoundRect(context, 884, 152, 92, 92, 18);
  context.stroke();
  context.fillStyle = "rgba(154,63,47,0.88)";
  context.font = `600 46px ${FONT_SERIF}`;
  context.textAlign = "center";
  context.fillText("谱", 930, 214);
  context.textAlign = "left";
  context.restore();

  // 国风人数卡片：淡青绿渐变底纹 + 微妙纹理
  const cardX = 72;
  const cardY = 360;
  const cardW = 936;
  const cardH = 170;

  // 绘制圆角矩形作为基础
  traceRoundRect(context, cardX, cardY, cardW, cardH, 28);

  // 淡青绿渐变背景（国风色调）
  const bgGrad = context.createLinearGradient(
    cardX,
    cardY,
    cardX + cardW,
    cardY + cardH,
  );
  bgGrad.addColorStop(0, "#e8f0ec");
  bgGrad.addColorStop(0.5, "#dce8e2");
  bgGrad.addColorStop(1, "#d0e0d8");
  context.fillStyle = bgGrad;
  context.fill();

  // 微妙的竖条纹纹理（宣纸质感）
  context.save();
  context.globalAlpha = 0.04;
  for (let i = 0; i < cardW; i += 3) {
    if (i % 12 === 0) {
      context.strokeStyle = "#184f43";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cardX + i, cardY);
      context.lineTo(cardX + i, cardY + cardH);
      context.stroke();
    }
  }
  context.restore();

  // 左侧装饰条（深绿）
  context.fillStyle = COLORS.pine;
  context.beginPath();
  context.roundRect(cardX, cardY, 6, cardH, [28, 0, 0, 28]);
  context.fill();

  // 右上角微妙的云纹装饰
  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = COLORS.pine;
  context.beginPath();
  context.arc(cardX + cardW - 80, cardY + 40, 35, 0, Math.PI * 2);
  context.arc(cardX + cardW - 40, cardY + 55, 25, 0, Math.PI * 2);
  context.arc(cardX + cardW - 100, cardY + 60, 20, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // 文字内容 - 主标题
  context.fillStyle = COLORS.pine;
  context.font = `600 46px ${FONT_SERIF}`;
  context.fillText(`${model.memberCount} 位家人`, cardX + 40, cardY + 78);

  // 副标题
  context.fillStyle = "rgba(24,79,67,0.68)";
  context.font = `26px ${FONT_SANS}`;
  context.fillText(
    model.generationCount
      ? `${model.generationCount} 代相承 · 我们仍在持续补充`
      : "每一个名字，都值得被记住",
    cardX + 40,
    cardY + 124,
  );

  const valueItems = [
    [
      "世系",
      model.generationCount
        ? `${model.generationCount} 代相承`
        : "从一位家人开始",
    ],
    ["记录", "名字与关系清晰可见"],
    ["传承", "随时补充，留给后代"],
  ];
  valueItems.forEach(([label, value], index) => {
    const itemX = 72 + index * 312;
    context.fillStyle = COLORS.cinnabar;
    context.font = `600 20px ${FONT_SANS}`;
    context.fillText(label, itemX, 572);
    context.fillStyle = COLORS.inkSoft;
    context.font = `20px ${FONT_SANS}`;
    context.fillText(value, itemX, 604);
  });

  context.fillStyle = COLORS.inkSoft;
  context.font = `24px ${FONT_SANS}`;

  context.fillStyle = COLORS.cinnabar;
  context.font = `600 24px ${FONT_SANS}`;
  context.fillText("关系预览", 72, 662);
  context.fillStyle = COLORS.ink;
  context.font = `600 44px ${FONT_SERIF}`;
  context.fillText("家人的名字，正在连成一棵树", 72, 726);

  drawFamilyTreePreview(context, model, 820);
  await drawQrFooter(context, height, "也为你的家人，留下一份家谱");
  return canvas.toDataURL("image/png");
};

const drawPortrait = async (context, model, x, y) => {
  roundRect(context, x, y, 178, 210, 78, "#e8ddcc", COLORS.hairline);
  let portrait = null;
  try {
    portrait = await loadImage(model.portraitUrl);
  } catch {
    portrait = null;
  }

  if (portrait) {
    context.save();
    traceRoundRect(context, x, y, 178, 210, 78);
    context.clip();
    const scale = Math.max(178 / portrait.width, 210 / portrait.height);
    const width = portrait.width * scale;
    const height = portrait.height * scale;
    context.drawImage(
      portrait,
      x + (178 - width) / 2,
      y + (210 - height) / 2,
      width,
      height,
    );
    context.restore();
    return;
  }

  context.fillStyle = COLORS.cinnabar;
  context.font = `600 76px ${FONT_SERIF}`;
  context.textAlign = "center";
  context.fillText(
    Array.from(model.name).slice(-1)[0] || "志",
    x + 89,
    y + 132,
  );
  context.textAlign = "left";
};

const drawPersonEvents = (context, model, startY, footerTop) => {
  let y = startY;
  if (!model.events.length) {
    context.fillStyle = COLORS.inkSoft;
    context.font = `28px ${FONT_SERIF}`;
    context.fillText("人物的故事，正等待家人继续补充。", 106, y + 64);
    return y + 140;
  }

  model.events.forEach((event) => {
    if (y > footerTop - 220) return;
    context.fillStyle = COLORS.gold;
    context.beginPath();
    context.arc(104, y + 30, 9, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = COLORS.hairline;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(104, y + 42);
    context.lineTo(104, y + 174);
    context.stroke();

    context.fillStyle = COLORS.cinnabar;
    context.font = `600 23px ${FONT_SANS}`;
    context.fillText(event.timeText, 144, y + 37);
    if (event.isHighlight) {
      context.fillStyle = COLORS.gold;
      context.fillText("闪光时刻", 820, y + 37);
    }
    context.fillStyle = COLORS.ink;
    context.font = `600 38px ${FONT_SERIF}`;
    const titleBottom = drawWrappedText(
      context,
      event.title,
      144,
      y + 90,
      816,
      48,
      2,
    );
    let narrativeY = titleBottom + 20;
    if (event.location) {
      context.fillStyle = COLORS.inkSoft;
      context.font = `23px ${FONT_SANS}`;
      context.fillText(event.location, 144, narrativeY);
      narrativeY += 42;
    }
    context.fillStyle = COLORS.inkSoft;
    context.font = `27px ${FONT_SERIF}`;
    const bottom = drawWrappedText(
      context,
      event.narrative,
      144,
      narrativeY,
      816,
      42,
      12,
    );
    y = bottom + 76;
  });

  if (model.omittedEventCount && y < footerTop - 80) {
    context.fillStyle = COLORS.inkSoft;
    context.font = `23px ${FONT_SANS}`;
    context.fillText(
      `另有 ${model.omittedEventCount} 段纪事留在家谱中`,
      144,
      y,
    );
    y += 58;
  }
  return y;
};

export const renderPersonPoster = async (options) => {
  const model = buildPersonPosterModel(options);
  const height = measurePersonPosterHeight(model);
  const canvas = createCanvas(height);
  const context = canvas.getContext("2d");
  drawPaperBackground(context, height);
  drawBrand(context);

  await drawPortrait(context, model, 72, 232);
  context.fillStyle = COLORS.cinnabar;
  context.font = `600 23px ${FONT_SANS}`;
  context.fillText(`人物志 · ${model.generationLabel}`, 292, 270);
  context.fillStyle = COLORS.ink;
  context.font = `600 70px ${FONT_SERIF}`;
  context.fillText(model.name, 292, 354);
  context.fillStyle = COLORS.inkSoft;
  context.font = `25px ${FONT_SANS}`;
  drawWrappedText(
    context,
    model.lifeFacts.join(" · ") || "家人的讲述，让名字长出生平",
    292,
    410,
    690,
    36,
    2,
  );

  let y = 510;
  if (model.summary) {
    roundRect(context, 72, y, 936, 190, 24, "rgba(255,253,248,0.76)");
    context.fillStyle = COLORS.ink;
    context.font = `28px ${FONT_SERIF}`;
    drawWrappedText(context, model.summary, 112, y + 54, 856, 44, 3);
    y += 244;
  }

  context.fillStyle = COLORS.cinnabar;
  context.font = `600 24px ${FONT_SANS}`;
  context.fillText("生平纪事", 72, y);
  context.fillStyle = COLORS.ink;
  context.font = `600 46px ${FONT_SERIF}`;
  context.fillText("那些值得被家人记住的片段", 72, y + 70);
  y += 132;

  drawPersonEvents(context, model, y, height - 350);
  await drawQrFooter(context, height, "来谱里，继续记录家人的一生");
  return canvas.toDataURL("image/png");
};

export const dataUrlToFile = async (dataUrl, filename) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: "image/png" });
};
