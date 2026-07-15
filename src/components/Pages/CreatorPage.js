import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  message,
  Progress,
  Button,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Modal,
  Tooltip,
  Input,
  Form,
  Select,
  Radio,
  Checkbox,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  TableOutlined,
  SaveOutlined,
  CameraOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
  ClearOutlined,
  BookOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import AppLayout from "../Layout/AppLayout.js";
import AntdFamilyTable from "../AntdFamilyTable.js";
import FirstFamilyWizard from "../Onboarding/FirstFamilyWizard.js";
import tencentImageAnalysisService from "../../services/tencentImageAnalysisService.js";
import uploadService from "../../services/uploadService.js";
import tenantService from "../../services/tenantService.js";
import familyDataService from "../../services/familyDataService.js";
import familyDataGenerator from "../../services/familyDataGenerator.js";
import { buildFirstFamily } from "../../utils/firstFamily.js";
import {
  isPersonAlive,
  normalizePersonLifeStatus,
} from "../../utils/personLifeStatus.js";
import { trackEvent } from "../../utils/analytics.js";
import {
  addPaternalAncestor,
  getLifeStatusFields,
  getPaternalOnboardingState,
} from "../../utils/paternalOnboarding.js";
import "./CreatorPage.css";

const { Title } = Typography;

// 数据管理页面 - 以表格数据为核心

const DEFAULT_COLUMNS = [
  "id",
  "name",
  "g_rank",
  "rank_index",
  "g_father_id",
  "official_position",
  "summary",
  "adoption",
  "sex",
  "g_mother_id",
  "birth_date",
  "id_card",
  "face_img",
  "photos",
  "household_info",
  "spouse",
  "home_page",
  "dealth",
  "formal_name",
  "location",
  "childrens",
];

const emptyRow = () =>
  normalizePersonLifeStatus(
    {
      id: "",
      name: "",
      g_rank: "",
      rank_index: "",
      g_father_id: "",
      official_position: "",
      summary: "",
      adoption: "none",
      sex: "MAN",
      g_mother_id: "",
      birth_date: "",
      id_card: "",
      face_img: "",
      photos: "",
      household_info: "",
      spouse: "",
      home_page: "",
      formal_name: "",
      location: "",
      childrens: "",
    },
    true,
  );

