// Image Grid Rendering and Pagination for Image Viewer Plugin

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

