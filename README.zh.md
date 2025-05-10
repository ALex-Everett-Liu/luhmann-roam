# Luhmann-Roam 知识管理系统

[English](README.md) | [简体中文](README.zh.md)

Luhmann-Roam 是一个受 Roam Research 和 Niklas Luhmann 的 Zettelkasten 方法启发的知识管理系统。提供了一个具有双向链接功能的层次化大纲界面，允许用户以网络结构创建、组织和连接笔记。

## 功能特点

- **层次化大纲**：在树状结构中创建和组织笔记
- **双向链接**：通过带权重和描述的关系连接笔记
- **Markdown 支持**：使用 Markdown 格式为笔记添加丰富内容
- **多语言界面**：在英文和中文间切换
- **节点操作**：缩进、减少缩进、重新排序和重新定位节点
- **视觉反馈**：突出显示聚焦节点和活动分支
- **搜索和过滤**：快速查找并聚焦特定内容
- **任务管理**：通过时间跟踪功能管理日常任务
- **时间戳跟踪**：查看节点的创建和修改时间
- **位置管理**：精确调整节点位置和层次结构
- **节点属性**：为节点添加、编辑和查询自定义属性
- **面包屑导航**：通过面包屑路径导航节点层次结构
- **书签管理**：保存和组织重要节点以便快速访问
- **命令面板**：通过可搜索界面访问命令和功能
- **键盘快捷键**：全面的快捷键系统提升工作效率
- **2D 宇宙可视化**：在交互式宇宙视图中可视化节点关系
- **图像管理**：使用 DCIM 管理器组织和优化图像
- **博客发布**：将笔记转换并发布为博客文章
- **代码分析**：可视化和分析代码库结构
- **优化性能**：智能 DOM 更新提高响应速度

## 界面截图

### 主界面

