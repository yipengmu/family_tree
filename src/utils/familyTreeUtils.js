/**
 * 返回同一父亲名下的下一个兄弟排行。
 * 无父亲时按 0 归组，兼容旧数据中的空值和数字 0。
 */
export const getNextSiblingRank = (familyData = [], fatherId) => {
  const normalizedFatherId = fatherId ? String(fatherId) : "0";
  const siblingRanks = familyData
    .filter((person) => String(person.g_father_id || 0) === normalizedFatherId)
    .map((person) => Number(person.rank_index) || 0);

  return Math.max(0, ...siblingRanks) + 1;
};

const getPositiveRankIndex = (value) => {
  const rankIndex = Number(value);
  return Number.isFinite(rankIndex) && rankIndex > 0
    ? rankIndex
    : Number.MAX_SAFE_INTEGER;
};

const compareIds = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right));
};

/**
 * 生成节点从根到当前人的父系排序路径。
 *
 * 布局算法只关心节点的拓扑关系，不知道 rank_index 的业务含义。把每一级
 * 父系成员的排行带进排序路径，可以让同一父亲的所有子女稳定地从左到右
 * 排列，同时让不同支系保持与其父亲相同的阅读顺序。
 */
const getFamilyOrderPath = (node, nodeMap) => {
  const path = [];
  const visited = new Set();
  let current = node;

  while (current && !visited.has(String(current.id))) {
    visited.add(String(current.id));
    path.unshift([
      getPositiveRankIndex(current.data?.rankIndex),
      String(current.id),
    ]);
    const fatherId = current.data?.fatherId;
    current = fatherId ? nodeMap.get(String(fatherId)) : null;
  }

  return path;
};

const compareFamilyOrder = (left, right, nodeMap) => {
  const leftPath = getFamilyOrderPath(left, nodeMap);
  const rightPath = getFamilyOrderPath(right, nodeMap);
  const length = Math.max(leftPath.length, rightPath.length);

  for (let index = 0; index < length; index += 1) {
    const leftSegment = leftPath[index];
    const rightSegment = rightPath[index];
    if (!leftSegment) return -1;
    if (!rightSegment) return 1;
    if (leftSegment[0] !== rightSegment[0]) {
      return leftSegment[0] - rightSegment[0];
    }
    const idDifference = compareIds(leftSegment[1], rightSegment[1]);
    if (idDifference !== 0) return idDifference;
  }

  return compareIds(left.id, right.id);
};

/**
 * 返回家谱中的子女称谓，例如“长子”“次女”“三子”。
 * rank_index 是事实字段；称谓只是展示层派生值，不会写回家谱数据。
 *
 * 长次顺序以“同一父亲节点”分组后按 rank_index 排序的相对位置为准。
 * 如果调用方已计算好 birthPosition（如在 convertToReactFlowData 中按
 * 父组派生），会优先采用；否则回退到 rank_index 数值。
 */
export const getSiblingTitle = (rankIndex, sex, fatherId, birthPosition) => {
  if (!fatherId || String(fatherId) === "0") return "";

  const sourceIndex = birthPosition != null ? birthPosition : rankIndex;
  const index = Number(sourceIndex);
  if (!Number.isInteger(index) || index < 1) return "";

  const chineseDigits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const toChineseNumber = (value) => {
    if (value < 10) return chineseDigits[value];
    if (value < 20) return `十${value === 10 ? "" : chineseDigits[value - 10]}`;
    if (value < 100) {
      const tens = Math.floor(value / 10);
      const remainder = value % 10;
      return `${chineseDigits[tens]}十${remainder ? chineseDigits[remainder] : ""}`;
    }
    return String(value);
  };

  const prefix = index === 1 ? "长" : index === 2 ? "次" : toChineseNumber(index);
  const suffix = sex === "WOMAN" || sex === "女" || sex === "FEMALE"
    ? "女"
    : sex === "MAN" || sex === "男" || sex === "MALE"
      ? "子"
      : "人";

  return `${prefix}${suffix}`;
};

