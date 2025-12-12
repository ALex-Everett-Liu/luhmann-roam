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
let allTags = [];
let selectedTags = [];
let tagFilterSearchQuery = '';
let currentTagPage = 1;
const TAGS_PER_PAGE = 20;
let currentImagePage = 1;
const IMAGES_PER_PAGE = 24;

// DOM Elements
const elements = {
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    imageGrid: document.getElementById('imageGrid'),
    tagFilterBtn: document.getElementById('tagFilterBtn'),
    tagFilterText: document.getElementById('tagFilterText'),
    selectedTagsDisplay: document.getElementById('selectedTagsDisplay'),
    tagFilterDialog: document.getElementById('tagFilterDialog'),
    tagFilterDialogClose: document.getElementById('tagFilterDialogClose'),
    tagSearchInput: document.getElementById('tagSearchInput'),
    tagFilterList: document.getElementById('tagFilterList'),
    tagFilterStats: document.getElementById('tagFilterStats'),
    tagFilterTotal: document.getElementById('tagFilterTotal'),
    tagFilterClear: document.getElementById('tagFilterClear'),
    tagFilterSelectAll: document.getElementById('tagFilterSelectAll'),
    tagFilterCancel: document.getElementById('tagFilterCancel'),
    tagFilterApply: document.getElementById('tagFilterApply'),
    tagFilterPrevPage: document.getElementById('tagFilterPrevPage'),
    tagFilterNextPage: document.getElementById('tagFilterNextPage'),
    tagFilterPageInfo: document.getElementById('tagFilterPageInfo'),
    tagFilterPageJump: document.getElementById('tagFilterPageJump'),
    tagFilterPageJumpBtn: document.getElementById('tagFilterPageJumpBtn'),
    ratingFilter: document.getElementById('ratingFilter'),
    ratingMin: document.getElementById('ratingMin'),
    ratingMax: document.getElementById('ratingMax'),
    rankingMin: document.getElementById('rankingMin'),
    rankingMax: document.getElementById('rankingMax'),
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
    viewerRatingInput: document.getElementById('viewerRatingInput'),
    viewerRatingSave: document.getElementById('viewerRatingSave'),
    viewerRankingInput: document.getElementById('viewerRankingInput'),
    viewerRankingSave: document.getElementById('viewerRankingSave'),
    viewerRankingClear: document.getElementById('viewerRankingClear'),
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
    toastContainer: document.getElementById('toastContainer'),
    confirmDialog: document.getElementById('confirmDialog'),
    confirmDialogTitle: document.getElementById('confirmDialogTitle'),
    confirmDialogMessage: document.getElementById('confirmDialogMessage'),
    confirmDialogCancel: document.getElementById('confirmDialogCancel'),
    confirmDialogConfirm: document.getElementById('confirmDialogConfirm'),
    scanDialog: document.getElementById('scanDialog'),
    scanDialogClose: document.getElementById('scanDialogClose'),
    scanFolderSelect: document.getElementById('scanFolderSelect'),
    scanRefreshFolders: document.getElementById('scanRefreshFolders'),
    scanFolderPath: document.getElementById('scanFolderPath'),
    scanDialogCancel: document.getElementById('scanDialogCancel'),
    scanDialogStart: document.getElementById('scanDialogStart'),
    imagePagination: document.getElementById('imagePagination'),
    imagePrevPage: document.getElementById('imagePrevPage'),
    imageNextPage: document.getElementById('imageNextPage'),
    imagePageInfo: document.getElementById('imagePageInfo'),
    imagePageJump: document.getElementById('imagePageJump'),
    imagePageJumpBtn: document.getElementById('imagePageJumpBtn')
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
    elements.scanBtn.addEventListener('click', openScanDialog);
    
    // Scan dialog events
    elements.scanDialogClose.addEventListener('click', closeScanDialog);
    elements.scanDialogCancel.addEventListener('click', closeScanDialog);
    elements.scanDialogStart.addEventListener('click', startScan);
    elements.scanRefreshFolders.addEventListener('click', loadScanFolders);
    elements.scanFolderSelect.addEventListener('change', updateScanFolderPath);
    
    // Close scan dialog on backdrop click
    elements.scanDialog.addEventListener('click', (e) => {
        if (e.target === elements.scanDialog) {
            closeScanDialog();
        }
    });
    
    // Close scan dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.scanDialog.classList.contains('visible')) {
            closeScanDialog();
        }
    });
    elements.tagFilterBtn.addEventListener('click', openTagFilterDialog);
    elements.ratingFilter.addEventListener('change', applyFilters);
    elements.ratingMin.addEventListener('input', applyFilters);
    elements.ratingMax.addEventListener('input', applyFilters);
    elements.rankingMin.addEventListener('input', applyFilters);
    elements.rankingMax.addEventListener('input', applyFilters);
    
    // Tag filter dialog events
    elements.tagFilterDialogClose.addEventListener('click', closeTagFilterDialog);
    elements.tagFilterCancel.addEventListener('click', closeTagFilterDialog);
    elements.tagFilterApply.addEventListener('click', applyTagFilter);
    elements.tagFilterClear.addEventListener('click', clearTagFilter);
    elements.tagFilterSelectAll.addEventListener('click', selectAllTags);
    elements.tagSearchInput.addEventListener('input', filterTagList);
    elements.tagFilterPrevPage.addEventListener('click', () => goToTagPage(currentTagPage - 1));
    elements.tagFilterNextPage.addEventListener('click', () => goToTagPage(currentTagPage + 1));
    elements.tagFilterPageJumpBtn.addEventListener('click', jumpToTagPage);
    elements.tagFilterPageJump.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') jumpToTagPage();
    });
    
    // Close dialog on backdrop click
    elements.tagFilterDialog.addEventListener('click', (e) => {
        if (e.target === elements.tagFilterDialog) {
            closeTagFilterDialog();
        }
    });
    
    // Close dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.tagFilterDialog.classList.contains('visible')) {
            closeTagFilterDialog();
        }
    });
    elements.sortBy.addEventListener('change', applyFilters);
    elements.sortOrder.addEventListener('change', applyFilters);
    
    // Image pagination
    elements.imagePrevPage.addEventListener('click', () => goToImagePage(currentImagePage - 1));
    elements.imageNextPage.addEventListener('click', () => goToImagePage(currentImagePage + 1));
    elements.imagePageJumpBtn.addEventListener('click', jumpToImagePage);
    elements.imagePageJump.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') jumpToImagePage();
    });
    
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
    
    // Rating and Ranking inputs
    elements.viewerRatingSave.addEventListener('click', saveRating);
    elements.viewerRankingSave.addEventListener('click', saveRanking);
    elements.viewerRankingClear.addEventListener('click', clearRanking);
    
    // Allow Enter key to save
    elements.viewerRatingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRating();
    });
    elements.viewerRankingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRanking();
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
        currentImagePage = 1; // Reset to first page after upload
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
        const rating = elements.ratingFilter.value || undefined;
        const ratingMin = elements.ratingMin.value.trim() || undefined;
        const ratingMax = elements.ratingMax.value.trim() || undefined;
        const rankingMin = elements.rankingMin.value.trim() || undefined;
        const rankingMax = elements.rankingMax.value.trim() || undefined;
        const sortBy = elements.sortBy.value;
        const sortOrder = elements.sortOrder.value;
        
        const params = new URLSearchParams();
        if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
        if (rating) params.append('rating', rating);
        if (ratingMin) params.append('ratingMin', ratingMin);
        if (ratingMax) params.append('ratingMax', ratingMax);
        if (rankingMin) params.append('rankingMin', rankingMin);
        if (rankingMax) params.append('rankingMax', rankingMax);
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
        allTags = data.tags || [];
        
        // Update tag filter button text and selected tags display
        updateTagFilterDisplay();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function updateTagFilterDisplay() {
    if (selectedTags.length === 0) {
        elements.tagFilterText.textContent = 'All Tags';
        elements.selectedTagsDisplay.innerHTML = '';
    } else {
        elements.tagFilterText.textContent = `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`;
        elements.selectedTagsDisplay.innerHTML = selectedTags.map(tag => 
            `<span class="selected-tag">${tag} <i class="fas fa-times" data-tag="${tag}"></i></span>`
        ).join('');
        
        // Add click handlers to remove tags
        elements.selectedTagsDisplay.querySelectorAll('.selected-tag i').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const tag = icon.dataset.tag;
                removeSelectedTag(tag);
            });
        });
    }
}

function removeSelectedTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    updateTagFilterDisplay();
    renderTagFilterList();
    applyFilters();
}

function applyFilters() {
    currentImagePage = 1; // Reset to first page when filters change
    loadImages();
}

// Tag Filter Dialog Functions
function openTagFilterDialog() {
    elements.tagFilterDialog.classList.add('visible');
    elements.tagSearchInput.value = '';
    tagFilterSearchQuery = '';
    currentTagPage = 1;
    renderTagFilterList();
    updateTagFilterStats();
    updateTagFilterPagination();
    elements.tagSearchInput.focus();
}

function closeTagFilterDialog() {
    elements.tagFilterDialog.classList.remove('visible');
}

function renderTagFilterList() {
    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagFilterSearchQuery.toLowerCase())
    );
    
    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(filteredTags.length / TAGS_PER_PAGE));
    currentTagPage = Math.min(currentTagPage, totalPages);
    currentTagPage = Math.max(1, currentTagPage);
    
    const startIndex = (currentTagPage - 1) * TAGS_PER_PAGE;
    const endIndex = startIndex + TAGS_PER_PAGE;
    const paginatedTags = filteredTags.slice(startIndex, endIndex);
    
    elements.tagFilterList.innerHTML = paginatedTags.length === 0 
        ? '<div class="no-tags-message">No tags found</div>'
        : paginatedTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return `
                <label class="tag-filter-item ${isSelected ? 'selected' : ''}">
                    <input type="checkbox" value="${tag}" ${isSelected ? 'checked' : ''}>
                    <span class="tag-name">${tag}</span>
                </label>
            `;
        }).join('');
    
    // Add change listeners to checkboxes
    elements.tagFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const tag = e.target.value;
            if (e.target.checked) {
                if (!selectedTags.includes(tag)) {
                    selectedTags.push(tag);
                }
            } else {
                selectedTags = selectedTags.filter(t => t !== tag);
            }
            updateTagFilterStats();
            // Update checkbox visual state
            const label = e.target.closest('label');
            if (e.target.checked) {
                label.classList.add('selected');
            } else {
                label.classList.remove('selected');
            }
        });
    });
    
    // Update pagination controls
    updateTagFilterPagination();
}

