import {
  convertToReactFlowData,
  getLayoutedElements,
  getJourneyLayoutedNodes,
} from "./familyTreeUtils.js";

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
});
