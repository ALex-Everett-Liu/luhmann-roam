/**
 * Resizable Sidebar Manager
 * Provides drag-to-resize functionality for the sidebar with persistent state
 */

const ResizableSidebar = (function () {
  let isInitialized = false;
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let sidebarAPI = null;

  /**
   * Sets up a resizable sidebar with drag handle
   * @param {Object} options - Configuration options
   * @param {string} options.sidebarSelector - CSS selector for sidebar element
   * @param {string} options.handleSelector - CSS selector for resize handle
   * @param {number} options.minWidth - Minimum sidebar width in pixels
   * @param {number} options.maxWidthRatio - Maximum width as ratio of window width
   * @param {string} options.storageKey - localStorage key for persistence
   * @param {string} options.resizingClass - CSS class applied during resize
   * @param {boolean} options.enableSnapping - Enable snap-to-size functionality
   * @param {number[]} options.snapZones - Array of widths to snap to
   */
  function setupResizableSidebar(options = {}) {
    const {
      sidebarSelector = ".sidebar",
      handleSelector = "#resize-handle",
      minWidth = 200,
      maxWidthRatio = 0.6,
      storageKey = "sidebarWidth",
      resizingClass = "resizing",
      enableSnapping = false,
      snapZones = [250, 300, 400, 500],
    } = options;

    const sidebar = document.querySelector(sidebarSelector);
    const resizeHandle = document.querySelector(handleSelector);

    if (!sidebar || !resizeHandle) {
      console.warn("Resizable sidebar: Required elements not found", {
        sidebar: !!sidebar,
        resizeHandle: !!resizeHandle,
      });
      return null;
    }

    // Load saved width from localStorage
    function loadSavedWidth() {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const width = parseInt(savedWidth);
        const maxWidth = window.innerWidth * maxWidthRatio;

        if (width >= minWidth && width <= maxWidth) {
          sidebar.style.width = width + "px";
          return width;
        }
      }
      return null;
    }

    // Save width to localStorage
    function saveWidth(width) {
      localStorage.setItem(storageKey, width.toString());
    }

    // Apply width constraints
    function constrainWidth(width) {
      const maxWidth = window.innerWidth * maxWidthRatio;
      return Math.max(minWidth, Math.min(maxWidth, width));
    }

    // Snap to nearest zone if enabled
    function snapWidth(width) {
      if (!enableSnapping) return width;

      const snapThreshold = 15; // pixels
      for (const snapZone of snapZones) {
        if (Math.abs(width - snapZone) <= snapThreshold) {
          return snapZone;
        }
      }
      return width;
    }

    // Initialize with saved width
    loadSavedWidth();

    // Mouse down on resize handle
    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;

      document.body.classList.add(resizingClass);
      e.preventDefault();

      // Add cursor style to body for consistent feedback
      document.body.style.cursor = "col-resize";
    });

    // Mouse move for resizing
    const mouseMoveHandler = (e) => {
      if (!isResizing) return;

      const deltaX = startX - e.clientX; // Reverse for left sidebar
      let newWidth = startWidth + deltaX;

      // Apply snapping
      newWidth = snapWidth(newWidth);

      // Apply constraints
      newWidth = constrainWidth(newWidth);

      sidebar.style.width = newWidth + "px";
    };

    document.addEventListener("mousemove", mouseMoveHandler);

    // Mouse up to stop resizing
    const mouseUpHandler = () => {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove(resizingClass);
        document.body.style.cursor = "";

        // Save the final width
        saveWidth(sidebar.offsetWidth);
      }
    };

    document.addEventListener("mouseup", mouseUpHandler);

    // Handle window resize
    const windowResizeHandler = () => {
      const currentWidth = sidebar.offsetWidth;
      const maxWidth = window.innerWidth * maxWidthRatio;

      if (currentWidth > maxWidth) {
        const newWidth = constrainWidth(currentWidth);
        sidebar.style.width = newWidth + "px";
        saveWidth(newWidth);
      }
    };

    window.addEventListener("resize", windowResizeHandler);

    // Optional: Double-click to reset to default width
    resizeHandle.addEventListener("dblclick", () => {
      const defaultWidth = 395; // Original sidebar width
      const constrainedWidth = constrainWidth(defaultWidth);
      sidebar.style.width = constrainedWidth + "px";
      saveWidth(constrainedWidth);
    });

    // Return API for programmatic control
    return {
      setWidth: (width) => {
        const constrainedWidth = constrainWidth(width);
        sidebar.style.width = constrainedWidth + "px";
        saveWidth(constrainedWidth);
      },
      getWidth: () => sidebar.offsetWidth,
      reset: () => {
        localStorage.removeItem(storageKey);
        sidebar.style.width = "";
      },
      destroy: () => {
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
        window.removeEventListener("resize", windowResizeHandler);
      },
    };
  }

  /**
   * Initialize the resizable sidebar
   */
  function initialize() {
    if (isInitialized) {
      console.warn("ResizableSidebar already initialized");
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        sidebarAPI = setupResizableSidebar({
          sidebarSelector: ".sidebar",
          handleSelector: "#resize-handle",
          minWidth: 200,
          maxWidthRatio: 0.6,
          storageKey: "sidebarWidth",
          resizingClass: "resizing",
          enableSnapping: false,
        });
        isInitialized = true;
        console.log("ResizableSidebar initialized");
      });
    } else {
      sidebarAPI = setupResizableSidebar({
        sidebarSelector: ".sidebar",
        handleSelector: "#resize-handle",
        minWidth: 200,
        maxWidthRatio: 0.6,
        storageKey: "sidebarWidth",
        resizingClass: "resizing",
        enableSnapping: false,
      });
      isInitialized = true;
      console.log("ResizableSidebar initialized");
    }
  }

  /**
   * Get the sidebar API for programmatic control
   */
  function getAPI() {
    return sidebarAPI;
  }

  // Public API
  return {
    initialize,
    getAPI,
  };
})();

// Make available globally
if (typeof window !== "undefined") {
  window.ResizableSidebar = ResizableSidebar;
}

