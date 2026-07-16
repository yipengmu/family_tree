import React from "react";
import {
  CaretRightOutlined,
  CloseOutlined,
  FastForwardOutlined,
  PauseOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import "./FamilyJourneyPlayer.css";

const FamilyJourneyPlayer = ({
  familyName,
  totalMembers,
  steps,
  startYear,
  endYear,
  yearSpan,
  summary,
  status,
  currentStep,
  onStart,
  onPause,
  onResume,
  onSkip,
  onRestart,
  onClose,
  onSeek,
  performanceMode = false,
}) => {
  if (!steps.length) return null;

  if (status === "idle") {
    return (
      <button type="button" className="journey-launcher" onClick={onStart}>
        <span className="journey-launcher-mark" aria-hidden="true">
          谱
        </span>
        <span>
          <strong>看一个500年的家谱如何延续</strong>
          <small>从 明代 到 当代 · {steps.length}代 展开</small>
        </span>
        <span className="journey-launcher-play" aria-hidden="true">
          <CaretRightOutlined />
        </span>
      </button>
    );
  }

  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.generation === currentStep.generation),
  );
  const complete = status === "complete";
  const eraKey = complete ? "complete" : currentStep.era.key;

  return (
    <section
      className={`family-journey-player era-${eraKey}${performanceMode ? " journey-player--light" : ""}`}
      data-era={complete ? "世系全景" : currentStep.era.label}
      aria-live="polite"
    >
      <div className="journey-player-topline">
        <span
          key={`topline-${complete ? "complete" : currentStep.generation}`}
          className="journey-copy-transition"
        >
          {complete
            ? "世系全景"
            : `${currentStep.era.label} · 约 ${currentStep.estimatedYear} 年`}
        </span>
        <button type="button" onClick={onClose} aria-label="关闭家族发展动画">
          <CloseOutlined />
        </button>
      </div>

      <div
        key={`copy-${complete ? "complete" : currentStep.generation}`}
        className={`journey-player-copy journey-copy-transition${performanceMode ? " journey-copy-transition--light" : ""}`}
      >
        <div
          className={`journey-era-orb ${currentStep.era.key}`}
          aria-hidden="true"
        >
          {complete ? "今" : currentStep.generation}
        </div>
        <div>
          <h2>
            {complete
              ? `跨越约 ${yearSpan} 年，${steps.length} 代相承`
              : currentStep.era.title}
          </h2>
          <p>
            {complete
              ? `${familyName}从 ${startYear}年延展至 ${endYear}年，共收录 ${totalMembers} 位族人`
              : `第 ${currentStep.generation} 代 · 谱中已有 ${currentStep.visibleCount} 个名字`}
          </p>
        </div>
      </div>

      {complete && (summary?.officials || summary?.scholars) ? (
        <div className="journey-complete-summary">
          {summary.officials > 0 && (
            <span>
              谱载职官 <strong>{summary.officials}</strong> 人
            </span>
          )}
          {summary.scholars > 0 && (
            <span>
              功名记载 <strong>{summary.scholars}</strong> 人
            </span>
          )}
          {summary.notableRole && (
            <span>
              {summary.notableRole.label}{" "}
              <strong>{summary.notableRole.count}</strong>人
            </span>
          )}
        </div>
      ) : null}

      <div className="journey-timeline">
        <input
          type="range"
          min="0"
          max={steps.length - 1}
          value={activeIndex}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="选择家谱发展世代"
          style={{ "--journey-progress": `${currentStep.progress}%` }}
        />
        <div className="journey-timeline-labels" aria-hidden="true">
          <span>明</span>
          <span>清</span>
          <span>民国</span>
          <span>当代</span>
        </div>
      </div>

      <div className="journey-player-actions">
        {complete ? (
          <button
            type="button"
            className="journey-primary-action"
            onClick={onRestart}
          >
            <RedoOutlined /> 再看一次
          </button>
        ) : status === "playing" ? (
          <button
            type="button"
            className="journey-primary-action"
            onClick={onPause}
          >
            <PauseOutlined /> 暂停
          </button>
        ) : (
          <button
            type="button"
            className="journey-primary-action"
            onClick={onResume}
          >
            <CaretRightOutlined /> 继续
          </button>
        )}
        {!complete && (
          <button
            type="button"
            className="journey-secondary-action"
            onClick={onSkip}
          >
            <FastForwardOutlined /> 看全景
          </button>
        )}
        <small>年份为代际推演估算</small>
      </div>
    </section>
  );
};

export default FamilyJourneyPlayer;
