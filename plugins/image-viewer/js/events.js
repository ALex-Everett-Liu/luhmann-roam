// Event Listeners Setup for Image Viewer Plugin

function setupEventListeners() {
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.refreshBtn.addEventListener('click', () => {
        loadImages();
        loadTags();
    });
    
    // Check if scan button exists before adding listener
    if (elements.scanBtn) {
        elements.scanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                openScanDialog();
            } catch (error) {
                console.error('Error opening scan dialog:', error);
                showToast('Failed to open scan dialog: ' + error.message, 'error');
            }
        });
    }
    
    // Scan dialog events - check if elements exist first
    if (elements.scanDialogClose) {
        elements.scanDialogClose.addEventListener('click', closeScanDialog);
    }
    if (elements.scanDialogCancel) {
        elements.scanDialogCancel.addEventListener('click', closeScanDialog);
    }
    if (elements.scanDialogStart) {
        elements.scanDialogStart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                startScan();
            } catch (error) {
                console.error('Error in startScan click handler:', error);
                showToast('Failed to start scan: ' + error.message, 'error');
            }
        });
    }
    if (elements.scanRefreshFolders) {
        elements.scanRefreshFolders.addEventListener('click', loadScanFolders);
    }
    if (elements.scanFolderSelect) {
        elements.scanFolderSelect.addEventListener('change', updateScanFolderPath);
    }
    
    // Close scan dialog on backdrop click
    if (elements.scanDialog) {
        elements.scanDialog.addEventListener('click', (e) => {
            if (e.target === elements.scanDialog) {
                closeScanDialog();
            }
        });
    }
    
    // Close scan dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.scanDialog && elements.scanDialog.classList.contains('visible')) {
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
    elements.viewerDescriptionSave.addEventListener('click', saveDescription);
    
    // Allow Enter key to save
    elements.viewerRatingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRating();
    });
    elements.viewerRankingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveRanking();
    });
    // Allow Ctrl+Enter to save description (Enter alone creates new line)
    elements.viewerDescriptionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveDescription();
        }
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

