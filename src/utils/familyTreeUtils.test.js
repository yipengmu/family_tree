import {
  convertToReactFlowData,
  getFamilyBusEdges,
  getLayoutedElements,
  getJourneyLayoutedNodes,
} from "./familyTreeUtils.js";
import demoFamilyData from "../data/familyData.js";

describe("family tree relationship edges", () => {
  test("renders both father and mother links", () => {
    const familyData = [
      { id: 1, name: "父亲", g_rank: 1, rank_index: 1, g_father_id: 0 },
      { id: 2, name: "母亲", g_rank: 1, rank_index: 2, g_father_id: 0 },
      {
        id: 3,
        name: "孩子",
        g_rank: 2,
        rank_index: 1,
        g_father_id: 1,
        g_mother_id: 2,
      },
    ];

    const { edges } = convertToReactFlowData(familyData);

    expect(edges.map((edge) => [edge.source, edge.target])).toEqual([
      ["1", "3"],
      ["2", "3"],
    ]);

    const layoutedNodes = getLayoutedElements(
      convertToReactFlowData(familyData).nodes,
      edges,
    );
    const father = layoutedNodes.find((node) => node.id === "1");
    const mother = layoutedNodes.find((node) => node.id === "2");
    expect(
      Math.abs(father.position.x - mother.position.x),
    ).toBeGreaterThanOrEqual(200);
  });

  test("keeps real family branches adjacent during journey layout", () => {
    const familyData = [
      { id: 1, name: "根", g_rank: 1, rank_index: 1, g_father_id: 0 },
      { id: 2, name: "主线父", g_rank: 2, rank_index: 1, g_father_id: 1 },
      { id: 3, name: "旁支父", g_rank: 2, rank_index: 2, g_father_id: 1 },
      { id: 4, name: "主线子", g_rank: 3, rank_index: 1, g_father_id: 2 },
      { id: 5, name: "主线旁子", g_rank: 3, rank_index: 2, g_father_id: 2 },
      { id: 6, name: "旁支子", g_rank: 3, rank_index: 1, g_father_id: 3 },
    ];
    const { nodes } = convertToReactFlowData(familyData);
    const layoutedNodes = getJourneyLayoutedNodes(nodes, [1, 2, 4]);
    const mainlineChild = layoutedNodes.find(node => node.id === "4");
    const mainlineSibling = layoutedNodes.find(node => node.id === "5");
    const otherBranch = layoutedNodes.find(node => node.id === "6");

    expect(mainlineChild.position.x).toBe(0);
    expect(mainlineSibling.position.x).toBeGreaterThan(mainlineChild.position.x);
    expect(otherBranch.position.x).toBeGreaterThan(mainlineSibling.position.x);
  });

  test("does not create duplicate or invisible relationship edges", () => {
    const familyData = [
      { id: 1, name: "父", g_rank: 1, rank_index: 1, g_father_id: 0 },
      { id: 2, name: "子", g_rank: 2, rank_index: 1, g_father_id: 1, g_mother_id: 1 },
      { id: 3, name: "孤儿", g_rank: 2, rank_index: 2, g_father_id: 99 },
    ];
    const { edges } = convertToReactFlowData(familyData);

    expect(edges.map(edge => [edge.source, edge.target])).toEqual([["1", "2"]]);
  });

  test("groups two known parents and multiple children into one compact family bus", () => {
    const familyData = [
      { id: 1, name: "父", g_rank: 1, rank_index: 1 },
      { id: 2, name: "母", g_rank: 1, rank_index: 2 },
      { id: 3, name: "长子", g_rank: 2, rank_index: 1, g_father_id: 1, g_mother_id: 2 },
      { id: 4, name: "次子", g_rank: 2, rank_index: 2, g_father_id: 1, g_mother_id: 2 },
      { id: 5, name: "三子", g_rank: 2, rank_index: 3, g_father_id: 1, g_mother_id: 2 },
    ];
    const { nodes } = convertToReactFlowData(familyData);
    const familyBusEdges = getFamilyBusEdges(familyData, nodes);

    expect(familyBusEdges).toHaveLength(1);
    expect(familyBusEdges[0].data).toEqual({
      parentIds: ["1", "2"],
      childIds: ["3", "4", "5"],
    });
  });

  test("keeps a known single parent while ignoring unknown or invisible parents", () => {
    const familyData = [
      { id: 1, name: "母亲", g_rank: 1, rank_index: 1 },
      { id: 2, name: "孩子", g_rank: 2, rank_index: 1, g_father_id: 99, g_mother_id: 1 },
      { id: 3, name: "待考", g_rank: 2, rank_index: 2, g_father_id: 0, g_mother_id: 0 },
    ];
    const { nodes } = convertToReactFlowData(familyData);
    const familyBusEdges = getFamilyBusEdges(familyData, nodes);

    expect(familyBusEdges).toHaveLength(1);
    expect(familyBusEdges[0].data).toEqual({ parentIds: ["1"], childIds: ["2"] });
  });

  test("keeps a deep lineage vertical and does not increase the visible edge count", () => {
    const familyData = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      name: `第${index + 1}代`,
      g_rank: index + 1,
      rank_index: 1,
      g_father_id: index === 0 ? 0 : index,
    }));
    const { nodes, edges } = convertToReactFlowData(familyData);
    const layoutedNodes = getLayoutedElements(nodes, edges);
    const familyBusEdges = getFamilyBusEdges(familyData, layoutedNodes);

    expect(familyBusEdges.length).toBeLessThanOrEqual(edges.length);
    for (let index = 1; index < layoutedNodes.length; index += 1) {
      expect(layoutedNodes[index].position.y).toBeGreaterThan(layoutedNodes[index - 1].position.y);
    }
  });

  test("keeps the 624-person demo within the original relationship-edge budget", () => {
    const { nodes, edges } = convertToReactFlowData(demoFamilyData);
    const familyBusEdges = getFamilyBusEdges(demoFamilyData, nodes);

    expect(demoFamilyData).toHaveLength(624);
    expect(familyBusEdges.length).toBeLessThanOrEqual(edges.length);
    expect(familyBusEdges.every((edge) => edge.data.parentIds.length > 0)).toBe(true);
    expect(familyBusEdges.every((edge) => edge.data.childIds.length > 0)).toBe(true);
  });
});
