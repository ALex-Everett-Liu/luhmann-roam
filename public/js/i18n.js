/**
 * Internationalization Module
 * Handles translations and language switching across the application
 */
const I18n = (function() {
  // Default language
  let currentLanguage = 'en';
  
  // Translations dictionary
  const translations = {
    en: {
      // General UI
      appTitle: "Outliner",
      addRootNode: "Add Root Node",
      saveChanges: "Save Changes",
      switchToLanguage: "Switch to Chinese",
      
      // Node operations
      addChild: "Add Child",
      addSibling: "Add Sibling",
      delete: "Delete",
      indent: "Indent",
      outdent: "Outdent",
      moveUp: "Move Up",
      moveDown: "Move Down",
      link: "Link",
      markdown: "Markdown",
      filter: "Filter",
      position: "Position",
      timestamp: "Timestamp",
      
      // Modals
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      
      // Markdown modal
      editMarkdown: "Edit Markdown Content",
      editMode: "Edit",
      previewMode: "Preview",
      deleteMarkdown: "Delete Markdown",
      saveMarkdown: "Save",

      // Markdown search
      markdownSearch: "Markdown Search",
      markdownFiles: "Markdown Files",
      nodeContent: "Node Content",
      totalResults: "total results",
      markdownFile: "Markdown File",
      openMarkdown: "Open Markdown",
      
      // Link modal
      manageLinks: "Manage Links",
      outgoingLinks: "Outgoing Links",
      incomingLinks: "Incoming Links",
      addLink: "Add Link",
      searchTarget: "Search for target node...",
      weight: "Weight",
      description: "Description",
      
      // Task manager
      dailyTasks: "Daily Tasks",
      activeTask: "Active Task",
      noActiveTask: "No active task",
      newTask: "Enter new task...",
      add: "Add",
      today: "Today",
      byCreation: "By Creation",
      durationAsc: "↑ Duration",
      durationDesc: "↓ Duration",
      statistics: "Statistics",
      totalTasks: "Total Tasks",
      completed: "Completed",
      totalTime: "Total Time",
      
      // Timestamps
      nodeTimestamps: "Node Timestamps",
      created: "Created:",
      lastUpdated: "Last Updated:",
      
      // Position manager
      adjustPosition: "Adjust Node Position",
      moveNode: "Move Node",
      newPosition: "New Position (0-based index):",
      currentPosition: "Current position:",
      totalSiblings: "Total siblings:",
      validPositions: "Valid positions:",
      apply: "Apply",
      makeRootNode: "Make Root Node",
      searchNodes: "Search Nodes",
      searchPlaceholder: "Type to search for nodes...",
      noSearchResults: "No matching nodes found",
      searchError: "Error searching nodes",
      parent: "Parent",
      rootLevel: "Root level",
      searchShortcutHint: "Search for nodes (Ctrl+F)",
      loadingPositionInfo: "Loading position information...",
      enterNewPosition: "Enter new position",
      errorLoadingPositionInfo: "Error loading position information",
      errorAdjustingPosition: "Error adjusting node position",
      searchParentNodePlaceholder: "Type to search for a parent node...",
      noParentSelected: "No parent node selected (will become a root node)",
      noMatchingNodes: "No matching nodes found",
      errorSearchingNodes: "Error searching nodes",
      positionPlaceholder: "Position (0 = first child)",
      errorMovingNode: "Error moving node",
      searchForParentNode: "Search for a parent node:",
      selectedParent: "Selected parent:",
      underParent: "under parent node \"{parent}\"",
      atRootLevel: "at root level",
      currentPosition: "Current position: <strong>{position}</strong>",
      totalSiblings: "Total siblings: <strong>{count}</strong> (Valid positions: {validPositions})",
      noNodeSelected: "No node selected",
      searchForNode: "Search for a node:",
      selectedNode: "Selected node:",
      linkWeightPlaceholder: "Link weight (0.1-10)",
      linkDescriptionPlaceholder: "Link description (optional)",
      createLink: "Create Link",
      noOutgoingLinks: "No outgoing links",
      noIncomingLinks: "No incoming links",
      weightLabel: "Weight: {weight}",
      noDescription: "No description",
      edit: "Edit",
      selectTargetNode: "Please select a target node",
      errorCreatingLink: "Error creating link",
      editLink: "Edit Link",
      errorUpdatingLink: "Error updating link",
      confirmDeleteLink: "Are you sure you want to delete this link?",
      errorDeletingLink: "Error deleting link",
      enterMarkdownPlaceholder: "Enter markdown content...",
      openImagesNewTab: "Open images in new tab",
      selectedImgWidth: "Selected Image Width (px):",
      selectImgToResize: "Select an image to resize ({method} on image)",
      tip: "Tip:",
      resizeImgHelp: "{method} on any image to resize it.",
      confirmDeleteMarkdown: "Are you sure you want to delete this markdown content?",
      errorDeletingMarkdown: "Failed to delete markdown content",
      filters: "Filters",
      searchNodesForFilter: "Search for nodes to filter...",
      noActiveFilters: "No active filters",
      clearFilters: "Clear Filters",
      saveAsBookmark: "Save as Bookmark",
      bookmarks: "Bookmarks",
      noFiltersToBookmark: "No active filters to bookmark",
      saveFilterBookmark: "Save Filter Bookmark",
      enterBookmarkName: "Enter a name for this filter bookmark:",
      bookmarkNamePlaceholder: "Bookmark name",
      noSavedBookmarks: "No saved bookmarks",
      load: "Load",
      filterOnNode: "Filter on this node",
      returnToRoot: "Return to root level",
      newNode: "New node",
      confirmDeleteNode: "Are you sure you want to delete this node and all its children?",
      confirmDeleteTask: "Are you sure you want to delete this task?",
      previousDay: "Previous day",
      nextDay: "Next day",
      noTasksForDay: "No tasks for this day",

      // Local Graph Manager
      localGraphExplorer: "Local Graph Explorer",
      selectCenterNode: "Select Center Node",
      chooseCenterNodeDescription: "Choose a node from your Local Graph pool to explore its neighborhood:",
      quickAccess: "Quick Access",
      recentlyUsedCenterNodes: "Recently used center nodes",
      searchPoolNodes: "Search Pool Nodes",
      searchPoolNodesPlaceholder: "Search pool nodes...",
      startTypingToSearchPool: "Start typing to search pool nodes...",
      maxDistance: "Max Distance:",
      maxDepth: "Max Depth:",
      maxTotalLinkWeightDistance: "Maximum total link weight distance",
      maxNumberOfHops: "Maximum number of hops from center",
      exploreGraph: "Explore Graph",
      changeCenter: "Change Center",
      saveToQuickAccess: "Save to Quick Access",
      adjust: "Adjust",
      layout: "Layout:",
      addNode: "Add Node",
      refresh: "Refresh",
      searchInGraph: "Search in Graph",
      searchNodesInCurrentGraph: "Search nodes in current graph...",
      graphStatistics: "Graph Statistics",
      nodes: "Nodes:",
      links: "Links:",
      distanceLevels: "Distance Levels",
      selectedNode: "Selected Node",
      localGraphMetrics: "LOCAL GRAPH METRICS",
      globalGraphMetrics: "GLOBAL GRAPH METRICS",
      
      // Empty state
      noNodesFound: "No Nodes Found",
      knowledgeGraphEmpty: "Your knowledge graph is empty. To use the Local Graph Explorer, you need to create some nodes first.",
      createYourFirstNode: "Create Your First Node",
      goToMainOutliner: "Go to Main Outliner",
      checkAgain: "Check Again",
      gettingStarted: "Getting Started:",
      
      // Distance adjustment modal
      adjustDistanceParameters: "Adjust Distance Parameters",
      maximumDistance: "Maximum Distance:",
      maximumDepth: "Maximum Depth:",
      maxHopsFromCenter: "Maximum number of hops (links) from center node",
      
      // Add node modal
      addNewNode: "Add New Node",
      contentEnglish: "Content (English)*:",
      enterNodeContent: "Enter node content...",
      contentChinese: "Content (Chinese):",
      enterChineseContent: "输入中文内容...",
      placeInOutliner: "Place in Outliner (from pool):",
      searchPoolNodesOrEmpty: "Search pool nodes or leave empty for root...",
      searchPoolNodesOrEmptyHelp: "Start typing to search pool nodes or leave empty to create as root node...",
      addToLocalGraphPool: "Add to Local Graph Pool",
      
      // Manual placement
      manualNodePlacement: "Manual Node Placement",
      proceedToManualPlacement: "Proceed to Manual Placement",
      resetToAutoPositions: "Reset to Auto Positions",
      skipThisNode: "Skip This Node",
      autoPlaceRemaining: "Auto-place Remaining",
      cancelManualMode: "Cancel Manual Mode",
      finish: "Finish",
      
      // Notifications and messages
      pleaseSelectCenterNode: "Please select a center node first",
      errorLoadingGraphData: "Error loading graph data",
      pleaseEnterNodeContent: "Please enter content for the node",
      nodeCreatedWithLinks: "Node created successfully with {count} link(s)!",
      errorCreatingNode: "Error creating node",
      pathToNode: "Path to node: {path}",
      errorFocusingNode: "Error focusing node in outliner",
      firstNodeCreated: "First node created! You can now create more nodes and links.",
      errorCreatingFirstNode: "Error creating first node",
      pleaseUseMainOutliner: "Please use the main outliner to create nodes",
      foundNodes: "Great! Found {count} nodes. You can now select a center node.",
      stillNoNodesFound: "Still no nodes found. Please create some nodes first.",
      errorCheckingNodes: "Error checking for nodes",
      nodeCreatedAndAddedToPool: "Node created and added to pool!",
      nodeCreatedButFailedToAddToPool: "Node created but failed to add to pool",
      nodeAddedToPool: "Node added to Local Graph Pool!",
      errorAddingNodeToPool: "Error adding node to pool",
      nodeRemovedFromPool: "Node removed from Local Graph Pool!",
      errorRemovingNodeFromPool: "Error removing node from pool",
      
      // Quick access
      noQuickAccessNodes: "No quick access nodes yet. Explore a graph and save it using the ⭐ button.",
      errorLoadingQuickAccess: "Error loading quick access nodes",
      noCenterNodeSelected: "No center node selected",
      savedToQuickAccess: "Saved to quick access!",
      errorSavingToQuickAccess: "Error saving to quick access",
      quickAccessCenterLoaded: "Quick access center loaded!",
      errorLoadingQuickAccessCenter: "Error loading quick access center",
      removeFromQuickAccess: "Remove this node from quick access?",
      removedFromQuickAccess: "Removed from quick access",
      errorRemovingFromQuickAccess: "Error removing from quick access",
      
      // Search
      startTypingToSearch: "Start typing to search nodes...",
      noNodesFoundInPool: "No nodes found in pool matching \"{query}\"",
      errorSearchingPoolNodes: "Error searching pool nodes",
      noNodesInPoolYet: "No nodes in pool yet. Add some nodes to the pool first.",
      errorLoadingSuggestions: "Error loading suggestions",
      
      // SVG and diagrams
      errorOpeningSVGEditor: "Error opening SVG editor",
      confirmDeleteDiagram: "Are you sure you want to delete this diagram?",
      diagramDeletedSuccessfully: "Diagram deleted successfully",
      errorDeletingDiagram: "Error deleting diagram",
      noActiveTabFound: "No active tab found",
      pleaseCreateDiagramFirst: "Please create a diagram first",
      diagramSavedSuccessfully: "Diagram saved successfully",
      errorSavingDiagram: "Error saving diagram",
      svgPreviewPlaceholder: "SVG preview will appear here",
      previewPlaceholder: "SVG preview will appear here",
      previewError: "Invalid SVG code",
      
      // Centrality
      centralityCalculatedSuccessfully: "Centrality calculated successfully!",
      errorCalculatingCentrality: "Error calculating centrality: {error}",
      
      // Layout and zoom
      showLess: "Show Less",
      showMore: "Show {count} More",
      zoomIn: "+",
      zoomOut: "−",
      resetZoom: "⌂",
      
      // Context menu and actions
      focusInOutliner: "Focus in Outliner",
      addToPool: "Add to Pool",
      removeFromPool: "Remove from Pool",
      editNode: "Edit Node",
      viewDiagram: "View Diagram",
      
      // Link management
      searchForNodeToLinkTo: "Search for node to link to...",
      optionalDescription: "Optional description...",
      
      // Distance and depth
      distance: "Distance",
      depth: "Depth",
      untitled: "Untitled",

      // Additional keys for Local Graph Manager
      center: "Center",
      none: "None",
      circular: "Circular",
      distanceBased: "Distance-Based",
      hybridConcentric: "Hybrid Concentric",
      manualPlacement: "Manual Placement",
      clickNodeToSelect: "Click a node to see details",
      step: "Step",
      of: "of",
      initialNodesPlaced: "Initial nodes (depth 1-2) have been placed automatically using distance-based layout.",
      canDragToAdjust: "You can drag them to adjust their positions, or proceed to place the remaining nodes.",
      clickToPlace: "Click anywhere on the canvas to place",
      nodeName: "Node Name",
      remaining: "Remaining",
      manualPlacementComplete: "Manual placement complete! All nodes have been positioned.",
      totalLinkWeightDistance: "Total link weight distance from center node",
      createLinksToNodes: "Create links to nodes in current graph",
      createNode: "Create Node",
      createAtLeastNodes: "Create at least 2-3 nodes in your outliner",
      addLinksBetweenNodes: "Add some links between nodes using the Graph Management tool",
      returnToExplore: "Return here to explore local neighborhoods around any node"
    },
    zh: {
      // General UI
      appTitle: "大纲工具",
      addRootNode: "添加根节点",
      saveChanges: "保存更改",
      switchToLanguage: "切换到英文",
      
      // Node operations
      addChild: "添加子节点",
      addSibling: "添加同级节点",
      delete: "删除",
      indent: "缩进",
      outdent: "减少缩进",
      moveUp: "上移",
      moveDown: "下移",
      link: "链接",
      markdown: "MD",
      filter: "过滤",
      position: "位置",
      timestamp: "时间戳",
      
      // Modals
      close: "关闭",
      save: "保存",
      cancel: "取消",
      
      // Markdown modal
      editMarkdown: "编辑Markdown内容",
      editMode: "编辑",
      previewMode: "预览",
      deleteMarkdown: "删除Markdown",
      saveMarkdown: "保存",

      // Markdown search
      markdownSearch: "Markdown 搜索",
      markdownFiles: "Markdown 文件",
      nodeContent: "节点内容", 
      totalResults: "总结果",
      markdownFile: "Markdown 文件",
      openMarkdown: "打开 Markdown",
      
      // Link modal
      manageLinks: "管理链接",
      outgoingLinks: "出链",
      incomingLinks: "入链",
      addLink: "添加链接",
      searchTarget: "搜索目标节点...",
      weight: "权重",
      description: "描述",
      
      // Task manager
      dailyTasks: "每日任务",
      activeTask: "当前任务",
      noActiveTask: "无活动任务",
      newTask: "输入新任务...",
      add: "添加",
      today: "今天",
      byCreation: "按创建时间",
      durationAsc: "↑ 按时长",
      durationDesc: "↓ 按时长",
      statistics: "统计",
      totalTasks: "总任务数",
      completed: "已完成",
      totalTime: "总时间",
      
      // Timestamps
      nodeTimestamps: "节点时间戳",
      created: "创建时间:",
      lastUpdated: "最后更新:",
      
      // Position manager
      adjustPosition: "调整节点位置",
      moveNode: "移动节点",
      newPosition: "新位置 (从0开始):",
      currentPosition: "当前位置:",
      totalSiblings: "同级节点总数:",
      validPositions: "有效位置范围:",
      apply: "应用",
      makeRootNode: "设为根节点",
      searchNodes: "搜索节点",
      searchPlaceholder: "输入搜索节点...",
      noSearchResults: "未找到匹配节点",
      searchError: "搜索节点时出错",
      parent: "父节点",
      rootLevel: "根级别",
      searchShortcutHint: "搜索节点 (Ctrl+F)",
      loadingPositionInfo: "正在加载位置信息...",
      enterNewPosition: "输入新位置",
      errorLoadingPositionInfo: "加载位置信息出错",
      errorAdjustingPosition: "调整节点位置出错",
      searchParentNodePlaceholder: "输入以搜索父节点...",
      noParentSelected: "未选择父节点（将变为根节点）",
      noMatchingNodes: "未找到匹配节点",
      errorSearchingNodes: "搜索节点时出错",
      positionPlaceholder: "位置 (0 = 第一个子节点)",
      errorMovingNode: "移动节点时出错",
      searchForParentNode: "搜索父节点：",
      selectedParent: "已选父节点：",
      underParent: "在父节点 \"{parent}\" 下",
      atRootLevel: "在根级别",
      currentPosition: "当前位置：<strong>{position}</strong>",
      totalSiblings: "同级节点总数：<strong>{count}</strong>（有效位置：{validPositions}）",
      noNodeSelected: "无节点选择",
      searchForNode: "搜索节点：",
      selectedNode: "已选节点：",
      linkWeightPlaceholder: "链接权重 (0.1-10)",
      linkDescriptionPlaceholder: "链接描述 (可选)",
      createLink: "创建链接",
      noOutgoingLinks: "无出站链接",
      noIncomingLinks: "无入站链接",
      weightLabel: "权重：{weight}",
      noDescription: "无描述",
      edit: "编辑",
      selectTargetNode: "请选择目标节点",
      errorCreatingLink: "创建链接时出错",
      editLink: "编辑链接",
      errorUpdatingLink: "更新链接时出错",
      confirmDeleteLink: "确定要删除此链接吗？",
      errorDeletingLink: "删除链接时出错",
      enterMarkdownPlaceholder: "输入markdown内容...",
      openImagesNewTab: "在新标签页中打开图片",
      selectedImgWidth: "已选图片宽度 (px):",
      selectImgToResize: "选择要调整大小的图片 ({method} 点击图片)",
      tip: "提示：",
      resizeImgHelp: "{method} 点击图片以调整大小",
      confirmDeleteMarkdown: "确定要删除此markdown内容吗？",
      errorDeletingMarkdown: "删除markdown内容失败",
      filters: "过滤器",
      searchNodesForFilter: "搜索要过滤的节点...",
      noActiveFilters: "没有活动过滤器",
      clearFilters: "清除过滤器",
      saveAsBookmark: "保存为书签",
      bookmarks: "书签",
      noFiltersToBookmark: "没有可以添加书签的活动过滤器",
      saveFilterBookmark: "保存过滤器书签",
      enterBookmarkName: "为此过滤器书签输入名称：",
      bookmarkNamePlaceholder: "书签名称",
      noSavedBookmarks: "没有保存的书签",
      load: "加载",
      filterOnNode: "基于此节点过滤",
      returnToRoot: "返回根级别",
      newNode: "新节点",
      confirmDeleteNode: "您确定要删除此节点及其所有子节点吗？",
      confirmDeleteTask: "您确定要删除此任务吗？",
      previousDay: "前一天",
      nextDay: "后一天",
      noTasksForDay: "这一天没有任务",

      // Local Graph Manager
      localGraphExplorer: "局部图谱浏览器",
      selectCenterNode: "选择中心节点",
      chooseCenterNodeDescription: "从您的局部图谱池中选择一个节点来探索其邻域：",
      quickAccess: "快速访问",
      recentlyUsedCenterNodes: "最近使用的中心节点",
      searchPoolNodes: "搜索池节点",
      searchPoolNodesPlaceholder: "搜索池节点...",
      startTypingToSearchPool: "开始输入以搜索池节点...",
      maxDistance: "最大距离：",
      maxDepth: "最大深度：",
      maxTotalLinkWeightDistance: "最大总链接权重距离",
      maxNumberOfHops: "从中心节点的最大跳数",
      exploreGraph: "探索图谱",
      changeCenter: "更改中心",
      saveToQuickAccess: "保存到快速访问",
      adjust: "调整",
      layout: "布局：",
      addNode: "添加节点",
      refresh: "刷新",
      searchInGraph: "在图谱中搜索",
      searchNodesInCurrentGraph: "在当前图谱中搜索节点...",
      graphStatistics: "图谱统计",
      nodes: "节点：",
      links: "链接：",
      distanceLevels: "距离层级",
      selectedNode: "已选节点",
      localGraphMetrics: "局部图谱指标",
      globalGraphMetrics: "全局图谱指标",
      
      // Empty state
      noNodesFound: "未找到节点",
      knowledgeGraphEmpty: "您的知识图谱为空。要使用局部图谱浏览器，您需要先创建一些节点。",
      createYourFirstNode: "创建您的第一个节点",
      goToMainOutliner: "前往主大纲",
      checkAgain: "重新检查",
      gettingStarted: "入门指南：",
      
      // Distance adjustment modal
      adjustDistanceParameters: "调整距离参数",
      maximumDistance: "最大距离：",
      maximumDepth: "最大深度：",
      maxHopsFromCenter: "从中心节点的最大跳数（链接）",
      
      // Add node modal
      addNewNode: "添加新节点",
      contentEnglish: "内容（英文）*：",
      enterNodeContent: "输入节点内容...",
      contentChinese: "内容（中文）：",
      enterChineseContent: "输入中文内容...",
      placeInOutliner: "在大纲中放置（从池中）：",
      searchPoolNodesOrEmpty: "搜索池节点或留空作为根节点...",
      searchPoolNodesOrEmptyHelp: "开始输入以搜索池节点或留空以创建为根节点...",
      addToLocalGraphPool: "添加到局部图谱池",
      
      // Manual placement
      manualNodePlacement: "手动节点放置",
      proceedToManualPlacement: "进行手动放置",
      resetToAutoPositions: "重置为自动位置",
      skipThisNode: "跳过此节点",
      autoPlaceRemaining: "自动放置剩余",
      cancelManualMode: "取消手动模式",
      finish: "完成",
      
      // Notifications and messages
      pleaseSelectCenterNode: "请先选择一个中心节点",
      errorLoadingGraphData: "加载图谱数据时出错",
      pleaseEnterNodeContent: "请输入节点内容",
      nodeCreatedWithLinks: "节点创建成功，包含 {count} 个链接！",
      errorCreatingNode: "创建节点时出错",
      pathToNode: "节点路径：{path}",
      errorFocusingNode: "在大纲中聚焦节点时出错",
      firstNodeCreated: "第一个节点已创建！现在您可以创建更多节点和链接。",
      errorCreatingFirstNode: "创建第一个节点时出错",
      pleaseUseMainOutliner: "请使用主大纲创建节点",
      foundNodes: "太好了！找到 {count} 个节点。现在您可以选择一个中心节点。",
      stillNoNodesFound: "仍未找到节点。请先创建一些节点。",
      errorCheckingNodes: "检查节点时出错",
      nodeCreatedAndAddedToPool: "节点已创建并添加到池中！",
      nodeCreatedButFailedToAddToPool: "节点已创建但未能添加到池中",
      nodeAddedToPool: "节点已添加到局部图谱池！",
      errorAddingNodeToPool: "添加节点到池时出错",
      nodeRemovedFromPool: "节点已从局部图谱池中移除！",
      errorRemovingNodeFromPool: "从池中移除节点时出错",
      
      // Quick access
      noQuickAccessNodes: "尚无快速访问节点。探索图谱并使用 ⭐ 按钮保存。",
      errorLoadingQuickAccess: "加载快速访问节点时出错",
      noCenterNodeSelected: "未选择中心节点",
      savedToQuickAccess: "已保存到快速访问！",
      errorSavingToQuickAccess: "保存到快速访问时出错",
      quickAccessCenterLoaded: "快速访问中心已加载！",
      errorLoadingQuickAccessCenter: "加载快速访问中心时出错",
      removeFromQuickAccess: "从快速访问中移除此节点？",
      removedFromQuickAccess: "已从快速访问中移除",
      errorRemovingFromQuickAccess: "从快速访问中移除时出错",
      
      // Search
      startTypingToSearch: "开始输入以搜索节点...",
      noNodesFoundInPool: "在池中未找到匹配 \"{query}\" 的节点",
      errorSearchingPoolNodes: "搜索池节点时出错",
      noNodesInPoolYet: "池中尚无节点。请先添加一些节点到池中。",
      errorLoadingSuggestions: "加载建议时出错",
      
      // SVG and diagrams
      errorOpeningSVGEditor: "打开SVG编辑器时出错",
      confirmDeleteDiagram: "确定要删除此图表吗？",
      diagramDeletedSuccessfully: "图表删除成功",
      errorDeletingDiagram: "删除图表时出错",
      noActiveTabFound: "未找到活动标签页",
      pleaseCreateDiagramFirst: "请先创建图表",
      diagramSavedSuccessfully: "图表保存成功",
      errorSavingDiagram: "保存图表时出错",
      svgPreviewPlaceholder: "SVG预览将在这里显示",
      previewPlaceholder: "SVG预览将在这里显示",
      previewError: "无效的SVG代码",
      
      // Centrality
      centralityCalculatedSuccessfully: "中心性计算成功！",
      errorCalculatingCentrality: "计算中心性时出错：{error}",
      
      // Layout and zoom
      showLess: "显示更少",
      showMore: "显示更多 {count} 个",
      zoomIn: "+",
      zoomOut: "−",
      resetZoom: "⌂",
      
      // Context menu and actions
      focusInOutliner: "在大纲中聚焦",
      addToPool: "添加到池",
      removeFromPool: "从池中移除",
      editNode: "编辑节点",
      viewDiagram: "查看图表",
      
      // Link management
      searchForNodeToLinkTo: "搜索要链接的节点...",
      optionalDescription: "可选描述...",
      
      // Distance and depth
      distance: "距离",
      depth: "深度",
      untitled: "无标题",

      // Additional keys for Local Graph Manager
      center: "中心",
      none: "无",
      circular: "圆形",
      distanceBased: "基于距离",
      hybridConcentric: "混合同心圆",
      manualPlacement: "手动放置",
      clickNodeToSelect: "点击节点查看详情",
      step: "步骤",
      of: "共",
      initialNodesPlaced: "初始节点（深度1-2）已使用基于距离的布局自动放置。",
      canDragToAdjust: "您可以拖动它们来调整位置，或继续放置剩余节点。",
      clickToPlace: "点击画布上的任意位置来放置",
      nodeName: "节点名称",
      remaining: "剩余",
      manualPlacementComplete: "手动放置完成！所有节点都已定位。",
      totalLinkWeightDistance: "从中心节点的总链接权重距离",
      createLinksToNodes: "创建到当前图谱中节点的链接",
      createNode: "创建节点",
      createAtLeastNodes: "在您的大纲中创建至少2-3个节点",
      addLinksBetweenNodes: "使用图谱管理工具在节点之间添加一些链接",
      returnToExplore: "返回这里探索任何节点周围的局部邻域"
    }
  };

  /**
   * Initialize the i18n module
   */
  function initialize() {
    // Get the stored language preference or default to English
    currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    
    // Update the UI with the current language
    updateUI();
    
    console.log(`I18n initialized with language: ${currentLanguage}`);
  }
  
  /**
   * Update the application UI based on the current language
   */
  function updateUI() {
    // Update static UI elements
    document.querySelector('.sidebar h1').textContent = t('appTitle');
    document.getElementById('add-root-node').textContent = t('addRootNode');
    document.getElementById('save-changes').textContent = t('saveChanges');
    
    const langToggle = document.getElementById('language-toggle');
    langToggle.textContent = t('switchToLanguage');
    
    // Notify other modules of the language change
    notifyLanguageChange();
  }
  
  /**
   * Notify all manager modules about the language change
   */
  function notifyLanguageChange() {
    // Notify other modules if they have updateLanguage method
    if (window.MarkdownManager && MarkdownManager.updateLanguage) {
      MarkdownManager.updateLanguage(currentLanguage);
    }
    
    if (window.LinkManager && LinkManager.updateLanguage) {
      LinkManager.updateLanguage(currentLanguage);
    }
    
    if (window.SearchManager && SearchManager.updateLanguage) {
      SearchManager.updateLanguage(currentLanguage);
    }
    
    if (window.FilterManager && FilterManager.updateLanguage) {
      FilterManager.updateLanguage(currentLanguage);
    }
    
    if (window.PositionManager && PositionManager.updateLanguage) {
      PositionManager.updateLanguage(currentLanguage);
    }
    
    if (window.TimestampManager && TimestampManager.updateLanguage) {
      TimestampManager.updateLanguage(currentLanguage);
    }
    
    if (window.TaskManager && TaskManager.updateLanguage) {
      TaskManager.updateLanguage(currentLanguage);
    }
    
    // Add this line to notify BreadcrumbManager about language changes
    if (window.BreadcrumbManager && BreadcrumbManager.updateLanguage) {
      BreadcrumbManager.updateLanguage(currentLanguage);
    }
    
    // Add this line to notify BookmarkManager about language changes
    if (window.BookmarkManager && BookmarkManager.updateLanguage) {
      BookmarkManager.updateLanguage(currentLanguage);
    }
    
    // Add this line to notify LocalGraphManager about language changes
    if (window.LocalGraphManager && LocalGraphManager.updateLanguage) {
      LocalGraphManager.updateLanguage(currentLanguage);
    }
  }
  
  /**
   * Toggle the current language between English and Chinese
   */
  function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    localStorage.setItem('preferredLanguage', currentLanguage);
    
    // Update the UI with the new language
    updateUI();
    
    // Check if we can use optimized refresh methods
    if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
      console.log('Using optimized partial DOM updates for language change');
      
      // Save current scroll position
      const scrollPosition = window.scrollY;
      
      // Get all root nodes (top-level nodes)
      const outlinerContainer = document.getElementById('outliner-container');
      if (outlinerContainer) {
        const rootNodes = outlinerContainer.querySelectorAll(':scope > .node');
        
        // Create a promise for each root node refresh
        const refreshPromises = Array.from(rootNodes).map(node => {
          const nodeId = node.dataset.id;
          if (nodeId) {
            return window.NodeOperationsManager.refreshSubtree(nodeId);
          }
          return Promise.resolve();
        });
        
        // Execute all refreshes and restore scroll position when done
        Promise.all(refreshPromises).then(() => {
          // Apply filters if they exist
          if (window.FilterManager) {
            window.FilterManager.applyFilters();
          }
          
          // Restore scroll position
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 10);
        });
      } else {
        // Fallback to full refresh if outliner container not found
        console.log('Using full DOM refresh for language change');
        if (window.fetchNodes) {
          window.fetchNodes();
        }
      }
    } else {
      // Fallback to old method if optimized approach not available
      console.log('Using full DOM refresh for language change');
      if (window.fetchNodes) {
        window.fetchNodes();
      }
    }
  }
  
  /**
   * Get translation for a key in the current language
   * @param {string} key - The translation key to look up
   * @param {object} params - Optional parameters for string interpolation
   * @returns {string} The translated string
   */
  function t(key, params = {}) {
    const lang = translations[currentLanguage] || translations.en;
    let text = lang[key] || translations.en[key] || key;
    
    // Handle parameter substitution if needed
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return text;
  }
  
  /**
   * Get the current language code
   * @returns {string} The current language code ('en' or 'zh')
   */
  function getCurrentLanguage() {
    return currentLanguage;
  }
  
  // Public API
  return {
    initialize,
    toggleLanguage,
    t,
    getCurrentLanguage
  };
})();

// Make it available globally
window.I18n = I18n; 