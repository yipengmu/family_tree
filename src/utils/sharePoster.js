import QRCode from "qrcode";
import BRAND from "../constants/brand.js";
import { isPersonAlive } from "./personLifeStatus.js";

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

const drawBrand = (context, y = 72) => {
  roundRect(context, 72, y, 78, 78, 20, COLORS.cinnabar);
  context.fillStyle = "#fffaf1";
  context.font = `600 44px ${FONT_SERIF}`;
  context.textAlign = "center";
  context.fillText(BRAND.seal, 111, y + 55);

  context.textAlign = "left";
  context.fillStyle = COLORS.ink;
  context.font = `600 34px ${FONT_SERIF}`;
  context.fillText(BRAND.name, 172, y + 32);
  context.fillStyle = COLORS.inkSoft;
  context.font = `24px ${FONT_SANS}`;
  context.fillText(BRAND.tagline, 172, y + 68);
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
  context.fillText("长按识别二维码，来谱里记录你的家人", 72, footerTop + 126);
  context.fillText("tree.tatababa.top", 72, footerTop + 172);
  context.drawImage(qrImage, 776, footerTop + 42, 232, 232);

  context.fillStyle = "rgba(47,43,37,0.46)";
  context.font = `20px ${FONT_SANS}`;
  context.fillText("图片由谱里在本机生成，不代表家谱已公开", 72, height - 52);
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

const drawFamilyGroups = (context, model, startY) => {
  let y = startY;
  model.groups.forEach((group, index) => {
    if (group.omitted) {
      context.fillStyle = COLORS.inkSoft;
      context.font = `32px ${FONT_SERIF}`;
      context.textAlign = "center";
      context.fillText("⋮", 130, y + 42);
      context.textAlign = "left";
      y += 74;
      return;
    }

    if (index < model.groups.length - 1) {
      context.strokeStyle = COLORS.gold;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(130, y + 64);
      context.lineTo(130, y + 154);
      context.stroke();
    }

    roundRect(context, 84, y + 18, 92, 92, 46, COLORS.pine);
    context.fillStyle = "#fffdf8";
    context.font = `600 26px ${FONT_SERIF}`;
    context.textAlign = "center";
    context.fillText(group.generation || "?", 130, y + 75);
    context.textAlign = "left";

    roundRect(
      context,
      214,
      y,
      794,
      132,
      22,
      "rgba(255,253,248,0.9)",
      COLORS.hairline,
    );
    context.fillStyle = COLORS.cinnabar;
    context.font = `600 21px ${FONT_SANS}`;
    context.fillText(group.label, 246, y + 38);
    context.fillStyle = COLORS.ink;
    context.font = `600 30px ${FONT_SERIF}`;
    const names = group.people.map((person) => person.name).join("　");
    const suffix = group.hiddenCount ? `　等 ${group.hiddenCount + 4} 位` : "";
    drawWrappedText(context, `${names}${suffix}`, 246, y + 86, 720, 38, 1);
    y += 158;
  });
  return y;
};

export const renderFamilyPoster = async (options) => {
  const model = buildFamilyPosterModel(options);
  const height = Math.max(1850, 1200 + model.groups.length * 158);
  const canvas = createCanvas(height);
  const context = canvas.getContext("2d");
  drawPaperBackground(context, height);
  drawBrand(context);

  context.fillStyle = COLORS.cinnabar;
  context.font = `600 24px ${FONT_SANS}`;
  context.fillText("我的家庭世系", 72, 244);
  context.fillStyle = COLORS.ink;
  context.font = `600 66px ${FONT_SERIF}`;
  drawWrappedText(context, model.familyName, 72, 324, 936, 78, 2);

  roundRect(context, 72, 470, 936, 160, 28, COLORS.pine);
  context.fillStyle = "#fffdf8";
  context.font = `600 46px ${FONT_SERIF}`;
  context.fillText(`${model.memberCount} 位家人`, 116, 548);
  context.fillStyle = "rgba(255,253,248,0.72)";
  context.font = `26px ${FONT_SANS}`;
  context.fillText(
    model.generationCount
      ? `${model.generationCount} 代相承 · 仍在持续补充`
      : "每一个名字，都值得被记住",
    116,
    594,
  );

  context.fillStyle = COLORS.inkSoft;
  context.font = `24px ${FONT_SANS}`;
  context.fillText(
    model.hideProtectedNames
      ? "在世及状态待确认人物已使用隐私称谓"
      : "这张图片包含家人姓名，请确认公开范围",
    72,
    690,
  );

  drawFamilyGroups(context, model, 750);
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