/**
 * 将扁平化的家谱数据转换为React Flow需要的节点和边数据结构
 * @param {Array} familyData - 扁平化的家谱数据
 * @param {Array} fullFamilyData - 完整的家谱数据（用于检查折叠状态）
 * @param {Boolean} isCollapseMode - 是否处于折叠模式
 * @param {Object} options - 额外选项
 * @returns {Object} - 包含nodes和edges的对象
 */
export const convertToReactFlowData = (
  familyData,
  fullFamilyData = null,
  isCollapseMode = false,
  options = {},
) => {
  const {
    isNameProtectionEnabled = false,
    isMobile = false,
    onOpenPersonProfile = null,
    useFounderLabels = true,
  } = options;
  const nodes = [];
  const edges = [];

  // 创建节点映射，便于查找
  const nodeMap = new Map();

  // 按父亲分组、按 rank_index 排序后给每个成员派生出“父组内相对位置”。
  // 长次称谓以这个相对位置为准，而不是直接读 rank_index 数值——这样即使
  // 某个父亲只有一个孩子，rank_index 字段值偏大时仍然会显示为“长子”。
  // rank_index 仍作为稳定排序关键字保留，数据缺失时退回到 id 兜底。
  const siblingBirthOrder = new Map();
  const siblingsByFather = new Map();
  familyData.forEach((person) => {
    const fatherId = person.g_father_id ? String(person.g_father_id) : "0";
    if (fatherId === "0") return;
    if (!siblingsByFather.has(fatherId)) siblingsByFather.set(fatherId, []);
    siblingsByFather.get(fatherId).push(person);
  });
  siblingsByFather.forEach((siblings, fatherId) => {
    const ordered = [...siblings].sort((left, right) => {
      const leftRank = Number(left.rank_index) || 0;
      const rightRank = Number(right.rank_index) || 0;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return Number(left.id) - Number(right.id);
    });
    ordered.forEach((person, index) => {
      siblingBirthOrder.set(String(person.id), index + 1);
    });
  });

  // 首先创建所有节点
  familyData.forEach((person) => {
    // 检查是否有被折叠的子节点
    let hasCollapsedChildren = false;
    if (isCollapseMode && fullFamilyData) {
      const allChildren = fullFamilyData.filter(
        (p) => p.g_father_id === person.id,
      );
      const visibleChildren = familyData.filter(
        (p) => p.g_father_id === person.id,
      );
      hasCollapsedChildren =
        allChildren.length > 0 && visibleChildren.length < allChildren.length;
    }

    const node = {
      id: person.id.toString(),
      type: "familyMember",
      position: { x: 0, y: 0 }, // 初始位置，后续会通过布局算法调整
      data: {
        id: person.id,
        name: person.name,
        rank: person.g_rank,
        rankIndex: person.rank_index,
        fatherId: person.g_father_id,
        siblingTitle: getSiblingTitle(
          person.rank_index,
          person.sex,
          person.g_father_id,
          siblingBirthOrder.get(String(person.id)),
        ),
        officialPosition: person.official_position,
        summary: person.summary,
        adoption: person.adoption,
        sex: person.sex,
        motherId: person.g_mother_id,
        birthDate: person.birth_date,
        idCard: person.id_card,
        faceImg: person.face_img,
        photos: person.photos,
        householdInfo: person.household_info,
        spouse: person.spouse,
        homePage: person.home_page,
        death: person.dealth,
        formalName: person.formal_name,
        location: person.location,
        childrens: person.childrens,
        hasCollapsedChildren, // 添加折叠状态标识
        isNameProtectionEnabled, // 添加姓名保护开关
        isMobile,
        onOpenPersonProfile,
        useFounderLabels,
      },
    };

    nodes.push(node);
    nodeMap.set(String(person.id), node);
  });

  // 创建边（父母与子女关系）。过滤掉当前视图中不存在的父节点，
  // 并按 source-target 去重，避免折叠/脏数据造成“幽灵线”或重复线。
  const edgeKeys = new Set();
  const addRelationshipEdge = (source, target, style) => {
    const sourceId = String(source);
    const targetId = String(target);
    const edgeKey = `${sourceId}-${targetId}`;
    if (!nodeMap.has(sourceId) || edgeKeys.has(edgeKey)) return;

    edgeKeys.add(edgeKey);
    edges.push({
      id: `edge-${edgeKey}`,
      source: sourceId,
      target: targetId,
      type: "straight", // 使用直线连接，避免交错
      animated: false,
      style: {
        ...style,
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
      markerEnd: {
        type: "arrowclosed",
        color: style.stroke,
        width: 12,
        height: 12,
      },
    });
  };

  familyData.forEach((person) => {
    if (person.g_father_id && person.g_father_id !== 0) {
      addRelationshipEdge(person.g_father_id, person.id, {
        stroke: "hsl(215.4 16.3% 46.9%)",
      });
    }

    if (person.g_mother_id && person.g_mother_id !== 0) {
      addRelationshipEdge(person.g_mother_id, person.id, {
        stroke: "hsl(8 40% 52%)",
      });
    }
  });

  return { nodes, edges };
};

/**
 * 将可见的父母/子女关系合并成家谱常用的“纵向主干 + 同代总线”结构。
 *
 * 这里仅生成画布展示用的边，不参与节点坐标计算，因此不会改变 FamilyData
 * 或折叠规则。一个
 * 父母组合只生成一条可视边，边组件再绘制父母汇流和多个子女的共用横线。
 */
export const getFamilyBusEdges = (familyData, visibleNodes = []) => {
  const visibleNodeIds = new Set(visibleNodes.map((node) => String(node.id)));
  const familyGroups = new Map();

  familyData.forEach((person) => {
    const parentIds = [person.g_father_id, person.g_mother_id]
      .filter(
        (parentId) =>
          parentId && parentId !== 0 && visibleNodeIds.has(String(parentId)),
      )
      .map(String)
      .filter((parentId, index, ids) => ids.indexOf(parentId) === index);

    if (!parentIds.length || !visibleNodeIds.has(String(person.id))) return;

    const familyKey = parentIds.join("-");
    if (!familyGroups.has(familyKey)) {
      familyGroups.set(familyKey, {
        parentIds,
        children: [],
      });
    }

    familyGroups.get(familyKey).children.push(person);
  });

  return [...familyGroups.entries()].map(([familyKey, group]) => {
    const children = [...group.children].sort((left, right) => {
      const rankDifference =
        getPositiveRankIndex(left.rank_index) - getPositiveRankIndex(right.rank_index);
      return rankDifference || compareIds(left.id, right.id);
    });

    return {
      id: `family-bus-${familyKey}-${children.map((child) => child.id).join("-")}`,
      source: group.parentIds[0],
      target: String(children[0].id),
      type: "familyBus",
      animated: false,
      selectable: false,
      data: {
        parentIds: group.parentIds,
        childIds: children.map((child) => String(child.id)),
      },
      style: {
        stroke: "hsl(155 13% 45%)",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
    };
  });
};

/**
 * 为家谱演示生成稳定的紧凑布局。
 *
 * 旧实现只按每代的数组下标左右交替摆放节点，导致不同父系支路互相穿插，
 * 深代时会出现大量横跨画布的连线。这里按“从根到当前节点”的真实父系路径
 * 排序，同一父系的后代始终保持相邻，同时让演示主线在每一代保持 x=0。
 */
export const getJourneyLayoutedNodes = (nodes, pathIds = [], options = {}) => {
  const nodeWidth = options.nodeWidth || 200;
  const nodeGap = options.nodeGap || 24;
  const generationHeight = options.generationHeight || 200;
  const pathIdSet = new Set(pathIds.map(String));
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));
  const nodesByGeneration = new Map();

  nodes.forEach((node) => {
    const generation = Number(node.data.rank);
    if (!Number.isFinite(generation)) return;
    if (!nodesByGeneration.has(generation))
      nodesByGeneration.set(generation, []);
    nodesByGeneration.get(generation).push(node);
  });

  const generations = [...nodesByGeneration.keys()].sort((a, b) => a - b);
  const minGeneration = generations[0] || 1;
  const slotWidth = nodeWidth + nodeGap;

  return generations.flatMap((generation) => {
    const generationNodes = [...nodesByGeneration.get(generation)].sort(
      (left, right) => compareFamilyOrder(left, right, nodeMap),
    );
    const focusIndex = Math.max(
      0,
      generationNodes.findIndex((node) => pathIdSet.has(String(node.id))),
    );

    return generationNodes.map((node, index) => ({
      ...node,
      targetPosition: "top",
      sourcePosition: "bottom",
      position: {
        x: (index - focusIndex) * slotWidth,
        y: (generation - minGeneration) * generationHeight,
      },
    }));
  });
};

