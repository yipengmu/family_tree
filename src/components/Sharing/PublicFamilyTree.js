import { useMemo } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider } from "reactflow";
import FamilyBusEdge from "../FamilyBusEdge.js";
import FamilyMemberNode from "../FamilyMemberNode.js";
import {
  convertToReactFlowData,
  getFamilyBusEdges,
  getLayoutedElements,
} from "../../utils/familyTreeUtils.js";
import "reactflow/dist/style.css";
import "../FamilyTreeFlow.css";

const nodeTypes = { familyMember: FamilyMemberNode };
const edgeTypes = { familyBus: FamilyBusEdge };

function PublicFamilyTreeCanvas({ familyData }) {
  const graph = useMemo(() => {
    const converted = convertToReactFlowData(familyData, familyData, false, {
      isNameProtectionEnabled: false,
      useFounderLabels: false,
    });
    const nodes = getLayoutedElements(converted.nodes, converted.edges, "TB");
    return { nodes, edges: getFamilyBusEdges(familyData, nodes) };
  }, [familyData]);

  return (
    <div
      className="public-family-tree-canvas"
      aria-label="公开分享的家谱树状图"
    >
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.08, minZoom: 0.08, maxZoom: 1.1 }}
        minZoom={0.05}
        maxZoom={2}
        panOnDrag
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="public-family-tree-controls"
          showInteractive={false}
        />
        <Background
          variant="dots"
          gap={16}
          size={1}
          color="rgba(36, 72, 62, .18)"
        />
      </ReactFlow>
    </div>
  );
}

export default function PublicFamilyTree(props) {
  return (
    <ReactFlowProvider>
      <PublicFamilyTreeCanvas {...props} />
    </ReactFlowProvider>
  );
}
