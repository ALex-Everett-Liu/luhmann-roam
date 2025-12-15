// Scan Dialog Functions for Image Viewer Plugin

async function openScanDialog() {
    if (!elements.scanDialog) {
        showToast('Scan dialog not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!elements.scanFolderSelect) {
        showToast('Scan folder select not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!elements.scanFolderPath) {
        showToast('Scan folder path element not found. Please refresh the page.', 'error');
        return;
    }
    
    try {
        // Remove inline display:none style to allow CSS to control visibility
        elements.scanDialog.style.display = '';
        elements.scanDialog.classList.add('visible');
        elements.scanFolderSelect.value = '';
        updateScanFolderPath();
        await loadScanFolders();
    } catch (error) {
        console.error('Error in openScanDialog:', error);
        showToast('Failed to open scan dialog: ' + error.message, 'error');
    }
}

function closeScanDialog() {
    if (elements.scanDialog) {
        elements.scanDialog.classList.remove('visible');
        // Set inline style to hide when closed
        elements.scanDialog.style.display = 'none';
    }
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
    if (!elements.scanFolderSelect || !elements.scanFolderPath) {
        console.warn('updateScanFolderPath: elements not found');
        return;
    }
    const selectedPath = elements.scanFolderSelect.value;
    if (selectedPath) {
        elements.scanFolderPath.textContent = `plugins/image-viewer/images/${selectedPath}`;
    } else {
        elements.scanFolderPath.textContent = 'plugins/image-viewer/images/';
    }
}

async function startScan() {
    try {
        if (!elements.scanFolderSelect) {
            showToast('Scan folder select not found', 'error');
            return;
        }
        
        const selectedFolder = elements.scanFolderSelect.value || null;
        closeScanDialog();
        
        const folderName = selectedFolder ? selectedFolder.split(/[/\\]/).pop() : 'all folders';
        
        if (typeof showConfirmDialog !== 'function') {
            showToast('Confirmation dialog function not found', 'error');
            return;
        }
        
        const confirmed = await showConfirmDialog(
            `Scan for images in ${selectedFolder ? `"${folderName}" folder` : 'all folders'}? This will import any new images found.`,
            'Scan Images'
        );
        
        if (!confirmed) {
            return;
        }
        
        await scanImages(selectedFolder);
    } catch (error) {
        console.error('Error in startScan:', error);
        showToast('Failed to start scan: ' + error.message, 'error');
    }
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

