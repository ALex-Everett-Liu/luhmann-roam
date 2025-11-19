// Renderer process for WebP Converter Plugin
// Adapted to work in plugin context (no Electron dependencies)

// Global state
let selectedFiles = [];
let isConverting = false;
let abortController = null;

// DOM Elements
const elements = {
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    imagePreview: document.getElementById('imagePreview'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    outputFormat: document.getElementById('outputFormat'),
    outputDirectory: document.getElementById('outputDirectory'),
    convertBtn: document.getElementById('convertBtn'),
    stopBtn: document.getElementById('stopBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    resultsSection: document.getElementById('resultsSection'),
    conversionResults: document.getElementById('conversionResults'),
    progressSection: document.getElementById('progressSection'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
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
    updateQualityDisplay();
    loadSettings();
}

// Event Listeners
function setupEventListeners() {
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.qualitySlider.addEventListener('input', updateQualityDisplay);
    elements.convertBtn.addEventListener('click', startConversion);
    elements.stopBtn.addEventListener('click', stopConversion);
    elements.clearAllBtn.addEventListener('click', clearAllImages);
    elements.outputFormat.addEventListener('change', saveSettings);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            elements.fileInput.click();
        }
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            clearAllImages();
        }
    });
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

function handleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Please select valid image files', 'error');
        return;
    }
    
    selectedFiles = [...selectedFiles, ...imageFiles];
    updateImagePreview();
    updateConvertButton();
}

// Image Preview
function updateImagePreview() {
    const previewContainer = elements.imagePreview;
    
    if (selectedFiles.length === 0) {
        previewContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-image"></i>
                <p>No images selected</p>
            </div>
        `;
        elements.clearAllBtn.style.display = 'none';
        return;
    }
    
    elements.clearAllBtn.style.display = 'block';
    
    previewContainer.innerHTML = selectedFiles.map((file, index) => `
        <div class="image-item" data-index="${index}">
            <div class="image-preview">
                <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                <button class="remove-btn" onclick="removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="image-info">
                <span class="image-name">${file.name}</span>
                <span class="image-size">${formatFileSize(file.size)}</span>
            </div>
        </div>
    `).join('');
}

function removeImage(index) {
    selectedFiles.splice(index, 1);
    updateImagePreview();
    updateConvertButton();
}

function clearAllImages() {
    selectedFiles = [];
    updateImagePreview();
    updateConvertButton();
    hideResults();
}

// UI Updates
function updateQualityDisplay() {
    elements.qualityValue.textContent = elements.qualitySlider.value;
    saveSettings();
}

function updateConvertButton() {
    elements.convertBtn.disabled = selectedFiles.length === 0 || isConverting;
    elements.convertBtn.innerHTML = isConverting 
        ? '<i class="fas fa-spinner fa-spin"></i> Converting...' 
        : '<i class="fas fa-magic"></i> Convert Images';
}

// Conversion Logic
async function startConversion() {
    if (selectedFiles.length === 0) return;
    
    const outputDir = elements.outputDirectory.value || '';
    
    isConverting = true;
    abortController = new AbortController();
    
    updateConvertButton();
    showProgress();
    hideResults();
    
    const results = [];
    const totalFiles = selectedFiles.length;
    
    try {
        for (let i = 0; i < totalFiles; i++) {
            if (abortController.signal.aborted) {
                break;
            }
            
            const file = selectedFiles[i];
            const progress = ((i / totalFiles) * 100).toFixed(0);
            
            updateProgress(parseInt(progress), `Converting ${file.name}...`);
            
            const result = await convertImage(file, outputDir);
            results.push(result);
        }
        
        if (!abortController.signal.aborted) {
            updateProgress(100, 'Conversion complete!');
            showResults(results);
            saveSettings();
            showToast(`${results.length} images converted successfully`, 'success');
        }
        
    } catch (error) {
        if (!abortController.signal.aborted) {
            showToast(`Conversion failed: ${error.message}`, 'error');
        }
    } finally {
        isConverting = false;
        updateConvertButton();
        hideProgress();
        abortController = null;
    }
}

function stopConversion() {
    if (abortController) {
        abortController.abort();
        showToast('Conversion cancelled', 'info');
    }
}

async function convertImage(file, outputDir) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('quality', elements.qualitySlider.value);
    formData.append('format', elements.outputFormat.value);
    if (outputDir) {
        formData.append('outputDir', outputDir);
    }
    
    const response = await fetch('/api/plugins/webp-converter/convert', {
        method: 'POST',
        body: formData,
        signal: abortController?.signal
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

// Directory Selection (simplified - no Electron IPC)
async function selectOutputDirectory() {
    // In a web context, we can't directly select directories
    // Instead, we'll use a text input or leave it empty for default
    const dir = prompt('Enter output directory path (leave empty for default):');
    if (dir !== null) {
        elements.outputDirectory.value = dir;
        saveSettings();
    }
}

// Progress Management
function showProgress() {
    elements.progressSection.style.display = 'block';
    elements.stopBtn.style.display = 'inline-flex';
}

function hideProgress() {
    elements.progressSection.style.display = 'none';
    elements.stopBtn.style.display = 'none';
}

function updateProgress(percentage, text) {
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = text || `${percentage}%`;
}

// Results Display
function showResults(results) {
    elements.resultsSection.style.display = 'block';
    const container = elements.conversionResults;
    
    container.innerHTML = results.map(result => `
        <div class="result-item ${result.success ? 'success' : 'error'}">
            <div class="result-header">
                <i class="fas ${result.success ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span class="file-name">${result.filename}</span>
            </div>
            ${result.success ? `
                <div class="result-details">
                    <div>Original: ${result.originalSize}</div>
                    <div>Converted: ${result.convertedSize}</div>
                    <div>Savings: ${result.savingsPercent}%</div>
                </div>
                ${result.outputPath ? `
                    <a href="${result.outputPath.startsWith('/') ? result.outputPath : '/' + result.outputPath}" class="open-folder-btn" download="${result.convertedFile}">
                        <i class="fas fa-download"></i> Download
                    </a>
                ` : ''}
            ` : `
                <div class="error-message">${result.error || 'Conversion failed'}</div>
            `}
        </div>
    `).join('');
    
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResults() {
    elements.resultsSection.style.display = 'none';
}

function clearResults() {
    elements.conversionResults.innerHTML = '';
    hideResults();
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Settings Management
function saveSettings() {
    const settings = {
        quality: elements.qualitySlider.value,
        format: elements.outputFormat.value,
        outputDir: elements.outputDirectory.value
    };
    localStorage.setItem('webp-converter-settings', JSON.stringify(settings));
}

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('webp-converter-settings') || '{}');
        
        if (settings.quality) {
            elements.qualitySlider.value = settings.quality;
            updateQualityDisplay();
        }
        
        if (settings.format) {
            elements.outputFormat.value = settings.format;
        }
        
        if (settings.outputDir) {
            elements.outputDirectory.value = settings.outputDir;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Toast Notifications
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
    
    // Auto remove after duration
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isConverting) {
        stopConversion();
    }
});

// Make functions available globally for onclick handlers
window.removeImage = removeImage;
window.clearResults = clearResults;
window.selectOutputDirectory = selectOutputDirectory;

