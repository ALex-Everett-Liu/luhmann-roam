/**
 * NodeSizeHighlightManager - Highlights nodes with the largest node_size compared to their parent, siblings, and children
 */
const NodeSizeHighlightManager = (function() {
    // Private variables
    let isInitialized = false;
    let isEnabled = false;
    let highlightedNodes = new Set();

    /**
     * Initialize the manager
     */
    function initialize() {
        if (isInitialized) {
            console.log('NodeSizeHighlightManager already initialized, skipping');
            return;
        }

        console.log('NodeSizeHighlightManager initialized successfully');
        isInitialized = true;
        
        // Load enabled state from localStorage
        const savedState = localStorage.getItem('nodeSizeHighlightEnabled');
        isEnabled = savedState === 'true';
        
        if (isEnabled) {
            // Delay initial application to ensure DOM is ready
            setTimeout(() => {
                applyHighlights();
            }, 500);
        }
    }

    /**
     * Toggle the highlight feature on/off
     */
    function toggle() {
        isEnabled = !isEnabled;
        localStorage.setItem('nodeSizeHighlightEnabled', isEnabled.toString());
        
        if (isEnabled) {
            applyHighlights();
        } else {
            clearHighlights();
        }
        
        // Update toggle button if it exists
        updateToggleButton();
        
        console.log(`NodeSizeHighlightManager ${isEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if the feature is enabled
     */
    function getEnabled() {
        return isEnabled;
    }

    /**
     * Apply highlights to all nodes based on size comparison
     */
    async function applyHighlights() {
        if (!isEnabled) {
            return;
        }

        console.log('🔍 Applying node size highlights...');
        
        try {
            // Clear previous highlights
            clearHighlights();
            
            // Get all currently displayed nodes from the DOM
            const nodeElements = document.querySelectorAll('.node[data-id]');
            console.log(`📊 Found ${nodeElements.length} nodes in DOM`);
            
            if (nodeElements.length === 0) {
                console.log('❌ No nodes found in DOM, skipping highlight application');
                return;
            }
            
            // Build a map of all nodes with their data
            const allNodes = new Map();
            await buildNodeMapFromDOM(nodeElements, allNodes);
            
            console.log(`📋 Built node map with ${allNodes.size} nodes`);
            
            // Check each node for highlighting
            let highlightCount = 0;
            for (const [nodeId, nodeData] of allNodes.entries()) {
                if (shouldHighlightNode(nodeId, nodeData, allNodes)) {
                    highlightNode(nodeId);
                    highlightedNodes.add(nodeId);
                    highlightCount++;
                }
            }
            
            console.log(`✅ Applied highlights to ${highlightCount} nodes`);
            
        } catch (error) {
            console.error('❌ Error applying node size highlights:', error);
        }
    }

    /**
     * Build a map of all nodes from DOM elements and fetch their data
     */
    async function buildNodeMapFromDOM(nodeElements, nodeMap) {
        for (const nodeElement of nodeElements) {
            const nodeId = nodeElement.dataset.id;
            if (nodeId) {
                try {
                    // Fetch node data from API to get node_size and parent info
                    const response = await fetch(`/api/nodes/${nodeId}`);
                    if (response.ok) {
                        const nodeData = await response.json();
                        nodeMap.set(nodeId, nodeData);
                    }
                } catch (error) {
                    console.error(`❌ Error fetching data for node ${nodeId}:`, error);
                }
            }
        }
    }

    /**
     * Determine if a node should be highlighted based on size comparison
     */
    function shouldHighlightNode(nodeId, nodeData, allNodes) {
        const nodeSize = nodeData.node_size || 20; // Default size is 20
        let maxComparisonSize = nodeSize; // Start with the current node's size
        let hasComparisons = false;

        // Compare with parent
        if (nodeData.parent_id) {
            const parent = allNodes.get(nodeData.parent_id);
            if (parent) {
                const parentSize = parent.node_size || 20;
                maxComparisonSize = Math.max(maxComparisonSize, parentSize);
                hasComparisons = true;
            }
        }

        // Compare with siblings (nodes with same parent)
        for (const [siblingId, siblingData] of allNodes.entries()) {
            if (siblingId !== nodeId && siblingData.parent_id === nodeData.parent_id) {
                const siblingSize = siblingData.node_size || 20;
                maxComparisonSize = Math.max(maxComparisonSize, siblingSize);
                hasComparisons = true;
            }
        }

        // Compare with children
        for (const [childId, childData] of allNodes.entries()) {
            if (childData.parent_id === nodeId) {
                const childSize = childData.node_size || 20;
                maxComparisonSize = Math.max(maxComparisonSize, childSize);
                hasComparisons = true;
            }
        }

        // Only highlight if this node has the maximum size and there were comparisons to make
        // Also require that the size is above default (20)
        return hasComparisons && nodeSize === maxComparisonSize && nodeSize > 20;
    }

    /**
     * Add visual highlight to a node
     */
    function highlightNode(nodeId) {
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.classList.add('size-highlighted');
            
            // Get the actual node size for the indicator
            const nodeSize = getNodeSizeFromElement(nodeElement) || 20;
            
            // Add special styling for very large nodes
            if (nodeSize > 50) {
                nodeElement.setAttribute('data-large-size', 'true');
            }
            
            // Add a small indicator showing the size
            const existingIndicator = nodeElement.querySelector('.size-highlight-indicator');
            if (!existingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'size-highlight-indicator';
                indicator.title = `Largest node size in family group (size: ${nodeSize})`;
                indicator.innerHTML = '⭐';
                
                // Add to node content area
                const nodeContent = nodeElement.querySelector('.node-content');
                if (nodeContent) {
                    nodeContent.appendChild(indicator);
                }
            }
        }
    }

    /**
     * Get node size from DOM element or fetch from API
     */
    function getNodeSizeFromElement(nodeElement) {
        // Try to get from data attribute first
        if (nodeElement.dataset.nodeSize) {
            return parseInt(nodeElement.dataset.nodeSize);
        }
        
        // Fallback to default
        return 20;
    }

    /**
     * Remove all highlights
     */
    function clearHighlights() {
        // Remove CSS classes
        const highlightedElements = document.querySelectorAll('.node.size-highlighted');
        highlightedElements.forEach(node => {
            node.classList.remove('size-highlighted');
            node.removeAttribute('data-large-size');
        });
        
        // Remove indicators
        const indicators = document.querySelectorAll('.size-highlight-indicator');
        indicators.forEach(indicator => {
            indicator.remove();
        });
        
        highlightedNodes.clear();
        
        if (highlightedElements.length > 0 || indicators.length > 0) {
            console.log(`🧹 Cleared ${highlightedElements.length} highlights and ${indicators.length} indicators`);
        }
    }

    /**
     * Update the toggle button state
     */
    function updateToggleButton() {
        const toggleButton = document.getElementById('toggle-size-highlight');
        if (toggleButton) {
            toggleButton.textContent = isEnabled ? 'Disable Size Highlights' : 'Enable Size Highlights';
            toggleButton.classList.toggle('active', isEnabled);
        }
    }

    /**
     * Refresh highlights after node operations
     */
    function refreshHighlights() {
        if (isEnabled) {
            console.log('🔄 Refreshing highlights...');
            // Delay to allow DOM updates to complete
            setTimeout(() => {
                applyHighlights();
            }, 200);
        }
    }

    /**
     * Debug function to check current state (with detailed logging)
     */
    function debug() {
        console.log('🐛 NodeSizeHighlightManager Debug Info:');
        console.log(`  - Initialized: ${isInitialized}`);
        console.log(`  - Enabled: ${isEnabled}`);
        console.log(`  - Highlighted nodes: ${highlightedNodes.size}`);
        
        const nodeElements = document.querySelectorAll('.node[data-id]');
        console.log(`  - DOM nodes found: ${nodeElements.length}`);
        
        const highlightedElements = document.querySelectorAll('.node.size-highlighted');
        console.log(`  - Currently highlighted elements: ${highlightedElements.length}`);
        
        const indicators = document.querySelectorAll('.size-highlight-indicator');
        console.log(`  - Star indicators: ${indicators.length}`);
        
        // List all nodes with their IDs (only in debug mode)
        nodeElements.forEach((el, index) => {
            console.log(`  - Node ${index + 1}: ${el.dataset.id}`);
        });
        
        return {
            initialized: isInitialized,
            enabled: isEnabled,
            highlightedCount: highlightedNodes.size,
            domNodesCount: nodeElements.length,
            highlightedElementsCount: highlightedElements.length,
            indicatorsCount: indicators.length
        };
    }

    /**
     * Force apply highlights (for testing)
     */
    function forceApply() {
        console.log('🔧 Force applying highlights...');
        const wasEnabled = isEnabled;
        isEnabled = true;
        applyHighlights().then(() => {
            if (!wasEnabled) {
                console.log('🔧 Restoring original enabled state');
                isEnabled = wasEnabled;
            }
        });
    }

    // Public API
    return {
        initialize,
        toggle,
        getEnabled,
        applyHighlights,
        clearHighlights,
        refreshHighlights,
        debug,
        forceApply
    };
})();

// Make it available globally
window.NodeSizeHighlightManager = NodeSizeHighlightManager;

// Auto-initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing NodeSizeHighlightManager');
    NodeSizeHighlightManager.initialize();
});

console.log('NodeSizeHighlightManager script loaded');