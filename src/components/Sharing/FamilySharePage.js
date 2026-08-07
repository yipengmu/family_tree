import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  EyeOutlined,
  LinkOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Modal, Result, Tag, message } from "antd";
import shareService from "../../services/shareService.js";
import { trackEvent } from "../../utils/analytics.js";
import ShareOverview, { getStats } from "./ShareOverview.js";
import SharePageHeader from "./SharePageHeader.js";
import SharePosterModal from "./SharePosterModal.js";
import "./FamilySharePage.css";

const formatDateTime = (value) => {
  if (!value) return "尚无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function FamilySharePage({
  familyName = "我的家谱",
  familyData = [],
  currentTenant,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [refreshingShare, setRefreshingShare] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState(null);
  const tenantId = currentTenant?.id;
  const canPublishOnline =
    !currentTenant?.role || currentTenant.role === "OWNER";
  const stats = useMemo(() => getStats(familyData), [familyData]);

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
      const result = await shareService.publish(tenantId, {
        refresh: refreshingShare,
      });
      trackEvent("share_link_created", { refreshed: refreshingShare });
      setShare(result.share);
      setConfirmOpen(false);
      await copyShareLink(result.share.shareUrl, "7 天分享链接已生成并复制");
    } catch (requestError) {
      message.error(requestError.message || "分享链接生成失败");
    } finally {
      setPublishing(false);
    }
  };

  const openOnlineConfirmation = (refresh = false) => {
    trackEvent("share_intent_selected", { intent: "family_link" });
    setRefreshingShare(refresh);
    setAcknowledged(false);
    setConfirmOpen(true);
  };

  const handleOnlineShare = () => {
    if (hasActiveShare) {
      copyShareLink(share.shareUrl);
      return;
    }
    openOnlineConfirmation(false);
  };

  const handleAchievementShare = () => {
    trackEvent("share_intent_selected", { intent: "achievement_poster" });
    setPosterOpen(true);
  };

  const handleRevoke = () => {
    Modal.confirm({
      title: "停止这份家谱分享？",
      content: "停止后，已经发出的链接会立即失效；你之后仍可重新生成。",
      okText: "停止分享",
      okButtonProps: { danger: true },
      cancelText: "继续保留",
      async onOk() {
        try {
          await shareService.revoke(tenantId, share.id);
          trackEvent("share_link_revoked", { result: "success" });
          setShare(null);
          message.success("分享已停止，原链接已失效");
        } catch (requestError) {
          message.error(requestError.message || "暂时无法停止分享");
          throw requestError;
        }
      },
    });
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
      <SharePageHeader expiryLabel={null} />

      {error && (
        <Alert
          className="family-share-alert"
          message={error}
          showIcon
          type="warning"
        />
      )}

      <section className="family-share-intro">
        <span>分享整理成果</span>
        <h1>
          你已经把 <strong>{stats.memberCount}</strong> 位家人，连成了
          <strong> {stats.generationCount}</strong> 代
        </h1>
        <p>让成果被看见，也让每一次公开都在你能掌控的边界里。</p>
      </section>

      <section
        className="family-share-choices"
        aria-labelledby="share-choice-title"
      >
        <div className="family-share-choice-heading">
          <span>先选择分享对象</span>
          <h2 id="share-choice-title">你想让谁看见？</h2>
        </div>

        <div className="family-share-choice-grid">
          <article className="family-share-choice is-recommended">
            <div className="family-share-choice-icon" aria-hidden="true">
              <PictureOutlined />
            </div>
            <Tag color="success">适合公开分享</Tag>
            <h3>展示我的建谱成果</h3>
            <p>
              发朋友圈或给朋友看。展示人物数、代数和匿名关系结构，帮助更多人理解谱里。
            </p>
            <ul>
              <li>全部人物姓名和家谱名称自动隐藏</li>
              <li>二维码只打开谱里，不打开你家的家谱</li>
              <li>图片在本机生成，不上传家庭资料</li>
            </ul>
            <Button
              block
              icon={<PictureOutlined />}
              onClick={handleAchievementShare}
              size="large"
              type="primary"
            >
              生成匿名成果图
            </Button>
          </article>

          <article className="family-share-choice">
            <div className="family-share-choice-icon" aria-hidden="true">
              <LinkOutlined />
            </div>
            <Tag color="warning">适合家人查看</Tag>
            <h3>限时给家人看家谱</h3>
            <p>
              发到家人群。生成一份固定 7
              天的只读快照，展示真实姓名、代际和亲属关系。
            </p>
            <ul>
              <li>不含照片、生日、住址、联系方式和故事</li>
              <li>查看者不能编辑，也不会自动成为家谱成员</li>
              <li>7 天后自动失效，你也可以随时停止</li>
            </ul>

            {hasActiveShare && (
              <div className="family-share-active-status">
                <div>
                  <EyeOutlined />
                  <span>
                    已查看 <strong>{share.viewCount || 0}</strong> 次
                  </span>
                </div>
                <small>
                  到期 {formatDateTime(share.expiresAt)} · 最近查看{" "}
                  {formatDateTime(share.lastViewedAt)}
                </small>
              </div>
            )}

            <Button
              block
              disabled={loading || !tenantId || !familyData.length}
              icon={<LinkOutlined />}
              loading={loading}
              onClick={handleOnlineShare}
              size="large"
              type={hasActiveShare ? "default" : "primary"}
            >
              {hasActiveShare ? "复制 7 天分享链接" : "确认内容并生成链接"}
            </Button>

            {hasActiveShare && (
              <div className="family-share-manage-actions">
                <a
                  href={share.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  referrerPolicy="no-referrer"
                >
                  查看家人看到的页面
                </a>
                <button
                  type="button"
                  onClick={() => openOnlineConfirmation(true)}
                >
                  更新内容并重置 7 天
                </button>
                <button type="button" onClick={handleRevoke}>
                  停止分享
                </button>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="family-share-boundary-note">
        <SafetyCertificateOutlined />
        <div>
          <strong>分享边界由用途决定</strong>
          <p>
            想让更多朋友了解产品，用匿名成果图；只有确认姓名和关系适合公开给家人时，才生成限时链接。
          </p>
        </div>
      </section>

      <ShareOverview
        eyebrow="当前家谱 · 仅你可见"
        familyData={familyData}
        familyName={familyName}
        treeHint="这是你的完整家谱视角，不代表已经公开。"
        treeTitle="分享前检查"
      />

      <Modal
        title={
          refreshingShare
            ? "确认更新家谱快照并重置 7 天"
            : "确认发布 7 天家谱分享"
        }
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={publishOnlineShare}
        okText={refreshingShare ? "确认更新并复制新链接" : "确认发布并复制链接"}
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
          <span>{stats.generationCount} 代</span>
          <span>{stats.relationshipCount} 条关系</span>
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

      <SharePosterModal
        open={posterOpen}
        onClose={() => setPosterOpen(false)}
        kind="family"
        familyAnonymized
        familyName={familyName}
        familyData={familyData}
      />
    </main>
  );
}

export default FamilySharePage;
