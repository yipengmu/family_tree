import dagre from 'dagre';

/**
 * 将扁平化的家谱数据转换为React Flow需要的节点和边数据结构
 * @param {Array} familyData - 扁平化的家谱数据
 * @param {Array} fullFamilyData - 完整的家谱数据（用于检查折叠状态）
 * @param {Boolean} isCollapseMode - 是否处于折叠模式
 * @returns {Object} - 包含nodes和edges的对象
 */
export const convertToReactFlowData = (familyData, fullFamilyData = null, isCollapseMode = false) => {
  const nodes = [];
  const edges = [];
  
  // 创建节点映射，便于查找
  const nodeMap = new Map();
  
  // 首先创建所有节点
  familyData.forEach(person => {
    // 检查是否有被折叠的子节点
    let hasCollapsedChildren = false;
    if (isCollapseMode && fullFamilyData) {
      const allChildren = fullFamilyData.filter(p => p.g_father_id === person.id);
      const visibleChildren = familyData.filter(p => p.g_father_id === person.id);
      hasCollapsedChildren = allChildren.length > 0 && visibleChildren.length < allChildren.length;
    }

    const node = {
      id: person.id.toString(),
      type: 'familyMember',
      position: { x: 0, y: 0 }, // 初始位置，后续会通过布局算法调整
      data: {
        id: person.id,
        name: person.name,
        rank: person.g_rank,
        rankIndex: person.rank_index,
        fatherId: person.g_father_id,
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
        hasCollapsedChildren // 添加折叠状态标识
      }
    };

    nodes.push(node);
    nodeMap.set(person.id, node);
  });
  
  // 创建边（父子关系）
  familyData.forEach(person => {
    if (person.g_father_id && person.g_father_id !== 0) {
      const edge = {
        id: `edge-${person.g_father_id}-${person.id}`,
        source: person.g_father_id.toString(),
        target: person.id.toString(),
        type: 'straight',  // 使用直线连接，避免交错
        animated: false,
        style: {
          stroke: 'hsl(215.4 16.3% 46.9%)',  // 使用统一的颜色
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        markerEnd: {
          type: 'arrowclosed',
          color: 'hsl(215.4 16.3% 46.9%)',
          width: 12,
          height: 12,
        }
      };
      edges.push(edge);
    }
  });
  
  return { nodes, edges };
};

/**
 * 使用Dagre算法进行层次布局
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组
 * @returns {Array} - 布局后的节点数组
 */
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 200;
  const nodeHeight = 80;
  
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,     // 增加节点间距，从50增加到80，减少连接线交错
    ranksep: 120,    // 增加行间距，从90增加到120，保持代际间合适高度
    marginx: 20,
    marginy: 10,     // 减少顶部边距，从20减少到10
    align: undefined, // 移除对齐限制，让Dagre自动居中对齐父子节点
    acyclicer: 'greedy',  // 使用贪心算法减少环路
    ranker: 'tight-tree'  // 使用紧凑树排列，优化连接线
  });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);

  // 获取布局后的节点位置
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';

    // 调整位置，使节点居中
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  // 手动调整父子节点的水平对齐
  return adjustParentChildAlignment(layoutedNodes, edges);
};

/**
 * 调整父子节点的水平对齐，同时避免同级节点重叠
 * @param {Array} nodes - 布局后的节点数组
 * @param {Array} edges - 边数组
 * @returns {Array} - 调整对齐后的节点数组
 */
const adjustParentChildAlignment = (nodes, edges) => {
  const nodeWidth = 200;
  const minNodeSpacing = 80; // 节点间最小间距

  // 创建节点映射
  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  // 创建父子关系映射
  const parentChildrenMap = new Map();
  edges.forEach(edge => {
    const parentId = edge.source;
    const childId = edge.target;

    if (!parentChildrenMap.has(parentId)) {
      parentChildrenMap.set(parentId, []);
    }
    parentChildrenMap.get(parentId).push(childId);
  });

  // 按Y坐标分组节点到不同代数
  const generations = new Map();
  nodes.forEach(node => {
    const y = Math.round(node.position.y / 60) * 60;
    if (!generations.has(y)) {
      generations.set(y, []);
    }
    generations.get(y).push(node);
  });

  // 从上到下逐代处理
  const processedGenerations = Array.from(generations.keys()).sort((a, b) => a - b);

  processedGenerations.forEach(generationY => {
    const generationNodes = generations.get(generationY);

    // 先尝试居中对齐父子节点
    generationNodes.forEach(parentNode => {
      const childrenIds = parentChildrenMap.get(parentNode.id);
      if (childrenIds && childrenIds.length > 0) {
        const childrenNodes = childrenIds.map(id => nodeMap.get(id)).filter(Boolean);

        if (childrenNodes.length > 0) {
          // 计算子节点的水平中心位置
          const childrenXPositions = childrenNodes.map(child => child.position.x + nodeWidth / 2);
          const minX = Math.min(...childrenXPositions);
          const maxX = Math.max(...childrenXPositions);
          const centerX = (minX + maxX) / 2;

          // 设置父节点的理想位置
          parentNode.idealX = centerX - nodeWidth / 2;
        }
      }
    });

    // 解决同级节点重叠问题
    resolveOverlaps(generationNodes, nodeWidth, minNodeSpacing);
  });

  return nodes;
};

