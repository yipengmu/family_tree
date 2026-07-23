import { ClockCircleOutlined, LinkOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Link } from "react-router-dom";
import BrandLogo from "../UI/BrandLogo.js";
import "./SharePageHeader.css";

export default function SharePageHeader({
  actionDisabled = false,
  actionLabel,
  actionLoading = false,
  expiryLabel = "7天内有效",
  onShare,
}) {
  return (
    <header className="share-page-header">
      <Link
        to="/?from=share"
        className="share-page-brand"
        aria-label="了解谱里"
      >
        <BrandLogo alt="" />
        <span>
          <strong>谱里</strong>
          <small>年轻人的第一份家谱</small>
        </span>
      </Link>
      <div className="share-page-actions">
        <div className="share-page-expiry">
          <ClockCircleOutlined />
          <strong>{expiryLabel}</strong>
        </div>
        {onShare && (
          <Button
            className="share-page-link-button"
            disabled={actionDisabled}
            icon={<LinkOutlined />}
            loading={actionLoading}
            onClick={onShare}
            size="small"
            type="primary"
          >
            {actionLabel || "分享链接"}
          </Button>
        )}
      </div>
    </header>
  );
}
