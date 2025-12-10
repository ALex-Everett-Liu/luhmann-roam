// Renderer process for Image Viewer Plugin

// Global state
let images = [];
let currentImage = null;
let zoomLevel = 1;
let isFullscreen = false;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// DOM Elements
const elements = {
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    imageGrid: document.getElementById('imageGrid'),
    tagFilter: document.getElementById('tagFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    sortBy: document.getElementById('sortBy'),
    sortOrder: document.getElementById('sortOrder'),
    refreshBtn: document.getElementById('refreshBtn'),
    scanBtn: document.getElementById('scanBtn'),
    imageViewerModal: document.getElementById('imageViewerModal'),
    viewerImage: document.getElementById('viewerImage'),
    viewerImageContainer: document.getElementById('viewerImageContainer'),
    viewerExitFullscreen: document.getElementById('viewerExitFullscreen'),
    viewerImageName: document.getElementById('viewerImageName'),
    viewerImageInfo: document.getElementById('viewerImageInfo'),
    viewerZoomIn: document.getElementById('viewerZoomIn'),
    viewerZoomOut: document.getElementById('viewerZoomOut'),
    viewerResetZoom: document.getElementById('viewerResetZoom'),
    viewerFullscreen: document.getElementById('viewerFullscreen'),
    viewerCopyLink: document.getElementById('viewerCopyLink'),
    viewerClose: document.getElementById('viewerClose'),
    viewerRating: document.getElementById('viewerRating'),
    viewerTagsInput: document.getElementById('viewerTagsInput'),
    viewerAddTags: document.getElementById('viewerAddTags'),
    viewerTagsList: document.getElementById('viewerTagsList'),
    viewerViewCount: document.getElementById('viewerViewCount'),
    viewerFileSize: document.getElementById('viewerFileSize'),
    viewerDimensions: document.getElementById('viewerDimensions'),
    viewerPublicLink: document.getElementById('viewerPublicLink'),
    viewerCopyLinkBtn: document.getElementById('viewerCopyLinkBtn'),
    viewerDeleteBtn: document.getElementById('viewerDeleteBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer')
};

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

// Event Listeners
function setupEventListeners() {
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.refreshBtn.addEventListener('click', () => {
        loadImages();
        loadTags();
    });
    elements.scanBtn.addEventListener('click', scanImages);
    elements.tagFilter.addEventListener('change', applyFilters);
    elements.ratingFilter.addEventListener('change', applyFilters);
    elements.sortBy.addEventListener('change', applyFilters);
    elements.sortOrder.addEventListener('change', applyFilters);
    
    // Viewer controls
    elements.viewerZoomIn.addEventListener('click', () => zoomImage(1.2));
    elements.viewerZoomOut.addEventListener('click', () => zoomImage(0.8));
    elements.viewerResetZoom.addEventListener('click', resetZoom);
    elements.viewerFullscreen.addEventListener('click', toggleFullscreen);
    elements.viewerCopyLink.addEventListener('click', copyImageLink);
    elements.viewerClose.addEventListener('click', closeViewer);
    elements.viewerAddTags.addEventListener('click', addTagsToCurrentImage);
    elements.viewerCopyLinkBtn.addEventListener('click', copyPublicLink);
    elements.viewerDeleteBtn.addEventListener('click', deleteCurrentImage);
    
    // Rating stars
    elements.viewerRating.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            updateImageRating(rating);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Close viewer on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.imageViewerModal.classList.contains('visible')) {
            if (isFullscreen) {
                toggleFullscreen();
            } else {
                closeViewer();
            }
        }
    });
    
    // Image panning
    setupImagePanning();
    
    // Fullscreen listeners
    setupFullscreenListeners();
}

