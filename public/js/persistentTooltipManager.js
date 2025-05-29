/**
 * Persistent Tooltip Manager
 * Allows users to persist node action tooltips and make them draggable
 * Triggered by Ctrl+T hotkey when hovering over a node
 */
const PersistentTooltipManager = (function() {
    // Private variables
    let persistentTooltips = new Map(); // Map of nodeId -> tooltip element
    let isInitialized = false;
    let dragState = {
        isDragging: false,
        currentTooltip: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    };

    /**
     * Initialize the manager
     */
    function initialize() {
        if (isInitialized) return;
        
        setupEventListeners();
        addStyles();
        
        isInitialized = true;
        console.log('PersistentTooltipManager initialized');
    }

    /**
     * Add CSS styles for persistent tooltips
     */
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .persistent-tooltip {
                position: fixed;
                background-color: #fff;
                border: 2px solid #4285f4;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
                z-index: 1000;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 4px;
                max-width: 180px;
                cursor: move;
                user-select: none;
                opacity: 0.95;
                transition: opacity 0.2s ease;
            }

            .persistent-tooltip:hover {
                opacity: 1;
            }

            .persistent-tooltip.dragging {
                opacity: 0.8;
                transform: rotate(2deg);
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            }

            .persistent-tooltip-header {
                grid-column: 1 / -1;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 4px;
                font-size: 12px;
                color: #666;
            }

            .persistent-tooltip-title {
                font-weight: 500;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .persistent-tooltip-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .persistent-tooltip-close:hover {
                background-color: #f0f0f0;
                color: #666;
            }

            .persistent-tooltip button:not(.persistent-tooltip-close) {
                padding: 8px;
                margin: 1px;
                font-size: 16px;
                background-color: transparent;
                color: #555;
                border: none;
                border-radius: 6px;
                transition: all 0.15s ease;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            .persistent-tooltip button:not(.persistent-tooltip-close):hover {
                background-color: #f5f7fa;
                color: #4285f4;
                transform: translateY(-1px);
            }

            /* Dark theme support */
            body.dark-theme .persistent-tooltip {
                background-color: var(--dark-surface-color, #2d2d2d);
                border-color: #4285f4;
                color: var(--dark-text-color, #e0e0e0);
            }

            body.dark-theme .persistent-tooltip-header {
                border-bottom-color: var(--dark-border-color, #444);
            }

            body.dark-theme .persistent-tooltip button:not(.persistent-tooltip-close) {
                color: var(--dark-text-secondary, #b0b0b0);
            }

            body.dark-theme .persistent-tooltip button:not(.persistent-tooltip-close):hover {
                background-color: var(--dark-light-gray, #404040);
                color: #4285f4;
            }

            /* Hotkey indicator */
            .persistent-tooltip-hotkey {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(66, 133, 244, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                z-index: 1001;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .persistent-tooltip-hotkey.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Listen for Ctrl+T hotkey
        document.addEventListener('keydown', handleKeyDown);
        
        // Listen for mouse events for dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Listen for escape key to close all persistent tooltips
        document.addEventListener('keydown', handleEscapeKey);
        
        // Show hotkey hint when hovering over nodes
        document.addEventListener('mouseover', handleNodeHover);
        document.addEventListener('mouseout', handleNodeHoverOut);
    }

    /**
     * Handle keydown events
     */
    function handleKeyDown(event) {
        // Ctrl+T to toggle persistent tooltip
        if (event.ctrlKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            event.stopPropagation();
            
            const hoveredNode = document.querySelector('.node-content:hover');
            if (hoveredNode) {
                const node = hoveredNode.closest('.node');
                if (node) {
                    togglePersistentTooltip(node.dataset.id, hoveredNode);
                }
            }
        }
    }

    /**
     * Handle escape key to close all tooltips
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape') {
            closeAllPersistentTooltips();
        }
    }

    /**
     * Handle node hover to show hotkey hint
     */
    function handleNodeHover(event) {
        const nodeContent = event.target.closest('.node-content');
        if (nodeContent && !dragState.isDragging) {
            showHotkeyHint();
        }
    }

    /**
     * Handle node hover out to hide hotkey hint
     */
    function handleNodeHoverOut(event) {
        const nodeContent = event.target.closest('.node-content');
        if (!nodeContent || !event.relatedTarget?.closest('.node-content')) {
            hideHotkeyHint();
        }
    }

    /**
     * Show hotkey hint
     */
    function showHotkeyHint() {
        let hint = document.getElementById('persistent-tooltip-hotkey-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'persistent-tooltip-hotkey-hint';
            hint.className = 'persistent-tooltip-hotkey';
            hint.textContent = 'Press Ctrl+T to pin tooltip';
            document.body.appendChild(hint);
        }
        
        hint.classList.add('show');
    }

    /**
     * Hide hotkey hint
     */
    function hideHotkeyHint() {
        const hint = document.getElementById('persistent-tooltip-hotkey-hint');
        if (hint) {
            hint.classList.remove('show');
        }
    }

    /**
     * Toggle persistent tooltip for a node
     */
    function togglePersistentTooltip(nodeId, nodeContent) {
        if (persistentTooltips.has(nodeId)) {
            // Close existing tooltip
            closePersistentTooltip(nodeId);
        } else {
            // Create new persistent tooltip
            createPersistentTooltip(nodeId, nodeContent);
        }
    }

    /**
     * Create a persistent tooltip for a node
     */
    function createPersistentTooltip(nodeId, nodeContent) {
        // Get the original node actions
        const originalActions = nodeContent.querySelector('.node-actions');
        if (!originalActions) return;

        // Get node data for the title
        const nodeTextElement = nodeContent.querySelector('.node-text');
        const nodeText = nodeTextElement ? nodeTextElement.textContent.trim() : `Node ${nodeId}`;
        const displayTitle = nodeText.length > 20 ? nodeText.substring(0, 20) + '...' : nodeText;

        // Create persistent tooltip container
        const tooltip = document.createElement('div');
        tooltip.className = 'persistent-tooltip';
        tooltip.dataset.nodeId = nodeId;

        // Create header with title and close button
        const header = document.createElement('div');
        header.className = 'persistent-tooltip-header';
        
        const title = document.createElement('div');
        title.className = 'persistent-tooltip-title';
        title.textContent = displayTitle;
        title.title = nodeText; // Full text on hover
        
        const closeButton = document.createElement('button');
        closeButton.className = 'persistent-tooltip-close';
        closeButton.innerHTML = '×';
        closeButton.title = 'Close tooltip (or press Escape)';
        closeButton.addEventListener('click', () => closePersistentTooltip(nodeId));
        
        header.appendChild(title);
        header.appendChild(closeButton);
        tooltip.appendChild(header);

        // Clone all action buttons
        const buttons = originalActions.querySelectorAll('button');
        buttons.forEach(button => {
            const clonedButton = button.cloneNode(true);
            
            // Remove any existing event listeners and re-add them
            const newButton = clonedButton.cloneNode(true);
            
            // Copy the click functionality
            newButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // Trigger the original button's click
                button.click();
                // Optionally close the tooltip after action
                // closePersistentTooltip(nodeId);
            });
            
            tooltip.appendChild(newButton);
        });

        // Position the tooltip near the node but not overlapping
        const nodeRect = nodeContent.getBoundingClientRect();
        const tooltipWidth = 180; // Approximate width
        const tooltipHeight = 120; // Approximate height
        
        let left = nodeRect.right + 10;
        let top = nodeRect.top;
        
        // Adjust if tooltip would go off-screen
        if (left + tooltipWidth > window.innerWidth) {
            left = nodeRect.left - tooltipWidth - 10;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }
        if (left < 0) {
            left = 10;
        }
        if (top < 0) {
            top = 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';

        // Add drag functionality
        setupDragFunctionality(tooltip);

        // Add to DOM and store reference
        document.body.appendChild(tooltip);
        persistentTooltips.set(nodeId, tooltip);

        console.log(`Created persistent tooltip for node ${nodeId}`);
    }

    /**
     * Set up drag functionality for a tooltip
     */
    function setupDragFunctionality(tooltip) {
        const header = tooltip.querySelector('.persistent-tooltip-header');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.persistent-tooltip-close')) return; // Don't drag when clicking close
            
            dragState.isDragging = true;
            dragState.currentTooltip = tooltip;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            
            const rect = tooltip.getBoundingClientRect();
            dragState.offsetX = e.clientX - rect.left;
            dragState.offsetY = e.clientY - rect.top;
            
            tooltip.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
            
            e.preventDefault();
        });
    }

    /**
     * Handle mouse move for dragging
     */
    function handleMouseMove(e) {
        if (!dragState.isDragging || !dragState.currentTooltip) return;
        
        const newLeft = e.clientX - dragState.offsetX;
        const newTop = e.clientY - dragState.offsetY;
        
        // Keep tooltip within viewport bounds
        const tooltipRect = dragState.currentTooltip.getBoundingClientRect();
        const maxLeft = window.innerWidth - tooltipRect.width;
        const maxTop = window.innerHeight - tooltipRect.height;
        
        const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
        
        dragState.currentTooltip.style.left = constrainedLeft + 'px';
        dragState.currentTooltip.style.top = constrainedTop + 'px';
    }

    /**
     * Handle mouse up to end dragging
     */
    function handleMouseUp(e) {
        if (dragState.isDragging) {
            dragState.isDragging = false;
            
            if (dragState.currentTooltip) {
                dragState.currentTooltip.classList.remove('dragging');
                dragState.currentTooltip = null;
            }
            
            document.body.style.cursor = '';
            
            // Reset drag state
            dragState.startX = 0;
            dragState.startY = 0;
            dragState.offsetX = 0;
            dragState.offsetY = 0;
        }
    }

    /**
     * Close a specific persistent tooltip
     */
    function closePersistentTooltip(nodeId) {
        const tooltip = persistentTooltips.get(nodeId);
        if (tooltip) {
            tooltip.remove();
            persistentTooltips.delete(nodeId);
            console.log(`Closed persistent tooltip for node ${nodeId}`);
        }
    }

    /**
     * Close all persistent tooltips
     */
    function closeAllPersistentTooltips() {
        persistentTooltips.forEach((tooltip, nodeId) => {
            tooltip.remove();
        });
        persistentTooltips.clear();
        console.log('Closed all persistent tooltips');
    }

    /**
     * Get count of active persistent tooltips
     */
    function getActiveTooltipCount() {
        return persistentTooltips.size;
    }

    /**
     * Check if a node has a persistent tooltip
     */
    function hasTooltip(nodeId) {
        return persistentTooltips.has(nodeId);
    }

    // Public API
    return {
        initialize,
        togglePersistentTooltip,
        closePersistentTooltip,
        closeAllPersistentTooltips,
        getActiveTooltipCount,
        hasTooltip
    };
})();

// Make it available globally
window.PersistentTooltipManager = PersistentTooltipManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing PersistentTooltipManager');
    PersistentTooltipManager.initialize();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('DOM already ready, initializing PersistentTooltipManager immediately');
    PersistentTooltipManager.initialize();
}

console.log('PersistentTooltipManager script loaded');