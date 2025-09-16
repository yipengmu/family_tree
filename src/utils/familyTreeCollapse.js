/**
 * 家谱智能折叠工具
 * 实现前三代之后的自动折叠，但保留当前登录用户的路径展开
 */

import { getPathToRoot } from './familyTreeUtils';

/**
 * 获取当前登录用户信息
 * @param {Array} familyData - 家谱数据（可选）
 * @returns {Object} - 当前登录用户信息
 */
export const getCurrentUser = (familyData = null) => {
  // 如果提供了家谱数据，从中查找穆毅鹏
  if (familyData && familyData.length > 0) {
    const user = familyData.find(p => p.name === '穆毅鹏');
    if (user) {
      return {
        id: user.id,
        name: user.name,
        g_rank: user.g_rank
      };
    }
  }

  // 默认返回已知的穆毅鹏信息
  // 未来可以从登录状态、localStorage或API获取
  return {
    id: 685,
    name: '穆毅鹏',
    g_rank: 20
  };
};

/**
 * 获取需要展开的路径（当前用户到根节点的路径）
 * @param {Array} familyData - 家谱数据
 * @param {Object} currentUser - 当前登录用户
 * @param {Object} options - 展开选项
 * @returns {Set} - 需要展开的人员ID集合
 */
export const getExpandedPath = (familyData, currentUser = null, options = {}) => {
  if (!currentUser) {
    currentUser = getCurrentUser();
  }

  const {
    isFocusMode = false,
    searchTargetPerson = null
  } = options;

  // 获取最大代数
  const maxGeneration = Math.max(...familyData.map(p => p.g_rank));
  const lastThreeGenerations = [maxGeneration - 2, maxGeneration - 1, maxGeneration];

  // 获取从当前用户到根节点的路径
  const pathPersons = getPathToRoot(familyData, currentUser.id);
  const expandedIds = new Set(pathPersons.map(p => p.id));

  // 添加路径上每个节点的直接子女（显示兄弟姐妹关系）
  pathPersons.forEach(pathPerson => {
    const siblings = familyData.filter(person =>
      person.g_father_id === pathPerson.g_father_id &&
      person.g_father_id !== 0
    );
    siblings.forEach(sibling => {
      expandedIds.add(sibling.id);
    });
  });

  // 添加当前用户的直接子女
  const currentUserChildren = familyData.filter(person =>
    person.g_father_id === currentUser.id
  );
  currentUserChildren.forEach(child => {
    expandedIds.add(child.id);
  });

  // 添加当前用户同代的所有成员（堂兄弟姐妹）
  const sameGenerationMembers = familyData.filter(person =>
    person.g_rank === currentUser.g_rank
  );
  sameGenerationMembers.forEach(member => {
    expandedIds.add(member.id);
  });

  // 聚焦模式下的特殊逻辑：如果搜索目标是最后3代人员，展开最后3代所有人员
  if (isFocusMode && searchTargetPerson) {
    const targetGeneration = searchTargetPerson.g_rank;

    // 如果搜索目标在最后3代中
    if (lastThreeGenerations.includes(targetGeneration)) {
      console.log(`🎯 聚焦模式：搜索目标在第${targetGeneration}代（最后3代之一），展开最后3代所有人员`);

      // 添加最后3代的所有人员
      const lastThreeGenerationsMembers = familyData.filter(person =>
        lastThreeGenerations.includes(person.g_rank)
      );

      lastThreeGenerationsMembers.forEach(member => {
        expandedIds.add(member.id);
      });

      console.log(`📊 最后3代展开统计: 第${lastThreeGenerations[0]}-${lastThreeGenerations[2]}代，共${lastThreeGenerationsMembers.length}人`);
    }
  }

  return expandedIds;
};

/**
 * 应用智能折叠规则
 * @param {Array} familyData - 完整家谱数据
 * @param {Object} options - 折叠选项
 * @param {Set} expandedNodes - 用户手动展开的节点ID集合
 * @returns {Array} - 折叠后的家谱数据
 */
