const firstMeaningfulLine = (value) =>
  String(value || "")
    .split(/[\n。！？!?]/)
    .map((part) => part.trim())
    .find(Boolean) || "";

export const buildDirectLifeEvent = ({
  personName,
  title,
  narrative,
  timeText,
  location,
  eventType = "OTHER",
  isHighlight = false,
  visibility = "FAMILY",
}) => {
  const normalizedNarrative = String(narrative || "").trim();
  if (!normalizedNarrative) {
    throw new Error("请先写下一段经历");
  }

  const fallbackTitle =
    firstMeaningfulLine(normalizedNarrative).slice(0, 24) ||
    `关于${personName || "这位家人"}的一段往事`;

  return {
    title:
      String(title || "")
        .trim()
        .slice(0, 120) || fallbackTitle,
    narrative: normalizedNarrative,
    timeText: String(timeText || "")
      .trim()
      .slice(0, 100),
    location: String(location || "")
      .trim()
      .slice(0, 200),
    eventType: String(eventType || "OTHER").toUpperCase(),
    datePrecision: "UNKNOWN",
    isHighlight: isHighlight === true,
    visibility,
    sourceQuote: normalizedNarrative.slice(0, 2000),
  };
};