![主界面](https://github.com/user-attachments/assets/b31e2dac-95e5-426d-a1f7-65b0611a373d)

*显示笔记层次结构的主大纲界面*

### Markdown 编辑

![Markdown 编辑器](https://github.com/user-attachments/assets/b584c459-d23d-44b5-9a41-b5f1ca045016)

*支持 Markdown 和图像处理的丰富内容编辑*

### 双向链接

![链接管理](https://github.com/user-attachments/assets/55a9a94a-ef47-460e-a6d7-65229c080285)

*创建和管理笔记之间的连接*

### 任务管理

![任务管理器](https://github.com/user-attachments/assets/2ca40ad4-2904-4dcd-bb47-708677a4c1cf)

*带有时间管理的日常任务跟踪*

### 节点操作

![节点操作](https://github.com/user-attachments/assets/f0fd4a70-ce3a-4dd6-b8c4-1d04caed159d)

*通过各种操作重新组织知识结构*

## 开始使用

### 前提条件

- Node.js (v14 或更高版本)
- npm 或 yarn

### 安装

1. 克隆仓库:
   ```bash
   git clone https://github.com/ALex-Everett-Liu/luhmann-roam.git
   cd luhmann-roam
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 初始化数据库:
   ```bash
   node init-db.js
   ```

4. 启动应用:
   ```bash
   npm start
   ```

5. 在浏览器中访问:
   ```
   http://localhost:3003
   ```

## 使用指南

### 创建节点
- 点击"添加根节点"创建顶级节点
- 使用节点上的"+"按钮添加子节点
- 使用"添加同级节点"按钮添加同一级别的节点

### 编辑节点
- 点击节点文本进行编辑
- 使用语言切换按钮切换语言
- 使用 Markdown 按钮添加丰富内容

### 组织节点
- 拖放节点以重新定位
- 使用缩进/减少缩进按钮更改层次结构
- 使用上移/下移按钮重新排序同级节点
- 点击位置按钮进行精确定位

### 创建链接
- 点击节点上的链接按钮
- 搜索目标节点
- 添加链接权重和描述
- 查看入站和出站链接

### 管理属性
- 点击节点上的属性按钮
- 添加、编辑或删除自定义属性
- 使用查询界面查找具有特定属性的节点
- 浏览最近查询或保存复杂查询以备将来使用

### 使用面包屑导航
- 双击节点聚焦于它及其子节点
- 使用面包屑路径导航到上级层次结构
- 点击主页图标返回完整视图
- 聚焦模式帮助集中注意力在特定分支

### 使用书签
- 按 Alt+B 为当前聚焦节点添加书签
- 点击侧边栏中的书签节点快速访问
- 书签显示使用统计，可按使用频率排序
- 单击即可删除书签

### 使用命令面板
- 按 Ctrl+P（或 Mac 上的 Cmd+P）打开命令面板
- 按名称、类别或关键词搜索命令
- 按回车键执行命令
- 查看常用命令的键盘快捷键

### 使用键盘快捷键
- 按 ? 查看所有可用快捷键
- 使用箭头键在节点间导航
- 在快捷键模式下按特定字母键触发操作
- 组合按键执行高级操作

### 使用宇宙可视化
- 点击 Alt+C 打开节点的 2D 宇宙可视化
- 在类似太阳系的视图中探索节点层次结构
- 通过可视化传送门导航链接节点
- 平移、缩放和交互式可视化

### 管理图像
- 访问 DCIM 管理器组织图像
- 上传、标记和分类图像
- 将图像转换为 WebP 格式以优化
- 创建自定义排名过滤器进行图像排序

### 发布博客文章
- 将节点转换为保留格式的博客文章
- 管理和组织已发布内容
- 发布前预览内容
- 通过专用路由访问博客文章

### 任务管理
- 在侧边栏创建每日任务
- 跟踪任务所花费的时间
- 查看任务统计和完成率
- 在不同日期间导航

## 系统架构

Luhmann-Roam 采用模块化架构，使用专门的管理器处理不同功能方面：

### 后端
- 使用 Express 的 Node.js
- 用于数据存储的 SQLite 数据库
- 用于客户端-服务器通信的 RESTful API
- 基于文件的 Markdown 内容存储

### 前端
- 采用模块化设计的原生 JavaScript
- 针对不同功能的专业管理器
- 优化的 DOM 操作提高性能
- 使用自定义 CSS 的响应式 UI

有关系统架构、组件和数据模型的详细说明，请参阅[项目结构文档](PROJECT_STRUCTURE.md)。

## 项目结构概览

```text
luhmann-roam/
├── database.js        # 数据库配置和初始化
├── server.js          # Express 服务器和 API 端点
├── markdown/          # Markdown 内容存储
├── public/            # 静态资源和客户端代码
│   ├── index.html     # 主 HTML 文件
│   ├── css/           # 样式表
│   ├── js/            # JavaScript 模块
│   │   ├── app.js                 # 主应用逻辑
│   │   ├── markdownManager.js     # Markdown 编辑功能
│   │   ├── linkManager.js         # 链接管理功能
│   │   ├── searchManager.js       # 搜索功能
│   │   ├── filterManager.js       # 过滤功能
│   │   ├── bookmarkManager.js     # 书签管理功能
│   │   ├── commandPaletteManager.js # 命令面板功能
│   │   ├── cosmicNodeVisualizer2D.js # 节点 2D 可视化
│   │   ├── dcimManager.js         # 数字内容图像管理
│   │   ├── blogManager.js         # 博客发布功能
│   │   ├── taskManager.js         # 任务管理功能
│   │   ├── timestampManager.js    # 时间戳显示功能
│   │   ├── positionManager.js     # 节点定位功能
│   │   ├── attributeManager.js    # 节点属性功能
│   │   ├── breadcrumbManager.js   # 节点导航功能
│   │   ├── codeAnalyzerManager.js # 代码结构分析
│   │   ├── hotkeyManager.js       # 键盘快捷键功能
│   │   ├── i18n.js                # 国际化支持
│   │   ├── nodeExpansionManager.js # 节点展开功能
│   │   ├── nodeOperationsManager.js # 核心节点操作
│   │   └── dragDropManager.js     # 拖放功能
│   └── attachment/    # 上传的图像和附件
├── routes/            # Express 路由处理程序
│   ├── nodeRoutes.js  # 节点相关的 API 端点
│   ├── linkRoutes.js  # 链接相关的 API 端点
│   ├── blogRoutes.js  # 博客发布端点
│   └── imageRoutes.js # 图像管理端点
└── README.md          # 本文件
```

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m '添加一些很棒的特性'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情见 LICENSE 文件。

## 致谢

- 受 Niklas Luhmann 的 Zettelkasten 方法和 Roam Research 启发
- 使用原生 JavaScript 构建以最小化依赖
- 为个人知识管理和组织而设计
