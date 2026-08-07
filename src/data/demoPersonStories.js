export const DEMO_STORY_PERSON_ID = "394";

const demoStories = {
  [DEMO_STORY_PERSON_ID]: [
    {
      id: "demo-mu-jinsheng-vet",
      title: "在乡间做过兽医",
      narrative:
        "家人讲述，穆金声曾在乡间做过兽医。这是后辈重新询问长辈后，才从零散记忆里找回来的一段普通生活。",
      eventType: "CAREER",
      timeText: "时间待考",
      location: "老家乡间",
      tags: [{ type: "TOPIC", label: "兽医", source: "USER" }],
      isHighlight: false,
      visibility: "FAMILY",
      status: "PUBLISHED",
      creatorName: "家人",
      publishedAt: "2026-07-17T00:00:00.000Z",
      sourceLabel: "父亲讲述 · 细节待继续考证",
      sources: [],
    },
    {
      id: "demo-mu-jinsheng-craft",
      title: "会木工，也会制作木箍桶",
      narrative:
        "除了日常劳作，他还会木工，也会制作家用木箍桶。具体在何时学会、做过哪些物件，仍待家人继续补充。",
      eventType: "CAREER",
      timeText: "时间待考",
      tags: [
        { type: "TOPIC", label: "木工", source: "USER" },
        { type: "TOPIC", label: "木箍桶", source: "USER" },
      ],
      isHighlight: false,
      visibility: "FAMILY",
      status: "PUBLISHED",
      creatorName: "家人",
      publishedAt: "2026-07-17T00:00:00.000Z",
      sourceLabel: "父亲讲述 · 细节待继续考证",
      sources: [],
    },
    {
      id: "demo-mu-jinsheng-reading",
      title: "家人记得他读过《毛选》",
      narrative:
        "父辈记得他读过《毛选》。书从何处得来、常在什么时候读，目前还没有确定的说法。人物志允许这些细节先留作待考。",
      eventType: "EVERYDAY",
      timeText: "时间待考",
      tags: [{ type: "TOPIC", label: "阅读", source: "USER" }],
      isHighlight: false,
      visibility: "FAMILY",
      status: "PUBLISHED",
      creatorName: "家人",
      publishedAt: "2026-07-17T00:00:00.000Z",
      sourceLabel: "父亲讲述 · 细节待继续考证",
      sources: [],
    },
  ],
};

export const getDemoPersonStories = (personId) =>
  demoStories[String(personId)]?.map((story) => ({ ...story })) || [];
