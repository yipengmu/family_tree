import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "antd";
import { MobileOutlined, QrcodeOutlined } from "@ant-design/icons";
import QRCode from "qrcode";
import { getMobileAccessUrl } from "../../utils/deviceAccess.js";
import { trackEvent } from "../../utils/analytics.js";
import "./DesktopMobileAccess.css";

const DesktopMobileAccess = ({ source = "website" }) => {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const mobileUrl = useMemo(() => getMobileAccessUrl(), []);

  useEffect(() => {
    if (!open || qrDataUrl) return undefined;

    let active = true;
    QRCode.toDataURL(mobileUrl, {
      width: 280,
      margin: 1,
      color: { dark: "#173f38", light: "#fffdf7" },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [mobileUrl, open, qrDataUrl]);

  const openDialog = () => {
    setOpen(true);
    trackEvent("mobile_qr_open", { source });
  };

  return (
    <>
      <button
        className="desktop-mobile-access-trigger"
        type="button"
        onClick={openDialog}
        aria-label="扫码在手机上打开谱里"
      >
        <QrcodeOutlined aria-hidden="true" />
        <span>
          <strong>手机访问</strong>
          <small>微信扫码打开</small>
        </span>
      </button>

      <Modal
        className="desktop-mobile-access-modal"
        title="用手机打开谱里"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={390}
        centered
        destroyOnClose
      >
        <div className="desktop-mobile-access-content">
          <div className="desktop-mobile-access-qr" aria-live="polite">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                width="224"
                height="224"
                alt="扫码在手机上打开谱里产品"
              />
            ) : (
              <span role="status">正在生成二维码…</span>
            )}
          </div>
          <strong>
            <MobileOutlined aria-hidden="true" /> 手机扫码，马上开始
          </strong>
          <p>
            可用微信或手机相机扫码，直接打开移动端；登录后继续管理自己的家谱。
          </p>
          <small>二维码只包含谱里公开入口，不包含家谱资料或登录信息。</small>
          <Button type="text" onClick={() => setOpen(false)}>
            继续在电脑上浏览
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default DesktopMobileAccess;
