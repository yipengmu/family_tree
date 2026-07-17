import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DownloadOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Modal, Spin, message } from "antd";
import { trackEvent } from "../../utils/analytics.js";
import {
  dataUrlToFile,
  isShareProtectedPerson,
  renderFamilyPoster,
  renderPersonPoster,
} from "../../utils/sharePoster.js";
import "./SharePosterModal.css";

const safeFilename = (value) =>
  String(value || "谱里分享")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 48);

function SharePosterModal({
  open,
  onClose,
  kind,
  familyName,
  familyData = [],
  person,
  events = [],
}) {
  const sensitivePerson = isShareProtectedPerson(person || {});
  const [hideProtectedNames, setHideProtectedNames] = useState(true);
  const [includeLifeFacts, setIncludeLifeFacts] = useState(!sensitivePerson);
  const [includePortrait, setIncludePortrait] = useState(!sensitivePerson);
  const [includeStories, setIncludeStories] = useState(true);
  const [posterUrl, setPosterUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHideProtectedNames(true);
    setIncludeLifeFacts(!sensitivePerson);
    setIncludePortrait(!sensitivePerson);
    setIncludeStories(true);
  }, [open, sensitivePerson]);

  const posterOptions = useMemo(
    () =>
      kind === "family"
        ? { familyName, familyData, hideProtectedNames }
        : {
            person,
            events,
            includeLifeFacts,
            includePortrait,
            includeStories,
          },
    [
      events,
      familyData,
      familyName,
      hideProtectedNames,
      includeLifeFacts,
      includePortrait,
      includeStories,
      kind,
      person,
    ],
  );

  const generatePoster = useCallback(async () => {
    setGenerating(true);
    try {
      const url =
        kind === "family"
          ? await renderFamilyPoster(posterOptions)
          : await renderPersonPoster(posterOptions);
      setPosterUrl(url);
      trackEvent("share_poster_generated", { type: kind });
    } catch (error) {
      console.error("生成分享图片失败", error);
      message.error("图片生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }, [kind, posterOptions]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(generatePoster, 180);
    return () => window.clearTimeout(timer);
  }, [generatePoster, open]);

  const filename = `${safeFilename(
    kind === "family" ? familyName : `${person?.name || "家人"}人物志`,
  )}.png`;

  const downloadPoster = () => {
    if (!posterUrl) return;
    const link = document.createElement("a");
    link.href = posterUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    trackEvent("share_poster_saved", { type: kind, method: "download" });
  };

  const sharePoster = async () => {
    if (!posterUrl) return;
    try {
      const file = await dataUrlToFile(posterUrl, filename);
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        downloadPoster();
        message.info("图片已生成，也可以长按预览图保存到相册");
        return;
      }
      await navigator.share({
        files: [file],
        title: kind === "family" ? familyName : `${person?.name}人物志`,
        text: "我在谱里记录了家人的名字与故事。",
      });
      trackEvent("share_poster_saved", { type: kind, method: "system_share" });
    } catch (error) {
      if (error?.name !== "AbortError") {
        message.error("暂时无法调起系统分享，请长按图片保存");
      }
    }
  };

  return (
    <Modal
      title={kind === "family" ? "分享我的家谱" : "分享人物志"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnClose
      className="share-poster-modal"
    >
      <div className="share-poster-options" aria-label="分享图片内容设置">
        {kind === "family" ? (
          <Checkbox
            checked={hideProtectedNames}
            onChange={(event) => setHideProtectedNames(event.target.checked)}
          >
            隐藏在世及状态待确认人物姓名（推荐）
          </Checkbox>
        ) : (
          <>
            <Checkbox
              checked={includeStories}
              onChange={(event) => setIncludeStories(event.target.checked)}
            >
              包含已发布的生平纪事
            </Checkbox>
            <Checkbox
              checked={includePortrait}
              onChange={(event) => setIncludePortrait(event.target.checked)}
            >
              包含人物照片
            </Checkbox>
            <Checkbox
              checked={includeLifeFacts}
              onChange={(event) => setIncludeLifeFacts(event.target.checked)}
            >
              包含出生日期与地域
            </Checkbox>
          </>
        )}
      </div>

      <Alert
        type={sensitivePerson && kind === "person" ? "warning" : "info"}
        showIcon
        message="图片保存后将脱离家谱权限保护"
        description={
          sensitivePerson && kind === "person"
            ? "这位人物在世或生存状态待确认。请先确认本人、监护人及故事中相关家人的公开意愿。"
            : "二维码只会打开谱里产品，不会公开你的在线家谱；请仍然确认图片中的姓名和故事适合对外分享。"
        }
      />

      <div className="share-poster-preview" aria-live="polite">
        {generating || !posterUrl ? (
          <div className="share-poster-loading">
            <Spin size="large" />
            <span>正在排版分享图片…</span>
          </div>
        ) : (
          <img
            src={posterUrl}
            alt={kind === "family" ? `${familyName}分享图片预览` : `${person?.name}人物志分享图片预览`}
          />
        )}
      </div>
      <p className="share-poster-hint">手机端可长按上方图片保存到相册</p>

      <div className="share-poster-actions">
        <Button
          icon={<ReloadOutlined />}
          disabled={generating}
          onClick={generatePoster}
        >
          重新生成
        </Button>
        <Button
          icon={<DownloadOutlined />}
          disabled={!posterUrl || generating}
          onClick={downloadPoster}
        >
          保存图片
        </Button>
        <Button
          type="primary"
          icon={<ShareAltOutlined />}
          disabled={!posterUrl || generating}
          onClick={sharePoster}
        >
          分享图片
        </Button>
      </div>
    </Modal>
  );
}

export default SharePosterModal;

