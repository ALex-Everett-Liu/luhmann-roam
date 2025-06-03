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
            applyHighlights();
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
        if (!isEnabled) return;

        console.log('Applying node size highlights...');
        
        try {
            // Get all nodes from the server to ensure we have complete data with node_size
            const response = await fetch('/api/nodes?includeChildren=true');
            const rootNodes = await response.json();
            
            // Clear previous highlights
            clearHighlights();
            
            // Build a flat map of all nodes for easy lookup
            const allNodes = new Map();
            await buildNodeMap(rootNodes, allNodes);
            
            // Check each node for highlighting
            for (const [nodeId, nodeData] of allNodes.entries()) {
                if (shouldHighlightNode(nodeId, nodeData, allNodes)) {
                    highlightNode(nodeId);
                    highlightedNodes.add(nodeId);
                }
            }
            
            console.log(`Applied highlights to ${highlightedNodes.size} nodes`);
            
        } catch (error) {
            console.error('Error applying node size highlights:', error);
        }
    }

    /**
     * Recursively build a flat map of all nodes including children
     */
    async function buildNodeMap(nodes, nodeMap) {
        for (const node of nodes) {
            nodeMap.set(node.id, node);
            
            // Get children if they exist and node is expanded
            if (node.is_expanded) {
                try {
                    const childrenResponse = await fetch(`/api/nodes/${node.id}/children`);
                    const children = await childrenResponse.json();
                    await buildNodeMap(children, nodeMap);
                } catch (error) {
                    console.error(`Error fetching children for node ${node.id}:`, error);
                }
            }
        }
    }

    /**
     * Determine if a node should be highlighted based on size comparison
     */
    function shouldHighlightNode(nodeId, nodeData, allNodes) {
        const nodeSize = nodeData.node_size || 20; // Default size is 20
        let maxComparisonSize = nodeSize;
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
        return hasComparisons && nodeSize === maxComparisonSize && nodeSize > 20; // Only highlight if size is above default
    }

    /**
     * Add visual highlight to a node
     */
    function highlightNode(nodeId) {
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.classList.add('size-highlighted');
            
            // Add a small indicator showing the size
            const existingIndicator = nodeElement.querySelector('.size-highlight-indicator');
            if (!existingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'size-highlight-indicator';
                indicator.title = 'Largest node size in family group';
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
     * Remove all highlights
     */
    function clearHighlights() {
        // Remove CSS classes
        document.querySelectorAll('.node.size-highlighted').forEach(node => {
            node.classList.remove('size-highlighted');
        });
        
        // Remove indicators
        document.querySelectorAll('.size-highlight-indicator').forEach(indicator => {
            indicator.remove();
        });
        
        highlightedNodes.clear();
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
            // Delay to allow DOM updates to complete
            setTimeout(() => {
                applyHighlights();
            }, 100);
        }
    }

    // Public API
    return {
        initialize,
        toggle,
        getEnabled,
        applyHighlights,
        clearHighlights,
        refreshHighlights
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