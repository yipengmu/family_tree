import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, Spin, message } from "antd";
import { trackEvent } from "../../utils/analytics.js";
import { dataUrlToFile, renderFamilyPoster } from "../../utils/sharePoster.js";
import "./FamilySharePage.css";

const safeFilename = (value) =>
  String(value || "谱里家谱")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 48);

function FamilySharePage({ familyName = "我的家谱", familyData = [], onBack }) {
  const [posterUrl, setPosterUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const posterOptions = useMemo(
    () => ({
      familyName,
      familyData,
      hideProtectedNames: false,
    }),
    [familyData, familyName],
  );

  const generatePoster = useCallback(async () => {
    setGenerating(true);
    try {
      const url = await renderFamilyPoster(posterOptions);
      setPosterUrl(url);
      trackEvent("share_poster_generated", { type: "family" });
    } catch (error) {
      console.error("生成家谱分享图片失败", error);
      message.error("图片生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }, [posterOptions]);

  useEffect(() => {
    const timer = window.setTimeout(generatePoster, 80);
    return () => window.clearTimeout(timer);
  }, [generatePoster]);

  const filename = `${safeFilename(familyName)}.png`;

  const downloadPoster = () => {
    if (!posterUrl) return;
    const link = document.createElement("a");
    link.href = posterUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    trackEvent("share_poster_saved", { type: "family", method: "download" });
  };

  const sharePoster = async () => {
    if (!posterUrl) return;
    try {
      if (!navigator.share || typeof File === "undefined") {
        downloadPoster();
        message.info("图片已生成，也可以长按预览图保存到相册");
        return;
      }
      const file = await dataUrlToFile(posterUrl, filename);
      if (!navigator.canShare?.({ files: [file] })) {
        downloadPoster();
        message.info("图片已生成，也可以长按预览图保存到相册");
        return;
      }
      await navigator.share({
        files: [file],
        title: familyName,
        text: "我在谱里记录了家人的名字与故事。",
      });
      trackEvent("share_poster_saved", {
        type: "family",
        method: "system_share",
      });
    } catch (error) {
      if (error?.name !== "AbortError") {
        message.error("暂时无法调起系统分享，请长按图片保存");
      }
    }
  };

  return (
    <main className="family-share-page">
      <header className="family-share-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="family-share-back"
          aria-label="返回"
        />
        <div>
          <h1>分享家谱</h1>
          <p>预览图将正常展示家人姓名</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          disabled={generating}
          onClick={generatePoster}
          className="family-share-refresh"
        >
          重新生成
        </Button>
      </header>

      <section className="family-share-preview" aria-live="polite">
        {!posterUrl ? (
          <div className="family-share-loading">
            <Spin size="large" />
            <span>正在生成分享图片</span>
          </div>
        ) : (
          <>
            <img src={posterUrl} alt={`${familyName}分享图片预览`} />
            {generating && (
              <div className="family-share-refreshing" aria-hidden="true">
                <Spin />
              </div>
            )}
          </>
        )}
      </section>

      <footer className="family-share-actions">
        <div className="family-share-action-hints">
          <div className="action-hint-item">
            <DownloadOutlined />
            <span>保存到相册</span>
          </div>
          <div className="action-hint-divider">或</div>
          <div className="action-hint-item">
            <ShareAltOutlined />
            <span>分享给亲友</span>
          </div>
        </div>
        <p className="family-share-tip">手机端也可长按图片保存</p>
        <div className="family-share-buttons">
          <Button
            size="large"
            icon={<DownloadOutlined />}
            disabled={!posterUrl || generating}
            onClick={downloadPoster}
            className="family-share-btn-save"
          >
            保存图片
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<ShareAltOutlined />}
            disabled={!posterUrl || generating}
            onClick={sharePoster}
            className="family-share-btn-share"
          >
            分享图片
          </Button>
        </div>
      </footer>
    </main>
  );
}

export default FamilySharePage;