function filterTagList() {
    tagFilterSearchQuery = elements.tagSearchInput.value;
    currentTagPage = 1; // Reset to first page when filtering
    renderTagFilterList();
}

function goToTagPage(page) {
    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagFilterSearchQuery.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filteredTags.length / TAGS_PER_PAGE));
    
    if (page >= 1 && page <= totalPages) {
        currentTagPage = page;
        renderTagFilterList();
        // Scroll to top of tag list
        elements.tagFilterList.scrollTop = 0;
    }
}

function jumpToTagPage() {
    const page = parseInt(elements.tagFilterPageJump.value);
    if (!isNaN(page) && page > 0) {
        goToTagPage(page);
    }
}

function updateTagFilterPagination() {
    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagFilterSearchQuery.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filteredTags.length / TAGS_PER_PAGE));
    
    // Update page info
    elements.tagFilterPageInfo.textContent = `Page ${currentTagPage} of ${totalPages}`;
    elements.tagFilterPageJump.value = currentTagPage;
    elements.tagFilterPageJump.max = totalPages;
    
    // Enable/disable navigation buttons
    elements.tagFilterPrevPage.disabled = currentTagPage <= 1;
    elements.tagFilterNextPage.disabled = currentTagPage >= totalPages;
}

function updateTagFilterStats() {
    const count = selectedTags.length;
    elements.tagFilterStats.textContent = `${count} tag${count !== 1 ? 's' : ''} selected`;
    
    // Update total tag count
    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagFilterSearchQuery.toLowerCase())
    );
    elements.tagFilterTotal.textContent = `Total: ${filteredTags.length} tag${filteredTags.length !== 1 ? 's' : ''}`;
}