// Drag and Drop
function setupDragAndDrop() {
    const uploadArea = elements.uploadArea;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

// File Handling
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

async function handleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Please select valid image files', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        for (const file of imageFiles) {
            await uploadImage(file);
        }
        showToast(`${imageFiles.length} image(s) uploaded successfully`, 'success');
        loadImages();
        loadTags();
    } catch (error) {
        showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/plugins/image-viewer/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Load Images
async function loadImages() {
    try {
        const tags = Array.from(elements.tagFilter.selectedOptions)
            .map(opt => opt.value)
            .filter(v => v);
        const rating = elements.ratingFilter.value || undefined;
        const sortBy = elements.sortBy.value;
        const sortOrder = elements.sortOrder.value;
        
        const params = new URLSearchParams();
        if (tags.length > 0) params.append('tags', tags.join(','));
        if (rating) params.append('rating', rating);
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
        
        const response = await fetch(`/api/plugins/image-viewer/images?${params}`);
        if (!response.ok) throw new Error('Failed to load images');
        
        const data = await response.json();
        images = data.images || [];
        renderImageGrid();
    } catch (error) {
        console.error('Error loading images:', error);
        showToast('Failed to load images', 'error');
    }
}

async function loadTags() {
    try {
        const response = await fetch('/api/plugins/image-viewer/tags');
        if (!response.ok) throw new Error('Failed to load tags');
        
        const data = await response.json();
        const tags = data.tags || [];
        
        // Update tag filter
        const currentSelection = Array.from(elements.tagFilter.selectedOptions)
            .map(opt => opt.value);
        
        elements.tagFilter.innerHTML = '<option value="">All Tags</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (currentSelection.includes(tag)) {
                option.selected = true;
            }
            elements.tagFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function applyFilters() {
    loadImages();
}

// Scan Images
async function scanImages() {
    if (!confirm('Scan for images in the images directory? This will import any new images found.')) {
        return;
    }
    
    showLoading(true);
    elements.scanBtn.disabled = true;
    elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    
    try {
        const response = await fetch('/api/plugins/image-viewer/scan', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Scan failed');
        }
        
        const data = await response.json();
        
        let message = `Scan complete: ${data.imported} imported`;
        if (data.skipped > 0) {
            message += `, ${data.skipped} skipped`;
        }
        if (data.errors > 0) {
            message += `, ${data.errors} errors`;
        }
        
        showToast(message, data.imported > 0 ? 'success' : 'info');
        
        // Reload images and tags
        loadImages();
        loadTags();
    } catch (error) {
        console.error('Error scanning images:', error);
        showToast(`Scan failed: ${error.message}`, 'error');
    } finally {
        showLoading(false);
        elements.scanBtn.disabled = false;
        elements.scanBtn.innerHTML = '<i class="fas fa-search"></i> Scan Images';
    }
}

// Render Image Grid
function renderImageGrid() {
    const grid = elements.imageGrid;
    
    if (images.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-image"></i>
                <p>No images found</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = images.map(image => `
        <div class="image-item" data-id="${image.id}">
            <div class="image-thumbnail" onclick="openViewer('${image.id}')">
                <img src="${image.url}" alt="${image.filename}" loading="lazy">
                <div class="image-overlay">
                    <div class="image-rating">
                        ${renderStars(image.rating)}
                    </div>
                    <div class="image-views">
                        <i class="fas fa-eye"></i> ${image.viewCount}
                    </div>
                </div>
            </div>
            <div class="image-info">
                <div class="image-name" title="${image.filename}">${truncate(image.filename, 30)}</div>
                <div class="image-tags">
                    ${image.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= rating ? 'fas' : 'far';
        stars += `<i class="${filled} fa-star"></i>`;
    }
    return stars;
}

function truncate(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Image Viewer
async function openViewer(imageId) {
    const image = images.find(img => img.id === imageId);
    if (!image) {
        // Reload image if not in cache
        try {
            const response = await fetch(`/api/plugins/image-viewer/images/${imageId}`);
            if (!response.ok) throw new Error('Image not found');
            const data = await response.json();
            currentImage = data.image;
        } catch (error) {
            showToast('Image not found', 'error');
            return;
        }
    } else {
        currentImage = image;
    }
    
    // Update viewer
    elements.viewerImage.src = currentImage.url;
    elements.viewerImageName.textContent = currentImage.filename;
    elements.viewerImageInfo.textContent = `${currentImage.width} × ${currentImage.height}`;
    // View count will be incremented when image loads, show current + 1
    elements.viewerViewCount.textContent = (currentImage.viewCount || 0) + 1;
    elements.viewerFileSize.textContent = currentImage.fileSizeFormatted;
    elements.viewerDimensions.textContent = `${currentImage.width} × ${currentImage.height}`;
    elements.viewerPublicLink.value = window.location.origin + currentImage.url;
    
    // Update rating
    updateRatingDisplay(currentImage.rating);
    
    // Update tags
    renderTags(currentImage.tags);
    
    // Reset zoom and pan
    resetZoom();
    
    // Show modal
    elements.imageViewerModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeViewer() {
    elements.imageViewerModal.classList.remove('visible');
    document.body.style.overflow = '';
    currentImage = null;
    resetZoom();
}

// Zoom Functions
function zoomImage(factor) {
    const rect = elements.viewerImageContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const oldZoom = zoomLevel;
    zoomLevel *= factor;
    zoomLevel = Math.max(0.1, Math.min(5, zoomLevel));
    
    // Adjust pan to zoom towards center
    if (oldZoom !== zoomLevel) {
        const zoomChange = zoomLevel / oldZoom;
        // Calculate offset from container center
        const offsetX = centerX - panX;
        const offsetY = centerY - panY;
        // Adjust pan based on zoom change
        panX = centerX - offsetX * zoomChange;
        panY = centerY - offsetY * zoomChange;
        applyTransform();
    }
}

function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyTransform();
    // Container transform is already reset in applyTransform
}

function applyZoom() {
    applyTransform();
}

function applyTransform() {
    // Combine zoom and pan into single transform on image element
    // This avoids flexbox centering interference in fullscreen mode
    const imageTransform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    elements.viewerImage.style.setProperty('transform', imageTransform, 'important');
    
    // Reset container transform (flexbox handles centering)
    elements.viewerImageContainer.style.setProperty('transform', 'none', 'important');
    
    // Force reflow to ensure transform is applied in fullscreen
    if (isFullscreen) {
        void elements.viewerImage.offsetHeight; // Force reflow on image
        // Double-check transform is applied
        requestAnimationFrame(() => {
            const currentImageTransform = elements.viewerImage.style.transform;
            if (currentImageTransform !== imageTransform) {
                elements.viewerImage.style.setProperty('transform', imageTransform, 'important');
            }
        });
    }
}

// Fullscreen
function toggleFullscreen() {
    const container = elements.viewerImageContainer;
    
    if (!isFullscreen) {
        // Enter fullscreen - only show the image container
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        } else if (container.webkitEnterFullscreen) {
            container.webkitEnterFullscreen();
        }
        
        // Hide UI elements
        elements.imageViewerModal.querySelector('.viewer-header').style.display = 'none';
        elements.imageViewerModal.querySelector('.viewer-sidebar').style.display = 'none';
        elements.viewerExitFullscreen.style.display = 'block';
        
        isFullscreen = true;
        elements.viewerFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
        
        // Reapply transform after entering fullscreen to ensure it's visible
        setTimeout(() => {
            applyTransform();
        }, 100);
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
        
        // Show UI elements
        elements.imageViewerModal.querySelector('.viewer-header').style.display = 'flex';
        elements.imageViewerModal.querySelector('.viewer-sidebar').style.display = 'block';
        elements.viewerExitFullscreen.style.display = 'none';
        
        isFullscreen = false;
        elements.viewerFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

// Listen for fullscreen changes
function setupFullscreenListeners() {
    const container = elements.viewerImageContainer;
    
    // Handle fullscreen change events
    const fullscreenChange = () => {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement ||
            document.mozFullScreenElement
        );
        
        if (isCurrentlyFullscreen && !isFullscreen) {
            // Just entered fullscreen - reapply transform
            isFullscreen = true;
            applyTransform();
        } else if (!isCurrentlyFullscreen && isFullscreen) {
            // User exited fullscreen via ESC or other method
            isFullscreen = false;
            elements.imageViewerModal.querySelector('.viewer-header').style.display = 'flex';
            elements.imageViewerModal.querySelector('.viewer-sidebar').style.display = 'block';
            elements.viewerExitFullscreen.style.display = 'none';
            elements.viewerFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
            // Reapply transform after exiting fullscreen
            applyTransform();
        }
    };
    
    document.addEventListener('fullscreenchange', fullscreenChange);
    document.addEventListener('webkitfullscreenchange', fullscreenChange);
    document.addEventListener('msfullscreenchange', fullscreenChange);
    document.addEventListener('mozfullscreenchange', fullscreenChange);
    
    // Exit fullscreen button
    elements.viewerExitFullscreen.addEventListener('click', toggleFullscreen);
}

// Image Panning and Zoom
function setupImagePanning() {
    const container = elements.viewerImageContainer;
    
    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Zoom towards mouse position
        const oldZoom = zoomLevel;
        zoomLevel *= delta;
        zoomLevel = Math.max(0.1, Math.min(5, zoomLevel));
        
        // Adjust pan to zoom towards mouse position
        if (oldZoom !== zoomLevel) {
            const zoomChange = zoomLevel / oldZoom;
            // Calculate offset from container center
            const offsetX = mouseX - centerX - panX;
            const offsetY = mouseY - centerY - panY;
            // Adjust pan to keep mouse position fixed
            panX = mouseX - centerX - offsetX * zoomChange;
            panY = mouseY - centerY - offsetY * zoomChange;
            applyTransform();
        }
    }, { passive: false });
    
    // Mouse drag/pan
    container.addEventListener('mousedown', (e) => {
        // Don't start panning if clicking on buttons or other UI elements
        if (e.target.closest('button') || e.target.closest('.exit-fullscreen-btn')) {
            return;
        }
        // Allow panning when clicking anywhere in the container (including background)
        // This works in both normal and fullscreen modes
        // Check if target is container, image, or any child of container (but not buttons)
        const isContainerOrChild = e.target === container || 
                                   e.target === elements.viewerImage || 
                                   container.contains(e.target);
        
        if (isContainerOrChild) {
            isPanning = true;
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Store initial mouse position relative to container center
            panStartX = e.clientX - centerX - panX;
            panStartY = e.clientY - centerY - panY;
            container.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const rect = elements.viewerImageContainer.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Calculate pan relative to container center
            panX = e.clientX - centerX - panStartX;
            panY = e.clientY - centerY - panStartY;
            applyTransform();
            e.preventDefault();
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = 'grab';
        }
    });
    
    // Touch support
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isPanning = true;
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            panStartX = e.touches[0].clientX - centerX - panX;
            panStartY = e.touches[0].clientY - centerY - panY;
            e.preventDefault();
        }
    });
    
    container.addEventListener('touchmove', (e) => {
        if (isPanning && e.touches.length === 1) {
            const rect = elements.viewerImageContainer.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            panX = e.touches[0].clientX - centerX - panStartX;
            panY = e.touches[0].clientY - centerY - panStartY;
            applyTransform();
            e.preventDefault();
        }
    });
    
    container.addEventListener('touchend', () => {
        isPanning = false;
    });
}

// Rating
function updateRatingDisplay(rating) {
    elements.viewerRating.querySelectorAll('.star').forEach((star, index) => {
        const starRating = index + 1;
        const icon = star.querySelector('i');
        if (starRating <= rating) {
            icon.className = 'fas fa-star';
        } else {
            icon.className = 'far fa-star';
        }
    });
}

async function updateImageRating(rating) {
    if (!currentImage) return;
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        
        if (!response.ok) throw new Error('Failed to update rating');
        
        currentImage.rating = rating;
        updateRatingDisplay(rating);
        loadImages(); // Refresh grid
        showToast('Rating updated', 'success');
    } catch (error) {
        showToast('Failed to update rating', 'error');
    }
}

// Tags
function renderTags(tags) {
    elements.viewerTagsList.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <button class="tag-remove" onclick="removeTag('${tag}')">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).join('');
}

async function addTagsToCurrentImage() {
    if (!currentImage) return;
    
    const tagsInput = elements.viewerTagsInput.value.trim();
    if (!tagsInput) return;
    
    const newTags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    const currentTags = currentImage.tags || [];
    const allTags = [...new Set([...currentTags, ...newTags])];
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: allTags })
        });
        
        if (!response.ok) throw new Error('Failed to update tags');
        
        const data = await response.json();
        currentImage.tags = data.tags;
        renderTags(data.tags);
        elements.viewerTagsInput.value = '';
        loadImages(); // Refresh grid
        loadTags(); // Refresh tag filter
        showToast('Tags updated', 'success');
    } catch (error) {
        showToast('Failed to update tags', 'error');
    }
}

async function removeTag(tag) {
    if (!currentImage) return;
    
    const currentTags = currentImage.tags.filter(t => t !== tag);
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: currentTags })
        });
        
        if (!response.ok) throw new Error('Failed to remove tag');
        
        const data = await response.json();
        currentImage.tags = data.tags;
        renderTags(data.tags);
        loadImages(); // Refresh grid
        loadTags(); // Refresh tag filter
        showToast('Tag removed', 'success');
    } catch (error) {
        showToast('Failed to remove tag', 'error');
    }
}

// Copy Link
function copyImageLink() {
    if (!currentImage) return;
    copyPublicLink();
}

async function copyPublicLink() {
    const link = elements.viewerPublicLink.value;
    try {
        await navigator.clipboard.writeText(link);
        showToast('Link copied to clipboard', 'success');
    } catch (error) {
        // Fallback for older browsers
        elements.viewerPublicLink.select();
        document.execCommand('copy');
        showToast('Link copied to clipboard', 'success');
    }
}

// Delete Image
async function deleteCurrentImage() {
    if (!currentImage) return;
    
    if (!confirm(`Are you sure you want to delete "${currentImage.filename}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete image');
        
        showToast('Image deleted', 'success');
        closeViewer();
        loadImages();
        loadTags();
    } catch (error) {
        showToast('Failed to delete image', 'error');
    }
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    if (!elements.imageViewerModal.classList.contains('visible')) return;
    
    switch(e.key) {
        case '+':
        case '=':
            e.preventDefault();
            zoomImage(1.2);
            break;
        case '-':
            e.preventDefault();
            zoomImage(0.8);
            break;
        case '0':
            e.preventDefault();
            resetZoom();
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            navigateImage(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            navigateImage(1);
            break;
    }
}

function navigateImage(direction) {
    if (!currentImage || images.length === 0) return;
    
    const currentIndex = images.findIndex(img => img.id === currentImage.id);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;
    
    openViewer(images[newIndex].id);
}

// Utility Functions
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Make functions available globally
window.openViewer = openViewer;
window.removeTag = removeTag;

