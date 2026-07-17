import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Spin, message } from "antd";
import { trackEvent } from "../../utils/analytics.js";
import { renderFamilyPoster } from "../../utils/sharePoster.js";
import "./FamilySharePage.css";

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

  return (
    <main className="family-share-page">
      <section className="family-share-preview" aria-live="polite">
        <button
          type="button"
          onClick={onBack}
          className="family-share-back-top"
          aria-label="返回"
        >
          <ArrowLeftOutlined />
          返回
        </button>
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
      </footer>
    </main>
  );
}

export default FamilySharePage;