/**
 * 解决同级节点重叠问题
 * @param {Array} nodes - 同一代的节点数组
 * @param {number} nodeWidth - 节点宽度
 * @param {number} minSpacing - 最小间距
 */
const resolveOverlaps = (nodes, nodeWidth, minSpacing) => {
  if (nodes.length <= 1) return;

  // 按X坐标排序
  const sortedNodes = [...nodes].sort((a, b) => {
    const aX = a.idealX !== undefined ? a.idealX : a.position.x;
    const bX = b.idealX !== undefined ? b.idealX : b.position.x;
    return aX - bX;
  });

  // 使用理想位置或当前位置
  sortedNodes.forEach(node => {
    if (node.idealX !== undefined) {
      node.position.x = node.idealX;
    }
  });

  // 从左到右调整位置，确保没有重叠
  for (let i = 1; i < sortedNodes.length; i++) {
    const prevNode = sortedNodes[i - 1];
    const currentNode = sortedNodes[i];

    const prevRight = prevNode.position.x + nodeWidth;
    const currentLeft = currentNode.position.x;
    const requiredLeft = prevRight + minSpacing;

    // 如果当前节点与前一个节点重叠，向右移动
    if (currentLeft < requiredLeft) {
      currentNode.position.x = requiredLeft;
    }
  }

  // 清理临时属性
  sortedNodes.forEach(node => {
    delete node.idealX;
  });
};

/**
 * 根据代数筛选数据
 * @param {Array} familyData - 原始家谱数据
 * @param {Number} minRank - 最小代数
 * @param {Number} maxRank - 最大代数
 * @returns {Array} - 筛选后的数据
 */
export const filterByRank = (familyData, minRank = 1, maxRank = 20) => {
  return familyData.filter(person => 
    person.g_rank >= minRank && person.g_rank <= maxRank
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
  return familyData.filter(person => 
    person.name.toLowerCase().includes(term) ||
    (person.official_position && person.official_position.toLowerCase().includes(term)) ||
    (person.summary && person.summary.toLowerCase().includes(term)) ||
    (person.location && person.location.toLowerCase().includes(term))
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
    const children = familyData.filter(person => person.g_father_id === currentId);
    
    children.forEach(child => {
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
  const personMap = new Map(familyData.map(p => [p.id, p]));
  
  let currentPerson = personMap.get(personId);
  
  while (currentPerson && currentPerson.g_father_id && currentPerson.g_father_id !== 0) {
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
    byGeneration: {}
  };
  
  familyData.forEach(person => {
    // 统计代数
    if (person.g_rank > stats.generations) {
      stats.generations = person.g_rank;
    }
    
    // 统计性别
    if (person.sex === 'MAN') {
      stats.maleCount++;
    } else if (person.sex === 'WOMAN') {
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
  const personMap = new Map(familyData.map(p => [p.id, p]));
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
  pathPersons.forEach(person => {
    resultPersons.add(person);
  });

  // 为路径上的每个人员添加其直接子节点（显示兄弟姐妹关系）
  pathPersons.forEach(pathPerson => {
    const siblings = familyData.filter(person =>
      person.g_father_id === pathPerson.g_father_id &&
      person.g_father_id !== 0
    );
    siblings.forEach(sibling => {
      resultPersons.add(sibling);
    });

    // 添加该路径节点的所有直接子节点
    const children = familyData.filter(person =>
      person.g_father_id === pathPerson.id
    );
    children.forEach(child => {
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
      targetPerson: null
    };
  }

  const term = searchTerm.toLowerCase();
  const searchResults = familyData.filter(person =>
    person.name.toLowerCase().includes(term) ||
    (person.official_position && person.official_position.toLowerCase().includes(term)) ||
    (person.summary && person.summary.toLowerCase().includes(term)) ||
    (person.location && person.location.toLowerCase().includes(term))
  );

  // 如果只有一个搜索结果，返回其路径树
  if (searchResults.length === 1) {
    const targetPerson = searchResults[0];
    const pathTreeData = getPathTreeData(familyData, targetPerson.id);

    return {
      searchResults,
      pathTreeData,
      targetPerson
    };
  }

  // 如果有多个结果，返回所有匹配的人员
  return {
    searchResults,
    pathTreeData: searchResults,
    targetPerson: null
  };
};

/**
 * 验证数据完整性
 * @param {Array} familyData - 家谱数据
 * @returns {Object} - 验证结果
 */
export const validateFamilyData = (familyData) => {
  const issues = [];
  const personIds = new Set(familyData.map(p => p.id));

  familyData.forEach(person => {
    // 检查父亲ID是否存在
    if (person.g_father_id && person.g_father_id !== 0 && !personIds.has(person.g_father_id)) {
      issues.push(`${person.name} (ID: ${person.id}) 的父亲ID ${person.g_father_id} 不存在`);
    }

    // 检查必要字段
    if (!person.name || person.name.trim() === '') {
      issues.push(`ID ${person.id} 的成员缺少姓名`);
    }

    if (!person.g_rank || person.g_rank < 1) {
      issues.push(`${person.name} (ID: ${person.id}) 的代数信息异常`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
};
