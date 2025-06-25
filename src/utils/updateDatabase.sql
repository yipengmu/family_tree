-- 数据库更新脚本
-- 根据dbjson.js真实数据更新19代和20代人员的death状态

-- 更新第19代人员的生存状态
-- 基于dbjson.js的真实数据

-- 穆荣震 (ID: 680) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 680;

-- 穆荣滋 (ID: 681) - 在世  
UPDATE family_members SET dealth = 'alive' WHERE id = 681;

-- 穆荣润 (ID: 682) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 682;

-- 穆荣挺 (ID: 683) - 已故
UPDATE family_members SET dealth = 'dealth' WHERE id = 683;

-- 穆荣峰 (ID: 684) - 已故
UPDATE family_members SET dealth = 'dealth' WHERE id = 684;

-- 更新第20代人员的生存状态
-- 基于dbjson.js的真实数据

-- 穆毅鹏 (ID: 685) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 685;

-- 穆栋 (ID: 686) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 686;

-- 穆垠彤 (ID: 687) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 687;

-- 穆昊楠 (ID: 688) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 688;

-- 穆雅馨 (ID: 689) - 在世
UPDATE family_members SET dealth = 'alive' WHERE id = 689;

-- 验证更新结果
SELECT 
    id,
    name,
    g_rank,
    rank_index,
    dealth,
    CASE 
        WHEN dealth = 'alive' THEN '在世'
        WHEN dealth = 'dealth' THEN '已故'
        ELSE '未知'
    END as status_cn
FROM family_members 
WHERE g_rank IN (19, 20)
ORDER BY g_rank, rank_index;

-- 统计19-20代生存状态
SELECT 
    g_rank as generation,
    COUNT(*) as total_count,
    SUM(CASE WHEN dealth = 'alive' THEN 1 ELSE 0 END) as alive_count,
    SUM(CASE WHEN dealth = 'dealth' THEN 1 ELSE 0 END) as death_count,
    ROUND(
        SUM(CASE WHEN dealth = 'alive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as alive_percentage
FROM family_members 
WHERE g_rank IN (19, 20)
GROUP BY g_rank
ORDER BY g_rank;

-- 查看穆毅鹏的家族路径（从穆毅鹏到穆茂）
WITH RECURSIVE family_path AS (
    -- 起始点：穆毅鹏
    SELECT id, name, g_rank, g_father_id, 0 as level
    FROM family_members 
    WHERE id = 685
    
    UNION ALL
    
    -- 递归查找父辈
    SELECT f.id, f.name, f.g_rank, f.g_father_id, fp.level + 1
    FROM family_members f
    INNER JOIN family_path fp ON f.id = fp.g_father_id
    WHERE f.g_father_id IS NOT NULL AND f.g_father_id != 0
)
SELECT 
    level,
    id,
    name,
    g_rank as generation,
    CASE 
        WHEN dealth = 'alive' THEN '在世'
        WHEN dealth = 'dealth' THEN '已故'
        ELSE '未知'
    END as status
FROM family_path fp
LEFT JOIN family_members fm ON fp.id = fm.id
ORDER BY level;