export const applySmartCollapse = (familyData, options = {}, expandedNodes = new Set()) => {
  const {
    currentUser = getCurrentUser(),
    collapseAfterGeneration = 3,
    showAllGenerations = false,
    isFocusMode = false,
    searchTargetPerson = null
  } = options;

  // 如果显示全部代数，不进行折叠
  if (showAllGenerations) {
    return familyData;
  }

  // 获取需要展开的路径，传递聚焦模式和搜索目标信息
  const expandedIds = getExpandedPath(familyData, currentUser, {
    isFocusMode,
    searchTargetPerson
  });

  // 合并用户手动展开的节点
  const allExpandedIds = new Set([...expandedIds, ...expandedNodes]);

  // 为手动展开的节点添加其直接子女
  expandedNodes.forEach(nodeId => {
    const children = familyData.filter(person => person.g_father_id === nodeId);
    children.forEach(child => {
      allExpandedIds.add(child.id);
    });
  });

  // 如果在搜索模式下，确保搜索路径树的核心人员都被包含
  if (searchTargetPerson) {
    // 获取搜索目标到根节点的路径
    const pathPersons = getPathToRoot(familyData, searchTargetPerson.id);
    pathPersons.forEach(person => {
      allExpandedIds.add(person.id);
    });

    // 添加路径上每个节点的兄弟姐妹
    pathPersons.forEach(pathPerson => {
      const siblings = familyData.filter(person =>
        person.g_father_id === pathPerson.g_father_id &&
        person.g_father_id !== 0
      );
      siblings.forEach(sibling => {
        allExpandedIds.add(sibling.id);
      });

      // 添加该路径节点的所有直接子节点
      const children = familyData.filter(person =>
        person.g_father_id === pathPerson.id
      );
      children.forEach(child => {
        allExpandedIds.add(child.id);
      });
    });

    console.log(`🔍 搜索模式路径处理: 目标${searchTargetPerson.name}，路径${pathPersons.length}人，总展开${allExpandedIds.size}人`);
  }

  // 筛选数据：前三代全部显示，之后只显示展开路径
  const filteredData = familyData.filter(person => {
    // 前三代全部显示
    if (person.g_rank <= collapseAfterGeneration) {
      return true;
    }

    // 第三代之后只显示展开路径中的人员
    return allExpandedIds.has(person.id);
  });

  console.log(`🌳 智能折叠应用完成:`);
  console.log(`- 原始数据: ${familyData.length} 人`);
  console.log(`- 折叠后: ${filteredData.length} 人`);
  console.log(`- 当前用户: ${currentUser.name} (第${currentUser.g_rank}代)`);
  console.log(`- 展开路径: ${expandedIds.size} 人`);
  console.log(`- 手动展开: ${expandedNodes.size} 人`);
  console.log(`- 总展开: ${allExpandedIds.size} 人`);
  
  if (searchTargetPerson) {
    console.log(`- 搜索目标: ${searchTargetPerson.name} (第${searchTargetPerson.g_rank}代)`);
  }

  return filteredData;
};

/**
 * 获取折叠统计信息
 * @param {Array} originalData - 原始数据
 * @param {Array} collapsedData - 折叠后数据
 * @param {Object} currentUser - 当前用户
 * @returns {Object} - 统计信息
 */