function applyTagFilter() {
    updateTagFilterDisplay();
    applyFilters();
    closeTagFilterDialog();
}

function clearTagFilter() {
    selectedTags = [];
    renderTagFilterList();
    updateTagFilterStats();
    updateTagFilterPagination();
}

function selectAllTags() {
    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagFilterSearchQuery.toLowerCase())
    );
    selectedTags = [...new Set([...selectedTags, ...filteredTags])];
    renderTagFilterList();
    updateTagFilterStats();
    updateTagFilterPagination();
}

// Scan Dialog Functions
let scanFolders = [];

async function openScanDialog() {
    elements.scanDialog.classList.add('visible');
    elements.scanFolderSelect.value = '';
    updateScanFolderPath();
    await loadScanFolders();
}

function closeScanDialog() {
    elements.scanDialog.classList.remove('visible');
}

async function loadScanFolders() {
    try {
        elements.scanRefreshFolders.disabled = true;
        const icon = elements.scanRefreshFolders.querySelector('i');
        if (icon) icon.classList.add('fa-spin');
        
        const response = await fetch('/api/plugins/image-viewer/subfolders');
        if (!response.ok) {
            throw new Error('Failed to load folders');
        }
        
        const data = await response.json();
        scanFolders = data.folders || [];
        
        // Update select dropdown
        elements.scanFolderSelect.innerHTML = '<option value="">All Folders (Root)</option>';
        scanFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.relativePath;
            option.textContent = folder.name;
            elements.scanFolderSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading folders:', error);
        showToast('Failed to load folders', 'error');
    } finally {
        elements.scanRefreshFolders.disabled = false;
        const icon = elements.scanRefreshFolders.querySelector('i');
        if (icon) icon.classList.remove('fa-spin');
    }
}

function updateScanFolderPath() {
    const selectedPath = elements.scanFolderSelect.value;
    if (selectedPath) {
        elements.scanFolderPath.textContent = `plugins/image-viewer/images/${selectedPath}`;
    } else {
        elements.scanFolderPath.textContent = 'plugins/image-viewer/images/';
    }
}

async function startScan() {
    const selectedFolder = elements.scanFolderSelect.value || null;
    closeScanDialog();
    
    const folderName = selectedFolder ? selectedFolder.split(/[/\\]/).pop() : 'all folders';
    const confirmed = await showConfirmDialog(
        `Scan for images in ${selectedFolder ? `"${folderName}" folder` : 'all folders'}? This will import any new images found.`,
        'Scan Images'
    );
    if (!confirmed) {
        return;
    }
    
    await scanImages(selectedFolder);
}

