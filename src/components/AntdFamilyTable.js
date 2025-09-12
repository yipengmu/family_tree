import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tooltip, message, Input, Select } from 'antd';
import { PlusOutlined, DownloadOutlined, SaveOutlined, InfoCircleOutlined, EditOutlined } from '@ant-design/icons';

const { Option } = Select;

const AntdFamilyTable = ({ data = [], onDataChange, onExport, onSave, loading = false }) => {
  const [tableData, setTableData] = useState([]);
  const [editingKey, setEditingKey] = useState('');

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

  // 同步外部数据变化
  useEffect(() => {
    if (data && data.length > 0) {
      const mergedData = mergeAndDeduplicateData(data);
      setTableData(mergedData);
      console.log(`📊 家谱数据已更新: ${mergedData.length} 条记录`);
    } else if (data && data.length === 0) {
      // 如果传入空数组，清空数据
      setTableData([]);
    }
  }, [data]);

  // 列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'name', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'name', e.target.value)}
              autoFocus
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
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
      width: 60,
      sorter: (a, b) => a.g_rank - b.g_rank,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              type="number"
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'g_rank', parseInt(e.target.value))}
              onBlur={(e) => handleSave(record.key, 'g_rank', parseInt(e.target.value))}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text}
          </div>
        );
      },
    },
    {
      title: '排行',
      dataIndex: 'rank_index',
      key: 'rank_index',
      width: 60,
    },
    {
      title: '父亲ID',
      dataIndex: 'g_father_id',
      key: 'g_father_id',
      width: 80,
    },
    {
      title: '性别',
      dataIndex: 'sex',
      key: 'sex',
      width: 80,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Select
              defaultValue={text}
              style={{ width: '100%' }}
              onChange={(value) => handleSave(record.key, 'sex', value)}
            >
              <Option value="MAN">男</Option>
              <Option value="WOMAN">女</Option>
            </Select>
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text === 'MAN' ? '男' : text === 'WOMAN' ? '女' : text}
          </div>
        );
      },
    },
    {
      title: '收养状态',
      dataIndex: 'adoption',
      key: 'adoption',
      width: 100,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Select
              defaultValue={text}
              style={{ width: '100%' }}
              onChange={(value) => handleSave(record.key, 'adoption', value)}
            >
              <Option value="none">无</Option>
              <Option value="adopted">收养</Option>
              <Option value="foster">寄养</Option>
            </Select>
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text === 'none' ? '无' : text === 'adopted' ? '收养' : text === 'foster' ? '寄养' : text}
          </div>
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
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'official_position', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'official_position', e.target.value)}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text || '点击编辑'}
          </div>
        );
      },
    },
    {
      title: '配偶',
      dataIndex: 'spouse',
      key: 'spouse',
      width: 100,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'spouse', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'spouse', e.target.value)}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text || '点击编辑'}
          </div>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'summary',
      key: 'summary',
      width: 150,
      render: (text, record) => {
        if (editingKey === record.key) {
          return (
            <Input
              defaultValue={text}
              onPressEnter={(e) => handleSave(record.key, 'summary', e.target.value)}
              onBlur={(e) => handleSave(record.key, 'summary', e.target.value)}
            />
          );
        }
        return (
          <div 
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: 'pointer', minHeight: '22px' }}
          >
            {text || '点击编辑'}
          </div>
        );
      },
    },
  ];

  // 保存编辑
  const handleSave = (key, field, value) => {
    const newData = tableData.map(item => {
      if (item.key === key) {
        return { ...item, [field]: value };
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
      spouse: '',
      location: ''
    };

    const newData = [...tableData, newRow];
    setTableData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
    
    message.success('已添加新行');
  };

  // 导出CSV
  const exportCSV = () => {
    try {
      const headers = columns.map(col => col.title).join(',');
      const rows = tableData.map(row => 
        columns.map(col => {
          const value = row[col.dataIndex] || '';
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `family_tree_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('CSV文件已导出');
    } catch (error) {
      console.error('导出CSV失败:', error);
      message.error('导出CSV失败');
    }
  };

  return (
    <div className="antd-family-table" style={{ width: '100%' }}>
      {/* 数据状态信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          marginBottom: '8px',
          fontSize: '12px'
        }}>
          <strong>📊 数据状态:</strong>
          共 {tableData?.length || 0} 条记录
          {tableData && tableData.length > 0 && ` | 最新: ${tableData[0].name}`}
          {editingKey && ` | 编辑中: ${editingKey}`}
        </div>
      )}
      
      {/* 工具栏 */}
      <div className="antd-family-table-toolbar" style={{ marginBottom: '8px' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addRow}
          >
            添加行
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportCSV}
          >
            导出CSV
          </Button>
          {onExport && (
            <Button
              onClick={() => onExport(tableData)}
            >
              导出Excel
            </Button>
          )}
          {onSave && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={() => onSave(tableData)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              保存数据
            </Button>
          )}

          <Tooltip title="点击单元格编辑，支持排序和筛选">
            <Button type="text" icon={<InfoCircleOutlined />} />
          </Tooltip>
        </Space>
      </div>

      {/* Ant Design Table */}
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{
          defaultPageSize: 20,
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['20', '100', '300', '500'],
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onShowSizeChange: (current, size) => {
            console.log(`分页大小变更: 当前页=${current}, 每页显示=${size}`);
          },
        }}
        scroll={{ x: 1200, y: 400 }}
        size="small"
        bordered
        rowKey="key"
        locale={{
          emptyText: '暂无数据，请上传图片进行OCR识别'
        }}
      />
    </div>
  );
};

export default AntdFamilyTable;
