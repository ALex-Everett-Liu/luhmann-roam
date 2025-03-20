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
      noTasksForDay: "No tasks for this day"
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
      markdown: "富文本",
      filter: "过滤",
      position: "位置",
      timestamp: "时间戳",
      
      // Modals
      close: "关闭",
      save: "保存",
      cancel: "取消",
      
      // Markdown modal
      editMarkdown: "编辑富文本内容",
      editMode: "编辑",
      previewMode: "预览",
      deleteMarkdown: "删除富文本",
      saveMarkdown: "保存",
      
      // Link modal
      manageLinks: "管理链接",
      outgoingLinks: "出站链接",
      incomingLinks: "入站链接",
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
      noTasksForDay: "这一天没有任务"
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
  }
  
  /**
   * Toggle the current language between English and Chinese
   */
  function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    localStorage.setItem('preferredLanguage', currentLanguage);
    
    // Update the UI with the new language
    updateUI();
    
    // Trigger a refresh of the outliner to update node content
    if (window.fetchNodes) {
      window.fetchNodes();
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