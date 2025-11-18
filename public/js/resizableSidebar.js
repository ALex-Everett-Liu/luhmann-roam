// Sidebar resize functionality

function setupSidebarResize() {
  const sidebar = document.querySelector(".sidebar");
  const resizeHandle = document.getElementById("resize-handle");

  if (!sidebar || !resizeHandle) {
    console.warn("Sidebar resize elements not found");
    return;
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  // Load saved width from localStorage
  const savedWidth = localStorage.getItem("sidebarWidth");
  if (savedWidth) {
    const width = parseInt(savedWidth);
    if (width >= 200 && width <= window.innerWidth * 0.6) {
      sidebar.style.width = width + "px";
    }
  }

  // Mouse down on resize handle
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;

    document.body.classList.add("resizing");
    e.preventDefault();
  });

  // Mouse move for resizing
  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    // Calculate delta: dragging right (e.clientX > startX) should increase width
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(window.innerWidth * 0.6, startWidth + deltaX));

    sidebar.style.width = newWidth + "px";
  });

  // Mouse up to stop resizing
  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove("resizing");

      // Save width to localStorage
      localStorage.setItem("sidebarWidth", sidebar.offsetWidth.toString());
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    const currentWidth = sidebar.offsetWidth;
    const maxWidth = window.innerWidth * 0.6;

    if (currentWidth > maxWidth) {
      sidebar.style.width = maxWidth + "px";
      localStorage.setItem("sidebarWidth", maxWidth.toString());
    }
  });
}

// Export function
if (typeof module !== "undefined" && module.exports) {
  module.exports = { setupSidebarResize };
} else {
  window.setupSidebarResize = setupSidebarResize;
}

