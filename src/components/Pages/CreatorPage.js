import React, { useMemo, useState, useEffect } from 'react';
import { message, Progress, Alert, Button, Space, Tooltip, Steps, Upload, Card } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FileImageOutlined, TableOutlined, CodeOutlined, InboxOutlined, CloudUploadOutlined, EyeOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import AppLayout from '../Layout/AppLayout';
import TenantSelector from '../TenantSelector';

import AntdFamilyTable from '../AntdFamilyTable';
import DataSyncStatus from '../DataSyncStatus';
import qwenOcrService from '../../services/qwenOcrService';
import uploadService from '../../services/uploadService';
import tenantService from '../../services/tenantService';
import familyDataService from '../../services/familyDataService';
import familyDataGenerator from '../../services/familyDataGenerator';
import './CreatorPage.css';

// 轻量创作向导（不新增外部依赖）
// 步骤：上传 -> OCR -> 表格编辑 -> JSON 导出/发布

const DEFAULT_COLUMNS = [
  'id','name','g_rank','rank_index','g_father_id','official_position','summary','adoption','sex','g_mother_id','birth_date','id_card','face_img','photos','household_info','spouse','home_page','dealth','formal_name','location','childrens'
];

const emptyRow = () => ({
  id: '', name: '', g_rank: '', rank_index: '', g_father_id: '', official_position: '', summary: '', adoption: 'none', sex: 'MAN', g_mother_id: '', birth_date: '', id_card: '', face_img: '', photos: '', household_info: '', spouse: '', home_page: '', dealth: null, formal_name: '', location: '', childrens: ''
});

