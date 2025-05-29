/**
 * Persistent Tooltip Manager
 * Allows users to persist node action tooltips and make them draggable
 * Triggered by Ctrl+T hotkey when hovering over a node
 */
const PersistentTooltipManager = (function() {
    // Private variables
    let persistentTooltips = new Map(); // Map of nodeId -> tooltip element
    let isInitialized = false;
    let hasShownStartupHint = false; // Track if we've shown the startup hint
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
        
        // Show startup hint after a brief delay
        setTimeout(() => {
            showStartupHint();
        }, 2000); // Show after 2 seconds
        
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

            /* Hide original hover tooltips when persistent tooltips are active */
            body.has-persistent-tooltips .node-content:hover .node-actions {
                opacity: 0 !important;
                pointer-events: none !important;
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

            /* Startup hint styles */
            .persistent-tooltip-startup-hint {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(66, 133, 244, 0.95);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 1001;
                pointer-events: auto;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.4s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 280px;
                cursor: pointer;
            }

            .persistent-tooltip-startup-hint.show {
                opacity: 1;
                transform: translateY(0);
            }

            .persistent-tooltip-startup-hint:hover {
                background-color: rgba(66, 133, 244, 1);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }

            .persistent-tooltip-startup-hint::after {
                content: " (Click to dismiss)";
                font-size: 12px;
                opacity: 0.8;
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
        
        // Remove the hover event listeners for showing hints
        // document.addEventListener('mouseover', handleNodeHover);
        // document.addEventListener('mouseout', handleNodeHoverOut);
    }

    /**
     * Show startup hint
     */
    function showStartupHint() {
        if (hasShownStartupHint) return;
        
        const hint = document.createElement('div');
        hint.id = 'persistent-tooltip-startup-hint';
        hint.className = 'persistent-tooltip-startup-hint';
        hint.textContent = 'Tip: Hover over any node and press Ctrl+T to pin its action buttons';
        
        // Add click to dismiss
        hint.addEventListener('click', () => {
            hint.classList.remove('show');
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 400);
        });
        
        document.body.appendChild(hint);
        
        // Show the hint
        setTimeout(() => {
            hint.classList.add('show');
        }, 100);
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            if (hint.classList.contains('show')) {
                hint.classList.remove('show');
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.parentNode.removeChild(hint);
                    }
                }, 400);
            }
        }, 8000);
        
        hasShownStartupHint = true;
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
     * Update body class to control original tooltip visibility
     */
    function updateBodyClass() {
        if (persistentTooltips.size > 0) {
            document.body.classList.add('has-persistent-tooltips');
        } else {
            document.body.classList.remove('has-persistent-tooltips');
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

        // Update body class to hide original tooltips
        updateBodyClass();

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
            
            // Update body class to potentially show original tooltips again
            updateBodyClass();
            
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
        
        // Update body class to show original tooltips again
        updateBodyClass();
        
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