export const getCollapseStats = (originalData, collapsedData, currentUser = null) => {
  if (!currentUser) {
    currentUser = getCurrentUser();
  }

  const originalByGeneration = {};
  const collapsedByGeneration = {};

  originalData.forEach(person => {
    const gen = person.g_rank;
    originalByGeneration[gen] = (originalByGeneration[gen] || 0) + 1;
  });

  collapsedData.forEach(person => {
    const gen = person.g_rank;
    collapsedByGeneration[gen] = (collapsedByGeneration[gen] || 0) + 1;
  });

  const maxGeneration = Math.max(...originalData.map(p => p.g_rank));
  const generationStats = [];

  for (let i = 1; i <= maxGeneration; i++) {
    generationStats.push({
      generation: i,
      original: originalByGeneration[i] || 0,
      collapsed: collapsedByGeneration[i] || 0,
      hidden: (originalByGeneration[i] || 0) - (collapsedByGeneration[i] || 0)
    });
  }

  return {
    currentUser,
    totalOriginal: originalData.length,
    totalCollapsed: collapsedData.length,
    totalHidden: originalData.length - collapsedData.length,
    generationStats,
    collapseRatio: ((originalData.length - collapsedData.length) / originalData.length * 100).toFixed(1)
  };
};

/**
 * 检查某个人员是否在展开路径中
 * @param {Number} personId - 人员ID
 * @param {Array} familyData - 家谱数据
 * @param {Object} currentUser - 当前用户
 * @returns {Boolean} - 是否在展开路径中
 */
export const isInExpandedPath = (personId, familyData, currentUser = null) => {
  if (!currentUser) {
    currentUser = getCurrentUser();
  }

  const expandedIds = getExpandedPath(familyData, currentUser);
  return expandedIds.has(personId);
};

/**
 * 获取折叠提示信息
 * @param {Object} stats - 折叠统计信息
 * @returns {String} - 提示信息
 */
export const getCollapseHint = (stats) => {
  if (stats.totalHidden === 0) {
    return '显示完整家谱';
  }

  return `智能折叠模式：显示 ${stats.totalCollapsed} 人，隐藏 ${stats.totalHidden} 人 (${stats.collapseRatio}%)`;
};

/**
 * 切换用户路径展开
 * @param {Array} familyData - 家谱数据
 * @param {Number} targetUserId - 目标用户ID
 * @returns {Array} - 以目标用户为中心的折叠数据
 */
export const switchUserPath = (familyData, targetUserId) => {
  const targetUser = familyData.find(p => p.id === targetUserId);
  if (!targetUser) {
    console.warn('目标用户不存在:', targetUserId);
    return familyData;
  }

  console.log(`🔄 切换到用户路径: ${targetUser.name} (第${targetUser.g_rank}代)`);
  
  return applySmartCollapse(familyData, {
    currentUser: targetUser,
    collapseAfterGeneration: 3,
    showAllGenerations: false
  });
};

/**
 * 获取可切换的用户列表（第4代及以后的用户）
 * @param {Array} familyData - 家谱数据
 * @returns {Array} - 可切换的用户列表
 */
export const getSwitchableUsers = (familyData) => {
  return familyData
    .filter(person => person.g_rank >= 4)
    .map(person => ({
      id: person.id,
      name: person.name,
      generation: person.g_rank,
      summary: person.summary || `第${person.g_rank}代`
    }))
    .sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));
};

/**
 * 检查节点是否有被折叠的子节点
 * @param {Number} nodeId - 节点ID
 * @param {Array} familyData - 完整家谱数据
 * @param {Array} visibleData - 当前可见的数据
 * @returns {Boolean} - 是否有被折叠的子节点
 */
export const hasCollapsedChildren = (nodeId, familyData, visibleData) => {
  // 获取该节点的所有子节点
  const allChildren = familyData.filter(person => person.g_father_id === nodeId);

  // 获取当前可见的子节点
  const visibleChildrenIds = new Set(visibleData.map(p => p.id));
  const visibleChildren = allChildren.filter(child => visibleChildrenIds.has(child.id));

  // 如果有子节点但不是全部可见，说明有被折叠的
  return allChildren.length > 0 && visibleChildren.length < allChildren.length;
};

/**
 * 获取节点的直接子节点
 * @param {Number} nodeId - 节点ID
 * @param {Array} familyData - 家谱数据
 * @returns {Array} - 直接子节点列表
 */
export const getDirectChildren = (nodeId, familyData) => {
  return familyData.filter(person => person.g_father_id === nodeId);
};
