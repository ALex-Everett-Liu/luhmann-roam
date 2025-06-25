/**
 * Local Graph Indicators - OPTIMIZED VERSION
 * Only updates specific nodes, not the entire DOM
 */
const LocalGraphIndicators = (function() {
    let isInitialized = false;
    let poolNodes = new Set(); 
    let poolLinks = new Set(); 
    
    function initialize() {
        if (isInitialized) {
            console.log('LocalGraphIndicators already initialized');
            return;
        }
        
        try {
            // Load pool data but DON'T update all indicators immediately
            loadPoolData(false); // false = don't update all DOM
            setupObservers();
            isInitialized = true;
            console.log('LocalGraphIndicators initialized successfully');
        } catch (error) {
            console.error('Error initializing LocalGraphIndicators:', error);
        }
    }
    
    /**
     * Load pool data - OPTIMIZED: only update DOM if requested
     */
    async function loadPoolData(updateDOM = true) {
        try {
            const response = await fetch('/api/local-graph/pool');
            
            if (response.ok) {
                const data = await response.json();
                console.log('Pool data loaded:', data);
                
                // Extract node IDs and link IDs
                poolNodes = new Set(data.nodes.map(node => node.node_id));
                poolLinks = new Set(data.links.map(link => link.link_id));
                
                console.log('Pool nodes set:', Array.from(poolNodes));
                console.log('Pool links set:', Array.from(poolLinks));
                
                // Only update DOM if specifically requested
                if (updateDOM) {
                    updateVisibleIndicators();
                }
            } else {
                console.error('Failed to load pool data:', response.status);
            }
        } catch (error) {
            console.error('Error loading pool data:', error);
        }
    }
    
    /**
     * FIXED: Look for data-id instead of data-node-id
     */
    function updateVisibleIndicators() {
        // Look for elements with data-id (not data-node-id)
        const visibleElements = document.querySelectorAll('[data-id]');
        
        // Filter to only visible elements
        const actuallyVisible = Array.from(visibleElements).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        
        console.log(`Updating indicators for ${actuallyVisible.length} visible elements (out of ${visibleElements.length} total)`);
        
        actuallyVisible.forEach(applyIndicatorsToElement);
    }
    
    /**
     * FIXED: Update indicator for a single specific node using data-id
     */
    function updateIndicatorForNode(nodeId) {
        const elements = document.querySelectorAll(`[data-id="${nodeId}"]`);
        console.log(`Updating indicator for node ${nodeId}: found ${elements.length} elements`);
        elements.forEach(applyIndicatorsToElement);
    }
    
    /**
     * OPTIMIZED: Update indicators for multiple specific nodes
     */
    function updateIndicatorsForNodes(nodeIds) {
        console.log(`Updating indicators for ${nodeIds.length} specific nodes`);
        nodeIds.forEach(nodeId => {
            const elements = document.querySelectorAll(`[data-node-id="${nodeId}"]`);
            elements.forEach(applyIndicatorsToElement);
        });
    }
    
    /**
     * FIXED: Setup observers to watch for both data-id and data-node-id
     */
    function setupObservers() {
        const observer = new MutationObserver(function(mutations) {
            const newNodeElements = [];
            
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for both data-id and data-node-id
                        if (node.getAttribute && (node.getAttribute('data-id') || node.getAttribute('data-node-id'))) {
                            newNodeElements.push(node);
                        }
                        
                        // Check child elements for both attributes
                        const childElements = node.querySelectorAll ? node.querySelectorAll('[data-id], [data-node-id]') : [];
                        newNodeElements.push(...childElements);
                    }
                });
            });
            
            if (newNodeElements.length > 0) {
                console.log(`Processing ${newNodeElements.length} new node elements`);
                newNodeElements.forEach(applyIndicatorsToElement);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * FIXED: Apply indicators to elements with data-id
     */
    function applyIndicatorsToElement(element) {
        const nodeId = element.getAttribute('data-id') || element.getAttribute('data-node-id');
        const linkId = element.getAttribute('data-link-id');
        
        if (nodeId && poolNodes.has(nodeId)) {
            addNodeIndicator(element);
        } else if (nodeId) {
            removeNodeIndicator(element);
        }
        
        if (linkId && poolLinks.has(linkId)) {
            addLinkIndicator(element);
        } else if (linkId) {
            removeLinkIndicator(element);
        }
    }

    /**
     * Add visual indicator for nodes in the local graph pool
     */
    function addNodeIndicator(element) {
        // Remove existing indicator if present
        removeNodeIndicator(element);
        
        // Add CSS class
        element.classList.add('local-graph-pool-node');
        
        // Add visual indicator badge
        const indicator = document.createElement('span');
        indicator.className = 'local-graph-node-indicator';
        indicator.innerHTML = '🌐';
        indicator.title = 'This node is in the Local Graph pool';
        
        // Position the indicator
        const style = {
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            fontSize: '12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            cursor: 'help'
        };
        
        Object.assign(indicator.style, style);
        
        // Make sure parent has relative positioning
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        element.appendChild(indicator);
    }

    /**
     * Remove node indicator
     */
    function removeNodeIndicator(element) {
        element.classList.remove('local-graph-pool-node');
        const existingIndicator = element.querySelector('.local-graph-node-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }

    /**
     * Add visual indicator for links in the local graph pool
     */
    function addLinkIndicator(element) {
        // Remove existing indicator if present
        removeLinkIndicator(element);
        
        // Add CSS class
        element.classList.add('local-graph-pool-link');
        
        // Add subtle border or background change
        element.style.borderLeft = '3px solid #4CAF50';
        element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        
        // Add tooltip
        const originalTitle = element.title || '';
        element.title = originalTitle + (originalTitle ? ' | ' : '') + 'This link is in the Local Graph pool';
    }

    /**
     * Remove link indicator
     */
    function removeLinkIndicator(element) {
        element.classList.remove('local-graph-pool-link');
        element.style.borderLeft = '';
        element.style.backgroundColor = '';
        
        // Clean up title
        const title = element.title || '';
        element.title = title.replace(/ \| This link is in the Local Graph pool$/, '');
    }
    
    /**
     * OPTIMIZED: Add node to pool and update only that node's indicators
     */
    async function addNodeToPool(nodeId, notes = '') {
        try {
            const response = await fetch('/api/local-graph/pool/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId, notes })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add node to pool');
            }
            
            // Update local state
            poolNodes.add(nodeId);
            
            // OPTIMIZED: Only update indicators for this specific node
            updateIndicatorForNode(nodeId);
            
            return true;
        } catch (error) {
            console.error('Error adding node to pool:', error);
            return false;
        }
    }
    
    /**
     * OPTIMIZED: Remove node from pool and update only that node's indicators
     */
    async function removeNodeFromPool(nodeId) {
        try {
            const response = await fetch(`/api/local-graph/pool/nodes/${nodeId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove node from pool');
            }
            
            // Update local state
            poolNodes.delete(nodeId);
            
            // OPTIMIZED: Only update indicators for this specific node
            updateIndicatorForNode(nodeId);
            
            return true;
        } catch (error) {
            console.error('Error removing node from pool:', error);
            return false;
        }
    }
    
    /**
     * Add a link to the local graph pool and update indicators
     */
    async function addLinkToPool(linkId, notes = '') {
        try {
            const response = await fetch('/api/local-graph/pool/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkId, notes })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add link to pool');
            }
            
            // Update local state
            poolLinks.add(linkId);
            
            // Update indicators
            updateIndicatorsForLink(linkId);
            
            return true;
        } catch (error) {
            console.error('Error adding link to pool:', error);
            return false;
        }
    }
    
    /**
     * Remove a link from the local graph pool and update indicators
     */
    async function removeLinkFromPool(linkId) {
        try {
            const response = await fetch(`/api/local-graph/pool/links/${linkId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove link from pool');
            }
            
            // Update local state
            poolLinks.delete(linkId);
            
            // Update indicators
            updateIndicatorsForLink(linkId);
            
            return true;
        } catch (error) {
            console.error('Error removing link from pool:', error);
            return false;
        }
    }
    
    /**
     * Update indicators for a specific link
     */
    function updateIndicatorsForLink(linkId) {
        const elements = document.querySelectorAll(`[data-link-id="${linkId}"]`);
        elements.forEach(applyIndicatorsToElement);
    }
    
    /**
     * Check if a node is in the pool
     */
    function isNodeInPool(nodeId) {
        return poolNodes.has(nodeId);
    }
    
    /**
     * Check if a link is in the pool
     */
    function isLinkInPool(linkId) {
        return poolLinks.has(linkId);
    }
    
    /**
     * Get all nodes in the pool
     */
    function getPoolNodes() {
        return Array.from(poolNodes);
    }
    
    /**
     * Get all links in the pool
     */
    function getPoolLinks() {
        return Array.from(poolLinks);
    }
    
    /**
     * Refresh pool data from server
     */
    async function refreshPoolData() {
        await loadPoolData(true);
    }
    
    /**
     * Add context menu options for pool management
     */
    function addContextMenuIntegration() {
        // This would integrate with your existing context menu system
        // to add "Add to Local Graph Pool" / "Remove from Local Graph Pool" options
        
        document.addEventListener('contextmenu', function(e) {
            const nodeElement = e.target.closest('[data-node-id]');
            const linkElement = e.target.closest('[data-link-id]');
            
            if (nodeElement) {
                const nodeId = nodeElement.getAttribute('data-node-id');
                // Add custom context menu items for node pool management
                // This would need to integrate with your existing context menu system
            }
            
            if (linkElement) {
                const linkId = linkElement.getAttribute('data-link-id');
                // Add custom context menu items for link pool management
            }
        });
    }
    
    // Public API - OPTIMIZED
    return {
        initialize,
        addNodeToPool,
        removeNodeFromPool,
        addLinkToPool,
        removeLinkFromPool,
        isNodeInPool,
        isLinkInPool,
        getPoolNodes,
        getPoolLinks,
        refreshPoolData,
        updateIndicatorForNode,           // NEW: Update single node
        updateIndicatorsForNodes,         // NEW: Update multiple specific nodes
        updateVisibleIndicators,          // NEW: Update only visible elements
        isInitialized: () => isInitialized
    };
})();

// Add to global scope
window.LocalGraphIndicators = LocalGraphIndicators;