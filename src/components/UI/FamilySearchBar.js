import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AutoComplete, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import searchHistoryManager from '../../utils/searchHistory';
import './FamilySearchBar.css';

const { Text } = Typography;

const FamilySearchBar = ({ 
  familyData = [], 
  nodes = [], 
  statistics = null,
  onSearch,
  onSelect,
  placeholder = "搜索家族成员...",
  showStatus = true,
  style = {}
}) => {
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const searchTimeoutRef = useRef(null);

  // 加载搜索历史
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await searchHistoryManager.getSearchHistory();
        if (history && history.length > 0) {
          const historyOptions = history.map(item => ({
            value: item.query,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.query}</span>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </div>
            ),
            type: 'history'
          }));
          setSearchOptions(historyOptions);
        }
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // 生成搜索建议
  const generateSearchSuggestions = useCallback((query) => {
    if (!query || !familyData || familyData.length === 0) {
      return [];
    }

    const suggestions = [];
    const queryLower = query.toLowerCase();

    // 搜索匹配的家族成员
    familyData.forEach(member => {
      if (member.name && member.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          value: member.name,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{member.name}</span>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                第{member.g_rank}代
              </Text>
            </div>
          ),
          type: 'member',
          member: member
        });
      }
    });

    // 限制建议数量
    return suggestions.slice(0, 8);
  }, [familyData]);

  // 处理搜索输入
  const handleSearchInput = useCallback((value) => {
    setSearchInputValue(value);

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器，延迟搜索以提高性能
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        const suggestions = generateSearchSuggestions(value);
        setSearchOptions(suggestions);
      } else {
        // 如果输入为空，显示搜索历史
        searchHistoryManager.getSearchHistory().then(history => {
          if (history && history.length > 0) {
            const historyOptions = history.map(item => ({
              value: item.query,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{item.query}</span>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </div>
              ),
              type: 'history'
            }));
            setSearchOptions(historyOptions);
          }
        });
      }
    }, 300);
  }, [generateSearchSuggestions]);

  // 处理搜索选择
  const handleSearchSelect = useCallback(async (value, option) => {
    setSearchInputValue(value);
    
    // 保存到搜索历史
    try {
      await searchHistoryManager.addSearchHistory(value);
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }

    // 调用外部回调
    if (onSelect) {
      onSelect(value, option);
    }
  }, [onSelect]);

  // 处理搜索提交
  const handleSearchSubmit = useCallback(async () => {
    const query = searchInputValue.trim();
    if (!query) return;

    // 保存到搜索历史
    try {
      await searchHistoryManager.addSearchHistory(query);
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }

    // 调用外部回调
    if (onSearch) {
      onSearch(query);
    }
  }, [searchInputValue, onSearch]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="family-search-bar" style={style}>

      {/* 搜索功能 */}
      <div className="search-section">
        <AutoComplete
          value={searchInputValue}
          options={searchOptions}
          onSelect={handleSearchSelect}
          onSearch={handleSearchInput}
          placeholder={placeholder}
          style={{ width: 200 }}
          allowClear
          dropdownClassName="family-search-dropdown"
        >
          <Input
            prefix={<SearchOutlined />}
            onPressEnter={handleSearchSubmit}
            className="family-search-input"
          />
        </AutoComplete>
      </div>


      {/* 状态信息 */}
      {showStatus && (
        <div className="status-info">
          <div className="count-info">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {nodes.length}/{statistics?.totalMembers || familyData.length}人
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySearchBar;