// Scan Images
async function scanImages(subfolder = null) {
    showLoading(true);
    elements.scanBtn.disabled = true;
    elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    
    try {
        const response = await fetch('/api/plugins/image-viewer/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subfolder: subfolder
            })
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
        currentImagePage = 1; // Reset to first page after scan
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
        elements.imagePagination.style.display = 'none';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(images.length / IMAGES_PER_PAGE));
    currentImagePage = Math.min(currentImagePage, totalPages);
    currentImagePage = Math.max(1, currentImagePage);
    
    const startIndex = (currentImagePage - 1) * IMAGES_PER_PAGE;
    const endIndex = startIndex + IMAGES_PER_PAGE;
    const paginatedImages = images.slice(startIndex, endIndex);
    
    grid.innerHTML = paginatedImages.map(image => `
        <div class="image-item" data-id="${image.id}">
            <div class="image-thumbnail" onclick="openViewer('${image.id}')">
                <img src="${image.url}?thumbnail=true" alt="${image.filename}" loading="lazy">
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
    
    // Update pagination controls
    updateImagePagination();
}

function renderStars(rating) {
    // Show numeric rating if it's a decimal or > 5, otherwise show stars
    if (!rating || rating === 0) {
        return '<span class="no-rating">-</span>';
    }
    if (rating > 5 || rating % 1 !== 0) {
        // Decimal or > 5, show numeric value
        return `<span class="numeric-rating">${rating.toFixed(1)}</span>`;
    }
    // Integer 1-5, show stars
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

// Image Pagination Functions
function goToImagePage(page) {
    const totalPages = Math.max(1, Math.ceil(images.length / IMAGES_PER_PAGE));
    
    if (page >= 1 && page <= totalPages) {
        currentImagePage = page;
        renderImageGrid();
        // Scroll to top of image grid
        elements.imageGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function jumpToImagePage() {
    const page = parseInt(elements.imagePageJump.value);
    if (!isNaN(page) && page > 0) {
        goToImagePage(page);
    }
}

function updateImagePagination() {
    const totalPages = Math.max(1, Math.ceil(images.length / IMAGES_PER_PAGE));
    
    // Show/hide pagination based on whether we need it
    if (totalPages > 1) {
        elements.imagePagination.style.display = 'flex';
    } else {
        elements.imagePagination.style.display = 'none';
        return;
    }
    
    // Update page info
    elements.imagePageInfo.textContent = `Page ${currentImagePage} of ${totalPages} (${images.length} total)`;
    elements.imagePageJump.value = currentImagePage;
    elements.imagePageJump.max = totalPages;
    
    // Enable/disable navigation buttons
    elements.imagePrevPage.disabled = currentImagePage <= 1;
    elements.imageNextPage.disabled = currentImagePage >= totalPages;
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
    elements.viewerImageName.textContent = currentImage.filename;
    elements.viewerImageInfo.textContent = `${currentImage.width} × ${currentImage.height}`;
    elements.viewerFileSize.textContent = currentImage.fileSizeFormatted;
    elements.viewerDimensions.textContent = `${currentImage.width} × ${currentImage.height}`;
    elements.viewerPublicLink.value = window.location.origin + currentImage.url;
    
    // Update rating and ranking
    updateRatingDisplay(currentImage.rating);
    updateRankingDisplay(currentImage.ranking);
    
    // Update tags
    renderTags(currentImage.tags);
    
    // Set initial view count
    elements.viewerViewCount.textContent = currentImage.viewCount || 0;
    
    // Set up image load handler to update view count after image loads
    // Use a one-time handler to prevent multiple increments
    const updateViewCountAfterLoad = async () => {
        // Remove listener immediately to prevent multiple calls
        elements.viewerImage.removeEventListener('load', updateViewCountAfterLoad);
        
        try {
            // Small delay to ensure server has processed the increment
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Fetch updated image data to get the incremented view count
            const response = await fetch(`/api/plugins/image-viewer/images/${imageId}`);
            if (response.ok) {
                const data = await response.json();
                const updatedViewCount = data.image.viewCount || 0;
                elements.viewerViewCount.textContent = updatedViewCount;
                
                // Update currentImage and images array with new view count
                currentImage.viewCount = updatedViewCount;
                const imageIndex = images.findIndex(img => img.id === imageId);
                if (imageIndex !== -1) {
                    images[imageIndex].viewCount = updatedViewCount;
                    // Re-render grid to show updated view count
                    renderImageGrid();
                }
            }
        } catch (error) {
            console.error('Error updating view count:', error);
        }
    };
    
    // Add load event listener before setting src
    elements.viewerImage.addEventListener('load', updateViewCountAfterLoad, { once: true });
    
    // Add cache-busting parameter to ensure server request happens
    // This ensures view count increments even if browser has cached the image
    const cacheBuster = `?t=${Date.now()}`;
    elements.viewerImage.src = currentImage.url + cacheBuster;
    
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

// Rating and Ranking
function updateRatingDisplay(rating) {
    if (elements.viewerRatingInput) {
        elements.viewerRatingInput.value = rating !== null && rating !== undefined ? rating : '';
    }
}

function updateRankingDisplay(ranking) {
    if (elements.viewerRankingInput) {
        elements.viewerRankingInput.value = ranking !== null && ranking !== undefined ? ranking : '';
    }
}

async function saveRating() {
    if (!currentImage) return;
    
    const ratingValue = parseFloat(elements.viewerRatingInput.value);
    if (isNaN(ratingValue) || ratingValue < 0) {
        showToast('Rating must be a non-negative number', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: ratingValue })
        });
        
        if (!response.ok) throw new Error('Failed to update rating');
        
        const data = await response.json();
        currentImage.rating = data.rating;
        updateRatingDisplay(data.rating);
        loadImages(); // Refresh grid
        showToast('Rating updated', 'success');
    } catch (error) {
        showToast('Failed to update rating', 'error');
    }
}

async function saveRanking() {
    if (!currentImage) return;
    
    const rankingValue = elements.viewerRankingInput.value.trim() === '' 
        ? null 
        : parseFloat(elements.viewerRankingInput.value);
    
    if (rankingValue !== null && (isNaN(rankingValue) || rankingValue < 0)) {
        showToast('Ranking must be a non-negative number or empty', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ranking: rankingValue })
        });
        
        if (!response.ok) throw new Error('Failed to update ranking');
        
        const data = await response.json();
        currentImage.ranking = data.ranking;
        updateRankingDisplay(data.ranking);
        loadImages(); // Refresh grid
        showToast('Ranking updated', 'success');
    } catch (error) {
        showToast('Failed to update ranking', 'error');
    }
}

async function clearRanking() {
    if (!currentImage) return;
    
    elements.viewerRankingInput.value = '';
    await saveRanking();
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
        // Reset pagination if needed (renderImageGrid will handle adjusting if page doesn't exist)
        const totalPages = Math.ceil(images.length / IMAGES_PER_PAGE);
        if (currentImagePage > totalPages && currentImagePage > 1) {
            currentImagePage = Math.max(1, totalPages);
        }
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

/**
 * Show a confirmation dialog (replaces confirm() to avoid Electron Windows focus bugs)
 * @param {string} message - The confirmation message to display
 * @param {string} title - Optional title for the dialog (default: "Confirm")
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmDialog(message, title = 'Confirm') {
    return new Promise((resolve) => {
        // Set dialog content
        elements.confirmDialogTitle.innerHTML = `<i class="fas fa-question-circle"></i> ${title}`;
        elements.confirmDialogMessage.textContent = message;
        
        // Show dialog
        elements.confirmDialog.classList.add('visible');
        
        // Cleanup function
        const cleanup = () => {
            elements.confirmDialog.classList.remove('visible');
            elements.confirmDialogCancel.onclick = null;
            elements.confirmDialogConfirm.onclick = null;
            elements.confirmDialog.onclick = null;
            document.removeEventListener('keydown', handleKeyDown);
        };
        
        // Handle keydown events
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cleanup();
                resolve(false);
            } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                cleanup();
                resolve(true);
            }
        };
        
        // Set up event listeners
        elements.confirmDialogConfirm.onclick = () => {
            cleanup();
            resolve(true);
        };
        
        elements.confirmDialogCancel.onclick = () => {
            cleanup();
            resolve(false);
        };
        
        // Close on backdrop click (but not on content click)
        elements.confirmDialog.onclick = (e) => {
            if (e.target === elements.confirmDialog) {
                cleanup();
                resolve(false);
            }
        };
        
        // Add keyboard listener
        document.addEventListener('keydown', handleKeyDown);
        
        // Focus the confirm button for better keyboard navigation
        elements.confirmDialogConfirm.focus();
    });
}

// Make functions available globally
window.openViewer = openViewer;
window.removeTag = removeTag;

