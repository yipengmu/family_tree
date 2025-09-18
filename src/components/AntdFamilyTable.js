import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tooltip, message, Input, Select, Modal } from 'antd';
import { PlusOutlined, SaveOutlined, InfoCircleOutlined, EditOutlined } from '@ant-design/icons';

const { Option } = Select;

const AntdFamilyTable = ({ 
  data = [], 
  onDataChange, 
  onSave, 
  loading = false,
  selectedRowKeys: externalSelectedRowKeys,
  onSelectedRowKeysChange,
  onSelectedRowsChange
}) => {
  const [tableData, setTableData] = useState([]);
  const [editingKey, setEditingKey] = useState('');
  const [pageSize, setPageSize] = useState(50); // 添加分页大小状态
  
  // 使用父组件传递的多选状态，如果没有则使用内部状态
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState([]);
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);
  
  const selectedRowKeys = externalSelectedRowKeys !== undefined ? externalSelectedRowKeys : internalSelectedRowKeys;
  const setSelectedRowKeys = onSelectedRowKeysChange || setInternalSelectedRowKeys;
  const setSelectedRows = onSelectedRowsChange || setInternalSelectedRows;

  // 合并和去重家谱数据
  const mergeAndDeduplicateData = (newData) => {
    if (!newData || newData.length === 0) return [];

    // 获取当前表格中的最大ID，确保新数据的ID连续
    const currentMaxId = tableData.length > 0
      ? Math.max(...tableData.map(item => parseInt(item.id) || 0))
      : 0;

    console.log(`📊 当前最大ID: ${currentMaxId}, 新增数据: ${newData.length} 条`);

    // 处理新数据
    const processedNewData = newData.map((item, index) => ({
      key: item.id || `temp_${Date.now()}_${index}`,
      id: item.id || (currentMaxId + index + 1),
      name: item.name || `未知姓名${index + 1}`,
      g_rank: item.g_rank || 1,
      rank_index: item.rank_index || (index + 1),
      sex: item.sex || 'MAN',
      adoption: item.adoption || 'none',
      g_father_id: item.g_father_id || 0,
      official_position: item.official_position || '',
      summary: item.summary || '',
      birth_date: item.birth_date || '',
      dealth: item.dealth || '',
      alive: item.alive !== undefined ? item.alive : (item.dealth === 'alive'), // 根据dealth字段推导 alive
      spouse: item.spouse || '',
      location: item.location || '',
      // 保留所有原始字段
      ...item
    }));

    // 合并现有数据和新数据
    const allData = [...tableData, ...processedNewData];

    // 基于姓名和世代进行去重
    const deduplicatedData = [];
    const seenPersons = new Set();

    allData.forEach(person => {
      // 创建唯一标识：姓名 + 世代 + 父亲ID
      const personKey = `${person.name}_${person.g_rank}_${person.g_father_id}`;

      if (!seenPersons.has(personKey)) {
        seenPersons.add(personKey);
        deduplicatedData.push(person);
      } else {
        console.log(`🔄 发现重复人员，已跳过: ${person.name} (世代${person.g_rank})`);
      }
    });

    // 重新分配连续的ID
    const finalData = deduplicatedData.map((person, index) => ({
      ...person,
      id: index + 1,
      key: `person_${index + 1}`
    }));

    console.log(`📊 数据处理完成: 原始${allData.length}条 → 去重后${finalData.length}条`);
    return finalData;
  };

  // 同步外部数据变化 - 优化数据排序
  useEffect(() => {
    if (data && data.length > 0) {
      const mergedData = mergeAndDeduplicateData(data);
      
      // 按世代和排行排序，确保穆茂在第一行
      const sortedData = mergedData.sort((a, b) => {
        // 首先按世代排序
        if (a.g_rank !== b.g_rank) {
          return a.g_rank - b.g_rank;
        }
        // 同世代内按排行排序
        return (a.rank_index || 0) - (b.rank_index || 0);
      });
      
      // 确保穆茂在第一位（特殊处理）
      const muMaoIndex = sortedData.findIndex(item => 
        item.name && item.name.includes('穆茂') && item.g_rank === 1
      );
      
      if (muMaoIndex > 0) {
        const muMao = sortedData.splice(muMaoIndex, 1)[0];
        sortedData.unshift(muMao);
        console.log('👑 穆茂已调整为第一行');
      }
      
      setTableData(sortedData);
      console.log(`📊 家谱数据已更新: ${sortedData.length} 条记录，第一行: ${sortedData[0]?.name || '未知'}`);
    } else if (data && data.length === 0) {
      // 如果传入空数组，清空数据
      setTableData([]);
    }
  }, [data]);

  // 列定义 - 优化表格显示密度和网格效果
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      sorter: (a, b) => a.id - b.id,
      align: 'center',
      render: (text) => (
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '500',
          color: '#666'
        }}>
          {text}
        </span>
      )
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 90,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'name', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'name', e.target.value)}
              autoFocus
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer', 
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              fontWeight: '500',
              color: '#1890ff',
              padding: '0 4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={text}
          >
            {text || '点击编辑'}
          </div>
        );
      },
    },
    {
      title: '世代',
      dataIndex: 'g_rank',
      key: 'g_rank',
      width: 50,
      sorter: (a, b) => a.g_rank - b.g_rank,
      align: 'center',
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              type="number"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'g_rank', parseInt(e.target.value))}
              onBlur={(e) => handleSave(record.key, 'g_rank', parseInt(e.target.value))}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              display: 'inline-block',
              width: '100%',
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              fontWeight: '500',
              color: '#52c41a',
              backgroundColor: '#f6ffed',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            {text}
          </span>
        );
      },
    },
    {
      title: '排行',
      dataIndex: 'rank_index',
      key: 'rank_index',
      width: 50,
      align: 'center',
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              type="number"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'rank_index', parseInt(e.target.value))}
              onBlur={(e) => handleSave(record.key, 'rank_index', parseInt(e.target.value))}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              display: 'inline-block',
              width: '100%',
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              color: '#666'
            }}
          >
            {text}
          </span>
        );
      }
    },
    {
      title: '父亲ID',
      dataIndex: 'g_father_id',
      key: 'g_father_id',
      width: 60,
      align: 'center',
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              type="number"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'g_father_id', parseInt(e.target.value) || 0)}
              onBlur={(e) => handleSave(record.key, 'g_father_id', parseInt(e.target.value) || 0)}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              display: 'inline-block',
              width: '100%',
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              color: text === 0 ? '#999' : '#722ed1',
              fontWeight: text === 0 ? 'normal' : '500'
            }}
          >
            {text === 0 ? '-' : text}
          </span>
        );
      }
    },
    {
      title: '性别',
      dataIndex: 'sex',
      key: 'sex',
      width: 50,
      align: 'center',
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Select
              size="small"
              defaultValue={text}
              style={{ width: '100%', fontSize: '12px' }}
              onChange={(value) => handleSave(record.key, 'sex', value)}
            >
              <Option value="MAN">男</Option>
              <Option value="WOMAN">女</Option>
            </Select>
          );
        }
        const isMale = text === 'MAN';
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              display: 'inline-block',
              width: '20px',
              height: '20px',
              lineHeight: '20px',
              fontSize: '11px',
              fontWeight: '500',
              color: isMale ? '#1890ff' : '#eb2f96',
              backgroundColor: isMale ? '#e6f7ff' : '#fff0f6',
              borderRadius: '50%',
              textAlign: 'center',
              border: `1px solid ${isMale ? '#1890ff' : '#eb2f96'}`
            }}
          >
            {isMale ? '男' : '女'}
          </span>
        );
      },
    },
    {
      title: '收养',
      dataIndex: 'adoption',
      key: 'adoption',
      width: 60,
      align: 'center',
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Select
              size="small"
              defaultValue={text}
              style={{ width: '100%', fontSize: '12px' }}
              onChange={(value) => handleSave(record.key, 'adoption', value)}
            >
              <Option value="none">无</Option>
              <Option value="adopted">收养</Option>
              <Option value="foster">寄养</Option>
            </Select>
          );
        }
        const displayText = text === 'none' ? '-' : text === 'adopted' ? '收养' : text === 'foster' ? '寄养' : text;
        const color = text === 'none' ? '#999' : '#fa8c16';
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              fontSize: '11px',
              color: color,
              fontWeight: text === 'none' ? 'normal' : '500'
            }}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      title: '官职',
      dataIndex: 'official_position',
      key: 'official_position',
      width: 120,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'official_position', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'official_position', e.target.value)}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              color: text ? '#13c2c2' : '#d9d9d9',
              padding: '0 4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={text}
          >
            {text || '无'}
          </div>
        );
      },
    },
    {
      title: '是否在世',
      dataIndex: 'alive',
      key: 'alive',
      width: 70,
      align: 'center',
      filters: [
        { text: '在世', value: true },
        { text: '已故', value: false },
      ],
      onFilter: (value, record) => record.alive === value,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Select
              size="small"
              defaultValue={text}
              style={{ width: '100%', fontSize: '12px' }}
              onChange={(value) => handleSave(record.key, 'alive', value)}
            >
              <Option value={true}>在世</Option>
              <Option value={false}>已故</Option>
            </Select>
          );
        }
        
        // 如果 alive 字段未定义，根据 dealth 字段推断
        const isAlive = text !== undefined ? text : (record.dealth === 'alive');
        
        return (
          <span 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              display: 'inline-block',
              width: '40px',
              height: '20px',
              lineHeight: '20px',
              fontSize: '11px',
              fontWeight: '500',
              color: isAlive ? '#52c41a' : '#8c8c8c',
              backgroundColor: isAlive ? '#f6ffed' : '#f5f5f5',
              borderRadius: '10px',
              textAlign: 'center',
              border: `1px solid ${isAlive ? '#52c41a' : '#d9d9d9'}`
            }}
          >
            {isAlive ? '在世' : '已故'}
          </span>
        );
      },
    },
    {
      title: '配偶',
      dataIndex: 'spouse',
      key: 'spouse',
      width: 80,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              size="small"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'spouse', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'spouse', e.target.value)}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              height: '24px',
              lineHeight: '24px',
              fontSize: '12px',
              color: text ? '#722ed1' : '#d9d9d9',
              padding: '0 4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={text}
          >
            {text || '无'}
          </div>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'summary',
      key: 'summary',
      width: 140,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input.TextArea
              size="small"
              defaultValue={text}
              autoSize={{ minRows: 1, maxRows: 3 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  handleSave(record.key, 'summary', e.target.value)
                }
              }}
              onBlur={(e) => handleSave(record.key, 'summary', e.target.value)}
              style={{ fontSize: '12px' }}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ 
              cursor: 'pointer',
              minHeight: '24px',
              maxHeight: '72px',
              lineHeight: '16px',
              fontSize: '11px',
              color: text ? '#595959' : '#d9d9d9',
              padding: '4px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-all'
            }}
            title={text}
          >
            {text || '无备注'}
          </div>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      align: 'center',
      sorter: (a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeA - timeB;
      },
      render: (text, record) => {
        // 优先使用 updated_at，如果没有则使用 created_at
        const displayTime = text || record.created_at;
        
        if (!displayTime) {
          return (
            <span style={{ 
              fontSize: '11px',
              color: '#999',
              fontStyle: 'italic'
            }}>
              无记录
            </span>
          );
        }
        
        // 格式化时间显示
        const formatTime = (timeStr) => {
          try {
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) {
              return '无效时间';
            }
            
            // 格式: 2024-02-32 21:11:21
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } catch (error) {
            return '格式错误';
          }
        };
        
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '11px',
              color: '#666',
              fontWeight: '500',
              lineHeight: '16px'
            }}>
              {formatTime(displayTime)}
            </div>
            {record.created_at && record.updated_at && record.created_at !== record.updated_at && (
              <div style={{ 
                fontSize: '10px',
                color: '#999',
                marginTop: '2px'
              }}>
                📝 已更新
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // 保存编辑
  const handleSave = (key, field, value) => {
    const newData = tableData.map(item => {
      if (item.key === key) {
        // 如果数据发生变化，更新 updated_at 时间戳
        const updatedItem = { ...item, [field]: value };
        
        // 检查是否有实际变化
        const hasChanged = item[field] !== value;
        
        if (hasChanged) {
          // 添加更新时间戳
          updatedItem.updated_at = new Date().toISOString();
          console.log(`📝 字段更新: ${field} = ${value}, 更新时间: ${updatedItem.updated_at}`);
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setTableData(newData);
    setEditingKey('');
    
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // 添加新行
  const addRow = () => {
    const newId = Math.max(...tableData.map(row => parseInt(row.id) || 0), 0) + 1;
    const currentTime = new Date().toISOString();
    const newRow = {
      key: `new_${newId}`,
      id: newId,
      name: `新人物${newId}`,
      g_rank: 1,
      rank_index: 1,
      g_father_id: 0,
      official_position: '',
      summary: '',
      adoption: 'none',
      sex: 'MAN',
      birth_date: '',
      dealth: '',
      alive: true, // 新加的人默认在世
      spouse: '',
      location: '',
      created_at: currentTime,
      updated_at: currentTime
    };

    const newData = [...tableData, newRow];
    setTableData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
    
    message.success('已添加新行');
  };

  // 导出Excel功能已迁移到CreatorPage的管理与发布弹框中
  // const exportToExcel = () => { ... }

  // 批量删除功能已迁移到CreatorPage中
  // const handleBatchDelete = () => { ... }

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, newSelectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setSelectedRows(newSelectedRows);
    },
    getCheckboxProps: (record) => ({
      disabled: false, // 可以根据需要设置禁用条件
      name: record.name,
    }),
  };

  return (
    <div className="antd-family-table" style={{ width: '100%' }}>
      <style>
        {`
          .compact-family-table .ant-table-thead > tr > th {
            padding: 8px 6px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            background-color: #fafafa !important;
            border-bottom: 2px solid #e8e8e8 !important;
            text-align: center;
          }
          
          .compact-family-table .ant-table-tbody > tr > td {
            padding: 4px 6px !important;
            font-size: 12px !important;
            vertical-align: middle !important;
            border-right: 1px solid #f0f0f0 !important;
            height: 32px !important;
          }
          
          .compact-family-table .ant-table-tbody > tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .compact-family-table .ant-table-tbody > tr:hover {
            background-color: #f0f9ff !important;
          }
          
          .compact-family-table .ant-table-pagination {
            margin: 16px 0 0 0 !important;
            text-align: center;
          }
          
          .compact-family-table .ant-pagination {
            font-size: 12px;
          }
          
          .compact-family-table .ant-pagination-options {
            font-size: 12px;
          }
          
          .compact-family-table .ant-pagination-total-text {
            font-size: 12px;
            color: #666;
          }
          
          .compact-family-table .ant-pagination-item {
            min-width: 28px;
            height: 28px;
            line-height: 26px;
            font-size: 12px;
          }
          
          .compact-family-table .ant-pagination-prev,
          .compact-family-table .ant-pagination-next {
            min-width: 28px;
            height: 28px;
            line-height: 26px;
          }
          
          .compact-family-table .ant-select-selector {
            font-size: 12px !important;
            height: 24px !important;
            min-height: 24px !important;
          }
          
          .compact-family-table .ant-input {
            font-size: 12px !important;
            height: 24px !important;
            padding: 2px 6px !important;
          }
          
          .compact-family-table .ant-input-number {
            font-size: 12px !important;
            height: 24px !important;
          }
          
          .compact-family-table .ant-table-filter-column {
            font-size: 12px !important;
          }
          
          .compact-family-table .ant-table-column-sorter {
            font-size: 10px !important;
          }
        `}
      </style>
      
      {/* 工具栏已移除，批量删除功能在CreatorPage中处理 */}

      {/* Ant Design Table - 优化显示密度和网格效果 */}
      <Table
        columns={columns}
        dataSource={tableData}
        rowSelection={rowSelection}
        pagination={{
          pageSize: pageSize,
          showSizeChanger: true,
          showQuickJumper: false, // 取消goto功能
          pageSizeOptions: ['25', '50', '100', '200'],
          showTotal: (total, range) => (
            <span style={{ fontSize: '12px', color: '#666' }}>
              共 {total} 条
            </span>
          ),
          size: 'small',
          simple: false,
          onShowSizeChange: (current, size) => {
            console.log(`🔄 分页大小变更: ${pageSize} → ${size}`);
            setPageSize(size);
          },
          onChange: (page, size) => {
            console.log(`📊 切换到第 ${page} 页，每页 ${size} 条`);
          }
        }}
        scroll={{ x: 950, y: 500 }}
        size="small"
        bordered
        rowKey="key"
        locale={{
          emptyText: (
            <div style={{
              padding: '40px 20px',
              color: '#999',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '8px' }}>📝 暂无数据</div>
              <div style={{ fontSize: '12px' }}>请上传图片进行OCR识别或手动添加</div>
            </div>
          )
        }}
        className="compact-family-table"
        style={{
          fontSize: '12px',
          '--table-row-height': '32px'
        }}
        components={{
          header: {
            cell: (props) => (
              <th 
                {...props} 
                style={{
                  ...props.style,
                  backgroundColor: '#fafafa',
                  fontWeight: '600',
                  fontSize: '12px',
                  padding: '8px 6px',
                  lineHeight: '1.2',
                  borderBottom: '2px solid #e8e8e8'
                }}
              />
            )
          },
          body: {
            row: (props) => (
              <tr 
                {...props} 
                style={{
                  ...props.style,
                  height: '32px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              />
            ),
            cell: (props) => (
              <td 
                {...props} 
                style={{
                  ...props.style,
                  padding: '4px 6px',
                  verticalAlign: 'middle',
                  borderRight: '1px solid #f0f0f0'
                }}
              />
            )
          }
        }}
      />
    </div>
  );
};

export default AntdFamilyTable;
