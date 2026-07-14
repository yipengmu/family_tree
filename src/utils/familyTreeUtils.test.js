import {
  convertToReactFlowData,
  getLayoutedElements,
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
});
