// Image Loading and Filtering for Image Viewer Plugin

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

