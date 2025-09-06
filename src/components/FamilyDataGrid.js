import React, { useState, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Button, Space, message, Select, Input, DatePicker, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined, SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import moment from 'moment';

// 导入AG Grid样式
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './FamilyDataGrid.css';

const { Option } = Select;

// 性别选择器组件
const GenderCellRenderer = (props) => {
  const { value, setValue } = props;
  
  return (
    <Select
      value={value || 'MAN'}
      onChange={setValue}
      style={{ width: '100%', border: 'none' }}
      size="small"
    >
      <Option value="MAN">男</Option>
      <Option value="WOMAN">女</Option>
    </Select>
  );
};

// 收养状态选择器
const AdoptionCellRenderer = (props) => {
  const { value, setValue } = props;
  
  return (
    <Select
      value={value || 'none'}
      onChange={setValue}
      style={{ width: '100%', border: 'none' }}
      size="small"
    >
      <Option value="none">无</Option>
      <Option value="adopted">收养</Option>
      <Option value="foster">寄养</Option>
    </Select>
  );
};

// 生死状态选择器
const DeathStatusCellRenderer = (props) => {
  const { value, setValue } = props;
  
  return (
    <Select
      value={value || null}
      onChange={setValue}
      style={{ width: '100%', border: 'none' }}
      size="small"
      allowClear
      placeholder="在世"
    >
      <Option value={null}>在世</Option>
      <Option value="death">已故</Option>
    </Select>
  );
};

// 日期选择器组件
const DateCellRenderer = (props) => {
  const { value, setValue } = props;
  
  return (
    <DatePicker
      value={value ? moment(value) : null}
      onChange={(date) => setValue(date ? date.format('YYYY-MM-DD') : '')}
      style={{ width: '100%', border: 'none' }}
      size="small"
      placeholder="选择日期"
    />
  );
};

// 数字输入组件
const NumberCellRenderer = (props) => {
  const { value, setValue } = props;
  
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ border: 'none' }}
      size="small"
    />
  );
};

