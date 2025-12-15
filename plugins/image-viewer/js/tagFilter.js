// Tag Filter Dialog Functions for Image Viewer Plugin

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

