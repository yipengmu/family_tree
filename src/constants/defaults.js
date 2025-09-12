/**
 * 默认值常量配置
 */

// 默认头像图片URL
export const DEFAULT_AVATAR_URL = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

// 默认家谱数据字段
export const DEFAULT_FAMILY_MEMBER = {
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
  face_img: DEFAULT_AVATAR_URL,
  photos: '',
  household_info: '',
  spouse: '',
  home_page: '',
  dealth: null,
  formal_name: '',
  location: '',
  childrens: ''
};

// 默认列配置
export const DEFAULT_COLUMNS = [
  'id',
  'name',
  'g_rank',
  'rank_index',
  'g_father_id',
  'official_position',
  'summary',
  'adoption',
  'sex',
  'g_mother_id',
  'birth_date',
  'id_card',
  'face_img',
  'photos',
  'household_info',
  'spouse',
  'home_page',
  'dealth',
  'formal_name',
  'location',
  'childrens'
];

// 性别选项
export const GENDER_OPTIONS = [
  { value: 'MAN', label: '男' },
  { value: 'WOMAN', label: '女' }
];

// 收养状态选项
export const ADOPTION_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'adopted', label: '收养' },
  { value: 'foster', label: '寄养' }
];

// 生死状态选项
export const DEATH_STATUS_OPTIONS = [
  { value: null, label: '在世' },
  { value: 'death', label: '已故' }
];

// 测试数据模板
export const TEST_DATA_TEMPLATE = [
  {
    id: 'test_1',
    name: '',
    g_rank: 1,
    rank_index: 1,
    g_father_id: 0,
    official_position: '知县',
    summary: '知县，为官清廉，深受百姓爱戴。',
    adoption: 'none',
    sex: 'MAN',
    g_mother_id: null,
    birth_date: '1850-01-01',
    id_card: null,
    face_img: DEFAULT_AVATAR_URL,
    photos: null,
    household_info: null,
    spouse: '李氏',
    home_page: null,
    dealth: null,
    formal_name: '',
    location: '江苏苏州',
  }
];

// 文件上传配置
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  maxFiles: 10
};

// OCR配置
export const OCR_CONFIG = {
  timeout: 30000, // 30秒超时
  retryCount: 3,
  retryDelay: 1000 // 1秒重试延迟
};

// 应用配置
export const APP_CONFIG = {
  defaultTenantId: 'default',
  enableMultiTenant: true,
  debugMode: process.env.REACT_APP_DEBUG === 'true'
};