function CreatorPage({ activeMenuItem = 'create', onMenuClick }) {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // local preview urls
  const [ossUrls, setOssUrls] = useState([]); // uploaded urls
  const [rows, setRows] = useState([]);
  const [jsonOutput, setJsonOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [ocrConfig, setOcrConfig] = useState(null);

  const [appendMode, setAppendMode] = useState(true); // 默认使用追加模式

  // 数据持久化key
  const getStorageKey = (key) => {
    const tenantId = currentTenant?.id || 'default';
    return `creator_${tenantId}_${key}`;
  };

  // 加载默认族谱数据
  const loadDefaultFamilyData = async () => {
    try {
      console.log('🔄 开始加载默认穆氏族谱数据...');
      
      // 优先从后端数据库加载
      try {
        const response = await fetch('http://localhost:3003/api/family-data/default');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            console.log(`✅ 从后端数据库加载默认数据: ${result.data.length} 条记录`);
            return result.data;
          }
        }
      } catch (dbError) {
        console.warn('⚠️ 从后端数据库加载失败:', dbError.message);
      }
      
      // 如果后端没有数据，使用 familyDataService 加载
      console.log('📋 使用 familyDataService 加载默认数据...');
      const data = await familyDataService.getFamilyData(true, 'default');
      
      if (data && data.length > 0) {
        console.log(`✅ 从 familyDataService 加载默认数据: ${data.length} 条记录`);
        return data;
      }
      
      console.log('⚠️ 无法加载任何默认数据');
      return [];
    } catch (error) {
      console.error('❌ 加载默认族谱数据失败:', error);
      return [];
    }
  };

  // 保存数据到localStorage
  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(data));
    } catch (error) {
      console.warn('保存数据到localStorage失败:', error);
    }
  };

  // 从localStorage读取数据
  const loadFromStorage = (key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(getStorageKey(key));
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn('从localStorage读取数据失败:', error);
      return defaultValue;
    }
  };

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

  // 恢复保存的数据
  useEffect(() => {
    if (currentTenant) {
      const savedStep = loadFromStorage('step', 1);
      const savedFiles = loadFromStorage('files', []);
      const savedPreviews = loadFromStorage('previews', []);
      const savedOssUrls = loadFromStorage('ossUrls', []);
      let savedRows = loadFromStorage('rows', []);
      const savedJsonOutput = loadFromStorage('jsonOutput', '');

      // 如果是默认租户且没有保存的数据，自动加载默认穆氏族谱数据
      if ((currentTenant.id === 'default' || currentTenant.id === process.env.REACT_APP_DEFAULT_TENANT_ID) && 
          (!savedRows || savedRows.length === 0)) {
        console.log('🔄 默认租户无保存数据，尝试加载默认穆氏族谱数据...');
        loadDefaultFamilyData().then(defaultData => {
          if (defaultData && defaultData.length > 0) {
            console.log(`✅ 加载到默认穆氏族谱数据: ${defaultData.length} 条记录`);
            setRows(defaultData);
            saveToStorage('rows', defaultData);
          }
        }).catch(error => {
          console.warn('⚠️ 加载默认族谱数据失败:', error);
        });
      } else {
        setRows(savedRows);
      }

      setStep(savedStep);
      setFiles(savedFiles);
      setPreviews(savedPreviews);
      setOssUrls(savedOssUrls);
      setJsonOutput(savedJsonOutput);

      console.log('已恢复保存的数据:', {
        step: savedStep,
        filesCount: savedFiles.length,
        previewsCount: savedPreviews.length,
        ossUrlsCount: savedOssUrls.length,
        rowsCount: savedRows.length
      });
    }
  }, [currentTenant]);

  // 监听租户切换
  useEffect(() => {
    const unsubscribe = tenantService.onTenantChange(async (tenant) => {
      const previousTenant = currentTenant;
      setCurrentTenant(tenant);
      
      // 如果切换到默认租户且之前不是默认租户，尝试加载默认数据
      if ((tenant.id === 'default' || tenant.id === process.env.REACT_APP_DEFAULT_TENANT_ID) && 
          previousTenant && previousTenant.id !== tenant.id) {
        console.log('🔄 切换到默认租户，检查是否需要加载默认数据...');
        
        // 检查当前是否有数据
        const currentRows = loadFromStorage('rows', []);
        if (!currentRows || currentRows.length === 0) {
          try {
            const defaultData = await loadDefaultFamilyData();
            if (defaultData && defaultData.length > 0) {
              console.log(`✅ 为默认租户加载默认数据: ${defaultData.length} 条记录`);
              setRows(defaultData);
              saveToStorage('rows', defaultData);
              message.success(`已加载默认穆氏族谱数据（${defaultData.length}条记录）`);
            }
          } catch (error) {
            console.warn('⚠️ 加载默认数据失败:', error);
          }
        }
      }
      
      message.info(`已切换到 ${tenant.name}`);
    });

    return unsubscribe;
  }, [currentTenant]);

  // 自动保存数据
  useEffect(() => {
    if (currentTenant) {
      saveToStorage('step', step);
    }
  }, [step, currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      saveToStorage('files', files);
    }
  }, [files, currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      saveToStorage('previews', previews);
    }
  }, [previews, currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      saveToStorage('ossUrls', ossUrls);
    }
  }, [ossUrls, currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      saveToStorage('rows', rows);
    }
  }, [rows, currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      saveToStorage('jsonOutput', jsonOutput);
    }
  }, [jsonOutput, currentTenant]);

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
        setStep(2);
        message.success(`成功上传 ${urls.length} 张图片`);
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
          childrens: item.childrens || null
        }));

        console.log('🔄 验证后的数据:', validatedData);

        // 检查表格是否已有数据
        if (rows.length > 0) {
          // 表格已有数据，提示用户选择模式
          const handleAppendMode = () => {
            // 追加模式：合并到现有数据
            console.log('📝 追加模式：合并新识别的数据到现有数据');
            const mergedData = [...rows, ...validatedData];
            setRows(mergedData);
            message.success(`成功追加识别 ${validatedData.length} 个人物信息，当前共 ${mergedData.length} 条记录`);
            setStep(3);
            setAppendMode(true); // 记住用户选择
          };

          const handleReplaceMode = () => {
            // 替换模式：替换现有数据
            console.log('📝 替换模式：替换现有数据');
            // 确保完全清空现有数据，然后设置新数据
            setRows([]);
            setTimeout(() => {
              setRows(validatedData);
              message.success(`成功识别 ${validatedData.length} 条家谱记录`);
            }, 10);
            setStep(3);
            setAppendMode(false); // 记住用户选择
          };

          // 显示模式选择确认框
          message.info({
            content: (
              <div>
                <p>表格中已有 {rows.length} 条数据，OCR识别到 {validatedData.length} 条新数据</p>
                <Space>
                  <Button type="primary" onClick={handleAppendMode}>追加数据</Button>
                  <Button danger onClick={handleReplaceMode}>覆盖数据</Button>
                </Space>
              </div>
            ),
            duration: 0, // 不自动关闭
            icon: <InfoCircleOutlined />,
            key: 'data-mode-selection'
          });
        } else {
          // 表格无数据，直接设置
          console.log('📝 表格无数据，直接设置识别结果');
          // 确保完全清空现有数据，然后设置新数据
          setRows([]);
          setTimeout(() => {
            setRows(validatedData);
            message.success(`成功识别 ${validatedData.length} 条家谱记录`);
            setStep(3);
          }, 10);
        }

        // 额外验证：确保状态更新
        setTimeout(() => {
          console.log('🔍 验证：当前rows状态长度:', rows.length);
        }, 100);
      } else {
        console.log('⚠️ 未识别到数据，创建1行空白供手动编辑');
        // 创建1行空白，方便手动编辑
        const emptyRowData = [{
          ...emptyRow(),
          id: 1
        }];
        setRows(emptyRowData);
        setStep(3);
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

  // 数据变化处理
  const handleDataChange = (newData) => {
    console.log('📝 数据变化:', newData);
    setRows(newData);
    // 保存到localStorage
    saveToStorage('rows', newData);
  };
  
  // 添加新行
  const addNewRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.id) || 0)) + 1 : 1;
    const newRow = {
      ...emptyRow(),
      id: newId
    };
    const newData = [...rows, newRow];
    setRows(newData);
    saveToStorage('rows', newData);
    message.success('已添加新行');
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

  // 两份“Excel”占位：先提供 CSV 导出（后续可引入 SheetJS/xlsx）
  const downloadCSV = (cols, data, filename) => {
    const header = cols.join(',');
    const lines = data.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcels = () => {
    // 拆为“人物基本信息表”和“关系表”两个 CSV
    const personCols = ['id','name','sex','birth_date','formal_name','official_position','summary','location'];
    const relationCols = ['id','g_rank','rank_index','g_father_id','g_mother_id','spouse','childrens','adoption'];
    downloadCSV(personCols, rows, '人物基本信息.csv');
    downloadCSV(relationCols, rows, '亲属关系.csv');
  };

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


  const canNextFromStep1 = files.length > 0;
  const canUpload = files.length > 0 && !busy;
  const canOCR = ossUrls.length > 0 && !busy;

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="creator-page">
        <div className="creator-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1>家谱不会丢，家族永流传</h1>
              <p>公益电子家谱，1分钟搞定</p>
            </div>
            <TenantSelector onTenantChange={setCurrentTenant} />
          </div>

          {/* 步骤进度条 */}
          <div style={{ marginBottom: '32px' }}>
            <Steps
              current={step - 1}
              items={[
                {
                  title: '上传图片',
                  description: '选择家谱图片文件',
                  icon: <FileImageOutlined />,
                },
                {
                  title: 'OCR识别',
                  description: '智能识别家谱信息',
                  icon: <TableOutlined />,
                },
                {
                  title: 'JSON导出',
                  description: '生成标准数据格式',
                  icon: <CodeOutlined />,
                },
              ]}
            />
          </div>
        </div>


        {/* Step 1 */}
        <section className="card card-padding">
          <h3>Step 1 · 上传族谱图片 (最多10张)</h3>
          <div className="uploader">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onPickFiles}
              disabled={busy}
            />
            <Space>
              <Button
                type="primary"
                disabled={!canUpload}
                loading={busy && uploadProgress > 0}
                onClick={handleUpload}
              >
                {busy && uploadProgress > 0 ? '上传中...' : '上传图片'}
              </Button>
              {uploadConfig && (
                <Tooltip title={`支持格式: ${uploadConfig.allowedTypes.join(', ')}`}>
                  <Button icon={<InfoCircleOutlined />} type="text" />
                </Tooltip>
              )}
            </Space>
          </div>

          {/* 上传进度 */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ marginTop: '16px' }}>
              <Progress
                percent={Math.round(uploadProgress)}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          )}
          {files.length>0 && (
            <div className="preview-grid">
              {previews.map((src, i) => (
                <div className="preview" key={i}>
                  <img src={src} alt={`预览${i+1}`} />
                </div>
              ))}
            </div>
          )}
          {ossUrls.length>0 && <div className="hint">已上传 {ossUrls.length} 张到 OSS</div>}
        </section>

        {/* Step 2 */}
        <section className="card card-padding">
          <h3>Step 2 · OCR识别家谱信息并校对</h3>

          <div className="uploader">
            <Space>
              <Button
                type="primary"
                disabled={!canOCR}
                loading={busy && ocrProgress > 0}
                onClick={handleOCR}
              >
                {busy && ocrProgress > 0 ? 'OCR识别中...' : '开始识别'}
              </Button>
              
              <Button 
                type="default"
                onClick={() => {
                  // 如果表格为空，添加一行空数据
                  if (rows.length === 0) {
                    const emptyRowData = [{
                      ...emptyRow(),
                      id: 1
                    }];
                    setRows(emptyRowData);
                  }
                  // 进入表格编辑模式
                  setStep(3);
                  message.info('已进入手动编辑模式');
                }}
              >
                手动编辑
              </Button>
            </Space>
          </div>

          {/* OCR进度 */}
          {ocrProgress > 0 && ocrProgress < 100 && (
            <div style={{ marginTop: '16px' }}>
              <Progress
                percent={Math.round(ocrProgress)}
                status="active"
                strokeColor={{
                  '0%': '#722ed1',
                  '100%': '#52c41a',
                }}
              />
            </div>
          )}



          {/* AntdFamilyTable 数据表格 */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={addNewRow}
                disabled={busy}
              >
                添加新行
              </Button>
              {rows.length > 0 && (
                <Button 
                  danger 
                  onClick={() => {
                    if (window.confirm('确定要清空所有数据吗？')) {
                      setRows([]);
                      saveToStorage('rows', []);
                      message.warning('已清空所有数据');
                    }
                  }}
                >
                  清空数据
                </Button>
              )}
              {/* 显示数据来源信息 */}
              {rows.length > 0 && currentTenant && (
                <span style={{ marginLeft: '16px', color: '#666', fontSize: '14px' }}>
                  {currentTenant.id === 'default' || currentTenant.id === process.env.REACT_APP_DEFAULT_TENANT_ID 
                    ? `当前显示: 默认穆氏族谱数据 (${rows.length}条记录)` 
                    : `当前显示: ${currentTenant.name} (${rows.length}条记录)`
                  }
                </span>
              )}
            </Space>
          </div>
          
          <AntdFamilyTable
            data={rows}
            onDataChange={handleDataChange}
            onExport={exportExcels}
            onSave={saveToCurrentTenant}
            loading={busy}
          />

          {/* 数据同步状态 */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <DataSyncStatus
                currentTenant={currentTenant}
                onRefresh={() => {
                  // 可以在这里添加刷新逻辑
                  console.log('🔄 数据同步状态刷新');
                }}
              />

              {/* API测试按钮 */}
              <div style={{ marginTop: '16px', padding: '16px', border: '1px dashed #d9d9d9', borderRadius: '6px' }}>
                <h4>🔧 开发调试工具</h4>
                <Space>
                  <Button
                    size="small"
                    onClick={async () => {
                      try {
                        console.log('🧪 测试API连接...');
                        const response = await fetch('http://localhost:3003/health');
                        const result = await response.text();
                        console.log('✅ 健康检查成功:', result);
                        message.success('API连接正常');
                      } catch (error) {
                        console.error('❌ 健康检查失败:', error);
                        message.error(`API连接失败: ${error.message}`);
                      }
                    }}
                  >
                    测试API连接
                  </Button>

                  <Button
                    size="small"
                    type="primary"
                    onClick={async () => {
                      try {
                        console.log('🧪 测试保存API...');
                        const testData = [{
                          id: 999,
                          name: '测试人员',
                          g_rank: 1,
                          rank_index: 1,
                          sex: 'MAN'
                        }];

                        const response = await fetch('http://localhost:3003/api/family-data/save', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tenantId: currentTenant?.id || 'default',
                            familyData: testData
                          })
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }

                        const result = await response.json();
                        console.log('✅ 保存API测试成功:', result);
                        message.success('保存API测试成功');
                      } catch (error) {
                        console.error('❌ 保存API测试失败:', error);
                        message.error(`保存API测试失败: ${error.message}`);
                      }
                    }}
                  >
                    测试保存API
                  </Button>
                </Space>
              </div>
            </>
          )}


        </section>

        {/* Step 3 */}
        <section className="card card-padding">
          <h3>Step 3 · JSON 转换与一键发布</h3>
          <div className="uploader">
            <button className="btn primary" onClick={convertToJSON}>生成 JSON</button>
            <button className="btn" onClick={downloadJSON}>下载 JSON</button>
            <Button
              type="primary"
              loading={busy}
              onClick={saveToCurrentTenant}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              保存到当前家谱
            </Button>
          </div>
          <textarea className="json-output" rows={12} readOnly value={jsonOutput} placeholder="点击“生成 JSON”查看输出" />
        </section>

        <div className="creator-notes">
          <p>实现说明：</p>
          <ul>
            <li>上传到 OSS：推荐通过后端网关签名后直传，前端仅提交 FormData。</li>
            <li>通义千问 OCR：使用阿里云通义千问VL-Max模型进行家谱识别，通过代理服务器调用。</li>
            <li>数据编辑：使用Ant Design Table组件，支持在线编辑、排序、分页等功能。</li>
            <li>“两份 Excel”：当前以 CSV 下载占位，后续可接入 SheetJS(xlsx) 输出 .xlsx。</li>
            <li>JSON 字段含 dealth：null 表示去世，只有 'alive' 表示在世（遵循你的规则）。</li>
          </ul>
        </div>


      </div>
    </AppLayout>
  );
}

export default CreatorPage;

