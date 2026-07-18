import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Modal, Spin, Tag, message } from "antd";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import { formatShareExpiry } from "../../utils/shareExpiry.js";
import { renderFamilyPoster } from "../../utils/sharePoster.js";
import "./FamilySharePage.css";

function FamilySharePage({
  familyName = "我的家谱",
  familyData = [],
  currentTenant,
  onBack,
}) {
  const [posterUrl, setPosterUrl] = useState("");
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [share, setShare] = useState(null);
  const [loadingShare, setLoadingShare] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshingShare, setRefreshingShare] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [now, setNow] = useState(Date.now());
  const tenantId = currentTenant?.id;
  const canPublishOnline =
    !currentTenant?.role || currentTenant.role === "OWNER";
  const posterOptions = useMemo(
    () => ({ familyName, familyData, hideProtectedNames: false }),
    [familyData, familyName],
  );

  const generatePoster = useCallback(async () => {
    setGeneratingPoster(true);
    try {
      const url = await renderFamilyPoster(posterOptions);
      setPosterUrl(url);
      trackEvent("share_poster_generated", { type: "family" });
    } catch (error) {
      console.error("生成家谱分享图片失败", error);
      message.error("图片生成失败，请稍后重试");
    } finally {
      setGeneratingPoster(false);
    }
  }, [posterOptions]);

  useEffect(() => {
    const timer = window.setTimeout(generatePoster, 80);
    return () => window.clearTimeout(timer);
  }, [generatePoster]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tenantId || !canPublishOnline) {
      setLoadingShare(false);
      return;
    }
    let active = true;
    shareService
      .getCurrent(tenantId)
      .then((result) => active && setShare(result.share))
      .catch(
        (error) =>
          active && message.error(error.message || "在线分享状态读取失败"),
      )
      .finally(() => active && setLoadingShare(false));
    return () => {
      active = false;
    };
  }, [canPublishOnline, tenantId]);

  const activeShare =
    share?.status === "ACTIVE" && new Date(share.expiresAt).getTime() > now;

  const openPublishConfirm = (refresh = false) => {
    setRefreshingShare(refresh);
    setAcknowledged(false);
    setConfirmOpen(true);
  };

  const publishOnlineShare = async () => {
    setPublishing(true);
    try {
      const result = await shareService.publish(tenantId, {
        refresh: refreshingShare,
      });
      setShare(result.share);
      setConfirmOpen(false);
      message.success(
        refreshingShare ? "公开内容已更新，旧链接已失效" : "7 天分享链接已生成",
      );
      trackEvent("share_link_created", { refreshed: refreshingShare });
    } catch (error) {
      message.error(error.message || "分享链接生成失败");
    } finally {
      setPublishing(false);
    }
  };

  const copyShareUrl = async () => {
    if (!share?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(share.shareUrl);
      message.success("分享链接已复制，7 天后自动失效");
      trackEvent("share_link_copied", { method: "clipboard" });
    } catch {
      message.error("复制失败，请长按链接手动复制");
    }
  };

  const shareOnlineUrl = async () => {
    if (!share?.shareUrl) return;
    if (!navigator.share) {
      await copyShareUrl();
      return;
    }
    try {
      await navigator.share({
        title: `${familyName}｜家谱分享`,
        text: `这是一份家人分享的家谱，有效期至 ${formatShareExpiry(share.expiresAt)}。`,
        url: share.shareUrl,
      });
      trackEvent("share_link_copied", { method: "system_share" });
    } catch (error) {
      if (error?.name !== "AbortError") message.error("暂时无法调起系统分享");
    }
  };

  const handleShareClick = () => {
    if (activeShare) {
      shareOnlineUrl();
      return;
    }
    openPublishConfirm(false);
  };

  return (
    <main className="family-share-page">
      <button
        type="button"
        onClick={onBack}
        className="family-share-back-top"
        aria-label="返回"
      >
        <ArrowLeftOutlined /> 返回
      </button>

      <section className="online-share-panel" aria-label="网页分享">
        {!canPublishOnline ? (
          <Alert
            showIcon
            type="info"
            message="只有家谱 Owner 可以发布在线分享"
            description="你仍然可以保存下方的家谱长图。"
          />
        ) : loadingShare ? (
          <div className="online-share-loading">
            <Spin />
            <span>正在读取分享状态…</span>
          </div>
        ) : activeShare ? (
          <div className="online-share-active">
            <Button
              type="primary"
              size="large"
              icon={<ShareAltOutlined />}
              onClick={handleShareClick}
            >
              分享并复制网页
            </Button>
          </div>
        ) : (
          <div className="online-share-empty">
            <Button
              type="primary"
              size="large"
              icon={<ShareAltOutlined />}
              onClick={handleShareClick}
            >
              分享并复制网页
            </Button>
          </div>
        )}
      </section>

      <section className="family-share-preview" aria-live="polite">
        <div className="family-share-poster-heading">
          <span>图片分享</span>
          <h2>同时保留一张可以保存到相册的家谱长图</h2>
        </div>
        {!posterUrl ? (
          <div className="family-share-loading">
            <Spin size="large" />
            <span>正在生成分享图片</span>
          </div>
        ) : (
          <>
            <img src={posterUrl} alt={`${familyName}分享图片预览`} />
            {generatingPoster && (
              <div className="family-share-refreshing" aria-hidden="true">
                <Spin />
              </div>
            )}
          </>
        )}
      </section>

      <Modal
        title={
          refreshingShare ? "更新公开内容并生成新链接" : "确认发布 7 天家谱分享"
        }
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={publishOnlineShare}
        okText={refreshingShare ? "更新并重新分享" : "确认发布"}
        cancelText="取消"
        confirmLoading={publishing}
        okButtonProps={{ disabled: !acknowledged }}
        width={620}
      >
        <Alert
          showIcon
          type="warning"
          message="链接有效期为 7 天，但查看者仍可截图或转发"
          description="本次会公开下列人物的真实姓名、性别、代际与亲属关系；不会公开照片、精确生日、地域、住址、联系方式、证件、人物志和原始材料。"
        />
        <div className="online-share-preview-summary">
          <strong>{familyName}</strong>
          <span>{familyData.length} 位人物</span>
          <span>
            {new Set(familyData.map((person) => person.g_rank)).size} 代
          </span>
        </div>
        <div
          className="online-share-name-preview"
          aria-label="将公开的人物姓名"
        >
          {familyData.map((person) => (
            <Tag key={String(person.person_id ?? person.id)}>
              {person.name || "姓名待考"}
            </Tag>
          ))}
        </div>
        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        >
          我已确认上述人物姓名和关系适合通过限时链接分享
        </Checkbox>
      </Modal>
    </main>
  );
}

export default FamilySharePage;
