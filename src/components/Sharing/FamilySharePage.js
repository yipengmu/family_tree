import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Checkbox, Modal, Result, Tag, message } from "antd";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import ShareOverview from "./ShareOverview.js";
import SharePageHeader from "./SharePageHeader.js";
import "./FamilySharePage.css";

function FamilySharePage({
  familyName = "我的家谱",
  familyData = [],
  currentTenant,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState(null);
  const tenantId = currentTenant?.id;
  const canPublishOnline =
    !currentTenant?.role || currentTenant.role === "OWNER";

  const hasActiveShare =
    share?.status === "ACTIVE" &&
    new Date(share.expiresAt).getTime() > Date.now();

  useEffect(() => {
    if (!tenantId || !canPublishOnline) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    shareService
      .getCurrent(tenantId)
      .then((result) => {
        if (!active) return;
        const currentShare = result.share;
        const isActive =
          currentShare?.status === "ACTIVE" &&
          new Date(currentShare.expiresAt).getTime() > Date.now();
        setShare(isActive ? currentShare : null);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "在线分享状态读取失败");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canPublishOnline, tenantId]);

  const copyShareLink = useCallback(async (shareUrl, successMessage) => {
    if (!shareUrl) return false;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(shareUrl);
      trackEvent("share_link_copied", { method: "clipboard" });
      message.success(successMessage || "分享链接已复制");
      return true;
    } catch {
      message.warning("链接已生成，请从地址栏复制后分享");
      return false;
    }
  }, []);

  const publishOnlineShare = async () => {
    setPublishing(true);
    try {
      const result = await shareService.publish(tenantId);
      trackEvent("share_link_created", { refreshed: false });
      setShare(result.share);
      setConfirmOpen(false);
      await copyShareLink(result.share.shareUrl, "分享链接已生成并复制");
    } catch (requestError) {
      message.error(requestError.message || "分享链接生成失败");
    } finally {
      setPublishing(false);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
  };

  const handleShareAction = () => {
    if (hasActiveShare) {
      copyShareLink(share.shareUrl);
      return;
    }
    setAcknowledged(false);
    setConfirmOpen(true);
  };

  if (!canPublishOnline) {
    return (
      <main className="family-share-gateway">
        <Result
          status="info"
          title="只有家谱 Owner 可以发布在线分享"
          subTitle="在线分享会公开人物姓名和亲属关系，需要由家谱 Owner 确认。"
          extra={
            <Button type="primary" onClick={onBack}>
              返回家谱
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="family-share-page" aria-live="polite">
      <SharePageHeader
        actionDisabled={loading || !tenantId}
        actionLabel={hasActiveShare ? "分享链接" : "生成分享链接"}
        actionLoading={loading}
        expiryLabel={hasActiveShare ? "7天内有效" : "发布后7天有效"}
        onShare={handleShareAction}
      />

      {error && (
        <Alert
          className="family-share-alert"
          message={error}
          showIcon
          type="warning"
        />
      )}

      <ShareOverview
        eyebrow="家谱分享"
        familyData={familyData}
        familyName={familyName}
        treeTitle="家谱树状图"
      />

      <Modal
        title="确认发布 7 天家谱分享"
        open={confirmOpen}
        onCancel={handleCancel}
        onOk={publishOnlineShare}
        okText="确认发布并复制链接"
        cancelText="取消"
        confirmLoading={publishing}
        okButtonProps={{ disabled: !acknowledged }}
        width={620}
        maskClosable={false}
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
