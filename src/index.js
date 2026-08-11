import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import RouterApp from "./RouterApp.js";
import { initAnalytics } from "./utils/analytics.js";

initAnalytics();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__puliDeferredInstallPrompt = event;
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RouterApp />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // 安装能力不可用时保持普通网页体验，不阻塞家谱访问。
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
