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
  Checkbox,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Switch,
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

const prompts = [
  "小时候最鲜明的记忆",
  "求学或工作的经历",
  "他怎样照顾家人",
  "经历过的困难",
  "最让你敬佩的选择",
  "想留给后人的一句话",
];
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
  const [storyHighlight, setStoryHighlight] = useState(false);
  const [visibility, setVisibility] = useState("FAMILY");
  const [photos, setPhotos] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("正在整理故事…");
  const [mediaUrls, setMediaUrls] = useState({});
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const latestMemoryIdRef = useRef(null);
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

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      message.error("当前浏览器不支持录音，请改用文字记录");
      return;
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
    } catch (error) {
      message.error(
        error.name === "NotAllowedError"
          ? "请允许浏览器使用麦克风"
          : "无法开始录音",
      );
    }
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

  const pollProcessing = async (memoryId) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = await storyService.processMemory(memoryId);
      if (result.status === "READY") return result.memory;
      setProcessingLabel(
        result.job?.kind === "TRANSCRIBE"
          ? "正在听写原声…"
          : "正在提炼生平纪事…",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("处理时间较长，原始材料已经保存，请稍后重新打开");
  };

  const saveSourceMaterial = async () => {
    const created = await storyService.createMemory(tenant.id, personId, {
      rawText,
      visibility,
      title: storyTitle.trim() || `关于${person.name}的讲述`,
    });
    const memoryId = created.memory.id;
    latestMemoryIdRef.current = memoryId;
    if (audioFile) {
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
        isHighlight: storyHighlight,
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

  const submitStory = async () => {
    if (!audioFile && !rawText.trim()) {
      message.warning("请录一段故事或填写文字");
      return;
    }
    try {
      setBusy(true);
      setStage("processing");
      setProcessingLabel(audioFile ? "正在听写原声…" : "正在提炼生平纪事…");
      const memoryId = await saveSourceMaterial();
      const memory = await pollProcessing(memoryId);
      const extraction = memory.jobs.find(
        (job) => job.kind === "EXTRACT_EVENTS" && job.status === "SUCCEEDED",
      );
      const extracted = extraction?.output?.events || [];
      setDrafts(
        extracted.map((event, index) => ({
          ...event,
          key: `${index}`,
          selected: true,
          visibility,
        })),
      );
      setStage("review");
    } catch (error) {
      message.error(error.message);
      setStage("capture");
    } finally {
      setBusy(false);
    }
  };

  const publishDrafts = async () => {
    const selected = drafts.filter((draft) => draft.selected);
    if (!selected.length) {
      message.warning("请至少选择一条纪事");
      return;
    }
    try {
      setBusy(true);
      const memoryId = await findLatestDraftMemory();
      await storyService.publishMemory(memoryId, selected);
      message.success("生平纪事已写入人物志");
      closeStory();
      await loadEvents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const findLatestDraftMemory = async () => latestMemoryIdRef.current;

  const closeStory = () => {
    discardRecordingRef.current = true;
    stopRecording();
    setStoryOpen(false);
    setStage("capture");
    setAudioFile(null);
    setRawText("");
    setStoryTitle("");
    setStoryTime("");
    setStoryLocation("");
    setStoryType("EVERYDAY");
    setStoryHighlight(false);
    setPhotos([]);
    setDrafts([]);
    setSeconds(0);
    latestMemoryIdRef.current = null;
  };

  const updateDraft = (index, field, value) =>
    setDrafts((current) =>
      current.map((draft, itemIndex) =>
        itemIndex === index ? { ...draft, [field]: value } : draft,
      ),
    );
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
            <Button
              type="primary"
              icon={<AudioOutlined />}
              onClick={() => setStoryOpen(true)}
            >
              记录一段经历
            </Button>
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
              <p className="story-intro">
                先写下记得的部分就可以。文字、原声和照片会作为家庭档案保留；使用
                AI 整理时，也必须由你确认后才会发布。
              </p>
              <div className="story-prompts">
                {prompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() =>
                      setRawText((value) =>
                        value ? `${value}\n${prompt}：` : `${prompt}：`,
                      )
                    }
                  >
                    {prompt}
                  </button>
                ))}
              </div>
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
                <Select
                  size="large"
                  value={storyType}
                  onChange={setStoryType}
                  options={eventTypeOptions}
                />
              </div>
              <Input.TextArea
                rows={6}
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                maxLength={20000}
                showCount
                placeholder="写下发生了什么。记不清的时间、地点可以留空，也可以直接写“约”“听长辈说”或“待考”。"
              />
              <div className={`story-recorder ${recording ? "recording" : ""}`}>
                <div className="story-wave">
                  <SoundOutlined />
                </div>
                <strong>
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </strong>
                {!recording && !audioFile && (
                  <Button
                    type="primary"
                    shape="round"
                    icon={<AudioOutlined />}
                    onClick={startRecording}
                  >
                    开始录音
                  </Button>
                )}
                {recording && (
                  <>
                    <Button
                      shape="circle"
                      icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
                      onClick={togglePause}
                    />
                    <Button danger shape="round" onClick={stopRecording}>
                      结束录音
                    </Button>
                  </>
                )}
                {audioFile && !recording && (
                  <span className="story-recorded">
                    已保留一段原声 · {(audioFile.size / 1024 / 1024).toFixed(1)}
                    MB
                  </span>
                )}
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
                  <label>
                    <Switch
                      checked={storyHighlight}
                      onChange={setStoryHighlight}
                    />{" "}
                    标记为重要经历
                  </label>
                </div>
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
                <Button
                  size="large"
                  block
                  loading={busy}
                  disabled={!audioFile && !rawText.trim()}
                  onClick={submitStory}
                >
                  用 AI 整理成多条草稿
                </Button>
                <small>
                  直接保存不会调用 AI；所有内容默认保存在当前私密家谱。
                </small>
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
          {stage === "review" && (
            <div className="story-review">
              <div className="story-review-heading">
                <h3>请确认准备写入人物志的内容</h3>
                <p>可以修改、取消选择；AI 不会自动发布。</p>
              </div>
              {drafts.length === 0 ? (
                <Empty description="这段讲述暂时没有提取出明确事件，请补充更多时间或经历信息" />
              ) : (
                drafts.map((draft, index) => (
                  <Card key={draft.key} className="story-draft-card">
                    <Checkbox
                      checked={draft.selected}
                      onChange={(event) =>
                        updateDraft(index, "selected", event.target.checked)
                      }
                    >
                      写入人物志
                    </Checkbox>
                    <Input
                      value={draft.title}
                      onChange={(event) =>
                        updateDraft(index, "title", event.target.value)
                      }
                      placeholder="事件标题"
                    />
                    <div className="story-draft-meta">
                      <Input
                        value={draft.timeText}
                        onChange={(event) =>
                          updateDraft(index, "timeText", event.target.value)
                        }
                        placeholder="约 1980 年代"
                      />
                      <Input
                        value={draft.location}
                        onChange={(event) =>
                          updateDraft(index, "location", event.target.value)
                        }
                        placeholder="地点（可选）"
                      />
                    </div>
                    <Input.TextArea
                      rows={4}
                      value={draft.narrative}
                      onChange={(event) =>
                        updateDraft(index, "narrative", event.target.value)
                      }
                    />
                    <div className="story-draft-source">
                      原话依据：{draft.sourceQuote || "未标明"}
                    </div>
                    <label>
                      <Switch
                        checked={draft.isHighlight}
                        onChange={(checked) =>
                          updateDraft(index, "isHighlight", checked)
                        }
                      />{" "}
                      标记为闪光时刻
                    </label>
                  </Card>
                ))
              )}
              <Button
                type="primary"
                size="large"
                block
                loading={busy}
                onClick={publishDrafts}
              >
                确认并发布所选纪事
              </Button>
            </div>
          )}
        </Modal>
      </main>
    </AppLayout>
  );
}

export default PersonProfilePage;
