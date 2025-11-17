document.addEventListener("DOMContentLoaded", () => {
  // ================================================================
  // MOVE THIS TO THE TOP - Make addButtonToSidebar available globally early
  // ================================================================

  // Define this function at the top of the file, after other variable declarations
  function addButtonToSidebar(button) {
    const sidebarElement = document.querySelector(".sidebar");
    if (sidebarElement) {
      sidebarElement.appendChild(button);
    }
  }

  // Make it available globally immediately
  window.addButtonToSidebar = addButtonToSidebar;

  // ================================================================
  // ALL APPLICATION CODE AND FUNCTIONS SHOULD BE DEFINED INSIDE HERE
  // =

  // Basic Theme Management - Simple light/dark theme functionality
  function initializeBasicTheme() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem("basicTheme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
    }

    // Add theme toggle to UI if not already present
    if (!document.getElementById("theme-toggler")) {
      addBasicThemeToggle();
    }
  }

  function addBasicThemeToggle() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      const themeToggle = document.createElement("button");
      themeToggle.id = "basic-theme-toggler";
      themeToggle.className = "feature-toggle";
      themeToggle.textContent = document.body.classList.contains("dark-theme")
        ? "☀️ Light"
        : "🌙 Dark";
      themeToggle.title = "Toggle between light and dark themes";

      themeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-theme");
        localStorage.setItem("basicTheme", isDark ? "dark" : "light");
        themeToggle.textContent = isDark ? "☀️ Light" : "🌙 Dark";
      });

      // Insert before backup button if it exists
      const backupButton = document.getElementById("backup-database");
      if (backupButton) {
        sidebar.insertBefore(themeToggle, backupButton);
      } else {
        sidebar.appendChild(themeToggle);
      }
    }
  }

  const outlinerContainer = document.getElementById("outliner-container");
  const addRootNodeButton = document.getElementById("add-root-node");

  // Variables and state
  let nodes = [];
  let currentModalNodeId = null;
  let lastFocusedNodeId = null; // Add this variable to track the currently focused node
  let isInitialLoading = true; // Flag to indicate initial loading
  
  // Manual save mode: Track unsaved changes
  let unsavedChanges = new Map(); // nodeId -> {content, originalContent}
  
  // Get auto-save setting from localStorage (default: true for backward compatibility)
  function getAutoSaveEnabled() {
    const setting = localStorage.getItem("autoSaveEnabled");
    return setting !== "false"; // Default to true if not set
  }
  
  // Update auto-save setting (called when setting changes)
  function updateAutoSaveSetting(enabled) {
    localStorage.setItem("autoSaveEnabled", enabled ? "true" : "false");
    updateSaveButtonVisibility();
  }
  
  // Make updateAutoSaveSetting available globally for settings manager
  window.updateAutoSaveSetting = updateAutoSaveSetting;

  // Application functions
  // Language functionality removed - English only

  // Add this function to save the current focus as default
  function setDefaultFocusNode(nodeId) {
    localStorage.setItem(`main_default_focus_node`, nodeId);
    alert("This node is now set as the default focus on startup.");
  }

  // Fetch top-level nodes
  async function fetchNodes(forceFresh = false) {
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);

    try {
      // Get default focus node if initial loading
      const defaultFocusNodeId = localStorage.getItem(
        `main_default_focus_node`,
      );

      // If we have a default focus node and this is initial loading, only load that subtree
      if (isInitialLoading && defaultFocusNodeId && window.BreadcrumbManager) {
        console.log(
          `Loading with default focus on node: ${defaultFocusNodeId}`,
        );

        try {
          // Try to get the focused node and its children
          const focusNodeResponse = await fetch(
            `/api/nodes/${defaultFocusNodeId}?lang=en${forceFresh ? `&_=${Date.now()}` : ""}`,
          );

          // Check if node exists
          if (focusNodeResponse.status === 404) {
            console.log(
              `Default focus node ${defaultFocusNodeId} not found, loading all nodes instead`,
            );
            // Load all nodes instead
            const allNodesResponse = await fetch(
              `/api/nodes?lang=en${forceFresh ? `&_=${Date.now()}` : ""}`,
            );
            nodes = await allNodesResponse.json();
            await renderOutliner();
            isInitialLoading = false;
            return;
          }

          const focusNode = await focusNodeResponse.json();

          // Empty the nodes array and just add this node
          nodes = [focusNode];

          // Render the outliner with just this node
          await renderOutliner();

          // Focus on this node after rendering
          setTimeout(() => {
            window.BreadcrumbManager.focusOnNode(defaultFocusNodeId);
            isInitialLoading = false;
          }, 100);

          return;
        } catch (error) {
          console.error(
            "Error loading default focus node, falling back to all nodes:",
            error,
          );
          // Fall back to loading all nodes
        }
      }

      // Normal loading without focus
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : "";
      console.log(
        `Fetching nodes with lang=en${forceFresh ? " (forced fresh load)" : ""}`,
      );
      const response = await fetch(`/api/nodes?lang=en${cacheBuster}`);
      nodes = await response.json();
      await renderOutliner();

      // Set initial loading to false after first load
      isInitialLoading = false;

      // No filters to reapply - FilterManager removed

      // Restore scroll position
      setTimeout(() => {
        console.log(`Restoring scroll position to: ${scrollPosition}px`);
        window.scrollTo(0, scrollPosition);
      }, 10);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      // Optionally show user-friendly error message or fallback behavior
    }
  }

  // Fetch children for a node
  async function fetchChildren(nodeId, forceFresh = false) {
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : "";
      const response = await fetch(
        `/api/nodes/${nodeId}/children?lang=en${cacheBuster}`,
      );
      return await response.json();
    } catch (error) {
      console.error(`Error fetching children for node ${nodeId}:`, error);
      return [];
    }
  }

  // Render the outliner
  async function renderOutliner() {
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);

    outlinerContainer.innerHTML = "";

    for (const node of nodes) {
      const nodeElement = await createNodeElement(node);
      outlinerContainer.appendChild(nodeElement);
    }

    // Drag & Drop functionality removed - keyboard-focused operation only

    // Removed node size highlighting functionality for simplification

    // Try to restore scroll position
    setTimeout(() => {
      // First try to find and scroll to the last focused node
      if (lastFocusedNodeId) {
        const focusedElement = document.querySelector(
          `.node[data-id="${lastFocusedNodeId}"]`,
        );
        if (focusedElement) {
          console.log(`Scrolling to last focused node: ${lastFocusedNodeId}`);
          focusedElement.scrollIntoView({ behavior: "auto", block: "center" });

          // Add a brief highlight effect
          focusedElement.classList.add("highlight-focus");
          setTimeout(() => {
            focusedElement.classList.remove("highlight-focus");
          }, 1000);

          return;
        }
      }

      // Fall back to the saved scroll position if we can't find the focused node
      console.log(`Restoring scroll position to: ${scrollPosition}px`);
      window.scrollTo(0, scrollPosition);
    }, 10);
  }

  // Modify your createNodeElement function to show content
  async function createNodeElement(node) {
    const nodeDiv = document.createElement("div");
    nodeDiv.className = "node";
    nodeDiv.dataset.id = node.id;

    // Node content
    const nodeContent = document.createElement("div");
    nodeContent.className = "node-content";

    // Drag handle removed - keyboard-focused operation only

    // Collapse/expand button
    const children = await fetchChildren(node.id);
    if (children.length > 0) {
      const collapseIcon = document.createElement("span");
      collapseIcon.className = "collapse-icon";
      collapseIcon.innerHTML = node.is_expanded ? "▼" : "►";
      collapseIcon.addEventListener("click", () => toggleNode(node.id));
      nodeContent.appendChild(collapseIcon);
    } else {
      const bullet = document.createElement("span");
      bullet.className = "bullet";
      bullet.innerHTML = "•";
      nodeContent.appendChild(bullet);
    }

    // Node text (editable)
    const nodeText = document.createElement("div");
    nodeText.className = "node-text";
    nodeText.contentEditable = true;

    // English only - simplified
    const displayContent = node.content;

    // Make sure displayContent is never undefined or null for the editable field
    nodeText.textContent = displayContent || ""; // Use empty string if null/undefined

    // Styling for the editable field (already done in previous steps)
    nodeText.style.whiteSpace = "pre-wrap";
    nodeText.style.wordWrap = "break-word";
    nodeText.style.overflowWrap = "break-word";

    // ADD FOCUS TRACKING TO NODE TEXT
    nodeText.addEventListener("focus", function () {
      updateGlobalLastFocusedNodeId(node.id);
      console.log(`Node ${node.id} focused, updating lastFocusedNodeId`);
    });

    // ADD THE MISSING BLUR EVENT HANDLER HERE
    nodeText.addEventListener("blur", async function () {
      // Keep the lastFocusedNodeId even after blur so commands can still use it
      // Only clear it if we're focusing on a different node

      const currentContent = nodeText.innerText; // Use innerText to preserve line breaks
      const originalContent = node.content || "";

      console.log(`Blur event for node ${node.id}:`);
      console.log(`- Current content: "${currentContent}"`);
      console.log(`- Original content: "${originalContent}"`);

      // Convert line breaks to \n for storage
      const savedContent = currentContent.replace(/\n/g, "\\n");
      const normalizedOriginal = originalContent.replace(/\\n/g, "\n");

      console.log(`- Saved content (with \\n): "${savedContent}"`);
      console.log(`- Normalized original: "${normalizedOriginal}"`);

      if (currentContent !== normalizedOriginal) {
        const autoSaveEnabled = getAutoSaveEnabled();
        
        if (autoSaveEnabled) {
          // Auto-save mode: save immediately
          console.log(`Content changed for node ${node.id}, auto-saving...`);

          const success = await updateNodeContent(
            node.id,
            savedContent,
            undefined,
          );

          if (success) {
            console.log(`Successfully saved content for node ${node.id}`);
            // Update the local node data
            node.content = currentContent;
            // Remove from unsaved changes if it was there
            unsavedChanges.delete(node.id);
            nodeText.classList.remove("unsaved");
          } else {
            console.error(`Failed to save content for node ${node.id}`);
          }
        } else {
          // Manual save mode: track as unsaved
          console.log(`Content changed for node ${node.id}, tracking as unsaved`);
          unsavedChanges.set(node.id, {
            content: savedContent,
            originalContent: originalContent
          });
          // Add visual indicator
          nodeText.classList.add("unsaved");
          // Update save button
          updateSaveButtonText();
        }
      } else {
        console.log(`No content change detected for node ${node.id}`);
        // Remove from unsaved changes if content matches original
        if (unsavedChanges.has(node.id)) {
          unsavedChanges.delete(node.id);
          nodeText.classList.remove("unsaved");
          updateSaveButtonText();
        }
      }
    });

    // ADD KEYBOARD EVENT HANDLER FOR TAB/SHIFT+TAB AND ENTER
    nodeText.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault(); // Prevent default tab behavior

        if (e.shiftKey) {
          // Shift+Tab: Outdent node
          console.log(`Shift+Tab pressed on node ${node.id}, outdenting...`);
          outdentNode(node.id);
        } else {
          // Tab: Indent node
          console.log(`Tab pressed on node ${node.id}, indenting...`);
          indentNode(node.id);
        }
      } else if (e.key === "Enter") {
        if (e.shiftKey) {
          // Shift+Enter: Allow default behavior (add newline)
          console.log(
            `Shift+Enter pressed on node ${node.id}, adding newline...`,
          );
          // Don't prevent default - let the browser add a newline
          return;
        } else {
          // Enter: Add child node
          e.preventDefault(); // Prevent default enter behavior (which would add a line break)
          console.log(`Enter pressed on node ${node.id}, adding child...`);
          addChildNode(node.id);
        }
      }
    });

    nodeContent.appendChild(nodeText); // Add the editable text field

    // English only - no other language content

    // Node actions
    const nodeActions = document.createElement("div");
    nodeActions.className = "node-actions";

    // Position button
    const positionButton = document.createElement("button");
    positionButton.className = "position-button";
    positionButton.innerHTML = "#";
    positionButton.title = "Adjust position";
    positionButton.addEventListener("click", () =>
      PositionManager.openPositionAdjustModal(node.id),
    );
    nodeActions.appendChild(positionButton);

    // Link button removed - pure node operations sufficient

    // Move node button
    const moveNodeButton = document.createElement("button");
    moveNodeButton.className = "move-button";
    moveNodeButton.innerHTML = "📍";
    moveNodeButton.title = "Move node";
    moveNodeButton.addEventListener("click", () =>
      PositionManager.openMoveNodeModal(node.id),
    );
    nodeActions.appendChild(moveNodeButton);

    // Add sibling before button
    const addSiblingBeforeButton = document.createElement("button");
    addSiblingBeforeButton.className = "sibling-button";
    addSiblingBeforeButton.innerHTML = "↑+";
    addSiblingBeforeButton.title = "Add sibling before";
    addSiblingBeforeButton.addEventListener("click", () =>
      addSiblingNode(node.id, "before"),
    );
    nodeActions.appendChild(addSiblingBeforeButton);

    // Add sibling after button
    const addSiblingAfterButton = document.createElement("button");
    addSiblingAfterButton.className = "sibling-button";
    addSiblingAfterButton.innerHTML = "↓+";
    addSiblingAfterButton.title = "Add sibling after";
    addSiblingAfterButton.addEventListener("click", () =>
      addSiblingNode(node.id, "after"),
    );
    nodeActions.appendChild(addSiblingAfterButton);

    const addButton = document.createElement("button");
    addButton.innerHTML = "+";
    addButton.title = "Add child node";
    addButton.addEventListener("click", () => addChildNode(node.id));
    nodeActions.appendChild(addButton);

    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "×";
    deleteButton.title = "Delete node";
    deleteButton.addEventListener("click", () => deleteNode(node.id));
    nodeActions.appendChild(deleteButton);

    // Add bookmark button to node actions
    if (window.BookmarkManager) {
      BookmarkManager.addBookmarkButtonToNode(nodeActions, node.id);
    }

    // Focus button (replaces double-click functionality)
    const focusButton = document.createElement("button");
    focusButton.className = "focus-button";
    focusButton.innerHTML = "🎯";
    focusButton.title = "Focus on this node (Alt+F when hovering)";
    focusButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.BreadcrumbManager) {
        window.BreadcrumbManager.focusOnNode(node.id);
      }
    });
    nodeActions.appendChild(focusButton);

    // Default focus button
    const defaultFocusButton = document.createElement("button");
    defaultFocusButton.className = "default-focus-button";
    defaultFocusButton.innerHTML = "🔍";
    defaultFocusButton.title = "Set as default focus node on startup";
    defaultFocusButton.addEventListener("click", () =>
      setDefaultFocusNode(node.id),
    );
    nodeActions.appendChild(defaultFocusButton);

    // English only - no dual language functionality

    nodeContent.appendChild(nodeActions);
    nodeDiv.appendChild(nodeContent);

    // Children container
    if (children.length > 0 && node.is_expanded) {
      const childrenDiv = document.createElement("div");
      childrenDiv.className = "children";

      for (const child of children) {
        const childElement = await createNodeElement(child);
        childrenDiv.appendChild(childElement);
      }

      nodeDiv.appendChild(childrenDiv);
    }

    // After creating the node element and before returning it
    if (window.BreadcrumbManager) {
      BreadcrumbManager.addNodeFocusHandler(nodeDiv, node.id);
    }

    return nodeDiv;
  }

  // Add a root node
  async function addRootNode() {
    if (window.NodeOperationsManager) {
      // Just call the manager function and let it handle the refresh
      await NodeOperationsManager.addRootNode(nodes);
    } else {
      console.error("NodeOperationsManager not available");
    }
  }

  // Add a child node
  async function addChildNode(parentId) {
    try {
      // Store whether we're in focus mode before the operation
      const wasInFocusMode =
        window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
      const currentFocusedNodeId =
        wasInFocusMode && window.BreadcrumbManager
          ? window.BreadcrumbManager.getCurrentFocusedNodeId()
          : null;

      if (window.NodeOperationsManager) {
        // Just create the node without changing focus
        await NodeOperationsManager.addChildNode(parentId);

        // No focus restoration needed - we want to maintain the current focus state
        // REMOVED: code that was restoring focus to parentId
      } else {
        console.error("NodeOperationsManager not available");
      }
    } catch (error) {
      console.error("Error adding child node:", error);
    }
  }

  // Update node content
  async function updateNodeContent(nodeId, content) {
    try {
      console.log(`updateNodeContent called for ${nodeId} with:`, {
        content_param: content,
      });

      // English only - simple approach
      const updateData = {};

      if (content !== undefined) {
        updateData.content = content;
      }

      console.log(
        `Sending update request for node ${nodeId} with data:`,
        updateData,
      );

      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error saving node ${nodeId}:`, errorData);
        return false;
      }

      const updatedNodeFromServer = await response.json();
      console.log(`Successfully saved node ${nodeId}:`, updatedNodeFromServer);

      // Update the node in our local data structure (nodes array) to ensure consistency
      // The updatedNodeFromServer contains \\n, so we need to process it for local display cache
      const processedUpdateForLocalCache = {
        content: updatedNodeFromServer.content
          ? updatedNodeFromServer.content.replace(/\\n/g, "\n")
          : updatedNodeFromServer.content,
      };
      updateLocalNodeData(nodeId, processedUpdateForLocalCache);

      return true;
    } catch (error) {
      console.error(`Error updating node ${nodeId}:`, error);
      return false;
    }
  }

  // Helper function to update local node data after a successful save
  function updateLocalNodeData(nodeId, updateData) {
    // Update in the top-level nodes array if present
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        if (updateData.content !== undefined) {
          nodes[i].content = updateData.content;
        }
        console.log(`Updated local data for top-level node ${nodeId}`);
        return;
      }
    }

    // If not found at top level, it might be a child node
    // We'll handle this in a future update if needed
    console.log(
      `Node ${nodeId} not found in top-level nodes, may be a child node`,
    );
  }

  // Delete a node
  async function deleteNode(nodeId) {
    if (window.NodeOperationsManager) {
      return NodeOperationsManager.deleteNode(nodeId);
    } else {
      console.error("NodeOperationsManager not available");
      return false;
    }
  }

  // Toggle node expansion
  async function toggleNode(nodeId) {
    if (window.NodeExpansionManager) {
      // Remove preserveFocusState wrapper since we handle focus internally now
      return NodeExpansionManager.toggleNode(nodeId);
    } else {
      console.error("NodeExpansionManager not available");
      return false;
    }
  }

  // Indent a node (make it a child of the node above)
  async function indentNode(nodeId) {
    if (window.NodeOperationsManager) {
      // Remove preserveFocusState wrapper since we handle focus internally now
      return NodeOperationsManager.indentNode(nodeId);
    } else {
      console.error("NodeOperationsManager not available");
      return false;
    }
  }

  // Outdent a node (make it a sibling of its parent)
  async function outdentNode(nodeId) {
    if (window.NodeOperationsManager) {
      // Remove preserveFocusState wrapper since we handle focus internally now
      return NodeOperationsManager.outdentNode(nodeId);
    } else {
      console.error("NodeOperationsManager not available");
      return false;
    }
  }

  // Add a sibling node
  async function addSiblingNode(nodeId, position) {
    if (window.NodeOperationsManager) {
      // Instead of using preserveFocusState, just call the operation directly
      // to avoid any focus manipulation
      try {
        return await NodeOperationsManager.addSiblingNode(nodeId, position);
      } catch (error) {
        console.error(`Error adding sibling node to ${nodeId}:`, error);
        return false;
      }
    } else {
      console.error("NodeOperationsManager not available");
      return false;
    }
  }

  // ===================================================================
  // FEATURE: Move Node Modal
  // LOCATION: Inside DOMContentLoaded event listener
  // DEPENDENCIES: fetchNodes, debounce
  // ===================================================================
  // Create move node modal

  // ===================================================================
  // MANUAL SAVE MODE FUNCTIONS
  // ===================================================================
  
  // Update the Save Changes button text with unsaved count
  function updateSaveButtonText() {
    const saveButton = document.getElementById("save-changes");
    if (!saveButton) return;
    
    const unsavedCount = unsavedChanges.size;
    if (unsavedCount > 0) {
      saveButton.textContent = `Save Changes (${unsavedCount})`;
      saveButton.classList.add("has-unsaved");
    } else {
      saveButton.textContent = "Save Changes";
      saveButton.classList.remove("has-unsaved");
    }
  }
  
  // Update save button visibility based on auto-save setting
  function updateSaveButtonVisibility() {
    const saveButton = document.getElementById("save-changes");
    if (!saveButton) return;
    
    const autoSaveEnabled = getAutoSaveEnabled();
    if (autoSaveEnabled) {
      // Hide button in auto-save mode
      saveButton.style.display = "none";
    } else {
      // Show button in manual save mode
      saveButton.style.display = "block";
      updateSaveButtonText();
    }
  }
  
  // Save all pending changes
  async function saveAllChanges() {
    if (unsavedChanges.size === 0) {
      const saveButton = document.getElementById("save-changes");
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = "No changes to save";
        setTimeout(() => {
          saveButton.textContent = originalText;
        }, 1500);
      }
      return;
    }
    
    const saveButton = document.getElementById("save-changes");
    const originalText = saveButton ? saveButton.textContent : "Save Changes";
    
    if (saveButton) {
      saveButton.textContent = "Saving...";
      saveButton.disabled = true;
    }
    
    try {
      // Save all pending changes
      const promises = Array.from(unsavedChanges.entries()).map(
        async ([nodeId, {content}]) => {
          const success = await updateNodeContent(nodeId, content, undefined);
          if (success) {
            // Update local node data
            const nodeElement = document.querySelector(`.node[data-id="${nodeId}"] .node-text`);
            if (nodeElement) {
              const node = nodes.find(n => n.id === nodeId);
              if (node) {
                node.content = nodeElement.innerText;
              }
              nodeElement.classList.remove("unsaved");
            }
            return true;
          }
          return false;
        }
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      const failCount = results.length - successCount;
      
      // Clear successfully saved changes
      Array.from(unsavedChanges.entries()).forEach(([nodeId, _], index) => {
        if (results[index]) {
          unsavedChanges.delete(nodeId);
        }
      });
      
      // Update button text
      updateSaveButtonText();
      
      if (saveButton) {
        if (failCount > 0) {
          saveButton.textContent = `Saved ${successCount}, ${failCount} failed`;
        } else {
          saveButton.textContent = "Saved!";
        }
        
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.disabled = false;
          updateSaveButtonText();
        }, 2000);
      }
      
      console.log(`Saved ${successCount} of ${results.length} changes`);
    } catch (error) {
      console.error("Error saving changes:", error);
      if (saveButton) {
        saveButton.textContent = "Error!";
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.disabled = false;
        }, 2000);
      }
    }
  }
  
  // Make saveAllChanges available globally
  window.saveAllChanges = saveAllChanges;

  // Add this function to check container settings
  function checkContainerSettings() {
    const contentContainer = document.querySelector(".content");
    if (contentContainer) {
      const styles = window.getComputedStyle(contentContainer);
      console.log("Content container settings:");
      console.log(`- Height: ${styles.height}`);
      console.log(`- Max Height: ${styles.maxHeight}`);
      console.log(`- Overflow: ${styles.overflow}`);
      console.log(`- Overflow-Y: ${styles.overflowY}`);

      // If the container doesn't have proper overflow settings, fix them
      if (styles.overflowY !== "auto" && styles.overflowY !== "scroll") {
        console.log("Fixing container overflow settings");
        contentContainer.style.overflowY = "auto";
      }
    }
  }

  // Add this function to set up the resizable sidebar
  function setupResizableSidebar() {
    const appContainer = document.querySelector(".app-container"); // selecting the main application container; public/css/core/layout.css
    const sidebar = document.querySelector(".sidebar");
    const content = document.querySelector(".content");

    // Create the resize handle with a visible grip
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.innerHTML = '<div class="resize-grip"></div>'; // users can click and drag to resize the sidebar

    // Insert the handle into the DOM between sidebar and content area
    appContainer.insertBefore(resizeHandle, content);

    // Get the initial sidebar width from localStorage or use default
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      sidebar.style.width = savedWidth + "px";
      // Also update the handle position
      resizeHandle.style.left = `${parseInt(savedWidth)}px`;
    }

    // Variables for tracking resize state
    let isResizing = false;

    // Mouse down event on the resize handle
    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;

      // Add a class to the body during resize to prevent text selection
      document.body.classList.add("resizing");

      // Prevent text selection during resize
      e.preventDefault();
    });

    // Mouse move event for resizing
    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      // Calculate new width based on mouse position
      const newWidth = Math.max(
        200,
        Math.min(e.clientX, window.innerWidth * 0.8),
      );

      // Update sidebar width
      sidebar.style.width = `${newWidth}px`;

      // Update handle position
      resizeHandle.style.left = `${newWidth}px`;

      // Save the width to localStorage
      localStorage.setItem("sidebarWidth", newWidth);
    });

    // Mouse up event to stop resizing
    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove("resizing");
      }
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      // Make sure sidebar doesn't exceed max width when window is resized
      const currentWidth = parseInt(getComputedStyle(sidebar).width);
      const maxWidth = window.innerWidth * 0.8;

      if (currentWidth > maxWidth) {
        sidebar.style.width = maxWidth + "px";
        resizeHandle.style.left = `${maxWidth}px`;
        localStorage.setItem("sidebarWidth", maxWidth);
      }
    });
  }

  // Event listeners
  addRootNodeButton.addEventListener("click", addRootNode);
  // languageToggle no longer exists - I18n removed

  // Add event listener for save changes button
  const saveChangesButton = document.getElementById("save-changes");
  if (saveChangesButton) {
    saveChangesButton.addEventListener("click", saveAllChanges);
  }

  // Initial setup - no language toggle needed
  // Initialize save button visibility based on auto-save setting
  updateSaveButtonVisibility();

  // Call this function during initialization
  checkContainerSettings();

  // Set up resizable sidebar
  setupResizableSidebar();

  // Add clear default focus button (just once)
  const clearDefaultFocusButton = document.createElement("button");
  clearDefaultFocusButton.id = "clear-default-focus";
  clearDefaultFocusButton.className = "feature-toggle";
  clearDefaultFocusButton.textContent = "Clear Default Focus";
  clearDefaultFocusButton.title = "Clear the default focus node setting";
  clearDefaultFocusButton.addEventListener("click", () => {
    localStorage.removeItem(`main_default_focus_node`);
    alert("Default focus cleared. All nodes will load on next startup.");
  });

  // Add to sidebar using helper function
  addButtonToSidebar(clearDefaultFocusButton);

  // Initialize the BackupManager
  if (window.BackupManager) {
    console.log("Setting up BackupManager initialization from app.js");
    BackupManager.initialize();
  }

  // Initialize the BreadcrumbManager
  if (window.BreadcrumbManager) {
    BreadcrumbManager.initialize();
  }

  // Initialize the PositionManager
  if (window.PositionManager) {
    PositionManager.initialize();
  }

  // TimestampManager removed - will be redesigned later

  // Style Settings Manager removed - basic theme functionality only
  // Font settings are handled by BasicFontSettings in settings modal

  // Initialize basic theme functionality
  initializeBasicTheme();

  // Initialize the PersistentTooltipManager
  if (window.PersistentTooltipManager) {
    PersistentTooltipManager.initialize();
  }

  // Make fetchNodes available globally for the SearchManager
  window.fetchNodes = fetchNodes;
  /**
   * IMPORTANT INTEGRATION NOTES:
   *
   * 1. Module Availability:
   *    - We first check if window.CosmicNodeVisualizer2D exists
   *    - This depends on the module being assigned to the window object in its file
   *    - Without this window assignment, the module won't be available here
   *
   * 2. Event Flow:
   *    - Button click → Check module exists → Check visibility state → Show/hide
   *    - We carefully handle the case where the module doesn't exist
   *
   * 3. Node ID Fallback Logic:
   *    - Try lastFocusedNodeId first
   *    - Fall back to BreadcrumbManager if available
   *    - Use first available node as last resort
   */

  // Just call fetchNodes by itself
  fetchNodes();

  // ================================================================
  // END OF APPLICATION CODE - DO NOT ADD FUNCTIONS BELOW THIS LINE
  // ================================================================

  // Helper function to preserve focus state across operations
  async function preserveFocusState(operation, shouldRestoreFocus = true) {
    // Store whether we're in focus mode before the operation
    const wasInFocusMode =
      window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
    // Store the currently focused node ID if in focus mode
    const focusedNodeId =
      wasInFocusMode && window.BreadcrumbManager
        ? currentModalNodeId || lastFocusedNodeId
        : null;

    try {
      // Run the provided operation
      await operation();

      // Restore focus state if requested and we were in focus mode
      if (
        shouldRestoreFocus &&
        wasInFocusMode &&
        window.BreadcrumbManager &&
        focusedNodeId
      ) {
        window.BreadcrumbManager.focusOnNode(focusedNodeId);
      }
    } catch (error) {
      console.error("Operation failed:", error);
      throw error;
    }
  }

  // I18n removed - English only
  // No initialization needed

  // Initialize the NodeExpansionManager
  if (window.NodeExpansionManager) {
    NodeExpansionManager.initialize();
  }

  // Make createNodeElement available globally for direct DOM manipulation
  window.createNodeElement = createNodeElement;

  // Make toggleNode available globally for direct DOM manipulation
  window.toggleNode = toggleNode;

  // Make fetchChildren available globally for the NodeGridVisualizer
  window.fetchChildren = fetchChildren;

  // Initialize the Basic Font Settings
  if (window.BasicFontSettings) {
    BasicFontSettings.initialize();
  }

  // Global language functionality removed - English only

  // Content copying removed - English only
  window.copyContentBetweenLanguages = function () {
    return false;
  }; // Stub function for compatibility

  // Make lastFocusedNodeId available globally for command palette and other modules
  window.lastFocusedNodeId = lastFocusedNodeId;

  // Update the global reference whenever lastFocusedNodeId changes
  function updateGlobalLastFocusedNodeId(nodeId) {
    lastFocusedNodeId = nodeId;
    window.lastFocusedNodeId = nodeId;
  }

  // Initialize the SettingsManager (add this after other manager initializations)
  if (window.SettingsManager) {
    console.log("Setting up SettingsManager initialization from app.js");
    SettingsManager.initialize();
  }
});
