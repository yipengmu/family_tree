import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftOutlined,
  AudioOutlined,
  CameraOutlined,
  CheckCircleFilled,
  CloseOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Tag,
  Upload,
} from "antd";
import AppLayout from "../Layout/AppLayout.js";
import storyService, {
  compressPhoto,
  deletePendingRecording,
  savePendingRecording,
} from "../../services/storyService.js";
import tenantService from "../../services/tenantService.js";
import { buildDirectLifeEvent } from "../../utils/lifeStory.js";
import { isPersonAlive } from "../../utils/personLifeStatus.js";
import "./PersonProfilePage.css";

const visibilityOptions = [
  { value: "FAMILY", label: "家谱成员可见" },
  { value: "PRIVATE", label: "仅自己可见" },
];
const eventTypeOptions = [
  { value: "EVERYDAY", label: "普通生活" },
  { value: "CHILDHOOD", label: "童年成长" },
  { value: "EDUCATION", label: "求学经历" },
  { value: "CAREER", label: "工作与手艺" },
  { value: "FAMILY", label: "家庭生活" },
  { value: "MIGRATION", label: "迁徙与居住" },
  { value: "OTHER", label: "其他经历" },
];
const eventTypeLabels = Object.fromEntries(
  eventTypeOptions.map((option) => [option.value, option.label]),
);
const voiceGuideSteps = [
  { key: "who", title: "谁", prompt: "这是关于谁的故事？当时还有谁在场？" },
  {
    key: "when",
    title: "何时何地",
    prompt: "大概是什么时候？事情发生在哪里？",
  },
  {
    key: "what",
    title: "发生了什么",
    prompt: "从事情的开始讲起，发生了哪些事？",
  },
  {
    key: "how",
    title: "后来怎样",
    prompt: "后来怎么样了？为什么家里人一直记得？",
  },
];

const chooseAudioType = () =>
  ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
    window.MediaRecorder?.isTypeSupported?.(type),
  ) || "";

const extensionForType = (type) => (type.includes("mp4") ? "m4a" : "webm");

