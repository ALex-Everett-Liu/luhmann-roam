// Renderer process for Image Viewer Plugin
// Main initialization file - orchestrates all modules

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupDragAndDrop();
    loadImages();
    loadTags();
}

// Make functions available globally (for onclick handlers in HTML)
window.openViewer = openViewer;
window.removeTag = removeTag;