const FamilyDataGrid = ({ 
  data = [], 
  onDataChange, 
  onExport, 
  onSave,
  loading = false 
}) => {
  const gridRef = useRef();
  const [rowData, setRowData] = useState(data);

  // 列定义
  const columnDefs = useMemo(() => [
    {
      headerName: 'ID',
      field: 'id',
      width: 80,
      cellRenderer: (params) => (
        <NumberCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'id', value)}
        />
      )
    },
    {
      headerName: '姓名',
      field: 'name',
      width: 120,
      editable: true,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: '性别',
      field: 'sex',
      width: 80,
      cellRenderer: (params) => (
        <GenderCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'sex', value)}
        />
      )
    },
    {
      headerName: '世代',
      field: 'g_rank',
      width: 80,
      cellRenderer: (params) => (
        <NumberCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'g_rank', value)}
        />
      )
    },
    {
      headerName: '排行',
      field: 'rank_index',
      width: 80,
      cellRenderer: (params) => (
        <NumberCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'rank_index', value)}
        />
      )
    },
    {
      headerName: '父亲ID',
      field: 'g_father_id',
      width: 100,
      cellRenderer: (params) => (
        <NumberCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'g_father_id', value)}
        />
      )
    },
    {
      headerName: '母亲ID',
      field: 'g_mother_id',
      width: 100,
      cellRenderer: (params) => (
        <NumberCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'g_mother_id', value)}
        />
      )
    },
    {
      headerName: '官职',
      field: 'official_position',
      width: 120,
      editable: true
    },
    {
      headerName: '简介',
      field: 'summary',
      width: 200,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      headerName: '收养状态',
      field: 'adoption',
      width: 100,
      cellRenderer: (params) => (
        <AdoptionCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'adoption', value)}
        />
      )
    },
    {
      headerName: '出生日期',
      field: 'birth_date',
      width: 120,
      cellRenderer: (params) => (
        <DateCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'birth_date', value)}
        />
      )
    },
    {
      headerName: '正式名',
      field: 'formal_name',
      width: 120,
      editable: true
    },
    {
      headerName: '配偶',
      field: 'spouse',
      width: 120,
      editable: true
    },
    {
      headerName: '生死状态',
      field: 'dealth',
      width: 100,
      cellRenderer: (params) => (
        <DeathStatusCellRenderer
          {...params}
          setValue={(value) => updateCellValue(params.node.rowIndex, 'dealth', value)}
        />
      )
    },
    {
      headerName: '地点',
      field: 'location',
      width: 120,
      editable: true
    },
    {
      headerName: '身份证',
      field: 'id_card',
      width: 150,
      editable: true
    },
    {
      headerName: '头像',
      field: 'face_img',
      width: 150,
      editable: true
    },
    {
      headerName: '子女',
      field: 'childrens',
      width: 120,
      editable: true
    },
    {
      headerName: '操作',
      field: 'actions',
      width: 100,
      cellRenderer: (params) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => deleteRow(params.node.rowIndex)}
        >
          删除
        </Button>
      ),
      pinned: 'right'
    }
  ], []);

  // 更新单元格值
  const updateCellValue = useCallback((rowIndex, field, value) => {
    const newData = [...rowData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setRowData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
  }, [rowData, onDataChange]);

  // 单元格值变化处理
  const onCellValueChanged = useCallback((event) => {
    const newData = [...rowData];
    newData[event.node.rowIndex] = event.data;
    setRowData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
  }, [rowData, onDataChange]);

  // 添加新行
  const addRow = useCallback(() => {
    const newRow = {
      id: '',
      name: '',
      g_rank: '',
      rank_index: '',
      g_father_id: '',
      official_position: '',
      summary: '',
      adoption: 'none',
      sex: 'MAN',
      g_mother_id: '',
      birth_date: '',
      id_card: '',
      face_img: '',
      photos: '',
      household_info: '',
      spouse: '',
      home_page: '',
      dealth: null,
      formal_name: '',
      location: '',
      childrens: ''
    };
    
    const newData = [...rowData, newRow];
    setRowData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
    
    message.success('已添加新行');
  }, [rowData, onDataChange]);

  // 删除行
  const deleteRow = useCallback((rowIndex) => {
    const newData = rowData.filter((_, index) => index !== rowIndex);
    setRowData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
    
    message.success('已删除行');
  }, [rowData, onDataChange]);

  // 导出CSV
  const exportCSV = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `家谱数据_${new Date().toISOString().split('T')[0]}.csv`
      });
      message.success('CSV文件已导出');
    }
  }, []);

  // 默认列定义
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: false
  }), []);

  // 网格选项
  const gridOptions = useMemo(() => ({
    rowSelection: 'multiple',
    enableRangeSelection: true,
    suppressRowClickSelection: true,
    rowHeight: 40,
    headerHeight: 45
  }), []);

  // 同步外部数据变化
  React.useEffect(() => {
    console.log('📊 FamilyDataGrid 接收到新数据:', data);
    console.log('📊 数据长度:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📊 第一条数据示例:', data[0]);
      console.log('📊 所有数据字段检查:', Object.keys(data[0]));
    }
    setRowData(data);

    // 强制刷新表格
    if (gridRef.current && gridRef.current.api) {
      setTimeout(() => {
        gridRef.current.api.setRowData(data);
        console.log('🔄 强制刷新AG Grid数据');
      }, 100);
    }
  }, [data]);

  return (
    <div className="family-data-grid" style={{ width: '100%', height: '500px' }}>
      {/* 工具栏 */}
      <div className="family-data-grid-toolbar">
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
              onClick={() => onExport(rowData)}
            >
              导出Excel
            </Button>
          )}
          {onSave && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={() => onSave(rowData)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              保存数据
            </Button>
          )}
          <Tooltip title="双击单元格编辑，支持多选、排序、筛选">
            <Button type="text" icon={<InfoCircleOutlined />} />
          </Tooltip>
        </Space>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          gridOptions={gridOptions}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          suppressMenuHide={true}
        />
      </div>
    </div>
  );
};

export default FamilyDataGrid;