/**
 * 使用单次树布局生成层次坐标。edges 参数保留用于兼容调用方，排序和坐标
 * 生成均在本函数内一次完成。
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组
 * @returns {Array} - 布局后的节点数组
 */
export const getLayoutedElements = (nodes, _edges, direction = "TB") => {
  return getSinglePassTreeLayout(nodes, direction);
};

/**
 * 单次树布局：子女按 rank_index 插入父亲的有序子女链，再用 DFS 计算
 * 子树宽度与坐标。这样排序直接发生在坐标生成过程中，没有布局后处理轮。
 */
const getSinglePassTreeLayout = (nodes, direction = "TB") => {
  const nodeWidth = 200;
  const nodeHeight = 80;
  const siblingGap = 80;
  const generationGap = 120;
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));
  const childrenMap = new Map();

  const insertChild = (fatherId, child) => {
    const key = String(fatherId);
    const children = childrenMap.get(key) || [];
    let index = 0;
    while (
      index < children.length
      && compareFamilyOrder(children[index], child, nodeMap) <= 0
    ) {
      index += 1;
    }
    children.splice(index, 0, child);
    childrenMap.set(key, children);
  };

  nodes.forEach((node) => {
    const fatherId = node.data?.fatherId;
    if (fatherId && nodeMap.has(String(fatherId))) {
      insertChild(fatherId, node);
    }
  });

  const childIds = new Set(
    [...childrenMap.values()].flat().map((node) => String(node.id)),
  );
  const roots = nodes
    .filter((node) => !childIds.has(String(node.id)))
    .sort((left, right) => compareFamilyOrder(left, right, nodeMap));
  const subtreeWidths = new Map();

  const getSubtreeWidth = (node, path = new Set()) => {
    const nodeId = String(node.id);
    if (subtreeWidths.has(nodeId)) return subtreeWidths.get(nodeId);
    if (path.has(nodeId)) return nodeWidth;

    const nextPath = new Set(path);
    nextPath.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    const childrenWidth = children.reduce(
      (total, child) => total + getSubtreeWidth(child, nextPath),
      Math.max(0, children.length - 1) * siblingGap,
    );
    const width = Math.max(nodeWidth, childrenWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };

  nodes.forEach((node) => getSubtreeWidth(node));

  const ranks = nodes
    .map((node) => Number(node.data?.rank))
    .filter(Number.isFinite);
  const minRank = Math.min(...ranks, 1);
  const placed = new Set();
  let cursor = 0;
  const isHorizontal = direction === "LR" || direction === "RL";

  const placeSubtree = (node, left, path = new Set()) => {
    const nodeId = String(node.id);
    if (placed.has(nodeId) || path.has(nodeId)) return;
    placed.add(nodeId);

    const nextPath = new Set(path);
    nextPath.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    const width = subtreeWidths.get(nodeId) || nodeWidth;
    const childrenWidth = children.reduce(
      (total, child) => total + (subtreeWidths.get(String(child.id)) || nodeWidth),
      Math.max(0, children.length - 1) * siblingGap,
    );
    let childCursor = left + (width - childrenWidth) / 2;

    children.forEach((child) => {
      const childWidth = subtreeWidths.get(String(child.id)) || nodeWidth;
      placeSubtree(child, childCursor, nextPath);
      childCursor += childWidth + siblingGap;
    });

    const childCenters = children
      .map((child) => nodeMap.get(String(child.id)))
      .filter((child) => child && placed.has(String(child.id)))
      .map((child) => child.position.__treeCenter);
    const center = childCenters.length
      ? (Math.min(...childCenters) + Math.max(...childCenters)) / 2
      : left + width / 2;
    const generation = Number(node.data?.rank);
    const level = Number.isFinite(generation) ? generation - minRank : 0;

    node.position = {
      x: isHorizontal ? level * (nodeWidth + generationGap) : center - nodeWidth / 2,
      y: isHorizontal ? center - nodeWidth / 2 : level * (nodeHeight + generationGap),
      __treeCenter: center,
    };
  };

  roots.forEach((root) => {
    const width = subtreeWidths.get(String(root.id)) || nodeWidth;
    placeSubtree(root, cursor);
    cursor += width + siblingGap;
  });

  nodes.forEach((node) => {
    if (placed.has(String(node.id))) return;
    placeSubtree(node, cursor);
    cursor += (subtreeWidths.get(String(node.id)) || nodeWidth) + siblingGap;
  });

  const centerOffset = cursor / 2;
  nodes.forEach((node) => {
    delete node.position.__treeCenter;
    if (!isHorizontal) node.position.x -= centerOffset;
    if (direction === "BT") node.position.y *= -1;
    if (direction === "RL") node.position.x *= -1;
    node.targetPosition = direction === "LR"
      ? "left"
      : direction === "RL"
        ? "right"
        : direction === "BT"
          ? "bottom"
          : "top";
    node.sourcePosition = direction === "LR"
      ? "right"
      : direction === "RL"
        ? "left"
        : direction === "BT"
          ? "top"
          : "bottom";
  });

  return nodes;
};

