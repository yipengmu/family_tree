import React, { useMemo, useState, useEffect } from 'react';
import { message, Progress, Alert, Button, Space, Tooltip } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import AppLayout from '../Layout/AppLayout';
import TenantSelector from '../TenantSelector';
import OSSTestPanel from '../OSSTestPanel';
import ocrService from '../../services/ocrService';
import uploadService from '../../services/uploadService';
import tenantService from '../../services/tenantService';
import familyDataService from '../../services/familyDataService';
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
  const [rows, setRows] = useState([emptyRow()]);
  const [jsonOutput, setJsonOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [ocrConfig, setOcrConfig] = useState(null);
  const [showOSSTest, setShowOSSTest] = useState(false);

  // 初始化配置
  useEffect(() => {
    const tenant = tenantService.getCurrentTenant();
    setCurrentTenant(tenant);

    const uploadConf = uploadService.getUploadConfig();
    console.log('✅ OSS客户端初始化 constructor11');

    setUploadConfig(uploadConf);

    const ocrConf = ocrService.validateConfig();
    setOcrConfig(ocrConf);
  }, []);

  // 监听租户切换
  useEffect(() => {
    const unsubscribe = tenantService.onTenantChange((tenant) => {
      setCurrentTenant(tenant);
      // 租户切换时重置状态
      setStep(1);
      setFiles([]);
      setPreviews([]);
      setOssUrls([]);
      setRows([emptyRow()]);
      setJsonOutput('');
      message.info(`已切换到 ${tenant.name}，请重新开始创作流程`);
    });

    return unsubscribe;
  }, []);

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

  // 调用火山引擎 OCR 识别家谱信息
  const runVolcengineOCR = async (imageUrls) => {
    try {
      setOcrProgress(0);
      const tenantId = currentTenant?.id || 'default';

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

      const result = await ocrService.recognizeFamilyTree(imageUrls, tenantId);

      clearInterval(progressInterval);
      setOcrProgress(100);

      return result;
    } catch (error) {
      setOcrProgress(0);
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

    setBusy(true);
    try {
      message.loading('正在识别图片中的家谱信息...', 0);
      const parsed = await runVolcengineOCR(ossUrls);
      message.destroy();

      if (parsed.length > 0) {
        setRows(parsed);
        setStep(3);
        message.success(`成功识别 ${parsed.length} 条家谱记录`);
      } else {
        setRows([emptyRow()]);
        setStep(3);
        message.warning('未识别到家谱信息，请手动添加或检查图片质量');
      }
    } catch (error) {
      message.destroy();
      message.error(`OCR识别失败: ${error.message}`);
      console.error('OCR识别失败:', error);
    } finally {
      setBusy(false);
      setOcrProgress(0);
    }
  };

  // 表格编辑
  const updateCell = (ri, key, val) => {
    setRows((prev) => {
      const next = prev.slice();
      next[ri] = { ...next[ri], [key]: val };
      return next;
    });
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (ri) => setRows((prev) => prev.filter((_, i) => i !== ri));

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
  const saveToCurrentTenant = async () => {
    try {
      if (!rows.length || rows.every(row => !row.name)) {
        message.warning('请先添加家谱数据');
        return;
      }

      setBusy(true);
      message.loading('正在保存家谱数据...', 0);

      // 过滤掉空行
      const validRows = rows.filter(row => row.name && row.name.trim());

      await familyDataService.saveFamilyData(validRows, currentTenant?.id);
      message.destroy();
      message.success(`成功保存 ${validRows.length} 条家谱记录到 ${currentTenant?.name}`);

      // 生成JSON用于预览
      convertToJSON();
    } catch (error) {
      message.destroy();
      message.error(`保存失败: ${error.message}`);
      console.error('保存家谱数据失败:', error);
    } finally {
      setBusy(false);
    }
  };

  // 一键生成家谱网站
  const generateWebsite = async () => {
    try {
      if (!rows.length || rows.every(row => !row.name)) {
        message.warning('请先添加家谱数据');
        return;
      }

      // 先保存数据
      await saveToCurrentTenant();

      // TODO: 集成Vercel自动部署或其他部署服务
      message.info('网站生成功能开发中，敬请期待！');
    } catch (error) {
      message.error(`生成网站失败: ${error.message}`);
    }
  };

  const canNextFromStep1 = files.length > 0;
  const canUpload = files.length > 0 && !busy;
  const canOCR = ossUrls.length > 0 && !busy;

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="creator-page">
        <div className="creator-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1>家谱不会丢，数据永流传</h1>
              <p>2分钟将纸质家谱数字化</p>
            </div>
            <TenantSelector onTenantChange={setCurrentTenant} />
          </div>

          {/* 配置状态提示 */}
          <div style={{ marginBottom: '16px' }}>
            <Space>
              {uploadConfig && (
                <Tooltip title={`上传方式: ${uploadConfig.uploadMethod}, 最大文件: ${uploadConfig.maxFileSize / 1024 / 1024}MB`}>
                  <Alert
                    message={`上传: ${uploadConfig.uploadMethod}`}
                    type={uploadConfig.isOSSEnabled ? 'success' : 'warning'}
                    showIcon
                    icon={uploadConfig.isOSSEnabled ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                    style={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              )}

              {ocrConfig && (
                <Tooltip title={ocrConfig.isDevMode ? 'OCR: 开发模式 (使用模拟数据)' : 'OCR: 生产模式'}>
                  <Alert
                    message={`OCR: ${ocrConfig.isDevMode ? '开发模式' : '生产模式'}`}
                    type={ocrConfig.isValid ? 'success' : 'info'}
                    showIcon
                    icon={ocrConfig.isValid ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
                    style={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              )}

              {currentTenant && (
                <Alert
                  message={`当前家谱: ${currentTenant.name}`}
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                />
              )}

              {process.env.REACT_APP_DEBUG === 'true' && (
                <Button
                  type={showOSSTest ? 'primary' : 'default'}
                  onClick={() => setShowOSSTest(!showOSSTest)}
                  size="small"
                >
                  {showOSSTest ? '隐藏OSS测试' : '显示OSS测试'}
                </Button>
              )}
            </Space>
          </div>
        </div>

        <div className="creator-steps">
          <div className={`step ${step>=1?'active':''}`}>1 上传图片</div>
          <div className={`step ${step>=2?'active':''}`}>2 OCR 多维表</div>
          <div className={`step ${step>=3?'active':''}`}>3 JSON & 发布</div>
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
              <Button onClick={addRow}>新增一行</Button>
              <Button onClick={exportExcels}>导出Excel</Button>
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

          <div className="grid">
            <table>
              <thead>
                <tr>
                  {DEFAULT_COLUMNS.map((c) => <th key={c}>{c}</th>)}
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    {DEFAULT_COLUMNS.map((c) => (
                      <td key={c}>
                        <input
                          value={r[c] ?? ''}
                          onChange={(e) => updateCell(ri, c, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="link" onClick={() => removeRow(ri)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <Button
              onClick={generateWebsite}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: 'white' }}
            >
              一键生成网站
            </Button>
          </div>
          <textarea className="json-output" rows={12} readOnly value={jsonOutput} placeholder="点击“生成 JSON”查看输出" />
        </section>

        <div className="creator-notes">
          <p>实现说明：</p>
          <ul>
            <li>上传到 OSS：推荐通过后端网关签名后直传，前端仅提交 FormData。</li>
            <li>火山引擎 OCR：出于安全与密钥保护，建议后端代理调用。</li>
            <li>多维表：当前为轻量输入表。若需 Airtable 体验，可授权后集成 react-data-grid 或 Handsontable。</li>
            <li>“两份 Excel”：当前以 CSV 下载占位，后续可接入 SheetJS(xlsx) 输出 .xlsx。</li>
            <li>JSON 字段含 dealth：null 表示去世，只有 'alive' 表示在世（遵循你的规则）。</li>
          </ul>
        </div>

        {/* OSS测试面板 */}
        {showOSSTest && (
          <OSSTestPanel />
        )}
      </div>
    </AppLayout>
  );
}

export default CreatorPage;

