import React, { useMemo } from "react";
import PublicFamilyTree from "./PublicFamilyTree.js";
import "./ShareOverview.css";

const getStats = (familyData = [], stats = {}) => {
  const generations = new Set(
    familyData.map((person) => person.g_rank).filter(Boolean),
  );
  const relationshipCount = familyData.reduce(
    (total, person) =>
      total +
      Number(Boolean(person.g_father_id)) +
      Number(Boolean(person.g_mother_id)),
    0,
  );

  return {
    memberCount: stats.memberCount ?? familyData.length,
    generationCount: stats.generationCount ?? generations.size,
    relationshipCount: stats.relationshipCount ?? relationshipCount,
  };
};

export default function ShareOverview({
  familyName = "我的家谱",
  familyData = [],
  stats,
  eyebrow = "家谱分享",
  treeTitle = "世系总览",
  treeHint = "拖动查看分支，使用图谱侧边按钮缩放或全屏。",
}) {
  const summary = useMemo(
    () => getStats(familyData, stats),
    [familyData, stats],
  );

  return (
    <>
      <section className="share-overview-hero">
        <span className="share-overview-eyebrow">{eyebrow}</span>
        <h1>{familyName}</h1>
        <p>沿着姓名与关系，看见家庭代代延续。</p>
        <div className="share-overview-stats" aria-label="家谱摘要">
          <span>
            <strong>{summary.memberCount}</strong>
            <small>谱中人物</small>
          </span>
          <span>
            <strong>{summary.generationCount}</strong>
            <small>记录代数</small>
          </span>
          <span>
            <strong>{summary.relationshipCount}</strong>
            <small>家庭关系</small>
          </span>
        </div>
      </section>

      <section className="share-overview-tree-section">
        <div className="share-overview-section-heading">
          <div>
            <span>{treeTitle}</span>
            <h2>家人的名字，正在连成一棵树</h2>
          </div>
          <p>{treeHint}</p>
        </div>
        {familyData.length ? (
          <PublicFamilyTree familyData={familyData} />
        ) : (
          <div className="share-overview-tree-empty">
            还没有可以展示的家谱成员
          </div>
        )}
      </section>
    </>
  );
}

export { getStats };
