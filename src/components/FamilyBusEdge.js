import { BaseEdge, useStore } from "reactflow";

const getNodeAnchor = (node, anchor) => {
  if (!node) return null;

  const position = node.positionAbsolute || node.position;
  const width = node.width || 200;
  const height = node.height || 80;

  if (
    !position ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y)
  ) {
    return null;
  }

  return {
    x: position.x + width / 2,
    y: anchor === "bottom" ? position.y + height : position.y,
  };
};

const toVerticalSegment = (point, busY) => `M ${point.x} ${point.y} V ${busY}`;

const FamilyBusEdge = ({
  id,
  data,
  style,
  sourceX,
  sourceY,
  targetX,
  targetY,
}) => {
  const nodeInternals = useStore((state) => state.nodeInternals);
  const parentPoints = (data?.parentIds || [])
    .map((parentId) =>
      getNodeAnchor(nodeInternals.get(String(parentId)), "bottom"),
    )
    .filter(Boolean);
  const childPoints = (data?.childIds || [])
    .map((childId) => getNodeAnchor(nodeInternals.get(String(childId)), "top"))
    .filter(Boolean);

  if (!parentPoints.length || !childPoints.length) {
    return (
      <BaseEdge
        id={id}
        path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
        style={style}
      />
    );
  }

  const parentBottom = Math.max(...parentPoints.map((point) => point.y));
  const childTop = Math.min(...childPoints.map((point) => point.y));
  const availableHeight = childTop - parentBottom;

  if (availableHeight <= 0) {
    return (
      <BaseEdge
        id={id}
        path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
        style={style}
      />
    );
  }

  // 总线靠近父母一侧，给子女节点上方和同代卡片保留稳定的留白。
  const busY =
    parentBottom + Math.min(64, Math.max(28, availableHeight * 0.38));
  const allPoints = [...parentPoints, ...childPoints];
  const leftX = Math.min(...allPoints.map((point) => point.x));
  const rightX = Math.max(...allPoints.map((point) => point.x));
  const verticalSegments = [
    ...parentPoints.map((point) => toVerticalSegment(point, busY)),
    ...childPoints.map((point) => `M ${point.x} ${busY} V ${point.y}`),
  ];
  const busSegment = leftX === rightX ? "" : `M ${leftX} ${busY} H ${rightX}`;
  const path = [...verticalSegments, busSegment].filter(Boolean).join(" ");

  return <BaseEdge id={id} path={path} style={style} />;
};

export default FamilyBusEdge;
