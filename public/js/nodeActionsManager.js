// NodeActionsManager - Handles creation and management of node action buttons
const NodeActionsManager = (function () {
  // Private variables
  let isInitialized = false;

  // Initialize the manager
  function initialize() {
    if (isInitialized) {
      console.log("NodeActionsManager already initialized, skipping");
      return;
    }

    isInitialized = true;
    console.log("NodeActionsManager initialized");
  }

  // Create node actions container with all action buttons
  function createNodeActions(nodeId) {
    // Create the node actions container
    const nodeActions = document.createElement("div");
    nodeActions.className = "node-actions";

    // Position button
    const positionButton = document.createElement("button");
    positionButton.className = "position-button";
    positionButton.innerHTML = "#";
    positionButton.title = "Adjust position";
    positionButton.addEventListener("click", () =>
      PositionManager.openPositionAdjustModal(nodeId),
    );
    nodeActions.appendChild(positionButton);

    // Move node button
    const moveNodeButton = document.createElement("button");
    moveNodeButton.className = "move-button";
    moveNodeButton.innerHTML = "📍";
    moveNodeButton.title = "Move node";
    moveNodeButton.addEventListener("click", () =>
      PositionManager.openMoveNodeModal(nodeId),
    );
    nodeActions.appendChild(moveNodeButton);

    // Add sibling before button
    const addSiblingBeforeButton = document.createElement("button");
    addSiblingBeforeButton.className = "sibling-button";
    addSiblingBeforeButton.innerHTML = "↑+";
    addSiblingBeforeButton.title = "Add sibling before";
    addSiblingBeforeButton.addEventListener("click", () => {
      if (window.addSiblingNode) {
        window.addSiblingNode(nodeId, "before");
      }
    });
    nodeActions.appendChild(addSiblingBeforeButton);

    // Add sibling after button
    const addSiblingAfterButton = document.createElement("button");
    addSiblingAfterButton.className = "sibling-button";
    addSiblingAfterButton.innerHTML = "↓+";
    addSiblingAfterButton.title = "Add sibling after";
    addSiblingAfterButton.addEventListener("click", () => {
      if (window.addSiblingNode) {
        window.addSiblingNode(nodeId, "after");
      }
    });
    nodeActions.appendChild(addSiblingAfterButton);

    // Add child button
    const addButton = document.createElement("button");
    addButton.innerHTML = "+";
    addButton.title = "Add child node";
    addButton.addEventListener("click", () => {
      if (window.addChildNode) {
        window.addChildNode(nodeId);
      }
    });
    nodeActions.appendChild(addButton);

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "×";
    deleteButton.title = "Delete node";
    deleteButton.addEventListener("click", () => {
      if (window.deleteNode) {
        window.deleteNode(nodeId);
      }
    });
    nodeActions.appendChild(deleteButton);

    // Add bookmark button to node actions (if BookmarkManager exists)
    if (window.BookmarkManager) {
      BookmarkManager.addBookmarkButtonToNode(nodeActions, nodeId);
    }

    // Focus button (replaces double-click functionality)
    const focusButton = document.createElement("button");
    focusButton.className = "focus-button";
    focusButton.innerHTML = "🎯";
    focusButton.title = "Focus on this node (Alt+F when hovering)";
    focusButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.BreadcrumbManager) {
        window.BreadcrumbManager.focusOnNode(nodeId);
      }
    });
    nodeActions.appendChild(focusButton);

    // Default focus button
    const defaultFocusButton = document.createElement("button");
    defaultFocusButton.className = "default-focus-button";
    defaultFocusButton.innerHTML = "🔍";
    defaultFocusButton.title = "Set as default focus node on startup";
    defaultFocusButton.addEventListener("click", () => {
      if (window.setDefaultFocusNode) {
        window.setDefaultFocusNode(nodeId);
      }
    });
    nodeActions.appendChild(defaultFocusButton);

    return nodeActions;
  }

  // Public API
  return {
    initialize,
    createNodeActions,
  };
})();

// Make NodeActionsManager available globally
window.NodeActionsManager = NodeActionsManager;

