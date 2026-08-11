import React, { useEffect, useMemo, useState } from "react";
import {
  CloseOutlined,
  ExportOutlined,
  PlusSquareOutlined,
} from "@ant-design/icons";
import {
  getMobileBrowserKind,
  HOME_SHORTCUT_OPEN_EVENT,
  HOME_SHORTCUT_SEEN_KEY,
  shouldOfferHomeShortcut,
} from "../../utils/deviceAccess.js";
import { trackEvent } from "../../utils/analytics.js";
import "./HomeShortcutPrompt.css";

const AUTO_PROMPT_DELAY = 12000;

const HomeShortcutPrompt = () => {
  const [open, setOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(
    () => window.__puliDeferredInstallPrompt || null,
  );
  const browserKind = useMemo(() => getMobileBrowserKind(), []);

  useEffect(() => {
    if (!shouldOfferHomeShortcut()) return undefined;

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      window.__puliDeferredInstallPrompt = event;
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      window.__puliDeferredInstallPrompt = null;
      localStorage.setItem(HOME_SHORTCUT_SEEN_KEY, new Date().toISOString());
      setOpen(false);
      trackEvent("home_shortcut_prompt_action", { action: "installed" });
    };
    const handleManualOpen = () => {
      setShowInstructions(false);
      setOpen(true);
      trackEvent("home_shortcut_prompt_view", { source: "settings" });
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(HOME_SHORTCUT_OPEN_EVENT, handleManualOpen);

    let timer;
    if (!localStorage.getItem(HOME_SHORTCUT_SEEN_KEY)) {
      timer = window.setTimeout(() => {
        setOpen(true);
        trackEvent("home_shortcut_prompt_view", { source: "first-visit" });
      }, AUTO_PROMPT_DELAY);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(HOME_SHORTCUT_OPEN_EVENT, handleManualOpen);
    };
  }, []);

  const rememberAndClose = (action = "dismiss") => {
    localStorage.setItem(HOME_SHORTCUT_SEEN_KEY, new Date().toISOString());
    setOpen(false);
    setShowInstructions(false);
    trackEvent("home_shortcut_prompt_action", { action });
  };

  const handlePrimaryAction = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      window.__puliDeferredInstallPrompt = null;
      setInstallPrompt(null);
      rememberAndClose(
        choice?.outcome === "accepted" ? "installed" : "declined",
      );
      return;
    }

    setShowInstructions(true);
    trackEvent("home_shortcut_prompt_action", { action: "show-guide" });
  };

  if (!open || !shouldOfferHomeShortcut()) return null;

  const instruction =
    browserKind === "wechat"
      ? "点击右上角“···”，选择“在浏览器打开”，再从浏览器菜单添加到主屏幕。"
      : browserKind === "ios"
        ? "在 Safari 底部点击分享按钮，再选择“添加到主屏幕”。"
        : "打开浏览器菜单，选择“添加到主屏幕”或“安装应用”。";

  return (
    <section
      className="home-shortcut-prompt"
      role="dialog"
      aria-modal="false"
      aria-labelledby="home-shortcut-title"
    >
      <button
        className="home-shortcut-close"
        type="button"
        onClick={() => rememberAndClose("dismiss")}
        aria-label="暂不添加到手机桌面"
      >
        <CloseOutlined />
      </button>
      <div className="home-shortcut-icon" aria-hidden="true">
        <PlusSquareOutlined />
      </div>
      <div className="home-shortcut-copy">
        <strong id="home-shortcut-title">下次更快打开谱里</strong>
        <p>把谱里添加到手机桌面，像打开常用应用一样随时记录家人。</p>
        {showInstructions && (
          <p className="home-shortcut-instruction">
            <ExportOutlined aria-hidden="true" /> {instruction}
          </p>
        )}
        <div className="home-shortcut-actions">
          <button type="button" onClick={handlePrimaryAction}>
            {installPrompt ? "添加到桌面" : "查看添加方法"}
          </button>
          <button type="button" onClick={() => rememberAndClose("later")}>
            稍后
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeShortcutPrompt;
