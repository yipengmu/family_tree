# 穆氏家谱 - 在线可视化系统 v0.1.0

一个基于 React Flow 构建的现代化家谱可视化系统，专为展示穆氏家族20代传承而设计。

> 🎉 **v0.1.0 稳定版本已发布！** 这是第一个生产就绪的版本，包含完整的前端功能。

## ✨ 特性

- 🌳 **高性能可视化**: 使用 React Flow 处理大型家谱数据（689个成员，20代深度）
- 🔍 **智能搜索**: 支持按姓名、职位、地点等多维度搜索
- 📊 **代数筛选**: 可按代数范围筛选显示内容
- 🎨 **交互式界面**: 支持缩放、平移、节点点击查看详情
- 📱 **响应式设计**: 适配桌面端和移动端
- ⚡ **性能优化**: 虚拟化渲染，避免传统树形组件的卡顿问题

## 🚀 技术栈

- **前端框架**: React 18
- **可视化引擎**: React Flow 11
- **UI组件库**: Ant Design 5
- **布局算法**: Dagre
- **部署平台**: Vercel

## 📦 安装与运行

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yipengmu/family_tree.git
cd family_tree

# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm start
```

访问 http://localhost:3000 查看应用。

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npx serve -s build
```

## 📁 项目结构

```
family_tree/
├── src/                    # 前端源代码
├── server/                 # 后端服务
├── public/                 # 静态资源
├── tests/                  # 测试文件
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── e2e/              # 端到端测试
│   ├── performance/       # 性能测试
│   └── debug/            # 调试脚本
├── docs/                   # 项目文档
├── scripts/                # 构建和工具脚本
└── README.md
```

## 🌐 在线访问

项目已部署到 Vercel，可直接访问：[穆氏家谱在线版](https://tatababa.top)

## 📊 数据结构

家谱数据采用扁平化JSON结构，包含以下字段：

- `id`: 唯一标识符
- `name`: 姓名
- `g_rank`: 代数（1-20）
- `rank_index`: 同代排行
- `g_father_id`: 父亲ID
- `official_position`: 职位
- `sex`: 性别
- `birth_date`: 生日
- `location`: 地点
- `summary`: 简介

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/yipengmu/family_tree?utm_source=oss&utm_medium=github&utm_campaign=yipengmu%2Ffamily_tree&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)