/**
 * 根据代数筛选数据
 * @param {Array} familyData - 原始家谱数据
 * @param {Number} minRank - 最小代数
 * @param {Number} maxRank - 最大代数
 * @returns {Array} - 筛选后的数据
 */
export const filterByRank = (familyData, minRank = 1, maxRank = 20) => {
  return familyData.filter(
    (person) => person.g_rank >= minRank && person.g_rank <= maxRank,
  );
};

/**
 * 搜索家族成员
 * @param {Array} familyData - 家谱数据
 * @param {String} searchTerm - 搜索关键词
 * @returns {Array} - 搜索结果
 */
export const searchFamilyMembers = (familyData, searchTerm) => {
  if (!searchTerm.trim()) return familyData;

  const term = searchTerm.toLowerCase();
  return familyData.filter(
    (person) =>
      person.name.toLowerCase().includes(term) ||
      (person.official_position &&
        person.official_position.toLowerCase().includes(term)) ||
      (person.summary && person.summary.toLowerCase().includes(term)) ||
      (person.location && person.location.toLowerCase().includes(term)),
  );
};

/**
 * 获取某个人的所有后代
 * @param {Array} familyData - 家谱数据
 * @param {Number} personId - 人员ID
 * @returns {Array} - 后代数组
 */
export const getDescendants = (familyData, personId) => {
  const descendants = [];
  const queue = [personId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = familyData.filter(
      (person) => person.g_father_id === currentId,
    );

    children.forEach((child) => {
      descendants.push(child);
      queue.push(child.id);
    });
  }

  return descendants;
};

