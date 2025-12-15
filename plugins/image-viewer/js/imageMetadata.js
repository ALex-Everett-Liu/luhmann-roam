// Image Metadata Management (Rating, Ranking, Description, Tags) for Image Viewer Plugin

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

// Description
function updateDescriptionDisplay(description) {
    if (elements.viewerDescriptionInput) {
        elements.viewerDescriptionInput.value = description !== null && description !== undefined ? description : '';
    }
}

async function saveDescription() {
    if (!currentImage) return;
    
    const descriptionValue = elements.viewerDescriptionInput.value.trim();
    const finalDescription = descriptionValue === '' ? null : descriptionValue;
    
    try {
        const response = await fetch(`/api/plugins/image-viewer/images/${currentImage.id}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: finalDescription })
        });
        
        if (!response.ok) throw new Error('Failed to update description');
        
        const data = await response.json();
        currentImage.description = data.description;
        updateDescriptionDisplay(data.description);
        showToast('Description updated', 'success');
    } catch (error) {
        showToast('Failed to update description', 'error');
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

