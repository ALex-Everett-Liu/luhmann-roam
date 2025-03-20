# Luhmann-Roam 知识管理系统

Luhmann-Roam 是一个受 Niklas Luhmann 的 Zettelkasten 方法启发的强大知识管理系统。它提供了一个具有双向链接功能的层次化大纲界面，允许用户以网络结构创建、组织和连接笔记。

## 功能特点

- **层次化大纲**：在树状结构中创建和组织笔记
- **双向链接**：通过带权重和描述的关系连接笔记
- **Markdown 支持**：使用 Markdown 格式为笔记添加丰富内容
- **多语言界面**：在英文和中文间切换
- **节点操作**：缩进、减少缩进、重新排序和重新定位节点
- **视觉反馈**：突出显示焦点和活动分支
- **搜索和过滤**：快速查找并聚焦特定内容
- **任务管理**：通过时间跟踪功能管理日常任务
- **时间戳跟踪**：查看节点的创建和修改时间
- **位置管理**：精确调整节点位置和层次结构

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
   git clone https://github.com/yourusername/luhmann-roam.git
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

### 任务管理
- 在侧边栏创建每日任务
- 跟踪任务所花费的时间
- 查看任务统计和完成率
- 在不同日期间导航

## 系统架构

### 后端
- 使用 Express 的 Node.js
- 用于数据存储的 SQLite 数据库
- 用于客户端-服务器通信的 RESTful API
- 基于文件的 Markdown 内容存储

### 前端
- 核心功能使用原生 JavaScript
- 采用专业管理器的模块化设计
- 使用自定义 CSS 的响应式 UI
- 没有外部 UI 框架或依赖项

## 开发

### 项目结构 