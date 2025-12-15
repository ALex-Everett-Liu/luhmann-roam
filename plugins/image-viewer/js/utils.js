// Utility Functions for Image Viewer Plugin

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
        if (!elements.confirmDialog) {
            // Fallback: resolve with true to continue
            resolve(true);
            return;
        }
        
        if (!elements.confirmDialogTitle || !elements.confirmDialogMessage) {
            resolve(true);
            return;
        }
        
        // Set dialog content
        elements.confirmDialogTitle.innerHTML = `<i class="fas fa-question-circle"></i> ${title}`;
        elements.confirmDialogMessage.textContent = message;
        
        // Remove inline display style and show dialog
        elements.confirmDialog.style.display = '';
        elements.confirmDialog.classList.add('visible');
        
        // Cleanup function
        const cleanup = () => {
            if (elements.confirmDialog) {
                elements.confirmDialog.classList.remove('visible');
                elements.confirmDialog.style.display = 'none';
            }
            if (elements.confirmDialogCancel) elements.confirmDialogCancel.onclick = null;
            if (elements.confirmDialogConfirm) elements.confirmDialogConfirm.onclick = null;
            if (elements.confirmDialog) elements.confirmDialog.onclick = null;
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

function truncate(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
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

