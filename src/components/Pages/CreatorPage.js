import React, { useMemo, useState, useEffect } from 'react';
import { message, Progress, Button, Space, Card, Row, Col, Divider, Typography, Modal, Tooltip, Input } from 'antd';
import { PlusOutlined, CloudUploadOutlined, TableOutlined, SaveOutlined, DownloadOutlined, ScanOutlined, CameraOutlined, SettingOutlined, ExclamationCircleOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import AppLayout from '../Layout/AppLayout';
import TenantSelector from '../TenantSelector';
import AntdFamilyTable from '../AntdFamilyTable';
import qwenOcrService from '../../services/qwenOcrService';
import uploadService from '../../services/uploadService';
import tenantService from '../../services/tenantService';
import familyDataService from '../../services/familyDataService';
import familyDataGenerator from '../../services/familyDataGenerator';
import './CreatorPage.css';

const { Title } = Typography;

// 数据管理页面 - 以表格数据为核心

const DEFAULT_COLUMNS = [
  'id','name','g_rank','rank_index','g_father_id','official_position','summary','adoption','sex','g_mother_id','birth_date','id_card','face_img','photos','household_info','spouse','home_page','dealth','formal_name','location','childrens'
];

const emptyRow = () => ({
  id: '', name: '', g_rank: '', rank_index: '', g_father_id: '', official_position: '', summary: '', adoption: 'none', sex: 'MAN', g_mother_id: '', birth_date: '', id_card: '', face_img: '', photos: '', household_info: '', spouse: '', home_page: '', dealth: null, formal_name: '', location: '', childrens: ''
});

function CreatorPage({ activeMenuItem = 'create', onMenuClick }) {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [ossUrls, setOssUrls] = useState([]);
  const [rows, setRows] = useState([]);
  const [jsonOutput, setJsonOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [ocrConfig, setOcrConfig] = useState(null);
  
  // 弹框状态管理
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  
  // 重名检测相关状态
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateData, setDuplicateData] = useState({ newData: [], duplicates: [] });
  const [pendingOcrData, setPendingOcrData] = useState(null);
  
  // 表格多选状态管理
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // 搜索状态管理
  const [searchText, setSearchText] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);

  // 数据持久化key (已删除localStorage逻辑)
  // const getStorageKey = (key) => {
  //   const tenantId = currentTenant?.id || 'default';
  //   return `creator_${tenantId}_${key}`;
  // };

  // 重名检测函数
  const detectDuplicateNames = (newData, existingData = rows) => {
    const duplicates = [];
    const existingNames = new Set(existingData.map(person => person.name?.trim().toLowerCase()));
    
    newData.forEach((person, index) => {
      const name = person.name?.trim().toLowerCase();
      if (name && existingNames.has(name)) {
        // 找到重复的原有人员
        const existingPerson = existingData.find(p => p.name?.trim().toLowerCase() === name);
        duplicates.push({
          newPerson: person,
          existingPerson: existingPerson,
          index: index
        });
      }
    });
    
    return duplicates;
  };
  
  // 处理OCR识别的数据（加入重名检测）
  const processOcrData = (validatedData) => {
    if (rows.length > 0) {
      // 检测重名
      const duplicates = detectDuplicateNames(validatedData);
      
      if (duplicates.length > 0) {
        console.log('🔍 发现重名人员:', duplicates);
        
        // 显示重名确认对话框
        setDuplicateData({ newData: validatedData, duplicates });
        setDuplicateModalVisible(true);
        setPendingOcrData(validatedData);
        
        message.warning(`发现 ${duplicates.length} 个重名人员，请确认是否继续添加`);
        return false; // 停止自动添加
      }
    }
    
    // 没有重名，直接添加
    addOcrDataToTable(validatedData);
    return true;
  };
  
  // 将OCR数据添加到表格（不保存到数据库）
  const addOcrDataToTable = (validatedData) => {
    if (rows.length > 0) {
      // 表格已有数据，追加模式
      console.log('📝 追加模式：合并新识别的数据到现有数据');
      const mergedData = [...rows, ...validatedData];
      setRows(mergedData);
      message.success(
        `成功追加识别 ${validatedData.length} 个人物信息，当前共 ${mergedData.length} 条记录（仅在内存中，未保存到数据库）`
      );
    } else {
      // 表格无数据，直接设置
      console.log('📝 表格无数据，直接设置识别结果');
      setRows(validatedData);
      message.success(`成功识别 ${validatedData.length} 条家谱记录（仅在内存中，未保存到数据库）`);
    }
    
    // 数据仅保存在内存中（不保存到localStorage）
    console.log('✅ OCR数据已添加到内存缓存，等待用户保存到数据库');
  };
  
  // 确认添加重名数据
  const confirmAddDuplicates = () => {
    if (pendingOcrData) {
      addOcrDataToTable(pendingOcrData);
      setDuplicateModalVisible(false);
      setPendingOcrData(null);
      setDuplicateData({ newData: [], duplicates: [] });
    }
  };
  
  // 批量删除脉数据函数
  const deleteDataAfterID = (afterId) => {
    const filteredRows = rows.filter(row => {
      const rowId = parseInt(row.id) || 0;
      return rowId <= afterId;
    });
    
    const deletedCount = rows.length - filteredRows.length;
    
    if (deletedCount > 0) {
      setRows(filteredRows);
      message.success(`已删除 ${deletedCount} 条ID大于 ${afterId} 的脉数据，当前剩余 ${filteredRows.length} 条记录`);
      console.log(`🗑️ 批量删除完成: 删除${deletedCount}条，保留${filteredRows.length}条`);
    } else {
      message.info(`没有找到ID大于 ${afterId} 的数据`);
    }
  };
  
  // 处理删除脉数据的确认
  const handleDeleteDirtyData = () => {
    const afterId = 625;
    const dataToDelete = rows.filter(row => {
      const rowId = parseInt(row.id) || 0;
      return rowId > afterId;
    });
    
    if (dataToDelete.length === 0) {
      message.info(`没有找到ID大于 ${afterId} 的数据`);
      return;
    }
    
    Modal.confirm({
      title: '确认删除脉数据',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>将删除 <strong style={{ color: '#f5222d' }}>{dataToDelete.length}</strong> 条ID大于 {afterId} 的数据。</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            删除范围：ID {afterId + 1} - {Math.max(...dataToDelete.map(row => parseInt(row.id) || 0))}
          </p>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            border: '1px solid #f0f0f0', 
            borderRadius: '4px', 
            padding: '8px',
            marginTop: '8px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#666' }}>
              将被删除的数据预览：
            </div>
            {dataToDelete.slice(0, 10).map((row, index) => (
              <div key={index} style={{ fontSize: '11px', color: '#888', padding: '2px 0' }}>
                ID: {row.id} - {row.name} (第{row.g_rank}代)
              </div>
            ))}
            {dataToDelete.length > 10 && (
              <div style={{ fontSize: '11px', color: '#999', padding: '2px 0' }}>
                ...还有 {dataToDelete.length - 10} 条数据
              </div>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#f5222d', marginTop: '12px' }}>
            ⚠️ 此操作不可逆，请确认后再操作。
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        deleteDataAfterID(afterId);
      }
    });
  };
  const cancelAddDuplicates = () => {
    setDuplicateModalVisible(false);
    setPendingOcrData(null);
    setDuplicateData({ newData: [], duplicates: [] });
    message.info('已取消添加重名数据');
  };
  
  // 批量删除选中的行
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>将删除 <strong style={{ color: '#f5222d' }}>{selectedRowKeys.length}</strong> 条数据。</p>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            border: '1px solid #f0f0f0', 
            borderRadius: '4px', 
            padding: '8px',
            marginTop: '8px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#666' }}>
              将被删除的数据预览：
            </div>
            {selectedRows.slice(0, 10).map((row, index) => (
              <div key={index} style={{ fontSize: '11px', color: '#888', padding: '2px 0' }}>
                ID: {row.id} - {row.name} (第{row.g_rank}代)
              </div>
            ))}
            {selectedRows.length > 10 && (
              <div style={{ fontSize: '11px', color: '#999', padding: '2px 0' }}>
                ...还有 {selectedRows.length - 10} 条数据
              </div>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#f5222d', marginTop: '12px' }}>
            ⚠️ 此操作不可逆，请确认后再操作。
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        // 删除选中的行（根据ID匹配）
        const selectedIds = selectedRows.map(row => row.id);
        const newData = rows.filter(row => !selectedIds.includes(row.id));
        setRows(newData);
        
        // 清空选择
        setSelectedRowKeys([]);
        setSelectedRows([]);
        
        message.success(`已删除 ${selectedRowKeys.length} 条数据`);
      }
    });
  };
  // 使用familyDataService的3层架构加载默认数据
  const loadDefaultFamilyData = async () => {
    try {
      console.log('🔄 使用familyDataService的3层架构加载默认数据...');
      
      // 使用 familyDataService 的 3层架构加载数据
      const data = await familyDataService.getFamilyData(true, 'default');
      
      if (data && data.length > 0) {
        console.log(`✅ 从3层架构加载默认数据: ${data.length} 条记录`);
        return data;
      }
      
      console.log('⚠️ 无法加载任何默认数据');
      return [];
    } catch (error) {
      console.error('❌ 加载默认族谱数据失败:', error);
      return [];
    }
  };

  // 已删除localStorage逻辑，改为纯内存管理
  // const saveToStorage = (key, data) => {
  //   try {
  //     localStorage.setItem(getStorageKey(key), JSON.stringify(data));
  //   } catch (error) {
  //     console.warn('保存数据到localStorage失败:', error);
  //   }
  // };

  // const loadFromStorage = (key, defaultValue = null) => {
  //   try {
  //     const stored = localStorage.getItem(getStorageKey(key));
  //     return stored ? JSON.parse(stored) : defaultValue;
  //   } catch (error) {
  //     console.warn('从localStorage读取数据失败:', error);
  //     return defaultValue;
  //   }
  // };

  // 初始化配置
  useEffect(() => {
    const tenant = tenantService.getCurrentTenant();
    setCurrentTenant(tenant);

    const uploadConf = uploadService.getUploadConfig();
    console.log('✅ OSS客户端初始化 constructor11');

    setUploadConfig(uploadConf);

    // 检查通义千问API Key配置
    const hasQwenKey = !!process.env.REACT_APP_QWEN_API_KEY;
    setOcrConfig({ configured: hasQwenKey });
  }, []);

  // 修改为使用familyDataService的3层架构加载数据
  useEffect(() => {
    if (currentTenant) {
      // 使用familyDataService的3层架构加载数据：内存缓存 → 数据库 → 原始familyData.js
      const loadDataFromService = async () => {
        try {
          console.log('🔄 使用familyDataService加载数据...', currentTenant.id);
          const data = await familyDataService.getFamilyData(false, currentTenant.id);
          
          if (data && data.length > 0) {
            console.log(`✅ 从3层架构加载数据: ${data.length} 条记录`);
            setRows(data);
            // 数据重新加载时清除搜索状态
            setSearchText('');
            setFilteredRows([]);
          } else {
            console.log('⚠️ 无数据，初始化为空状态');
            setRows([]);
            setSearchText('');
            setFilteredRows([]);
          }
        } catch (error) {
          console.warn('⚠️ 加载数据失败:', error);
          setRows([]);
        }
      };
      
      loadDataFromService();
      
      // 初始化其他状态为空
      setFiles([]);
      setPreviews([]);
      setOssUrls([]);
      setJsonOutput('');
    }
  }, [currentTenant]);

  // 监听租户切换（已删除localStorage逻辑）
  useEffect(() => {
    const unsubscribe = tenantService.onTenantChange(async (tenant) => {
      const previousTenant = currentTenant;
      setCurrentTenant(tenant);
      
      // 租户切换时，清空当前状态，等待上面的useEffect重新加载数据
      console.log('🔄 租户切换，清空当前状态...');
      setRows([]);
      setFiles([]);
      setPreviews([]);
      setOssUrls([]);
      setJsonOutput('');
      // 清除搜索状态
      setSearchText('');
      setFilteredRows([]);
      
      message.info(`已切换到 ${tenant.name}`);
    });

    return unsubscribe;
  }, [currentTenant]);

  // 监听家谱数据更新事件，确保保存后数据管理页面能实时同步
  useEffect(() => {
    const handleDataUpdated = async (event) => {
      const { tenantId } = event.detail;
      const currentTenantId = currentTenant?.id;
      
      // 如果更新的是当前租户的数据，重新加载数据
      if (tenantId === currentTenantId) {
        console.log('🔄 [CreatorPage] 检测到家谱数据更新，重新加载数据管理页面数据...');
        
        try {
          // 从数据库重新加载最新数据
          const response = await fetch(`http://localhost:3003/api/family-data/${tenantId}`);
          const result = await response.json();
          
          if (response.ok && result.success && result.data && result.data.length > 0) {
            console.log(`✅ [CreatorPage] 从数据库重新加载 ${result.data.length} 条记录`);
            setRows(result.data);
            
            // 数据重新加载时重新执行搜索（如果有搜索条件）
            if (searchText) {
              const searchTerm = searchText.toLowerCase().trim();
              const filtered = result.data.filter(row => {
                return (
                  (row.name && row.name.toLowerCase().includes(searchTerm)) ||
                  (row.official_position && row.official_position.toLowerCase().includes(searchTerm)) ||
                  (row.summary && row.summary.toLowerCase().includes(searchTerm)) ||
                  (row.spouse && row.spouse.toLowerCase().includes(searchTerm)) ||
                  (row.location && row.location.toLowerCase().includes(searchTerm)) ||
                  (row.g_rank && String(row.g_rank).includes(searchTerm)) ||
                  (row.id && String(row.id).includes(searchTerm))
                );
              });
              setFilteredRows(filtered);
            }
            
            // 更新JSON输出
            setTimeout(() => {
              convertToJSON();
            }, 100);
            
            message.success('数据已同步，表格已更新为最新内容');
          } else {
            console.log('📝 [CreatorPage] 数据库无数据或响应异常');
          }
        } catch (error) {
          console.error('❌ [CreatorPage] 重新加载数据失败:', error);
        }
      }
    };

    window.addEventListener('familyDataUpdated', handleDataUpdated);
    
    return () => {
      window.removeEventListener('familyDataUpdated', handleDataUpdated);
    };
  }, [currentTenant]);

  // 已删除localStorage自动保存逻辑，数据仅存在于内存中
  // 用户需要手动点击“保存到数据库”按钮来持久化数据
  
  // useEffect(() => {
  //   if (currentTenant) {
  //     saveToStorage('files', files);
  //   }
  // }, [files, currentTenant]);

  // useEffect(() => {
  //   if (currentTenant) {
  //     saveToStorage('previews', previews);
  //   }
  // }, [previews, currentTenant]);

  // useEffect(() => {
  //   if (currentTenant) {
  //     saveToStorage('ossUrls', ossUrls);
  //   }
  // }, [ossUrls, currentTenant]);

  // useEffect(() => {
  //   if (currentTenant) {
  //     saveToStorage('rows', rows);
  //   }
  // }, [rows, currentTenant]);

  // useEffect(() => {
  //   if (currentTenant) {
  //     saveToStorage('jsonOutput', jsonOutput);
  //   }
  // }, [jsonOutput, currentTenant]);

  // 搜索功能实现
  const handleSearch = (value) => {
    setSearchText(value);
    
    if (!value || !value.trim()) {
      setFilteredRows([]);
      return;
    }
    
    const searchTerm = value.toLowerCase().trim();
    const filtered = rows.filter(row => {
      return (
        (row.name && row.name.toLowerCase().includes(searchTerm)) ||
        (row.official_position && row.official_position.toLowerCase().includes(searchTerm)) ||
        (row.summary && row.summary.toLowerCase().includes(searchTerm)) ||
        (row.spouse && row.spouse.toLowerCase().includes(searchTerm)) ||
        (row.location && row.location.toLowerCase().includes(searchTerm)) ||
        (row.g_rank && String(row.g_rank).includes(searchTerm)) ||
        (row.id && String(row.id).includes(searchTerm))
      );
    });
    
    setFilteredRows(filtered);
    console.log(`🔍 搜索结果: "${value}" 找到 ${filtered.length} 条记录`);
  };
  
  const clearSearch = () => {
    setSearchText('');
    setFilteredRows([]);
  };
  
  // 获取当前显示的数据（搜索结果或全部数据）
  const getCurrentDisplayData = () => {
    return searchText ? filteredRows : rows;
  };

  // 选择文件，限制最多 10 张
  const onPickFiles = (e) => {
    const fileList = Array.from(e.target.files || []);

    // 验证文件
    const validation = uploadService.validateFiles(fileList);
    if (!validation.isValid) {
      message.error(validation.errors.join('\n'));
      return;
    }

    const list = fileList.slice(0, 10);
    setFiles(list);

    // 创建预览URL
    const previewUrls = list.map((f) => uploadService.createPreviewUrl(f));
    setPreviews(previewUrls);
  };

  // 上传文件到OSS或服务器
  const uploadToOSS = async (selectedFiles) => {
    try {
      setUploadProgress(0);
      const tenantId = currentTenant?.id || 'default';

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const urls = await uploadService.uploadFiles(selectedFiles, tenantId);

      clearInterval(progressInterval);
      setUploadProgress(100);

      return urls;
    } catch (error) {
      setUploadProgress(0);
      throw error;
    }
  };

  // 调用通义千问 OCR 识别家谱信息
  const runQwenOCR = async (imageUrls) => {
    try {
      setOcrProgress(0);
      const tenantId = currentTenant?.id || 'default';

      console.log('🔍 开始OCR识别详细流程:');
      console.log('📸 图片URLs:', imageUrls);
      console.log('🏢 租户ID:', tenantId);
      console.log('🔑 API Key状态:', process.env.REACT_APP_QWEN_API_KEY ? '已配置' : '未配置');

      // 验证图片URL可访问性
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`🌐 验证图片 ${i + 1} 可访问性: ${url}`);
        try {
          const response = await fetch(url, { method: 'HEAD' });
          console.log(`✅ 图片 ${i + 1} 可访问，状态: ${response.status}`);
        } catch (error) {
          console.error(`❌ 图片 ${i + 1} 无法访问:`, error.message);
        }
      }

      // 模拟OCR进度
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      console.log('📤 调用qwenOcrService.recognizeFamilyTree...');

      // 设置前端超时控制（比后端稍长一些）
      const frontendTimeoutMs = 100000; // 100秒超时，给后端足够时间调用千问API
      console.log(`⏰ 设置前端超时时间: ${frontendTimeoutMs}ms (${frontendTimeoutMs / 1000}秒)`);

      const ocrPromise = qwenOcrService.recognizeFamilyTree(imageUrls, tenantId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`OCR识别超时 (${frontendTimeoutMs / 1000}秒)，请检查网络连接或减少图片数量`));
        }, frontendTimeoutMs);
      });

      const result = await Promise.race([ocrPromise, timeoutPromise]);

      clearInterval(progressInterval);
      setOcrProgress(100);

      console.log('📥 OCR服务返回结果:');
      console.log('📊 结果类型:', typeof result);
      console.log('📊 是否为数组:', Array.isArray(result));
      console.log('📊 数组长度:', result?.length || 0);
      console.log('📊 完整结果:', result);

      return result;
    } catch (error) {
      setOcrProgress(0);
      console.error('❌ runQwenOCR 执行失败:', error);
      console.error('❌ 错误类型:', error.constructor.name);
      console.error('❌ 错误消息:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!files.length) {
      message.warning('请先选择要上传的图片');
      return;
    }

    setBusy(true);
    try {
      message.loading('正在上传图片...', 0);
      const urls = await uploadToOSS(files);
      message.destroy();

      setOssUrls(urls);
      if (urls.length) {
        message.success(`成功上传 ${urls.length} 张图片`);
        console.log('✅ 图片上传成功，可以进行OCR识别');
      } else {
        message.error('图片上传失败，请重试');
      }
    } catch (error) {
      message.destroy();
      message.error(`上传失败: ${error.message}`);
      console.error('上传失败:', error);
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  };

  const handleOCR = async () => {
    if (!ossUrls.length) {
      message.warning('请先上传图片');
      return;
    }

    console.log('🚀 开始OCR识别流程...');
    console.log('📸 待识别图片URLs:', ossUrls);
    console.log('🏢 当前租户:', currentTenant);

    setBusy(true);
    try {
      message.loading('正在识别图片中的家谱信息...', 0);
      const parsed = await runQwenOCR(ossUrls);
      message.destroy();

      console.log('🎯 OCR识别结果:', parsed);
      console.log('📊 识别到的记录数量:', parsed?.length || 0);

      if (parsed && parsed.length > 0) {
        console.log('✅ 设置识别数据到表格...');

        // 确保数据格式正确
        const currentTime = new Date().toISOString();
        const validatedData = parsed.map((item, index) => ({
          ...item,
          // 确保必需字段存在
          id: item.id || `temp_${Date.now()}_${index}`,
          name: item.name || `未知姓名${index + 1}`,
          g_rank: item.g_rank || 1,
          rank_index: item.rank_index || (index + 1),
          sex: item.sex || 'MAN',
          adoption: item.adoption || 'none',
          g_father_id: item.g_father_id || 0,
          official_position: item.official_position || '',
          summary: item.summary || null,
          g_mother_id: item.g_mother_id || null,
          birth_date: item.birth_date || null,
          id_card: item.id_card || null,
          face_img: item.face_img || null,
          photos: item.photos || null,
          household_info: item.household_info || null,
          spouse: item.spouse || null,
          home_page: item.home_page || null,
          dealth: item.dealth || null,
          formal_name: item.formal_name || null,
          location: item.location || null,
          childrens: item.childrens || null,
          // 添加时间戳
          created_at: currentTime,
          updated_at: currentTime
        }));

        console.log('🔄 验证后的数据:', validatedData);

        // 使用新的重名检测逻辑处理数据
        processOcrData(validatedData);
      } else {
        console.log('⚠️ 未识别到数据，创建1行空白供手动编辑');
        // 创建1行空登，方便手动编辑
        const currentTime = new Date().toISOString();
        const emptyRowData = [{
          ...emptyRow(),
          id: 1,
          created_at: currentTime,
          updated_at: currentTime
        }];
        setRows(emptyRowData);
        message.warning('未识别到家谱信息，已创建空白表格供手动编辑');
      }
    } catch (error) {
      message.destroy();

      // 显示详细的错误信息
      const errorMessage = error.message || '未知错误';
      message.error(`OCR识别失败: ${errorMessage}`, 10); // 显示10秒

      console.error('❌ OCR识别失败:', error);
      console.error('❌ 错误堆栈:', error.stack);

      // 如果是配置问题，给出具体建议
      if (errorMessage.includes('API Key')) {
        message.warning('请检查通义千问API Key配置', 8);
      } else if (errorMessage.includes('网络') || errorMessage.includes('timeout')) {
        message.warning('网络连接问题，请检查网络或稍后重试', 8);
      }
    } finally {
      setBusy(false);
      setOcrProgress(0);
    }
  };

  // 数据变化处理（已删除localStorage保存）
  const handleDataChange = (newData) => {
    console.log('📝 数据变化:', newData);
    setRows(newData);
    
    // 如果当前有搜索，重新执行搜索
    if (searchText) {
      const searchTerm = searchText.toLowerCase().trim();
      const filtered = newData.filter(row => {
        return (
          (row.name && row.name.toLowerCase().includes(searchTerm)) ||
          (row.official_position && row.official_position.toLowerCase().includes(searchTerm)) ||
          (row.summary && row.summary.toLowerCase().includes(searchTerm)) ||
          (row.spouse && row.spouse.toLowerCase().includes(searchTerm)) ||
          (row.location && row.location.toLowerCase().includes(searchTerm)) ||
          (row.g_rank && String(row.g_rank).includes(searchTerm)) ||
          (row.id && String(row.id).includes(searchTerm))
        );
      });
      setFilteredRows(filtered);
    }
    
    // 数据仅保存在内存中，等待用户手动保存到数据库
  };
  
  // 添加新行（已删除localStorage保存）
  const addNewRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.id) || 0)) + 1 : 1;
    const currentTime = new Date().toISOString();
    const newRow = {
      ...emptyRow(),
      id: newId,
      created_at: currentTime,
      updated_at: currentTime
    };
    const newData = [...rows, newRow];
    setRows(newData);
    // 数据仅保存在内存中，等待用户手动保存到数据库
    message.success('已添加新行（仅在内存中）');
  };





  // 生成并下载familyData文件
  const generateFamilyDataFile = async () => {
    if (!rows || rows.length === 0) {
      message.warning('请先进行OCR识别或添加家谱数据');
      return;
    }

    try {
      console.log('📝 开始生成familyData文件...');
      message.loading('正在生成familyData文件...', 0);

      const tenantId = currentTenant?.id || 'default';
      const result = await familyDataGenerator.generateFamilyDataFile(
        rows,
        tenantId,
        {
          suffix: 'qwen-ocr',
          autoDownload: true,
          includeStats: true
        }
      );

      message.destroy();

      if (result.success) {
        message.success(`文件生成成功: ${result.fileName}`);
        console.log('✅ 文件生成结果:', result);
        console.log('📊 文件统计:', result.stats);
      } else {
        message.error(`文件生成失败: ${result.error}`);
        console.error('❌ 文件生成失败:', result.error);
      }
    } catch (error) {
      message.destroy();
      message.error(`生成文件时发生错误: ${error.message}`);
      console.error('❌ 生成文件异常:', error);
    }
  };

  // 旧的CSV导出功能已被Excel导出替代
  // const downloadCSV = (cols, data, filename) => { ... }

  // 旧的exportExcels功能已被更完善的exportToExcel替代
  // const exportExcels = () => { ... }

  // JSON 转换
  const convertToJSON = () => {
    const result = rows.map((r, idx) => {
      const item = {};
      DEFAULT_COLUMNS.forEach((k) => { item[k] = r[k] ?? null; });
      // 规范化：数字字段转 number
      ['id','g_rank','rank_index','g_father_id','g_mother_id'].forEach((k) => {
        if (item[k] === '' || item[k] === null || item[k] === undefined) return;
        const n = Number(item[k]);
        item[k] = Number.isFinite(n) ? n : item[k];
      });
      // dealth 字段：null 表示去世；'alive' 表示在世（按你的规则）
      if (item.dealth !== 'alive') item.dealth = null;
      return item;
    });
    const json = JSON.stringify(result, null, 2);
    setJsonOutput(json);
    return json;
  };

  const downloadJSON = () => {
    const json = jsonOutput || convertToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const tenantName = currentTenant?.name || 'genealogy';
    const fileName = `${tenantName}_${new Date().toISOString().split('T')[0]}.json`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    message.success('JSON文件下载成功');
  };

  // 导出Excel功能（从AntdFamilyTable迁移）
  const exportToExcel = () => {
    try {
      if (!rows || rows.length === 0) {
        message.warning('暂无数据可导出');
        return;
      }

      // 准备数据
      const exportData = rows.map(row => ({
        'ID': row.id,
        '姓名': row.name,
        '世代': row.g_rank,
        '排行': row.rank_index,
        '父亲ID': row.g_father_id,
        '性别': row.sex === 'MAN' ? '男' : '女',
        '收养': row.adoption === 'none' ? '无' : (row.adoption === 'adopted' ? '收养' : '寄养'),
        '官职': row.official_position || '',
        '配偶': row.spouse || '',
        '备注': row.summary || '',
        '更新时间': (() => {
          const displayTime = row.updated_at || row.created_at;
          if (!displayTime) return '无记录';
          try {
            const date = new Date(displayTime);
            if (isNaN(date.getTime())) return '无效时间';
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
        })()
      }));
      
      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 12 }, // 姓名
        { wch: 8 },  // 世代
        { wch: 8 },  // 排行
        { wch: 10 }, // 父亲ID
        { wch: 8 },  // 性别
        { wch: 8 },  // 收养
        { wch: 15 }, // 官职
        { wch: 12 }, // 配偶
        { wch: 20 }, // 备注
        { wch: 20 }  // 更新时间
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, '家谱数据');
      
      // 下载文件
      const tenantName = currentTenant?.name || 'genealogy';
      const fileName = `${tenantName}_家谱数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      message.success('Excel文件已导出');
    } catch (error) {
      console.error('导出Excel失败:', error);
      message.error('导出Excel失败');
    }
  };

  // 保存家谱数据到当前租户
  const saveToCurrentTenant = async (tableData = null) => {
    try {
      // 使用传入的tableData或当前的rows状态
      const dataToSave = tableData || rows;

      if (!dataToSave.length || dataToSave.every(row => !row.name)) {
        message.warning('请先添加家谱数据');
        return;
      }

      if (!currentTenant?.id) {
        message.error('请先选择族谱');
        return;
      }

      setBusy(true);
      message.loading('正在保存家谱数据...', 0);

      // 过滤掉空行
      const validRows = dataToSave.filter(row => row.name && row.name.trim());

      console.log('💾 保存家谱数据到数据库:', {
        tenantId: currentTenant.id,
        dataCount: validRows.length,
        operation: '全量覆盖更新'
      });

      // 调用后端API保存数据到数据库（全量覆盖）
      console.log('🌐 发送保存请求到:', 'http://localhost:3003/api/family-data/save');
      console.log('📤 请求数据:', {
        tenantId: currentTenant.id,
        dataCount: validRows.length
      });

      const response = await fetch('http://localhost:3003/api/family-data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          familyData: validRows
        })
      });

      console.log('📥 响应状态:', response.status, response.statusText);
      console.log('📥 响应头:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 响应错误内容:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || '保存失败'}`);
      }

      const result = await response.json();
      console.log('✅ 响应结果:', result);

      if (result.success) {
        message.destroy();
        message.success(`${result.message} 到 ${currentTenant.name}`);
        console.log('✅ 家谱数据保存成功:', result);

        // 清除所有相关缓存，确保族谱页面能获取到最新数据
        try {
          // 清除前端服务的缓存
          const familyDataService = (await import('../../services/familyDataService')).default;
          familyDataService.clearAllCache();

          // 清除本地缓存管理器的缓存
          const cacheManager = (await import('../../utils/cacheManager')).default;
          cacheManager.remove(`family_data_${currentTenant.id}`);
          cacheManager.remove(`tenant_${currentTenant.id}_family_data`);

          console.log('🗑️ 已清除所有相关缓存，族谱页面将显示最新数据');
        } catch (cacheError) {
          console.warn('清除缓存时出现警告:', cacheError);
        }

        // 触发全局数据刷新事件（如果存在）
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('familyDataUpdated', {
            detail: {
              tenantId: currentTenant.id,
              dataCount: validRows.length,
              timestamp: new Date().toISOString()
            }
          }));
        }

        // 生成JSON用于预览
        convertToJSON();

        // 提示用户切换到族谱页面查看
        setTimeout(() => {
          message.info('数据已保存，可切换到族谱页面查看最新内容', 3);
        }, 1000);

      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error) {
      message.destroy();
      message.error(`保存失败: ${error.message}`);
      console.error('保存家谱数据失败:', error);
    } finally {
      setBusy(false);
    }
  };


  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="data-management-page">
        {/* 页面头部 */}
        <div className="page-header">
          <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
            <Col>
              <Title level={2} style={{ margin: 0, color: '#1e1e2d' }}>
                📋 族谱数据管理
              </Title>
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '16px' }}>
                智能识别、在线编辑、一键发布家谱数据
              </p>
            </Col>
            {/* 租户选择器已移至顶部全局导航栏 */}
          </Row>
        </div>

        {/* 核心数据表格区域（带内置功能入口） */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span> {getCurrentDisplayData().length > 0 && currentTenant && (
                  <span style={{ marginRight: '16px', color: '#6b7280', fontSize: '14px' }}>
                    {currentTenant.id === 'default' || currentTenant.id === process.env.REACT_APP_DEFAULT_TENANT_ID 
                      ? `默认穆氏族谱: ${getCurrentDisplayData().length}条` 
                      : `${currentTenant.name}: ${getCurrentDisplayData().length}条`
                    }
                    {searchText && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#f5222d' }}>
                        | 搜索结果
                      </span>
                    )}
                    {/* 世代范围信息 */}
                    {getCurrentDisplayData().length > 0 && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6c757d' }}>
                        | 世代范围: {Math.min(...getCurrentDisplayData().map(item => item.g_rank || 1))} - {Math.max(...getCurrentDisplayData().map(item => item.g_rank || 1))}
                      </span>
                    )}
                  </span>
                )}</span>
              <div className="table-toolbar">
                {/* 搜索功能 */}
                <div style={{ marginRight: '12px' }}>
                  <Input
                    placeholder="搜索姓名、职位、备注..."
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    suffix={
                      searchText ? (
                        <ClearOutlined 
                          style={{ color: '#bfbfbf', cursor: 'pointer' }} 
                          onClick={clearSearch}
                        />
                      ) : null
                    }
                    value={searchText}
                    onChange={(e) => handleSearch(e.target.value)}
                    size="small"
                    style={{ width: '180px' }}
                    allowClear
                  />
                  {searchText && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#666', 
                      marginTop: '2px',
                      textAlign: 'center'
                    }}>
                      找到 {filteredRows.length} 条结果
                    </div>
                  )}
                </div>
                
                {/* 功能入口按钮 */}
                <Space size="small">
                  {/* 批量删除按钮 - 放在新建一行的左边 */}
                  {selectedRowKeys.length > 0 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                      size="small"
                    >
                      批量删除 ({selectedRowKeys.length})
                    </Button>
                  )}
                  
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={addNewRow}
                    disabled={busy}
                    size="small"
                  >
                    添加新行
                  </Button>
                  
                  <Tooltip title="拍一拍家谱照片OCR识别">
                    <Button 
                      type="primary" 
                      icon={<CameraOutlined />} 
                      onClick={() => setOcrModalVisible(true)}
                      size="small"
                    >
                      OCR识别
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="家谱数据管理与发布">
                    <Button 
                      type="primary" 
                      icon={<SettingOutlined />} 
                      onClick={() => setManagementModalVisible(true)}
                      size="small"
                    >
                      管理与发布
                    </Button>
                  </Tooltip>
                </Space>
              </div>
            </div>
          }
          size="small"
        >
          <AntdFamilyTable
            data={getCurrentDisplayData()}
            onDataChange={handleDataChange}
            onSave={saveToCurrentTenant}
            loading={busy}
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            onSelectedRowsChange={setSelectedRows}
          />
        </Card>

        {/* OCR识别功能弹框 */}
        <Modal
          title="📄 拍一拍家谱照片OCR识别"
          open={ocrModalVisible}
          onCancel={() => setOcrModalVisible(false)}
          footer={null}
          width={600}
          destroyOnClose
        >
          <div style={{ padding: '16px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 文件选择区域 */}
              <div>
                <h4>📁 选择家谱图片</h4>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPickFiles}
                  disabled={busy}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
                {files.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                    已选择 {files.length} 个文件
                  </div>
                )}
                
                {/* 预览区域 */}
                {files.length > 0 && (
                  <div className="preview-grid">
                    {previews.map((src, i) => (
                      <div className="preview" key={i}>
                        <img src={src} alt={`预览${i+1}`} />
                      </div>
                    ))}
                  </div>
                )}
                
                {ossUrls.length > 0 && (
                  <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '8px' }}>
                    ✓ 已上传 {ossUrls.length} 张图片到云端
                  </div>
                )}
              </div>

              {/* 操作按钮区域 */}
              <div>
                <h4>🚀 开始识别</h4>
                <Space>
                  <Button
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    disabled={!files.length || busy}
                    loading={busy && uploadProgress > 0}
                    onClick={handleUpload}
                  >
                    {busy && uploadProgress > 0 ? '上传中...' : '上传图片'}
                  </Button>
                  
                  <Button
                    type="primary"
                    icon={<ScanOutlined />}
                    disabled={!ossUrls.length || busy}
                    loading={busy && ocrProgress > 0}
                    onClick={() => {
                      handleOCR().then(() => {
                        setOcrModalVisible(false);
                        message.success('识别完成，请查看表格数据');
                      });
                    }}
                  >
                    {busy && ocrProgress > 0 ? 'OCR识别中...' : '开始OCR识别'}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // 如果表格为空，添加一行空数据
                      if (rows.length === 0) {
                        const emptyRowData = [{
                          ...emptyRow(),
                          id: 1
                        }];
                        setRows(emptyRowData);
                      }
                      setOcrModalVisible(false);
                      message.info('已进入手动编辑模式');
                    }}
                  >
                    手动编辑
                  </Button>
                </Space>
              </div>

              {/* 进度显示 */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <h4>📄 上传进度</h4>
                  <Progress
                    percent={Math.round(uploadProgress)}
                    status="active"
                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                  />
                </div>
              )}
              
              {ocrProgress > 0 && ocrProgress < 100 && (
                <div>
                  <h4>🤖 OCR识别进度</h4>
                  <Progress
                    percent={Math.round(ocrProgress)}
                    status="active"
                    strokeColor={{ '0%': '#722ed1', '100%': '#52c41a' }}
                  />
                </div>
              )}
            </Space>
          </div>
        </Modal>

        {/* 数据管理功能弹框 */}
        <Modal
          title="🔧 家谱数据管理与发布"
          open={managementModalVisible}
          onCancel={() => setManagementModalVisible(false)}
          footer={null}
          width={500}
          destroyOnClose
        >
          <div style={{ padding: '16px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 数据保存与发布 */}
              <div>
                <h4>💾 数据保存与发布</h4>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={busy}
                    onClick={() => saveToCurrentTenant()}
                    disabled={!rows.length || rows.every(row => !row.name)}
                    block
                  >
                    保存到数据库 ({rows.filter(row => row.name && row.name.trim()).length}条有效数据)
                  </Button>
                  
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    💡 保存后数据将发布到族谱页面，可被其他用户查看
                  </div>
                </Space>
              </div>

              {/* 数据导出 */}
              <div>
                <h4>📋 数据导出</h4>
                <Space style={{ width: '100%' }} size="small">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={exportToExcel}
                    disabled={!rows.length}
                  >
                    导出Excel
                  </Button>
                  
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={downloadJSON}
                    disabled={!rows.length}
                  >
                    导出JSON
                  </Button>
                  
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={generateFamilyDataFile}
                    disabled={!rows.length}
                  >
                    生成FamilyData
                  </Button>
                </Space>
              </div>

              {/* 数据统计 */}
              {rows.length > 0 && (
                <div>
                  <h4>📊 数据统计</h4>
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '12px', 
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div>总记录数: <strong>{rows.length}</strong></div>
                    <div>有效记录: <strong>{rows.filter(row => row.name && row.name.trim()).length}</strong></div>
                    <div>世代范围: <strong>{Math.min(...rows.map(item => item.g_rank || 1))} - {Math.max(...rows.map(item => item.g_rank || 1))}</strong></div>
                    <div>男性: <strong>{rows.filter(row => row.sex === 'MAN').length}</strong> | 女性: <strong>{rows.filter(row => row.sex === 'WOMAN').length}</strong></div>
                  </div>
                </div>
              )}
            </Space>
          </div>
        </Modal>

        {/* 重名确认弹框 */}
        <Modal
          title="⚠️ 发现重名数据"
          open={duplicateModalVisible}
          onOk={confirmAddDuplicates}
          onCancel={cancelAddDuplicates}
          okText="确认添加"
          cancelText="取消"
          width={600}
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: '16px', color: '#fa8c16' }}>
              检测到 <strong>{duplicateData.duplicates.length}</strong> 个重名人员，请确认是否继续添加：
            </div>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              padding: '12px'
            }}>
              {duplicateData.duplicates.map((dup, index) => (
                <div key={index} style={{ 
                  marginBottom: '12px', 
                  padding: '8px',
                  backgroundColor: '#fff7e6',
                  borderRadius: '4px',
                  border: '1px solid #ffd591'
                }}>
                  <div style={{ fontWeight: '500', color: '#d46b08' }}>
                    重名人员: {dup.newPerson.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    新数据: 第{dup.newPerson.g_rank}代 | 
                    现有数据: 第{dup.existingPerson.g_rank}代
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
              💡 确认添加将保留重名数据，您可以稍后在表格中手动调整
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

export default CreatorPage;

