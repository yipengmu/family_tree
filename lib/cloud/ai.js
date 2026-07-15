import { ApiAuthError } from "../auth.js";
import { getTokenHubConfig } from "./config.js";

const stripFence = (value) =>
  String(value || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

async function complete({ model, messages, schema, maxTokens = 4000 }) {
  const config = getTokenHubConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: schema
        ? {
            type: "json_schema",
            json_schema: {
              name: schema.name,
              strict: true,
              schema: schema.schema,
            },
          }
        : { type: "json_object" },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiAuthError(
      502,
      payload?.error?.message || "腾讯云大模型调用失败",
    );
  const content = payload?.choices?.[0]?.message?.content;
  try {
    return {
      data: JSON.parse(stripFence(content)),
      usage: payload.usage || null,
      raw: payload,
    };
  } catch {
    throw new ApiAuthError(502, "腾讯云大模型返回了无法解析的结构化结果");
  }
}

export async function extractLifeEvents({
  transcript,
  correctedText,
  personName,
}) {
  const config = getTokenHubConfig();
  const sourceText = String(correctedText || transcript || "").trim();
  const schema = {
    name: "life_events",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["events"],
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "narrative",
              "eventType",
              "timeText",
              "datePrecision",
              "location",
              "isHighlight",
              "sourceQuote",
            ],
            properties: {
              title: { type: "string" },
              narrative: { type: "string" },
              eventType: { type: "string" },
              timeText: { type: "string" },
              datePrecision: {
                type: "string",
                enum: [
                  "EXACT",
                  "MONTH",
                  "YEAR",
                  "DECADE",
                  "APPROXIMATE",
                  "UNKNOWN",
                ],
              },
              location: { type: "string" },
              isHighlight: { type: "boolean" },
              sourceQuote: { type: "string" },
            },
          },
        },
      },
    },
  };
  return complete({
    model: config.storyModel,
    schema,
    messages: [
      {
        role: "system",
        content:
          "你是严谨的中文家庭口述史整理助手。只整理原文明确表达的事实，不补写动机、日期、人物或评价。模糊时间必须保留模糊表达。每条事件必须给出原文依据。",
      },
      {
        role: "user",
        content: `请把以下关于${personName || "这位亲人"}的讲述拆成适合家谱时间线的事件卡。若内容不足，可以返回空数组。\n\n${sourceText}`,
      },
    ],
  });
}

export async function parseFamilyTreeImage({ imageUrl }) {
  const config = getTokenHubConfig();
  return complete({
    model: config.visionModel,
    maxTokens: 6000,
    messages: [
      {
        role: "system",
        content:
          "你是严谨的中文纸质家谱图片整理助手。直接阅读图片里的文字、排版、代际层级和连接线，只输出图片明确呈现的候选，不得猜测看不清的姓名、关系、时间或地点。保留原图中的异体字和模糊表述；无法确认的字段留空。输出单个JSON对象，不要输出解释或Markdown。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: '请解析这张家谱图片，输出 {"rawText":"按版面顺序抄录的原文","warnings":["无法确认的内容"],"people":[{"id":"图片内临时编号","name":"姓名","g_rank":1,"rank_index":1,"g_father_id":null,"g_mother_id":null,"sex":"MAN或WOMAN","adoption":"none","official_position":"","summary":"","birth_date":null,"spouse":null,"location":null,"formal_name":null}]}。父母编号只能引用同一张图片 people 中的 id；看不清时使用 null。',
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
}
