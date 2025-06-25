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
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#b1b1b7',
          strokeWidth: 2,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#b1b1b7',
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
    nodesep: 50,
    ranksep: 100,
    marginx: 20,
    marginy: 20
  });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  return nodes.map((node) => {
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