function PersonProfilePage({
  person,
  familyData = [],
  onMenuClick,
  onBack,
  initialStoryOpen = false,
  onEdit,
}) {
  const tenant = tenantService.getCurrentTenant();
  const personId = person?.person_id ?? person?.id;
  const alive = isPersonAlive(person || {});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storyOpen, setStoryOpen] = useState(false);
  const [stage, setStage] = useState("capture");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [storyTime, setStoryTime] = useState("");
  const [storyLocation, setStoryLocation] = useState("");
  const [storyType, setStoryType] = useState("EVERYDAY");
  const [storyTags, setStoryTags] = useState([]);
  const [visibility, setVisibility] = useState("FAMILY");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("正在整理故事…");
  const [mediaUrls, setMediaUrls] = useState({});
  const [voiceGuideOpen, setVoiceGuideOpen] = useState(false);
  const [voiceStage, setVoiceStage] = useState("idle");
  const [autoFilled, setAutoFilled] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const latestMemoryIdRef = useRef(null);
  const secondsRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const voiceOpeningRef = useRef(false);
  const voiceCaptureRef = useRef(false);
  const tagMetadataRef = useRef({});
  const pendingKey = `person-${tenant?.id}-${personId}`;

  const loadEvents = useCallback(async () => {
    if (!tenant?.id || !personId || tenant.id === "default") {
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await storyService.getEvents(tenant.id, personId);
      setEvents(result.data || []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [personId, tenant?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (initialStoryOpen && personId && tenant?.id && tenant.id !== "default") {
      setStoryOpen(true);
    }
  }, [initialStoryOpen, personId, tenant?.id]);

  useEffect(() => {
    const assets = events
      .flatMap((event) => event.sources || [])
      .flatMap((source) => source.assets || []);
    const missing = assets.filter((asset) => !mediaUrls[asset.id]);
    if (!missing.length) return;
    Promise.all(
      missing.map(async (asset) => {
        try {
          const result = await storyService.getMediaUrl(asset.id);
          return [asset.id, result.url];
        } catch {
          return [asset.id, null];
        }
      }),
    ).then((pairs) =>
      setMediaUrls((current) => ({ ...current, ...Object.fromEntries(pairs) })),
    );
  }, [events, mediaUrls]);

  const cleanupRecorder = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanupRecorder, [cleanupRecorder]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive")
      recorderRef.current.stop();
    setRecording(false);
    setPaused(false);
    cleanupRecorder();
  }, [cleanupRecorder]);

  useEffect(() => {
    if (seconds >= 600 && recording) {
      message.info("单段录音已达到 10 分钟上限");
      stopRecording();
    }
  }, [recording, seconds, stopRecording]);

  const getExtractionDraft = (memory) =>
    memory?.jobs?.find(
      (job) => job.kind === "EXTRACT_EVENTS" && job.status === "SUCCEEDED",
    )?.output?.events?.[0] || null;

  const processVoiceMemory = async (memoryId) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const result = await storyService.processMemory(memoryId);
      if (result.status === "READY") return result.memory;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("语音整理时间较长，原音已保存，请稍后重试");
  };

  const applyVoiceDraft = (memory) => {
    const draft = getExtractionDraft(memory);
    if (!draft) throw new Error("没有从这段讲述中提炼出可填写的内容");
    setStoryTitle(draft.title || "");
    setStoryTime(draft.timeText || "");
    setStoryLocation(draft.location || "");
    setStoryType(
      eventTypeOptions.some((option) => option.value === draft.eventType)
        ? draft.eventType
        : "OTHER",
    );
    tagMetadataRef.current = Object.fromEntries(
      (draft.tags || [])
        .filter((tag) => typeof tag === "object" && tag?.label)
        .map((tag) => [tag.label, tag]),
    );
    setStoryTags(
      (draft.tags || [])
        .map((tag) => (typeof tag === "string" ? tag : tag?.label))
        .filter(Boolean),
    );
    setRawText(draft.narrative || memory.transcriptRaw || "");
    setAutoFilled(true);
    window.setTimeout(() => setAutoFilled(false), 1800);
  };

  const transcribeRecording = async (file, durationSeconds) => {
    try {
      setVoiceStage("processing");
      setProcessingLabel("正在保存原音…");
      const created = await storyService.createMemory(tenant.id, personId, {
        rawText: "",
        visibility,
        title: `关于${person.name}的语音讲述`,
      });
      const memoryId = created.memory.id;
      latestMemoryIdRef.current = memoryId;
      await storyService.uploadAsset({
        tenantId: tenant.id,
        personId,
        memoryId,
        kind: "AUDIO",
        file,
        durationSeconds,
      });
      await deletePendingRecording(pendingKey).catch(() => undefined);
      setProcessingLabel("正在识别并填写表单…");
      const memory = await processVoiceMemory(memoryId);
      applyVoiceDraft(memory);
      voiceCaptureRef.current = false;
      setVoiceGuideOpen(false);
      setVoiceStage("idle");
      message.success("语音内容已填写到表单，请确认后保存");
    } catch (error) {
      voiceCaptureRef.current = false;
      setVoiceStage("failed");
      message.error(
        latestMemoryIdRef.current
          ? `原音已保存，但自动填写失败：${error.message}`
          : error.message,
      );
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      message.error("当前浏览器不支持录音，请改用文字记录");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = chooseAudioType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48000,
      });
      discardRecordingRef.current = false;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const finalType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        const file = new File(
          [blob],
          `family-story-${Date.now()}.${extensionForType(finalType)}`,
          { type: finalType.split(";")[0] },
        );
        if (file.size > 50 * 1024 * 1024) {
          message.error("录音超过 50MB，请分成多段讲述");
          return;
        }
        if (discardRecordingRef.current) return;
        setAudioFile(file);
        await savePendingRecording(pendingKey, file).catch(() => undefined);
        if (voiceCaptureRef.current) {
          await transcribeRecording(file, secondsRef.current);
        }
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start(1000);
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(
        () => setSeconds((value) => value + 1),
        1000,
      );
      return true;
    } catch (error) {
      message.error(
        error.name === "NotAllowedError"
          ? "请允许浏览器使用麦克风"
          : "无法开始录音",
      );
      return false;
    }
  };

  const openVoiceGuide = async () => {
    if (recording || voiceOpeningRef.current) return;
    voiceOpeningRef.current = true;
    discardRecordingRef.current = false;
    setAudioFile(null);
    setSeconds(0);
    setVoiceStage("recording");
    setVoiceGuideOpen(true);
    voiceCaptureRef.current = true;
    const started = await startRecording();
    if (!started) {
      voiceCaptureRef.current = false;
      setVoiceStage("failed");
    }
    voiceOpeningRef.current = false;
  };

  const startLongPress = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(openVoiceGuide, 350);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const finishVoiceGuide = () => {
    if (!recording) return;
    setVoiceStage("processing");
    stopRecording();
  };

  const cancelVoiceGuide = () => {
    discardRecordingRef.current = true;
    voiceCaptureRef.current = false;
    stopRecording();
    setVoiceGuideOpen(false);
    setVoiceStage("idle");
    setSeconds(0);
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setPaused(true);
      clearInterval(timerRef.current);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setPaused(false);
      timerRef.current = setInterval(
        () => setSeconds((value) => value + 1),
        1000,
      );
    }
  };

  const saveSourceMaterial = async () => {
    const existingMemoryId = latestMemoryIdRef.current;
    let memoryId = existingMemoryId;
    if (memoryId) {
      await storyService.updateMemory(memoryId, {
        correctedText: rawText,
        title: storyTitle.trim() || `关于${person.name}的讲述`,
      });
    } else {
      const created = await storyService.createMemory(tenant.id, personId, {
        rawText,
        visibility,
        title: storyTitle.trim() || `关于${person.name}的讲述`,
      });
      memoryId = created.memory.id;
    }
    latestMemoryIdRef.current = memoryId;
    if (audioFile && !existingMemoryId) {
      await storyService.uploadAsset({
        tenantId: tenant.id,
        personId,
        memoryId,
        kind: "AUDIO",
        file: audioFile,
        durationSeconds: seconds,
      });
    }
    for (const entry of photos) {
      if (!entry.originFileObj) continue;
      const compressed = await compressPhoto(entry.originFileObj);
      await storyService.uploadAsset({
        tenantId: tenant.id,
        personId,
        memoryId,
        kind: "PHOTO",
        file: compressed,
      });
    }
    await deletePendingRecording(pendingKey).catch(() => undefined);
    return memoryId;
  };

  const publishDirectStory = async () => {
    let event;
    try {
      event = buildDirectLifeEvent({
        personName: person.name,
        title: storyTitle,
        narrative: rawText,
        timeText: storyTime,
        location: storyLocation,
        eventType: storyType,
        tags: storyTags.map((label) => tagMetadataRef.current[label] || label),
        isHighlight: false,
        visibility,
      });
    } catch (error) {
      message.warning(error.message);
      return;
    }

    try {
      setBusy(true);
      setProcessingLabel("正在保存家庭档案…");
      setStage("processing");
      const memoryId = await saveSourceMaterial();
      await storyService.publishMemory(memoryId, [event]);
      message.success("这段经历已写入人物志");
      closeStory();
      await loadEvents();
    } catch (error) {
      message.error(
        latestMemoryIdRef.current
          ? `原始材料已保存，但发布失败：${error.message}`
          : error.message,
      );
      setStage("capture");
    } finally {
      setBusy(false);
    }
  };

  const closeStory = () => {
    discardRecordingRef.current = true;
    voiceCaptureRef.current = false;
    cancelLongPress();
    stopRecording();
    setStoryOpen(false);
    setStage("capture");
    setAudioFile(null);
    setRawText("");
    setStoryTitle("");
    setStoryTime("");
    setStoryLocation("");
    setStoryType("EVERYDAY");
    setStoryTags([]);
    tagMetadataRef.current = {};
    setPhotos([]);
    setSeconds(0);
    latestMemoryIdRef.current = null;
    setVoiceGuideOpen(false);
    setVoiceStage("idle");
  };

  const generationLabel = useMemo(
    () => (person?.g_rank ? `第 ${person.g_rank} 代` : "家谱成员"),
    [person?.g_rank],
  );

  if (!person) {
    return (
      <AppLayout
        activeMenuItem="person"
        onMenuClick={onMenuClick}
        familyData={familyData}
        immersiveMobile
      >
        <main className="person-profile-page person-profile-missing">
          <div>
            <span>家庭档案</span>
            <h1>没有找到这位家人</h1>
            <p>人物可能已被移除，或者当前家谱没有访问权限。</p>
            <Button type="primary" onClick={onBack}>
              返回家谱
            </Button>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="person"
      onMenuClick={onMenuClick}
      familyData={familyData}
      immersiveMobile
    >
      <main className="person-profile-page">
        <button type="button" className="person-profile-back" onClick={onBack}>
          <ArrowLeftOutlined /> 返回家谱
        </button>
        <header className="person-profile-hero">
          <div className="person-profile-seal">志</div>
          <div className="person-profile-portrait">
            {person.face_img ? (
              <img src={person.face_img} alt={person.name} />
            ) : (
              <span>{person.name?.slice(-1)}</span>
            )}
          </div>
          <div className="person-profile-title">
            <span>{generationLabel}</span>
            <h1>{person.name}</h1>
            <p>
              {alive ? "与家人共同记录这一生" : "家人的讲述，让往事继续被记得"}
            </p>
          </div>
          {tenant?.id !== "default" && (
            <div className="person-profile-actions">
              <Button onClick={onEdit}>编辑资料</Button>
              <Button
                type="primary"
                icon={<AudioOutlined />}
                onClick={() => setStoryOpen(true)}
              >
                记录一段经历
              </Button>
            </div>
          )}
        </header>

        <section className="person-profile-facts">
          {person.birth_date && <span>生于 {person.birth_date}</span>}
          {person.location && (
            <span>
              <EnvironmentOutlined /> {person.location}
            </span>
          )}
          {person.official_position && <span>{person.official_position}</span>}
          <Tag color={alive ? "green" : "default"}>
            {alive ? "在世" : "已故"}
          </Tag>
        </section>

        {person.summary && (
          <blockquote className="person-profile-summary">
            {person.summary}
          </blockquote>
        )}

        <section className="life-events-section">
          <div className="life-events-heading">
            <span>人物志</span>
            <h2>生平纪事</h2>
            <p>每一段都保留讲述者和原始依据</p>
          </div>
          {loading ? (
            <Spin />
          ) : events.length === 0 ? (
            <Empty description="还没有家人留下生平纪事">
              {tenant?.id !== "default" && (
                <Button onClick={() => setStoryOpen(true)}>
                  记录第一段经历
                </Button>
              )}
            </Empty>
          ) : (
            <div className="life-timeline">
              {events.map((event) => (
                <article
                  key={event.id}
                  className={`life-event-card ${event.isHighlight ? "highlight" : ""}`}
                >
                  <div className="life-event-dot" />
                  <div className="life-event-time">
                    {event.timeText || "时间待考"}
                  </div>
                  <Card bordered={false}>
                    <div className="life-event-title-row">
                      <h3>{event.title}</h3>
                      {event.isHighlight && (
                        <Tag color="gold">
                          <HeartOutlined /> 闪光时刻
                        </Tag>
                      )}
                    </div>
                    {eventTypeLabels[event.eventType] && (
                      <Tag className="life-event-type">
                        {eventTypeLabels[event.eventType]}
                      </Tag>
                    )}
                    {event.location && (
                      <p className="life-event-location">
                        <EnvironmentOutlined /> {event.location}
                      </p>
                    )}
                    {!!event.tags?.length && (
                      <div className="life-event-tags">
                        {event.tags.map((tag) => (
                          <Tag key={`${event.id}-${tag.type}-${tag.label}`}>
                            #{tag.label}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <p className="life-event-narrative">{event.narrative}</p>
                    {event.sources
                      .flatMap((source) => source.assets)
                      .some(
                        (asset) =>
                          asset.kind === "PHOTO" && mediaUrls[asset.id],
                      ) && (
                      <div className="life-event-photos">
                        {event.sources
                          .flatMap((source) => source.assets)
                          .filter(
                            (asset) =>
                              asset.kind === "PHOTO" && mediaUrls[asset.id],
                          )
                          .map((asset) => (
                            <img
                              key={asset.id}
                              src={mediaUrls[asset.id]}
                              alt={asset.originalName || event.title}
                            />
                          ))}
                      </div>
                    )}
                    {event.sources
                      .flatMap((source) => source.assets)
                      .filter(
                        (asset) =>
                          asset.kind === "AUDIO" && mediaUrls[asset.id],
                      )
                      .map((asset) => (
                        <audio
                          key={asset.id}
                          controls
                          preload="none"
                          src={mediaUrls[asset.id]}
                        />
                      ))}
                    <footer>
                      由 {event.creatorName || "家人"} 讲述 ·{" "}
                      {new Date(event.publishedAt).toLocaleDateString("zh-CN")}
                    </footer>
                  </Card>
                </article>
              ))}
            </div>
          )}
        </section>

        <Modal
          title={`记录${person.name}的一段经历`}
          open={storyOpen}
          onCancel={closeStory}
          footer={null}
          width={720}
          destroyOnClose
          className="story-capture-modal"
          closable={!busy}
          maskClosable={!busy}
        >
          {stage === "capture" && (
            <>
              <div className="story-basic-fields">
                <Input
                  size="large"
                  value={storyTitle}
                  onChange={(event) => setStoryTitle(event.target.value)}
                  maxLength={120}
                  placeholder="给这段经历起个标题（可稍后补）"
                />
                <div className="story-draft-meta">
                  <Input
                    size="large"
                    value={storyTime}
                    onChange={(event) => setStoryTime(event.target.value)}
                    maxLength={100}
                    placeholder="大概时间，例如 1980 年代"
                  />
                  <Input
                    size="large"
                    value={storyLocation}
                    onChange={(event) => setStoryLocation(event.target.value)}
                    maxLength={200}
                    placeholder="发生地点（可选）"
                  />
                </div>
                <fieldset className="story-type-field">
                  <legend>经历类型</legend>
                  <div
                    className="story-type-tags"
                    role="radiogroup"
                    aria-label="经历类型"
                  >
                    {eventTypeOptions.map((option) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={storyType === option.value}
                        className={storyType === option.value ? "selected" : ""}
                        key={option.value}
                        onClick={() => setStoryType(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div
                className={`story-narrative-field ${autoFilled ? "auto-filled" : ""}`}
              >
                <Input.TextArea
                  rows={6}
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  maxLength={20000}
                  showCount
                  placeholder="写下发生了什么。记不清的时间、地点可以留空，也可以直接写“约”“听长辈说”或“待考”。"
                />
              </div>
              <div className="story-tag-field">
                <label htmlFor="story-tags">标签</label>
                <Select
                  id="story-tags"
                  mode="tags"
                  value={storyTags}
                  onChange={(values) => setStoryTags(values.slice(0, 12))}
                  tokenSeparators={[",", "，", " "]}
                  maxTagCount="responsive"
                  placeholder="例如：外出工作、春节、迁居"
                  open={false}
                />
              </div>
              <div className="story-attachments">
                <Upload
                  listType="picture-card"
                  accept="image/jpeg,image/png,image/webp"
                  beforeUpload={() => false}
                  fileList={photos}
                  onChange={({ fileList }) => setPhotos(fileList.slice(0, 9))}
                  multiple
                >
                  {photos.length < 9 && (
                    <div>
                      <CameraOutlined />
                      <div>相关照片</div>
                    </div>
                  )}
                </Upload>
                <div className="story-privacy-fields">
                  <Select
                    value={visibility}
                    onChange={setVisibility}
                    options={visibilityOptions}
                  />
                </div>
              </div>
              <div className="story-voice-entry">
                <div>
                  <strong>不想逐项填写？直接讲出来</strong>
                  <span>
                    系统会根据谁、何时何地、发生什么、后来怎样填写上面的表单
                  </span>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<AudioOutlined />}
                  onPointerDown={startLongPress}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onClick={openVoiceGuide}
                >
                  长按语音录入
                </Button>
              </div>
              <div className="story-submit-actions">
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<SaveOutlined />}
                  loading={busy}
                  disabled={!rawText.trim()}
                  onClick={publishDirectStory}
                >
                  保存为一条生平纪事
                </Button>
                <small>所有内容默认保存在当前私密家谱。</small>
              </div>
            </>
          )}
          {stage === "processing" && (
            <div className="story-processing">
              <Spin size="large" />
              <h3>{processingLabel}</h3>
              <p>原音和照片已经安全保存，请不要重复提交。</p>
            </div>
          )}
        </Modal>
        <Modal
          open={voiceGuideOpen}
          footer={null}
          closable={false}
          maskClosable={false}
          width="100%"
          className="voice-guide-modal"
          destroyOnClose
        >
          <div className="voice-guide-shell">
            <header>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={cancelVoiceGuide}
                disabled={voiceStage === "processing"}
              >
                取消
              </Button>
              <span className="voice-guide-time">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </header>

            {voiceStage === "processing" ? (
              <div className="voice-guide-processing">
                <Spin size="large" />
                <h2>{processingLabel}</h2>
                <p>原音会作为家庭档案保留，识别结果只会先填入表单。</p>
              </div>
            ) : voiceStage === "failed" ? (
              <div className="voice-guide-processing">
                <SoundOutlined className="voice-guide-error" />
                <h2>这次没有完成自动填写</h2>
                <p>可以重新录制，也可以返回表单继续手动填写。</p>
                <Button type="primary" onClick={openVoiceGuide}>
                  重新录制
                </Button>
                <Button onClick={cancelVoiceGuide}>返回表单</Button>
              </div>
            ) : (
              <>
                <div className="voice-guide-heading">
                  <span>正在记录{person.name}的故事</span>
                  <h2>可以松开手，照着四步慢慢讲</h2>
                </div>
                <ol className="voice-guide-steps">
                  {voiceGuideSteps.map((step, index) => {
                    const activeIndex =
                      seconds < 10
                        ? 0
                        : seconds < 25
                          ? 1
                          : seconds < 45
                            ? 2
                            : 3;
                    const completed = index < activeIndex;
                    return (
                      <li
                        key={step.key}
                        className={
                          index === activeIndex
                            ? "active"
                            : completed
                              ? "completed"
                              : ""
                        }
                      >
                        <span className="voice-step-number">
                          {completed ? <CheckCircleFilled /> : index + 1}
                        </span>
                        <div>
                          <strong>{step.title}</strong>
                          <p>{step.prompt}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div className={`voice-guide-orb ${paused ? "paused" : ""}`}>
                  <SoundOutlined />
                  <span>{paused ? "已暂停" : "正在聆听"}</span>
                </div>
                <div className="voice-guide-actions">
                  <Button
                    shape="circle"
                    size="large"
                    icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
                    aria-label={paused ? "继续录音" : "暂停录音"}
                    onClick={togglePause}
                  />
                  <Button
                    type="primary"
                    size="large"
                    onClick={finishVoiceGuide}
                  >
                    完成讲述
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </main>
    </AppLayout>
  );
}

export default PersonProfilePage;
