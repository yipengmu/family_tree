import { ApiAuthError } from "../auth.js";
import { getTokenHubConfig } from "./config.js";
import {
  FAMILY_TREE_IMAGE_SYSTEM_PROMPT,
  FAMILY_TREE_IMAGE_USER_PROMPT,
} from "../prompts/familyTreeImage.js";

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
          maxItems: 1,
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
              "tags",
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
              tags: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["label", "type", "source"],
                  properties: {
                    label: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["TOPIC", "PERSON", "PLACE", "TIME", "REVIEW"],
                    },
                    source: { type: "string", enum: ["AI"] },
                  },
                },
              },
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
          "你是严谨的中文家庭口述史整理助手。把一次讲述尽量整理成一条完整事件，围绕谁、何时何地、发生什么、后来怎样组织正文。只整理原文明确表达的事实，不补写动机、日期、人物或评价。模糊时间必须保留模糊表达。每条事件必须给出原文依据，并生成不超过8个简短中文标签；内容与待确认状态使用同一标签数组，type用于内部区分。",
      },
      {
        role: "user",
        content: `请把以下关于${personName || "这位亲人"}的讲述拆成适合家谱时间线的事件卡。若内容不足，可以返回空数组。\n\n${sourceText}`,
      },
    ],
  });
}

export async function parseFamilyTreeImages({ imageUrls }) {
  const config = getTokenHubConfig();
  const urls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
  if (!urls.length) throw new ApiAuthError(400, "请提供至少一张家谱图片");
  return complete({
    model: config.visionModel,
    maxTokens: 12000,
    messages: [
      {
        role: "system",
        content: FAMILY_TREE_IMAGE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: FAMILY_TREE_IMAGE_USER_PROMPT,
          },
          ...urls.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
  });
}

export async function parseFamilyTreeImage({ imageUrl }) {
  return parseFamilyTreeImages({ imageUrls: [imageUrl] });
}