/**
 * 获取某个人的所有祖先
 * @param {Array} familyData - 家谱数据
 * @param {Number} personId - 人员ID
 * @returns {Array} - 祖先数组
 */
export const getAncestors = (familyData, personId) => {
  const ancestors = [];
  const personMap = new Map(familyData.map((p) => [p.id, p]));

  let currentPerson = personMap.get(personId);

  while (
    currentPerson &&
    currentPerson.g_father_id &&
    currentPerson.g_father_id !== 0
  ) {
    const father = personMap.get(currentPerson.g_father_id);
    if (father) {
      ancestors.push(father);
      currentPerson = father;
    } else {
      break;
    }
  }

  return ancestors;
};

/**
 * 获取统计信息
 * @param {Array} familyData - 家谱数据
 * @returns {Object} - 统计信息
 */
export const getFamilyStatistics = (familyData) => {
  const stats = {
    totalMembers: familyData.length,
    generations: 0,
    maleCount: 0,
    femaleCount: 0,
    byGeneration: {},
  };

  familyData.forEach((person) => {
    // 统计代数
    if (person.g_rank > stats.generations) {
      stats.generations = person.g_rank;
    }

    // 统计性别
    if (person.sex === "MAN") {
      stats.maleCount++;
    } else if (person.sex === "WOMAN") {
      stats.femaleCount++;
    }

    // 按代数统计
    if (!stats.byGeneration[person.g_rank]) {
      stats.byGeneration[person.g_rank] = 0;
    }
    stats.byGeneration[person.g_rank]++;
  });

  return stats;
};

