import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Modal,
  Result,
  Spin,
  Tag,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../UI/BrandLogo.js";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import { getPublicShareDestination } from "../../utils/shareNavigation.js";
import "./FamilySharePage.css";

function FamilySharePage({
  familyName = "我的家谱",
  familyData = [],
  currentTenant,
  onBack,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const tenantId = currentTenant?.id;
  const canPublishOnline =
    !currentTenant?.role || currentTenant.role === "OWNER";

  const openPublicShare = useCallback(
    (nextShare) => {
      const currentOrigin = window.location.origin;
      const destination = getPublicShareDestination(
        nextShare?.shareUrl,
        currentOrigin,
      );
      if (!destination) {
        setError("分享链接暂时无法打开");
        setLoading(false);
        return;
      }

      if (destination.startsWith("/")) {
        navigate(destination, { replace: true });
        return;
      }
      window.location.replace(destination);
    },
    [navigate],
  );

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
        const share = result.share;
        const isActive =
          share?.status === "ACTIVE" &&
          new Date(share.expiresAt).getTime() > Date.now();
        if (isActive) {
          openPublicShare(share);
          return;
        }
        setLoading(false);
        setConfirmOpen(true);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "在线分享状态读取失败");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canPublishOnline, openPublicShare, tenantId]);

  const publishOnlineShare = async () => {
    setPublishing(true);
    try {
      const result = await shareService.publish(tenantId);
      trackEvent("share_link_created", { refreshed: false });

      try {
        await navigator.clipboard?.writeText(result.share.shareUrl);
        trackEvent("share_link_copied", { method: "clipboard" });
      } catch {
        // 复制能力受浏览器权限影响；不阻止分享人进入真实访问页。
      }

      setConfirmOpen(false);
      openPublicShare(result.share);
    } catch (requestError) {
      message.error(requestError.message || "分享链接生成失败");
      setPublishing(false);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    onBack?.();
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
    <main className="family-share-gateway" aria-live="polite">
      {error ? (
        <Result
          status="warning"
          title={error}
          extra={
            <Button type="primary" onClick={onBack}>
              返回家谱
            </Button>
          }
        />
      ) : (
        <div className="family-share-gateway-loading" role="status">
          <BrandLogo alt="谱里" />
          {loading && <Spin size="large" />}
          <p>
            {loading ? "正在打开实际分享页面…" : "确认后将打开实际分享页面"}
          </p>
        </div>
      )}

      <Modal
        title="确认发布 7 天家谱分享"
        open={confirmOpen}
        onCancel={handleCancel}
        onOk={publishOnlineShare}
        okText="确认发布并查看"
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
