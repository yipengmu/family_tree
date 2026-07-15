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
  status,
  currentStep,
  onStart,
  onPause,
  onResume,
  onSkip,
  onRestart,
  onClose,
  onSeek,
}) => {
  if (!steps.length) return null;

  if (status === "idle") {
    return (
      <button type="button" className="journey-launcher" onClick={onStart}>
        <span className="journey-launcher-mark" aria-hidden="true">
          谱
        </span>
        <span>
          <strong>看家族如何生长</strong>
          <small>从明代到当代 · {steps.length} 代展开</small>
        </span>
        <CaretRightOutlined aria-hidden="true" />
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
      className={`family-journey-player era-${eraKey}`}
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
        className="journey-player-copy journey-copy-transition"
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
              ? `${steps.length} 代相承，${totalMembers} 位族人`
              : currentStep.era.title}
          </h2>
          <p>
            {complete
              ? `${familyName}从一位先祖展开，最终汇成今天的家族全貌。`
              : `第 ${currentStep.generation} 代 · 谱中已有 ${currentStep.visibleCount} 个名字`}
          </p>
        </div>
      </div>

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
        <small>年代按代际跨度推演</small>
      </div>
    </section>
  );
};

export default FamilyJourneyPlayer;
