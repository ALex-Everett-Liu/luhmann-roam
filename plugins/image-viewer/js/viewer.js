// Image Viewer Modal Functions for Image Viewer Plugin

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
    
    // Check if this is a video file
    const isVideo = currentImage.mimeType && currentImage.mimeType.startsWith('video/') ||
                    /\.(webm|mp4|mov|avi|mkv)$/i.test(currentImage.filename);
    
    // Update viewer
    elements.viewerImageName.textContent = currentImage.filename;
    elements.viewerImageInfo.textContent = `${currentImage.width} × ${currentImage.height}`;
    elements.viewerFileSize.textContent = currentImage.fileSizeFormatted;
    elements.viewerDimensions.textContent = `${currentImage.width} × ${currentImage.height}`;
    elements.viewerPublicLink.value = window.location.origin + currentImage.url;
    
    // Update rating and ranking
    updateRatingDisplay(currentImage.rating);
    updateRankingDisplay(currentImage.ranking);
    
    // Update description
    updateDescriptionDisplay(currentImage.description);
    
    // Update tags
    renderTags(currentImage.tags);
    
    // Set initial view count
    elements.viewerViewCount.textContent = currentImage.viewCount || 0;
    
    // Show/hide image or video element based on file type
    if (isVideo) {
        elements.viewerImage.style.display = 'none';
        elements.viewerVideo.style.display = 'block';
        
        // Set up video load handler to update view count
        const updateViewCountAfterLoad = async () => {
            elements.viewerVideo.removeEventListener('loadeddata', updateViewCountAfterLoad);
            
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const response = await fetch(`/api/plugins/image-viewer/images/${imageId}`);
                if (response.ok) {
                    const data = await response.json();
                    const updatedViewCount = data.image.viewCount || 0;
                    elements.viewerViewCount.textContent = updatedViewCount;
                    
                    currentImage.viewCount = updatedViewCount;
                    const imageIndex = images.findIndex(img => img.id === imageId);
                    if (imageIndex !== -1) {
                        images[imageIndex].viewCount = updatedViewCount;
                        renderImageGrid();
                    }
                }
            } catch (error) {
                console.error('Error updating view count:', error);
            }
        };
        
        elements.viewerVideo.addEventListener('loadeddata', updateViewCountAfterLoad, { once: true });
        
        const cacheBuster = `?t=${Date.now()}`;
        elements.viewerVideo.src = currentImage.url + cacheBuster;
    } else {
        elements.viewerVideo.style.display = 'none';
        elements.viewerImage.style.display = 'block';
        
        // Set up image load handler to update view count after image loads
        const updateViewCountAfterLoad = async () => {
            elements.viewerImage.removeEventListener('load', updateViewCountAfterLoad);
            
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const response = await fetch(`/api/plugins/image-viewer/images/${imageId}`);
                if (response.ok) {
                    const data = await response.json();
                    const updatedViewCount = data.image.viewCount || 0;
                    elements.viewerViewCount.textContent = updatedViewCount;
                    
                    currentImage.viewCount = updatedViewCount;
                    const imageIndex = images.findIndex(img => img.id === imageId);
                    if (imageIndex !== -1) {
                        images[imageIndex].viewCount = updatedViewCount;
                        renderImageGrid();
                    }
                }
            } catch (error) {
                console.error('Error updating view count:', error);
            }
        };
        
        elements.viewerImage.addEventListener('load', updateViewCountAfterLoad, { once: true });
        
        const cacheBuster = `?t=${Date.now()}`;
        elements.viewerImage.src = currentImage.url + cacheBuster;
    }
    
    // Reset zoom and pan (only for images)
    if (!isVideo) {
        resetZoom();
    }
    
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

function navigateImage(direction) {
    if (!currentImage || images.length === 0) return;
    
    const currentIndex = images.findIndex(img => img.id === currentImage.id);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;
    
    openViewer(images[newIndex].id);
}