/**
 * 获取从指定节点到根节点（穆茂）的完整路径
 * @param {Array} familyData - 家谱数据
 * @param {Number} targetPersonId - 目标人员ID
 * @returns {Array} - 路径上的所有人员数据
 */
export const getPathToRoot = (familyData, targetPersonId) => {
  const personMap = new Map(familyData.map((p) => [p.id, p]));
  const pathPersons = [];

  let currentPerson = personMap.get(targetPersonId);

  // 从目标人员开始，一直向上追溯到根节点
  while (currentPerson) {
    pathPersons.push(currentPerson);

    // 如果到达根节点（穆茂，通常g_father_id为0或不存在）
    if (!currentPerson.g_father_id || currentPerson.g_father_id === 0) {
      break;
    }

    // 继续向上查找父节点
    currentPerson = personMap.get(currentPerson.g_father_id);
  }

  return pathPersons;
};

/**
 * 获取路径树数据（包含路径上所有节点及其直接子节点）
 * @param {Array} familyData - 家谱数据
 * @param {Number} targetPersonId - 目标人员ID
 * @returns {Array} - 路径树数据
 */
export const getPathTreeData = (familyData, targetPersonId) => {
  const pathPersons = getPathToRoot(familyData, targetPersonId);
  const resultPersons = new Set();

  // 添加路径上的所有人员
  pathPersons.forEach((person) => {
    resultPersons.add(person);
  });

  // 为路径上的每个人员添加其直接子节点（显示兄弟姐妹关系）
  pathPersons.forEach((pathPerson) => {
    const siblings = familyData.filter(
      (person) =>
        person.g_father_id === pathPerson.g_father_id &&
        person.g_father_id !== 0,
    );
    siblings.forEach((sibling) => {
      resultPersons.add(sibling);
    });

    // 添加该路径节点的所有直接子节点
    const children = familyData.filter(
      (person) => person.g_father_id === pathPerson.id,
    );
    children.forEach((child) => {
      resultPersons.add(child);
    });
  });

  return Array.from(resultPersons);
};

/**
 * 搜索家族成员并返回路径树数据
 * @param {Array} familyData - 家谱数据
 * @param {String} searchTerm - 搜索关键词
 * @returns {Object} - 搜索结果和路径树数据
 */
export const searchWithPathTree = (familyData, searchTerm) => {
  if (!searchTerm.trim()) {
    return {
      searchResults: [],
      pathTreeData: familyData,
      targetPerson: null,
    };
  }

  const term = searchTerm.toLowerCase();
  const searchResults = familyData.filter(
    (person) =>
      person.name.toLowerCase().includes(term) ||
      (person.official_position &&
        person.official_position.toLowerCase().includes(term)) ||
      (person.summary && person.summary.toLowerCase().includes(term)) ||
      (person.location && person.location.toLowerCase().includes(term)),
  );

  // 如果只有一个搜索结果，返回其路径树
  if (searchResults.length === 1) {
    const targetPerson = searchResults[0];
    const pathTreeData = getPathTreeData(familyData, targetPerson.id);

    return {
      searchResults,
      pathTreeData,
      targetPerson,
    };
  }

  // 如果有多个结果，返回所有匹配的人员
  return {
    searchResults,
    pathTreeData: searchResults,
    targetPerson: null,
  };
};

/**
 * 验证数据完整性
 * @param {Array} familyData - 家谱数据
 * @returns {Object} - 验证结果
 */
export const validateFamilyData = (familyData) => {
  const issues = [];
  const personIds = new Set(familyData.map((p) => p.id));

  familyData.forEach((person) => {
    // 检查父亲ID是否存在
    if (
      person.g_father_id &&
      person.g_father_id !== 0 &&
      !personIds.has(person.g_father_id)
    ) {
      issues.push(
        `${person.name} (ID: ${person.id}) 的父亲ID ${person.g_father_id} 不存在`,
      );
    }

    // 检查必要字段
    if (!person.name || person.name.trim() === "") {
      issues.push(`ID ${person.id} 的成员缺少姓名`);
    }

    if (!person.g_rank || person.g_rank < 1) {
      issues.push(`${person.name} (ID: ${person.id}) 的代数信息异常`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
};