function CreatorPage({
  activeMenuItem = "create",
  onMenuClick,
  onOpenPersonProfile,
  openPaternalGuide = false,
}) {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [rows, setRows] = useState([]);
  const [jsonOutput, setJsonOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // 弹框状态管理
  const [imageParseModalVisible, setImageParseModalVisible] = useState(false);
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  const [mobilePersonModalVisible, setMobilePersonModalVisible] =
    useState(false);
  const [archivePersonModalVisible, setArchivePersonModalVisible] =
    useState(false);
  const [archivePersonId, setArchivePersonId] = useState(null);
  const [paternalAncestorModalVisible, setPaternalAncestorModalVisible] =
    useState(false);
  const [paternalNameUnknown, setPaternalNameUnknown] = useState(false);
  const [paternalGuideAutoOpened, setPaternalGuideAutoOpened] = useState(false);
  const [showMobileTable, setShowMobileTable] = useState(false);
  const [editingMobilePerson, setEditingMobilePerson] = useState(null);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);
  const [mobilePersonForm] = Form.useForm();
  const [mobileEditForm] = Form.useForm();
  const [paternalAncestorForm] = Form.useForm();

  // 重名检测相关状态
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateData, setDuplicateData] = useState({
    newData: [],
    duplicates: [],
  });
  const [pendingImageData, setPendingImageData] = useState(null);

  // 表格多选状态管理
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // 搜索状态管理
  const [searchText, setSearchText] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);

  const fatherOptions = useMemo(
    () =>
      rows
        .filter((row) => row.name && row.id !== undefined && row.id !== null)
        .map((row) => ({
          value: row.id,
          label: `${row.name} · 第${row.g_rank || 1}代`,
        })),
    [rows],
  );

  const paternalOnboarding = useMemo(
    () => getPaternalOnboardingState(rows),
    [rows],
  );

  const archivePersonOptions = useMemo(
    () =>
      rows
        .filter((row) => row.name && (row.person_id ?? row.id) !== undefined)
        .map((row) => ({
          value: String(row.person_id ?? row.id),
          label: `${row.name} · 第${row.g_rank || 1}代`,
        })),
    [rows],
  );

  const personNameById = useMemo(() => {
    const names = new Map();
    rows.forEach((row) => {
      if (!row.name) return;
      if (row.id !== undefined && row.id !== null) {
        names.set(String(row.id), row.name);
      }
      if (row.person_id !== undefined && row.person_id !== null) {
        names.set(String(row.person_id), row.name);
      }
    });
    return names;
  }, [rows]);

  const openArchivePerson = (capture = false) => {
    if (!archivePersonId) {
      message.warning("请先选择一位家人");
      return;
    }
    setArchivePersonModalVisible(false);
    onOpenPersonProfile?.(archivePersonId, { capture });
  };

  const openPaternalAncestorModal = useCallback(() => {
    setPaternalNameUnknown(false);
    paternalAncestorForm.setFieldsValue({
      name: "",
      nameUnknown: false,
      lifeStatus: "unknown",
    });
    setPaternalAncestorModalVisible(true);
  }, [paternalAncestorForm]);

  useEffect(() => {
    if (
      !openPaternalGuide ||
      paternalGuideAutoOpened ||
      dataLoading ||
      paternalOnboarding.complete ||
      !paternalOnboarding.anchorPerson
    ) {
      return;
    }
    setPaternalGuideAutoOpened(true);
    openPaternalAncestorModal();
  }, [
    dataLoading,
    openPaternalGuide,
    openPaternalAncestorModal,
    paternalGuideAutoOpened,
    paternalOnboarding.anchorPerson,
    paternalOnboarding.complete,
  ]);

  const openMobilePersonEditor = (person) => {
    const lifeStatus =
      person.dealth === "unknown" || person.death_date === "unknown"
        ? "unknown"
        : isPersonAlive(person)
          ? "living"
          : "deceased";
    setEditingMobilePerson(person);
    mobileEditForm.setFieldsValue({
      name: person.name || "",
      sex: person.sex || "MAN",
      lifeStatus,
      g_rank: person.g_rank || 1,
      rank_index: person.rank_index || 1,
      g_father_id: person.g_father_id || undefined,
      birth_date: person.birth_date || "",
      spouse: person.spouse || "",
      location: person.location || "",
      official_position: person.official_position || "",
      summary: person.summary || "",
    });
  };

  // 数据持久化key (已删除localStorage逻辑)
  // const getStorageKey = (key) => {
  //   const tenantId = currentTenant?.id || 'default';
  //   return `creator_${tenantId}_${key}`;
  // };

  // 重名检测函数
  const detectDuplicateNames = (newData, existingData = rows) => {
    const duplicates = [];
    const existingNames = new Set(
      existingData.map((person) => person.name?.trim().toLowerCase()),
    );

    newData.forEach((person, index) => {
      const name = person.name?.trim().toLowerCase();
      if (name && existingNames.has(name)) {
        // 找到重复的原有人员
        const existingPerson = existingData.find(
          (p) => p.name?.trim().toLowerCase() === name,
        );
        duplicates.push({
          newPerson: person,
          existingPerson: existingPerson,
          index: index,
        });
      }
    });

    return duplicates;
  };

  // 处理图片解析候选（加入重名检测）
  const processImageCandidates = (validatedData) => {
    if (rows.length > 0) {
      // 检测重名
      const duplicates = detectDuplicateNames(validatedData);

      if (duplicates.length > 0) {
        console.log("🔍 发现重名人员:", duplicates);

        // 显示重名确认对话框
        setDuplicateData({ newData: validatedData, duplicates });
        setDuplicateModalVisible(true);
        setPendingImageData(validatedData);

        message.warning(
          `发现 ${duplicates.length} 个重名人员，请确认是否继续添加`,
        );
        return false; // 停止自动添加
      }
    }

    // 没有重名，直接添加
    addImageCandidatesToTable(validatedData);
    return true;
  };

  // 将图片解析候选添加到表格（不保存到数据库）
  const addImageCandidatesToTable = (validatedData) => {
    if (rows.length > 0) {
      // 表格已有数据，追加模式
      console.log("📝 追加模式：合并新识别的数据到现有数据");
      const mergedData = [...rows, ...validatedData];
      setRows(mergedData);
      message.success(
        `成功追加识别 ${validatedData.length} 个人物信息，当前共 ${mergedData.length} 条记录（仅在内存中，未保存到数据库）`,
      );
    } else {
      // 表格无数据，直接设置
      console.log("📝 表格无数据，直接设置识别结果");
      setRows(validatedData);
      message.success(
        `成功识别 ${validatedData.length} 条家谱记录（仅在内存中，未保存到数据库）`,
      );
    }

    // 数据仅保存在内存中（不保存到localStorage）
    console.log("✅ 图片解析候选已加入内存，等待用户确认并保存");
  };

  // 确认添加重名数据
  const confirmAddDuplicates = () => {
    if (pendingImageData) {
      addImageCandidatesToTable(pendingImageData);
      setDuplicateModalVisible(false);
      setPendingImageData(null);
      setDuplicateData({ newData: [], duplicates: [] });
    }
  };

  // 批量删除脉数据函数
  const deleteDataAfterID = (afterId) => {
    const filteredRows = rows.filter((row) => {
      const rowId = parseInt(row.id) || 0;
      return rowId <= afterId;
    });

    const deletedCount = rows.length - filteredRows.length;

    if (deletedCount > 0) {
      setRows(filteredRows);
      message.success(
        `已删除 ${deletedCount} 条ID大于 ${afterId} 的脉数据，当前剩余 ${filteredRows.length} 条记录`,
      );
      console.log(
        `🗑️ 批量删除完成: 删除${deletedCount}条，保留${filteredRows.length}条`,
      );
    } else {
      message.info(`没有找到ID大于 ${afterId} 的数据`);
    }
  };

  // 处理删除脉数据的确认
  const handleDeleteDirtyData = () => {
    const afterId = 625;
    const dataToDelete = rows.filter((row) => {
      const rowId = parseInt(row.id) || 0;
      return rowId > afterId;
    });

    if (dataToDelete.length === 0) {
      message.info(`没有找到ID大于 ${afterId} 的数据`);
      return;
    }

    Modal.confirm({
      title: "确认删除脉数据",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            将删除{" "}
            <strong style={{ color: "#f5222d" }}>{dataToDelete.length}</strong>{" "}
            条ID大于 {afterId} 的数据。
          </p>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            删除范围：ID {afterId + 1} -{" "}
            {Math.max(...dataToDelete.map((row) => parseInt(row.id) || 0))}
          </p>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: "4px",
              padding: "8px",
              marginTop: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "500",
                marginBottom: "4px",
                color: "#666",
              }}
            >
              将被删除的数据预览：
            </div>
            {dataToDelete.slice(0, 10).map((row, index) => (
              <div
                key={index}
                style={{ fontSize: "11px", color: "#888", padding: "2px 0" }}
              >
                ID: {row.id} - {row.name} (第{row.g_rank}代)
              </div>
            ))}
            {dataToDelete.length > 10 && (
              <div
                style={{ fontSize: "11px", color: "#999", padding: "2px 0" }}
              >
                ...还有 {dataToDelete.length - 10} 条数据
              </div>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#f5222d", marginTop: "12px" }}>
            ⚠️ 此操作不可逆，请确认后再操作。
          </p>
        </div>
      ),
      okText: "确认删除",
      cancelText: "取消",
      okType: "danger",
      onOk() {
        deleteDataAfterID(afterId);
      },
    });
  };
  const cancelAddDuplicates = () => {
    setDuplicateModalVisible(false);
    setPendingImageData(null);
    setDuplicateData({ newData: [], duplicates: [] });
    message.info("已取消添加重名数据");
  };

  // 批量删除选中的行
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择要删除的数据");
      return;
    }

    Modal.confirm({
      title: "确认批量删除",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            将删除{" "}
            <strong style={{ color: "#f5222d" }}>
              {selectedRowKeys.length}
            </strong>{" "}
            条数据。
          </p>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: "4px",
              padding: "8px",
              marginTop: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "500",
                marginBottom: "4px",
                color: "#666",
              }}
            >
              将被删除的数据预览：
            </div>
            {selectedRows.slice(0, 10).map((row, index) => (
              <div
                key={index}
                style={{ fontSize: "11px", color: "#888", padding: "2px 0" }}
              >
                ID: {row.id} - {row.name} (第{row.g_rank}代)
              </div>
            ))}
            {selectedRows.length > 10 && (
              <div
                style={{ fontSize: "11px", color: "#999", padding: "2px 0" }}
              >
                ...还有 {selectedRows.length - 10} 条数据
              </div>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#f5222d", marginTop: "12px" }}>
            ⚠️ 此操作不可逆，请确认后再操作。
          </p>
        </div>
      ),
      okText: "确认删除",
      cancelText: "取消",
      okType: "danger",
      onOk() {
        // 删除选中的行（根据ID匹配）
        const selectedIds = selectedRows.map((row) => row.id);
        const newData = rows.filter((row) => !selectedIds.includes(row.id));
        setRows(newData);

        // 清空选择
        setSelectedRowKeys([]);
        setSelectedRows([]);

        message.success(`已删除 ${selectedRowKeys.length} 条数据`);
      },
    });
  };
  // 使用familyDataService的3层架构加载默认数据
  const loadDefaultFamilyData = async () => {
    try {
      console.log("🔄 使用familyDataService的3层架构加载默认数据...");

      // 使用 familyDataService 的 3层架构加载数据
      const data = await familyDataService.getFamilyData(true, "default");

      if (data && data.length > 0) {
        console.log(`✅ 从3层架构加载默认数据: ${data.length} 条记录`);
        return data;
      }

      console.log("⚠️ 无法加载任何默认数据");
      return [];
    } catch (error) {
      console.error("❌ 加载默认族谱数据失败:", error);
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

    console.log("✅ 图片上传与大模型解析均由服务端安全管理");
  }, []);

  // 修改为使用familyDataService的3层架构加载数据
  useEffect(() => {
    if (currentTenant) {
      // 使用familyDataService的3层架构加载数据：内存缓存 → 数据库 → 原始familyData.js
      const loadDataFromService = async () => {
        setDataLoading(true);
        try {
          console.log("🔄 使用familyDataService加载数据...", currentTenant.id);
          const data = await familyDataService.getFamilyData(
            false,
            currentTenant.id,
          );

          if (data && data.length > 0) {
            console.log(`✅ 从3层架构加载数据: ${data.length} 条记录`);
            setRows(data);
            // 数据重新加载时清除搜索状态
            setSearchText("");
            setFilteredRows([]);
          } else {
            console.log("⚠️ 无数据，初始化为空状态");
            setRows([]);
            setSearchText("");
            setFilteredRows([]);
          }
        } catch (error) {
          console.warn("⚠️ 加载数据失败:", error);
          setRows([]);
        } finally {
          setDataLoading(false);
        }
      };

      loadDataFromService();

      // 初始化其他状态为空
      setFiles([]);
      setPreviews([]);
      setUploadedImages([]);
      setJsonOutput("");
    }
  }, [currentTenant]);

  // 监听租户切换（优化版 - 保持数据状态）
  useEffect(() => {
    const unsubscribe = tenantService.onTenantChange(async (tenant) => {
      setCurrentTenant(tenant);

      // 租户切换时，不立即清空数据，而是保留现有数据状态
      console.log("🔄 租户切换，数据状态保持不变...");

      // 可选：如果需要，可以在这里添加数据刷新逻辑
      // await loadFamilyData();

      message.info(`已切换到 ${tenant.name}，数据状态已保持`);
    });

    return unsubscribe;
  }, []);

  // 监听家谱数据更新事件，确保保存后数据管理页面能实时同步
  useEffect(() => {
    const handleDataUpdated = async (event) => {
      const { tenantId } = event.detail;
      const currentTenantId = currentTenant?.id;

      // 如果更新的是当前租户的数据，重新加载数据
      if (tenantId === currentTenantId) {
        console.log(
          "🔄 [CreatorPage] 检测到家谱数据更新，重新加载数据管理页面数据...",
        );

        try {
          const data = await familyDataService.getFamilyData(true, tenantId);
          if (Array.isArray(data)) {
            console.log(`✅ [CreatorPage] 重新加载 ${data.length} 条记录`);
            setRows(data);

            // 数据重新加载时重新执行搜索（如果有搜索条件）
            if (searchText) {
              const searchTerm = searchText.toLowerCase().trim();
              const filtered = data.filter((row) => {
                return (
                  (row.name && row.name.toLowerCase().includes(searchTerm)) ||
                  (row.official_position &&
                    row.official_position.toLowerCase().includes(searchTerm)) ||
                  (row.summary &&
                    row.summary.toLowerCase().includes(searchTerm)) ||
                  (row.spouse &&
                    row.spouse.toLowerCase().includes(searchTerm)) ||
                  (row.location &&
                    row.location.toLowerCase().includes(searchTerm)) ||
                  (row.g_rank && String(row.g_rank).includes(searchTerm)) ||
                  (row.id && String(row.id).includes(searchTerm))
                );
              });
              setFilteredRows(filtered);
            }
          }
        } catch (error) {
          console.error("❌ [CreatorPage] 重新加载数据失败:", error);
        }
      }
    };

    window.addEventListener("familyDataUpdated", handleDataUpdated);

    return () => {
      window.removeEventListener("familyDataUpdated", handleDataUpdated);
    };
  }, [currentTenant, searchText]);

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
  //     saveToStorage('uploadedImages', uploadedImages);
  //   }
  // }, [uploadedImages, currentTenant]);

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
    const filtered = rows.filter((row) => {
      return (
        (row.name && row.name.toLowerCase().includes(searchTerm)) ||
        (row.official_position &&
          row.official_position.toLowerCase().includes(searchTerm)) ||
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
    setSearchText("");
    setFilteredRows([]);
  };

  // 获取当前显示的数据（搜索结果或全部数据）
  const getCurrentDisplayData = () => {
    return searchText ? filteredRows : rows;
  };

  const applyImageCandidates = (parsed) => {
    if (!Array.isArray(parsed) || !parsed.length) {
      message.warning("大模型没有读出明确的人物信息，请换一张更清晰的照片");
      return false;
    }

    const currentTime = new Date().toISOString();
    const candidates = parsed.filter((item) => String(item?.name || "").trim());
    const nextId = Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1;
    const candidateIdMap = new Map(
      candidates.map((item, index) => [String(item.id), nextId + index]),
    );
    const mappedRelationId = (value) => candidateIdMap.get(String(value)) || 0;
    const validatedData = candidates.map((item, index) => ({
      ...item,
      id: nextId + index,
      name: String(item.name).trim(),
      g_rank: item.g_rank || 1,
      rank_index: item.rank_index || index + 1,
      sex: item.sex || "MAN",
      adoption: item.adoption || "none",
      g_father_id: mappedRelationId(item.g_father_id),
      official_position: item.official_position || "",
      summary: item.summary || null,
      g_mother_id: mappedRelationId(item.g_mother_id) || null,
      birth_date: item.birth_date || null,
      id_card: null,
      face_img: null,
      photos: null,
      household_info: null,
      spouse: item.spouse || null,
      home_page: null,
      dealth: null,
      formal_name: item.formal_name || null,
      location: item.location || null,
      childrens: null,
      created_at: currentTime,
      updated_at: currentTime,
    }));

    if (!validatedData.length) {
      message.warning("大模型没有读出明确的人名，请换一张更清晰的照片");
      return false;
    }
    processImageCandidates(validatedData);
    setShowMobileTable(true);
    return true;
  };

  // 上传原图到当前家谱的私有空间，并保留可追溯的对象键。
  const uploadFamilyTreeImages = async (selectedFiles) => {
    setUploadProgress(5);
    const tenantId = currentTenant?.id || "default";
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 8));
    }, 250);
    try {
      const images = await uploadService.uploadFiles(selectedFiles, tenantId, {
        returnDescriptors: true,
      });
      setUploadProgress(100);
      return images;
    } finally {
      clearInterval(progressInterval);
    }
  };

  // 腾讯 TokenHub 的 HY-Vision 模型直接理解图片，不再经过传统 OCR。
  const runImageAnalysis = async (images) => {
    setAnalysisProgress(5);
    const tenantId = currentTenant?.id || "default";
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => (prev >= 90 ? prev : prev + 6));
    }, 450);
    const frontendTimeoutMs = 120000;
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `大模型解析超时（${frontendTimeoutMs / 1000}秒），请减少图片数量后重试`,
            ),
          );
        }, frontendTimeoutMs);
      });
      const result = await Promise.race([
        tencentImageAnalysisService.parseFamilyTree(images, tenantId),
        timeoutPromise,
      ]);
      setAnalysisProgress(100);
      return result;
    } finally {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
    }
  };

  const handlePhotoImport = async (selectedFiles) => {
    if (!selectedFiles.length || busy) return;

    setBusy(true);
    setUploadedImages([]);
    setUploadProgress(0);
    setAnalysisProgress(0);
    try {
      message.loading("正在安全上传家谱照片...", 0);
      const images = await uploadFamilyTreeImages(selectedFiles);
      setUploadedImages(images);
      message.destroy();
      message.loading("腾讯混元大模型正在理解人物与世系...", 0);
      const parsed = await runImageAnalysis(images);
      message.destroy();

      if (applyImageCandidates(parsed)) {
        setImageParseModalVisible(false);
        message.success("解析完成，请核对人物和关系后再保存");
      }
    } catch (error) {
      message.destroy();
      setUploadProgress(0);
      setAnalysisProgress(0);
      const errorMessage = error.message || "未知错误";
      message.error(`图片解析失败：${errorMessage}`, 10);
      console.error("腾讯混元图片解析失败:", error);
    } finally {
      setBusy(false);
    }
  };

  // 手机和 PC 统一为选图后立即上传并解析。
  const onPickFiles = (event) => {
    const fileList = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = uploadService.validateFiles(fileList);
    if (!validation.isValid) {
      message.error(validation.errors.join("\n"));
      return;
    }

    const list = fileList.slice(0, 10);
    previews.forEach((url) => uploadService.revokePreviewUrl(url));
    setFiles(list);
    setPreviews(list.map((file) => uploadService.createPreviewUrl(file)));
    handlePhotoImport(list);
  };

  // 数据变化处理（已删除localStorage保存）
  const handleDataChange = (newData) => {
    console.log("📝 数据变化:", newData);
    setRows(newData);

    // 如果当前有搜索，重新执行搜索
    if (searchText) {
      const searchTerm = searchText.toLowerCase().trim();
      const filtered = newData.filter((row) => {
        return (
          (row.name && row.name.toLowerCase().includes(searchTerm)) ||
          (row.official_position &&
            row.official_position.toLowerCase().includes(searchTerm)) ||
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
    const newId =
      rows.length > 0
        ? Math.max(...rows.map((r) => parseInt(r.id) || 0)) + 1
        : 1;
    const currentTime = new Date().toISOString();
    const newRow = {
      ...emptyRow(),
      id: newId,
      created_at: currentTime,
      updated_at: currentTime,
    };
    const newData = [...rows, newRow];
    setRows(newData);
    // 数据仅保存在内存中，等待用户手动保存到数据库
    message.success("已添加一位家人，请填写姓名后保存");
  };

  const addMobilePerson = async (values) => {
    const { lifeStatus = "unknown", ...personValues } = values;
    const father = rows.find(
      (row) => String(row.id) === String(values.g_father_id),
    );
    const generation = father
      ? Number(father.g_rank || 0) + 1
      : Number(values.g_rank) || 1;
    const newPerson = normalizePersonLifeStatus(
      {
        ...emptyRow(),
        ...personValues,
        ...getLifeStatusFields(lifeStatus),
        g_rank: generation,
        rank_index:
          rows.filter((row) => Number(row.g_rank) === generation).length + 1,
        g_father_id: values.g_father_id
          ? Number(values.g_father_id) || values.g_father_id
          : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      false,
    );
    try {
      setBusy(true);
      const savedPerson = await familyDataService.createPerson(
        newPerson,
        currentTenant.id,
      );
      setRows((current) => [...current, savedPerson]);
      setMobilePersonModalVisible(false);
      mobilePersonForm.resetFields();
      message.success(`${values.name} 已加入家谱，之后可以继续补充资料`);
    } catch (error) {
      message.error(`添加失败：${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const saveMobilePerson = async (values) => {
    if (!editingMobilePerson) return;

    const lifeFields = getLifeStatusFields(values.lifeStatus);
    const normalizedValues = normalizePersonLifeStatus({
      ...editingMobilePerson,
      ...values,
      ...lifeFields,
      g_rank: Number(values.g_rank) || 1,
      rank_index: Number(values.rank_index) || 1,
      g_father_id: values.g_father_id
        ? Number(values.g_father_id) || values.g_father_id
        : 0,
      updated_at: new Date().toISOString(),
    });
    const patch = {
      name: normalizedValues.name,
      sex: normalizedValues.sex,
      ...lifeFields,
      g_rank: normalizedValues.g_rank,
      rank_index: normalizedValues.rank_index,
      g_father_id: normalizedValues.g_father_id,
      birth_date: normalizedValues.birth_date || "",
      spouse: normalizedValues.spouse || "",
      location: normalizedValues.location || "",
      official_position: normalizedValues.official_position || "",
      summary: normalizedValues.summary || "",
    };

    try {
      setBusy(true);
      if (editingMobilePerson.person_id) {
        const savedPerson = await updatePersonIncrementally(
          editingMobilePerson,
          patch,
        );
        if (!savedPerson) return;
      } else {
        const nextRows = rows.map((row) =>
          row === editingMobilePerson ? { ...row, ...normalizedValues } : row,
        );
        const saved = await saveToCurrentTenant(nextRows, "人物资料已保存");
        if (!saved) return;
      }
      setEditingMobilePerson(null);
      mobileEditForm.resetFields();
    } finally {
      setBusy(false);
    }
  };

  // 生成并下载familyData文件
  const generateFamilyDataFile = async () => {
    if (!rows || rows.length === 0) {
      message.warning("请先解析家谱照片或添加家谱数据");
      return;
    }

    try {
      console.log("📝 开始生成familyData文件...");
      message.loading("正在生成familyData文件...", 0);

      const tenantId = currentTenant?.id || "default";
      const result = await familyDataGenerator.generateFamilyDataFile(
        rows,
        tenantId,
        {
          suffix: "image-parse",
          autoDownload: true,
          includeStats: true,
        },
      );

      message.destroy();

      if (result.success) {
        message.success(`文件生成成功: ${result.fileName}`);
        console.log("✅ 文件生成结果:", result);
        console.log("📊 文件统计:", result.stats);
      } else {
        message.error(`文件生成失败: ${result.error}`);
        console.error("❌ 文件生成失败:", result.error);
      }
    } catch (error) {
      message.destroy();
      message.error(`生成文件时发生错误: ${error.message}`);
      console.error("❌ 生成文件异常:", error);
    }
  };

  // 旧的CSV导出功能已被Excel导出替代
  // const downloadCSV = (cols, data, filename) => { ... }

  // JSON 转换
  const convertToJSON = (sourceRows = rows) => {
    const result = sourceRows.map((r) => {
      const normalizedRow = normalizePersonLifeStatus(r);
      const item = {};
      DEFAULT_COLUMNS.forEach((k) => {
        item[k] = normalizedRow[k] ?? null;
      });
      // 规范化：数字字段转 number
      ["id", "g_rank", "rank_index", "g_father_id", "g_mother_id"].forEach(
        (k) => {
          if (item[k] === "" || item[k] === null || item[k] === undefined)
            return;
          const n = Number(item[k]);
          item[k] = Number.isFinite(n) ? n : item[k];
        },
      );
      return item;
    });
    const json = JSON.stringify(result, null, 2);
    setJsonOutput(json);
    return json;
  };

  const downloadJSON = () => {
    const json = jsonOutput || convertToJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const tenantName = currentTenant?.name || "genealogy";
    const fileName = `${tenantName}_${new Date().toISOString().split("T")[0]}.json`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    message.success("JSON文件下载成功");
  };

  // 保存家谱数据到当前租户
  const saveToCurrentTenant = async (tableData = null, successText = null) => {
    try {
      // 使用传入的tableData或当前的rows状态
      const dataToSave = tableData || rows;

      if (!dataToSave.length || dataToSave.every((row) => !row.name)) {
        message.warning("请先添加家谱数据");
        return;
      }

      if (!currentTenant?.id) {
        message.error("请先选择族谱");
        return;
      }

      setBusy(true);
      message.loading("正在保存家谱数据...", 0);

      // 过滤掉空行
      const validRows = dataToSave
        .filter((row) => row.name && row.name.trim())
        .map((row) => normalizePersonLifeStatus(row));

      await familyDataService.saveFamilyData(validRows, currentTenant.id);
      message.destroy();
      setRows(validRows);
      message.success(successText || `已保存到 ${currentTenant.name}`);
      convertToJSON(validRows);
      return true;
    } catch (error) {
      message.destroy();
      message.error(`保存失败: ${error.message}`);
      console.error("保存家谱数据失败:", error);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePaternalAncestor = async (values) => {
    try {
      const result = addPaternalAncestor(rows, values);
      const generationCount = result.state.completedGenerations;
      const saved = await saveToCurrentTenant(
        result.familyData,
        generationCount >= 4
          ? "父系四代已连接，第一份近期家谱完成了"
          : `已连接 ${generationCount}/4 代，家谱已向上生长一代`,
      );
      if (!saved) return;

      const eventName =
        generationCount >= 4
          ? "fourth_generation_connected"
          : "third_generation_connected";
      trackEvent(eventName, {
        generationCount,
        memberCount: result.familyData.length,
        pendingName: values.nameUnknown === true,
      });
      setPaternalAncestorModalVisible(false);
      paternalAncestorForm.resetFields();
      setPaternalNameUnknown(false);
      onMenuClick?.("tree");
    } catch (error) {
      message.error(error.message || "添加祖辈失败，请重试");
    }
  };

  const updatePersonIncrementally = async (record, patch) => {
    if (
      !currentTenant?.id ||
      currentTenant.id === "default" ||
      !record?.person_id
    )
      return null;
    try {
      const savedPerson = await familyDataService.updatePerson(
        record.person_id,
        patch,
        currentTenant.id,
      );
      setRows((current) =>
        current.map((row) =>
          row.person_id === savedPerson.person_id
            ? { ...row, ...savedPerson }
            : row,
        ),
      );
      message.success("这项资料已保存");
      return savedPerson;
    } catch (error) {
      message.error(`保存失败：${error.message}`);
      if (error.message.includes("更新")) {
        const latest = await familyDataService
          .getFamilyData(true, currentTenant.id)
          .catch(() => null);
        if (Array.isArray(latest)) setRows(latest);
      }
      return null;
    }
  };

  const handleFirstFamilyComplete = async (values) => {
    try {
      const firstFamily = buildFirstFamily(values);
      const saved = await saveToCurrentTenant(
        firstFamily,
        `你的第一份家谱已开始，共记录 ${firstFamily.length} 位家人；接下来可以继续补充父母、祖辈和家族故事`,
      );
      if (saved) {
        trackEvent("first_person_saved", { memberCount: firstFamily.length });
        if (firstFamily.length > 1) {
          trackEvent("first_relationship_created", {
            memberCount: firstFamily.length,
          });
        }
        onMenuClick?.("tree");
      }
    } catch (error) {
      message.error(error.message || "生成家谱失败，请重试");
    }
  };

  if (dataLoading || !currentTenant) {
    return (
      <AppLayout
        activeMenuItem={activeMenuItem}
        onMenuClick={onMenuClick}
        immersiveMobile
      >
        <div className="creator-loading">
          <Spin size="large" />
          <span>正在打开你的家谱...</span>
        </div>
      </AppLayout>
    );
  }

  if (!rows.some((row) => row.name && row.name.trim())) {
    return (
      <AppLayout
        activeMenuItem={activeMenuItem}
        onMenuClick={onMenuClick}
        immersiveMobile
      >
        <FirstFamilyWizard
          busy={busy}
          familyName={currentTenant.name}
          onComplete={handleFirstFamilyComplete}
          onExit={() => onMenuClick?.("tree")}
        />
      </AppLayout>
    );
  }

  const mobileDisplayRows = getCurrentDisplayData();
  const mobileGenerationValues = rows
    .map((row) => Number(row.g_rank))
    .filter((value) => Number.isFinite(value) && value > 0);
  const mobileGenerationRange = mobileGenerationValues.length
    ? `${Math.min(...mobileGenerationValues)}–${Math.max(...mobileGenerationValues)} 代`
    : "世代待补充";

  return (
    <AppLayout
      activeMenuItem={activeMenuItem}
      onMenuClick={onMenuClick}
      immersiveMobile
    >
      <div className="data-management-page">
        <header className="mobile-creation-header">
          <button
            type="button"
            onClick={() => onMenuClick?.("tree")}
            aria-label="返回家谱"
          >
            <ArrowLeftOutlined />
          </button>
          <strong>续家谱</strong>
          <span className="mobile-creation-spacer" aria-hidden="true" />
        </header>
        <section className="mobile-continue-hub">
          <div className="mobile-continue-heading">
            <h1>把记得的，先记下来</h1>
            <p>
              {currentTenant?.name || "我的家谱"} · 已记录{" "}
              {rows.filter((row) => row.name).length} 位家人
            </p>
          </div>
          {!paternalOnboarding.complete && paternalOnboarding.anchorPerson && (
            <section
              className="paternal-guide-card"
              aria-label={`父系四代进度：已连接 ${paternalOnboarding.completedGenerations} 代，共 4 代`}
            >
              <div className="paternal-guide-heading">
                <span className="paternal-guide-icon" aria-hidden="true">
                  <ApartmentOutlined />
                </span>
                <div>
                  <small>父系四代 · 已连接</small>
                  <strong>
                    {paternalOnboarding.completedGenerations}/4 代
                  </strong>
                </div>
              </div>
              <Progress
                percent={(paternalOnboarding.completedGenerations / 4) * 100}
                showInfo={false}
                strokeColor="#d8b46b"
                trailColor="rgba(255, 255, 255, 0.16)"
                size="small"
              />
              <h2>下一步：{paternalOnboarding.nextActionLabel}</h2>
              <p>{paternalOnboarding.relationshipDescription}</p>
              <Button
                type="primary"
                size="large"
                block
                onClick={openPaternalAncestorModal}
              >
                {paternalOnboarding.nextActionLabel}
              </Button>
              <small className="paternal-guide-note">
                每次只补一代，保存后立即看到家谱向上生长
              </small>
            </section>
          )}
          <button
            type="button"
            className={`mobile-flow-card ${paternalOnboarding.complete ? "primary" : ""}`}
            onClick={() => setMobilePersonModalVisible(true)}
          >
            <span className="mobile-flow-icon">
              <PlusOutlined />
            </span>
            <span>
              <strong>添加一位家人</strong>
              <small>只填姓名也能保存，约 30 秒</small>
            </span>
            <b>开始</b>
          </button>
          <button
            type="button"
            className="mobile-flow-card archive"
            onClick={() => setArchivePersonModalVisible(true)}
          >
            <span className="mobile-flow-icon">
              <BookOutlined />
            </span>
            <span>
              <strong>记录生平与家庭档案</strong>
              <small>写经历、留原声，也可以添加老照片</small>
            </span>
            <b>去记录</b>
          </button>
          <button
            type="button"
            className="mobile-flow-card"
            onClick={() => setImageParseModalVisible(true)}
          >
            <span className="mobile-flow-icon">
              <CameraOutlined />
            </span>
            <span>
              <strong>拍照录入旧家谱</strong>
              <small>识别结果会先让你确认</small>
            </span>
            <b>拍照</b>
          </button>
          <button
            type="button"
            className="mobile-flow-card"
            onClick={() => setShowMobileTable((value) => !value)}
          >
            <span className="mobile-flow-icon">
              <TableOutlined />
            </span>
            <span>
              <strong>查找与修改资料</strong>
              <small>查看已录家人，集中补充信息</small>
            </span>
            <b>{showMobileTable ? "收起" : "展开"}</b>
          </button>
          <button
            type="button"
            className="mobile-manage-link"
            onClick={() => setManagementModalVisible(true)}
          >
            <SettingOutlined /> 备份、导出与更多管理
          </button>

          {showMobileTable && (
            <section
              className="mobile-family-directory"
              aria-label="查找与修改家人资料"
            >
              <div className="mobile-directory-head">
                <div className="mobile-directory-summary">
                  <span>家人资料</span>
                  <strong>{currentTenant?.name || "我的家谱"}</strong>
                  <p>
                    已录 {rows.filter((row) => row.name).length} 位 ·{" "}
                    {mobileGenerationRange}
                  </p>
                </div>
                <div className="mobile-directory-menu" aria-label="资料操作">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setMobilePersonModalVisible(true)}
                  >
                    <PlusOutlined /> 添加家人
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageParseModalVisible(true)}
                  >
                    <CameraOutlined /> 照片录入
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagementModalVisible(true)}
                  >
                    <SaveOutlined /> 保存导出
                  </button>
                </div>
              </div>

              <div className="mobile-directory-search">
                <Input
                  aria-label="搜索家人资料"
                  placeholder="搜索姓名、地点、备注"
                  prefix={<SearchOutlined />}
                  suffix={<span>{mobileDisplayRows.length} 位</span>}
                  value={searchText}
                  onChange={(event) => {
                    handleSearch(event.target.value);
                    setMobileVisibleCount(20);
                  }}
                  allowClear
                />
              </div>

              <div className="mobile-person-list">
                {mobileDisplayRows.length ? (
                  mobileDisplayRows
                    .slice(0, mobileVisibleCount)
                    .map((person) => {
                      const fatherName = person.g_father_id
                        ? personNameById.get(String(person.g_father_id))
                        : null;
                      const supportingDetails = [
                        fatherName ? `父亲：${fatherName}` : null,
                        person.location || null,
                        person.spouse ? `配偶：${person.spouse}` : null,
                      ].filter(Boolean);
                      const personKey = person.person_id ?? person.id;
                      const lifeStatusUnknown =
                        person.dealth === "unknown" ||
                        person.death_date === "unknown";

                      return (
                        <button
                          type="button"
                          className="mobile-person-card"
                          key={personKey}
                          onClick={() => openMobilePersonEditor(person)}
                          aria-label={`修改${person.name}的资料`}
                        >
                          <span
                            className="mobile-person-avatar"
                            aria-hidden="true"
                          >
                            {person.name?.slice(-1)}
                          </span>
                          <span className="mobile-person-card-copy">
                            <span className="mobile-person-card-title">
                              <strong>{person.name}</strong>
                              <i>第 {person.g_rank || 1} 代</i>
                              <i
                                className={
                                  isPersonAlive(person)
                                    ? "alive"
                                    : lifeStatusUnknown
                                      ? "pending"
                                      : ""
                                }
                              >
                                {isPersonAlive(person)
                                  ? "在世"
                                  : lifeStatusUnknown
                                    ? "待确认"
                                    : "已故"}
                              </i>
                            </span>
                            <small>
                              {supportingDetails.length
                                ? supportingDetails.join(" · ")
                                : "资料待补充"}
                            </small>
                          </span>
                          <span className="mobile-person-edit-label">修改</span>
                        </button>
                      );
                    })
                ) : (
                  <div className="mobile-person-empty">
                    <SearchOutlined />
                    <span>没有找到匹配的家人</span>
                    <button type="button" onClick={clearSearch}>
                      清除搜索
                    </button>
                  </div>
                )}
              </div>

              {mobileDisplayRows.length > mobileVisibleCount && (
                <button
                  type="button"
                  className="mobile-directory-more"
                  onClick={() => setMobileVisibleCount((count) => count + 20)}
                >
                  再显示 20 位家人
                </button>
              )}
            </section>
          )}
        </section>

        {/* 页面头部 */}
        <div className="page-header">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "24px" }}
          >
            <Col>
              <Title level={2} style={{ margin: 0, color: "#1e1e2d" }}>
                续家谱
              </Title>
              <p
                style={{
                  margin: "8px 0 0 0",
                  color: "#6b7280",
                  fontSize: "16px",
                }}
              >
                添加家人、补充资料，随时保存回家谱
              </p>
            </Col>
            <Col>
              <Button
                icon={<BookOutlined />}
                onClick={() => setArchivePersonModalVisible(true)}
              >
                记录生平事迹
              </Button>
            </Col>
          </Row>
        </div>

        {/* 核心数据表格区域（带内置功能入口） */}
        <Card
          className="family-data-card"
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span>
                {" "}
                {getCurrentDisplayData().length > 0 && currentTenant && (
                  <span
                    style={{
                      marginRight: "16px",
                      color: "#6b7280",
                      fontSize: "14px",
                    }}
                  >
                    {currentTenant.id === "default" ||
                    currentTenant.id === process.env.REACT_APP_DEFAULT_TENANT_ID
                      ? `穆氏示范家谱: ${getCurrentDisplayData().length}条`
                      : `${currentTenant.name}: ${getCurrentDisplayData().length}条`}
                    {searchText && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#f5222d",
                        }}
                      >
                        | 搜索结果
                      </span>
                    )}
                    {/* 世代范围信息 */}
                    {getCurrentDisplayData().length > 0 && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#6c757d",
                        }}
                      >
                        | 世代范围:{" "}
                        {Math.min(
                          ...getCurrentDisplayData().map(
                            (item) => item.g_rank || 1,
                          ),
                        )}{" "}
                        -{" "}
                        {Math.max(
                          ...getCurrentDisplayData().map(
                            (item) => item.g_rank || 1,
                          ),
                        )}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <div className="table-toolbar">
                {/* 搜索功能 */}
                <div style={{ marginRight: "12px" }}>
                  <Input
                    placeholder="搜索姓名、职位、备注..."
                    prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                    suffix={
                      searchText ? (
                        <ClearOutlined
                          style={{ color: "#bfbfbf", cursor: "pointer" }}
                          onClick={clearSearch}
                        />
                      ) : null
                    }
                    value={searchText}
                    onChange={(e) => handleSearch(e.target.value)}
                    size="small"
                    style={{ width: "180px" }}
                    allowClear
                  />
                  {searchText && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        marginTop: "2px",
                        textAlign: "center",
                      }}
                    >
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
                    添加家人
                  </Button>

                  <Tooltip title="从旧家谱照片识别人物资料">
                    <Button
                      type="primary"
                      icon={<CameraOutlined />}
                      onClick={() => setImageParseModalVisible(true)}
                      size="small"
                    >
                      照片识别
                    </Button>
                  </Tooltip>

                  <Tooltip title="保存家谱资料">
                    <Button
                      type="primary"
                      icon={<SettingOutlined />}
                      onClick={() => setManagementModalVisible(true)}
                      size="small"
                    >
                      保存家谱
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
            onPersonUpdate={updatePersonIncrementally}
            loading={busy}
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            onSelectedRowsChange={setSelectedRows}
          />
        </Card>

        <Modal
          title="记录谁的生平？"
          open={archivePersonModalVisible}
          onCancel={() => setArchivePersonModalVisible(false)}
          footer={null}
          destroyOnClose
          className="archive-person-modal"
        >
          <div className="archive-person-picker">
            <div className="archive-picker-mark" aria-hidden="true">
              志
            </div>
            <div>
              <h3>先选一位家人</h3>
              <p>
                每段经历都会归入这个人的家庭档案，并保留原始文字、录音或照片作为依据。
              </p>
            </div>
            <Select
              size="large"
              showSearch
              autoFocus
              value={archivePersonId}
              onChange={setArchivePersonId}
              optionFilterProp="label"
              options={archivePersonOptions}
              placeholder="输入姓名查找"
              notFoundContent="还没有可选家人，请先添加一位家人"
            />
            <div className="archive-picker-actions">
              <Button
                size="large"
                disabled={!archivePersonId}
                onClick={() => openArchivePerson(false)}
              >
                查看已有档案
              </Button>
              <Button
                type="primary"
                size="large"
                disabled={!archivePersonId}
                onClick={() => openArchivePerson(true)}
              >
                开始记录
              </Button>
            </div>
            <small>默认仅家谱成员可见，也可以设为仅自己可见。</small>
          </div>
        </Modal>

        <Modal
          title={paternalOnboarding.nextActionLabel || "父系四代已连接"}
          open={paternalAncestorModalVisible}
          onCancel={() => {
            setPaternalAncestorModalVisible(false);
            setPaternalNameUnknown(false);
            paternalAncestorForm.resetFields();
          }}
          footer={null}
          destroyOnClose
          className="mobile-person-modal paternal-ancestor-modal"
        >
          <Form
            form={paternalAncestorForm}
            layout="vertical"
            onFinish={savePaternalAncestor}
            initialValues={{
              name: "",
              nameUnknown: false,
              lifeStatus: "unknown",
            }}
          >
            <div className="paternal-modal-progress">
              <span>父系四代</span>
              <strong>{paternalOnboarding.completedGenerations}/4 代</strong>
            </div>
            <h3 className="paternal-modal-relation">
              {paternalOnboarding.relationshipDescription}
            </h3>
            <p className="mobile-form-intro">
              姓名是唯一需要填写的资料；保存后关系和世代会自动调整。
            </p>
            <Form.Item
              name="name"
              label={`${paternalOnboarding.nextLabel || "祖辈"}姓名`}
              dependencies={["nameUnknown"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (
                      getFieldValue("nameUnknown") ||
                      String(value || "").trim()
                    ) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("请填写姓名，或选择姓名待考"),
                    );
                  },
                }),
              ]}
            >
              <Input
                size="large"
                placeholder="请输入姓名"
                autoFocus
                maxLength={30}
                disabled={paternalNameUnknown}
              />
            </Form.Item>
            <Form.Item name="nameUnknown" valuePropName="checked">
              <Checkbox
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPaternalNameUnknown(checked);
                  if (checked) paternalAncestorForm.setFieldValue("name", "");
                }}
              >
                暂时不知道姓名，先建立
                {paternalOnboarding.nextLabel || "祖辈"}关系
              </Checkbox>
            </Form.Item>
            <Form.Item name="lifeStatus" label="生存状态（可选）">
              <Radio.Group
                className="paternal-life-status"
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="unknown">不确定</Radio.Button>
                <Radio.Button value="living">在世</Radio.Button>
                <Radio.Button value="deceased">已故</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <div className="paternal-fact-note">
              默认保持“不确定”，谱里不会替你猜测家人的姓名或生存状态。
            </div>
            <div className="mobile-form-submit">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={busy}
              >
                保存并查看家谱生长
              </Button>
              <small>保存后自动返回家谱，不需要填写人物 ID 或世代</small>
            </div>
          </Form>
        </Modal>

        <Modal
          title="添加一位家人"
          open={mobilePersonModalVisible}
          onCancel={() => {
            setMobilePersonModalVisible(false);
            mobilePersonForm.resetFields();
          }}
          footer={null}
          destroyOnClose
          className="mobile-person-modal"
        >
          <Form
            form={mobilePersonForm}
            layout="vertical"
            onFinish={addMobilePerson}
            initialValues={{
              sex: "MAN",
              lifeStatus: "unknown",
              g_rank: 1,
            }}
          >
            <p className="mobile-form-intro">
              先填姓名和关系就能入谱，其他资料以后随时补。
            </p>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: "请填写家人姓名" }]}
            >
              <Input
                size="large"
                placeholder="请输入姓名"
                autoFocus
                maxLength={30}
              />
            </Form.Item>
            <div className="mobile-form-grid">
              <Form.Item name="sex" label="性别">
                <Select
                  size="large"
                  options={[
                    { value: "MAN", label: "男" },
                    { value: "WOMAN", label: "女" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="lifeStatus" label="生存状态">
                <Radio.Group
                  className="mobile-life-status"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="unknown">不确定</Radio.Button>
                  <Radio.Button value="living">在世</Radio.Button>
                  <Radio.Button value="deceased">已故</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>
            <Form.Item
              name="g_father_id"
              label="父亲 / 所属支系（可选）"
              extra="按姓名选择后，世代会自动计算；不清楚可以先跳过。"
            >
              <Select
                size="large"
                showSearch
                allowClear
                optionFilterProp="label"
                options={fatherOptions}
                placeholder="输入姓名查找"
                notFoundContent="没有找到，可先跳过"
              />
            </Form.Item>
            <details className="mobile-more-fields">
              <summary>补充更多资料（可选）</summary>
              <div className="mobile-more-fields-content">
                <Form.Item
                  name="g_rank"
                  label="世代"
                  extra="未选择父亲时使用，之后仍可修改"
                >
                  <Input
                    size="large"
                    type="number"
                    min="1"
                    inputMode="numeric"
                  />
                </Form.Item>
                <Form.Item name="birth_date" label="出生时间">
                  <Input size="large" placeholder="例如：1988年或1988-06-12" />
                </Form.Item>
                <Form.Item name="location" label="籍贯或居住地">
                  <Input size="large" placeholder="例如：山东省临沂市" />
                </Form.Item>
                <Form.Item name="spouse" label="配偶">
                  <Input size="large" placeholder="可稍后补充" />
                </Form.Item>
                <Form.Item name="summary" label="想留下的记述">
                  <Input.TextArea
                    rows={3}
                    placeholder="职业、经历，或一段想留给后人的话"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </div>
            </details>
            <div className="mobile-form-submit">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={busy}
              >
                保存到家谱
              </Button>
              <small>保存后仍可继续修改，家谱默认仅家人可见</small>
            </div>
          </Form>
        </Modal>

        <Modal
          title={
            editingMobilePerson
              ? `修改 ${editingMobilePerson.name} 的资料`
              : "修改资料"
          }
          open={Boolean(editingMobilePerson)}
          onCancel={() => {
            setEditingMobilePerson(null);
            mobileEditForm.resetFields();
          }}
          footer={null}
          destroyOnClose
          className="mobile-person-modal mobile-edit-person-modal"
        >
          <Form
            form={mobileEditForm}
            layout="vertical"
            onFinish={saveMobilePerson}
          >
            <p className="mobile-form-intro">
              修改后会直接保存到当前私密家谱，不需要再操作横向表格。
            </p>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: "请填写家人姓名" }]}
            >
              <Input size="large" maxLength={30} />
            </Form.Item>
            <div className="mobile-form-grid">
              <Form.Item name="sex" label="性别">
                <Select
                  size="large"
                  options={[
                    { value: "MAN", label: "男" },
                    { value: "WOMAN", label: "女" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="lifeStatus" label="生存状态">
                <Radio.Group
                  className="mobile-life-status"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="unknown">不确定</Radio.Button>
                  <Radio.Button value="living">在世</Radio.Button>
                  <Radio.Button value="deceased">已故</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>
            <Form.Item name="g_father_id" label="父亲 / 所属支系">
              <Select
                size="large"
                showSearch
                allowClear
                optionFilterProp="label"
                options={fatherOptions.filter(
                  (option) =>
                    String(option.value) !==
                    String(
                      editingMobilePerson?.id ??
                        editingMobilePerson?.person_id ??
                        "",
                    ),
                )}
                placeholder="输入姓名查找，也可以暂不关联"
              />
            </Form.Item>
            <div className="mobile-form-grid">
              <Form.Item name="g_rank" label="世代">
                <Input size="large" type="number" min="1" inputMode="numeric" />
              </Form.Item>
              <Form.Item name="rank_index" label="同代排行">
                <Input size="large" type="number" min="1" inputMode="numeric" />
              </Form.Item>
            </div>
            <details className="mobile-more-fields">
              <summary>出生、地点与更多资料</summary>
              <div className="mobile-more-fields-content">
                <Form.Item name="birth_date" label="出生时间">
                  <Input size="large" placeholder="例如：1988年或1988-06-12" />
                </Form.Item>
                <Form.Item name="location" label="籍贯或居住地">
                  <Input size="large" placeholder="例如：山东省临沂市" />
                </Form.Item>
                <Form.Item name="spouse" label="配偶">
                  <Input size="large" />
                </Form.Item>
                <Form.Item name="official_position" label="职业或身份">
                  <Input size="large" />
                </Form.Item>
                <Form.Item name="summary" label="人物记述">
                  <Input.TextArea rows={4} maxLength={500} showCount />
                </Form.Item>
              </div>
            </details>
            <div className="mobile-form-submit">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={busy}
              >
                保存修改
              </Button>
              <small>保存后，家谱图与人物资料会同步更新</small>
            </div>
          </Form>
        </Modal>

        {/* 家谱照片大模型解析弹框 */}
        <Modal
          title="从家谱照片录入"
          open={imageParseModalVisible}
          onCancel={() => {
            if (!busy) setImageParseModalVisible(false);
          }}
          footer={null}
          width={600}
          destroyOnClose
          closable={!busy}
          maskClosable={!busy}
          keyboard={!busy}
          className="family-photo-modal"
        >
          <div className="family-photo-import">
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div className="family-photo-intro">
                <h3>选择纸质家谱照片</h3>
                <p>
                  选完后会自动安全上传，并由腾讯混元大模型直接理解文字、版面和世系关系。
                </p>
              </div>

              <label
                className={`family-photo-picker ${busy ? "disabled" : ""}`}
              >
                <CameraOutlined />
                <span>
                  <strong>
                    {busy ? "正在处理照片" : "从相册或电脑选择照片"}
                  </strong>
                  <small>支持 JPG、PNG、WebP，单张不超过 10MB</small>
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPickFiles}
                  disabled={busy}
                />
              </label>

              {files.length > 0 && (
                <div>
                  <div className="family-photo-count">
                    已选择 {files.length} 张照片
                  </div>
                  <div className="preview-grid">
                    {previews.map((src, index) => (
                      <div className="preview" key={src}>
                        <img src={src} alt={`家谱照片预览${index + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {busy && uploadProgress > 0 && analysisProgress === 0 && (
                <div className="family-photo-progress" aria-live="polite">
                  <strong>正在安全上传原图</strong>
                  <span>原图会保存在当前家谱的私有空间</span>
                  <Progress
                    percent={Math.round(uploadProgress)}
                    status="active"
                    showInfo={false}
                  />
                </div>
              )}

              {busy && analysisProgress > 0 && (
                <div className="family-photo-progress" aria-live="polite">
                  <strong>大模型正在理解家谱</strong>
                  <span>逐张读取人名、代际和连接关系，请稍候</span>
                  <Progress
                    percent={Math.round(analysisProgress)}
                    status="active"
                    showInfo={false}
                  />
                </div>
              )}

              {!busy && uploadedImages.length > 0 && (
                <div className="family-photo-uploaded">
                  已安全上传 {uploadedImages.length} 张照片，可重新选择再次解析
                </div>
              )}

              <small className="family-photo-review-note">
                大模型只生成待确认候选，不会自动改写已保存的家谱。
              </small>
            </Space>
          </div>
        </Modal>

        {/* 数据管理功能弹框 */}
        <Modal
          title="保存家谱"
          open={managementModalVisible}
          onCancel={() => setManagementModalVisible(false)}
          footer={null}
          width={500}
          destroyOnClose
          className="management-modal"
          wrapClassName="management-modal-wrap"
        >
          <div className="management-sheet">
            <section className="management-section management-save-section">
              <div>
                <h4>保存家谱</h4>
                <p>
                  同步{" "}
                  {rows.filter((row) => row.name && row.name.trim()).length}{" "}
                  位家人的最新资料
                </p>
              </div>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={busy}
                onClick={() => saveToCurrentTenant()}
                disabled={!rows.length || rows.every((row) => !row.name)}
                block
                size="large"
              >
                保存修改
              </Button>
            </section>

            {rows.length > 0 && (
              <dl className="management-stats" aria-label="家谱数据概览">
                <div>
                  <dt>有效家人</dt>
                  <dd>
                    {rows.filter((row) => row.name && row.name.trim()).length}
                  </dd>
                </div>
                <div>
                  <dt>世代范围</dt>
                  <dd>
                    {Math.min(...rows.map((item) => item.g_rank || 1))}–
                    {Math.max(...rows.map((item) => item.g_rank || 1))}
                  </dd>
                </div>
                <div>
                  <dt>总记录</dt>
                  <dd>{rows.length}</dd>
                </div>
              </dl>
            )}
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
          <div style={{ padding: "16px 0" }}>
            <div style={{ marginBottom: "16px", color: "#fa8c16" }}>
              检测到 <strong>{duplicateData.duplicates.length}</strong>{" "}
              个重名人员，请确认是否继续添加：
            </div>

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                border: "1px solid #f0f0f0",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              {duplicateData.duplicates.map((dup, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: "#fff7e6",
                    borderRadius: "4px",
                    border: "1px solid #ffd591",
                  }}
                >
                  <div style={{ fontWeight: "500", color: "#d46b08" }}>
                    重名人员: {dup.newPerson.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    新数据: 第{dup.newPerson.g_rank}代 | 现有数据: 第
                    {dup.existingPerson.g_rank}代
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
              💡 确认添加将保留重名数据，您可以稍后在表格中手动调整
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

export default CreatorPage;
