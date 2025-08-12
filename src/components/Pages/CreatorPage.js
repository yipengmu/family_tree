import React, { useMemo, useState } from 'react';
import AppLayout from '../Layout/AppLayout';
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

  // 选择文件，限制最多 10 张
  const onPickFiles = (e) => {
    const list = Array.from(e.target.files || []).slice(0, 10);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  // 占位：上传至阿里云 OSS（需后端签名/网关）
  const uploadToOSS = async (selectedFiles) => {
    // TODO: 替换为你的网关地址，网关负责获取 STS、完成直传
    const GATEWAY = process.env.REACT_APP_OSS_UPLOAD_ENDPOINT || '/api/oss/upload';
    const urls = [];
    for (const f of selectedFiles) {
      // 占位：前端直接传 FormData 到你的后端网关
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch(GATEWAY, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('OSS 上传失败');
        const data = await res.json(); // 期望 { url: 'https://oss-bucket/xxx.jpg' }
        urls.push(data.url || '');
      } catch (err) {
        console.error(err);
      }
    }
    return urls.filter(Boolean);
  };

  // 占位：调用火山引擎 OCR，输入图片 URL，返回解析后的结构化行
  const runVolcengineOCR = async (imageUrls) => {
    // TODO: 用你自己的后端代理 REACT_APP_VOLC_OCR_ENDPOINT 调用火山 OCR
    // 这里返回 mock 数据，方便前端先整合
    const mock = [
      { id: 1, name: '穆森', g_rank: 2, rank_index: 1, g_father_id: 1, official_position: '', summary: null, adoption: 'none', sex: 'MAN', g_mother_id: null, birth_date: null, id_card: null, face_img: null, photos: null, household_info: null, spouse: null, home_page: null, dealth: null, formal_name: null, location: null, childrens: null },
    ];
    // 根据图片数量复制几行示例
    return imageUrls.length ? mock : [];
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = await uploadToOSS(files);
      setOssUrls(urls);
      if (urls.length) setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const handleOCR = async () => {
    if (!ossUrls.length) return;
    setBusy(true);
    try {
      const parsed = await runVolcengineOCR(ossUrls);
      setRows(parsed.length ? parsed : [emptyRow()]);
      setStep(3);
    } finally {
      setBusy(false);
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
    a.href = url; a.download = 'genealogy.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const canNextFromStep1 = files.length > 0;
  const canUpload = files.length > 0 && !busy;
  const canOCR = ossUrls.length > 0 && !busy;

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="creator-page">
        <div className="creator-header">
          <h1>家谱不会丢，数据永流传</h1>
          <p>2分钟将纸质家谱数字化</p>
        </div>

        <div className="creator-steps">
          <div className={`step ${step>=1?'active':''}`}>1 上传图片</div>
          <div className={`step ${step>=2?'active':''}`}>2 OCR 多维表</div>
          <div className={`step ${step>=3?'active':''}`}>3 JSON & 发布</div>
        </div>

        {/* Step 1 */}
        <section className="card card-padding">
          <h3>Step 1 · 上传 10 张族谱图片</h3>
          <div className="uploader">
            <input type="file" multiple accept="image/*" onChange={onPickFiles} />
            <button className="btn primary" disabled={!canUpload} onClick={handleUpload}>{busy? '上传中...' : '上传到 OSS'}</button>
          </div>
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
          <h3>Step 2 · 调用火山引擎 OCR 并在多维表中校对</h3>
          <div className="uploader">
            <button className="btn" disabled={!canOCR} onClick={handleOCR}>{busy? '识别中...' : '识别图片'}</button>
            <button className="btn" onClick={addRow}>新增一行</button>
            <button className="btn" onClick={exportExcels}>导出两份 Excel（CSV 占位）</button>
          </div>

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
            <button className="btn" onClick={() => alert('发布流程占位：可接 Vercel 自动部署/数据推送')}>一键生成家谱网站</button>
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
      </div>
    </AppLayout>
  );
}

export default CreatorPage;

