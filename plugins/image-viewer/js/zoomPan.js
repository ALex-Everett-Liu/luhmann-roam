// Zoom, Pan, and Fullscreen Functions for Image Viewer Plugin

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

