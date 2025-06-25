/**
 * Local Graph Indicators
 * Provides visual indicators in the main outliner for nodes and links that are part of the local graph pool
 */
const LocalGraphIndicators = (function() {
    let isInitialized = false;
    let poolNodes = new Set(); // Set of node IDs in the local graph pool
    let poolLinks = new Set(); // Set of link IDs in the local graph pool
    
    function initialize() {
        if (isInitialized) {
            console.log('LocalGraphIndicators already initialized');
            return;
        }
        
        try {
            // Initialize the indicators system
            loadPoolData();
            setupObservers();
            isInitialized = true;
            console.log('LocalGraphIndicators initialized successfully');
        } catch (error) {
            console.error('Error initializing LocalGraphIndicators:', error);
        }
    }
    
    /**
     * Load current pool data from the server
     */
    async function loadPoolData() {
        try {
            // Use the single /pool endpoint that returns both nodes and links
            const response = await fetch('/api/local-graph/pool');
            
            if (response.ok) {
                const data = await response.json();
                console.log('Pool data loaded:', data);
                
                // Extract node IDs and link IDs from the response
                poolNodes = new Set(data.nodes.map(node => node.node_id));
                poolLinks = new Set(data.links.map(link => link.link_id));
                
                console.log('Pool nodes set:', Array.from(poolNodes));
                console.log('Pool links set:', Array.from(poolLinks));
            } else {
                console.error('Failed to load pool data:', response.status);
            }
            
            // Apply indicators to existing DOM elements
            updateAllIndicators();
            
        } catch (error) {
            console.error('Error loading pool data:', error);
        }
    }
    
    /**
     * Setup observers to watch for DOM changes and apply indicators
     */
    function setupObservers() {
        // Observer for dynamically added nodes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a node element or contains node elements
                        applyIndicatorsToElement(node);
                        
                        // Also check child elements
                        const nodeElements = node.querySelectorAll ? node.querySelectorAll('[data-node-id]') : [];
                        nodeElements.forEach(applyIndicatorsToElement);
                        
                        // Check for link elements
                        const linkElements = node.querySelectorAll ? node.querySelectorAll('[data-link-id]') : [];
                        linkElements.forEach(applyIndicatorsToElement);
                    }
                });
            });
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Apply indicators to all existing elements
     */
    function updateAllIndicators() {
        // Find all node elements
        const nodeElements = document.querySelectorAll('[data-node-id]');
        nodeElements.forEach(applyIndicatorsToElement);
        
        // Find all link elements
        const linkElements = document.querySelectorAll('[data-link-id]');
        linkElements.forEach(applyIndicatorsToElement);
        
        // Also check for elements with class patterns
        const nodeContentElements = document.querySelectorAll('.node-content, .node-item, .outliner-node');
        nodeContentElements.forEach(element => {
            const nodeId = extractNodeIdFromElement(element);
            if (nodeId) {
                element.setAttribute('data-node-id', nodeId);
                applyIndicatorsToElement(element);
            }
        });
    }
    
    /**
     * Apply visual indicators to a specific element
     */
    function applyIndicatorsToElement(element) {
        const nodeId = element.getAttribute('data-node-id');
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
     * Extract node ID from element (fallback method)
     */
    function extractNodeIdFromElement(element) {
        // Try various methods to extract node ID
        
        // 1. Direct data attribute
        let nodeId = element.getAttribute('data-node-id');
        if (nodeId) return nodeId;
        
        // 2. From ID attribute pattern
        const id = element.id;
        if (id && id.startsWith('node-')) {
            return id.replace('node-', '');
        }
        
        // 3. From class pattern
        const classes = element.className.split(' ');
        for (const cls of classes) {
            if (cls.startsWith('node-id-')) {
                return cls.replace('node-id-', '');
            }
        }
        
        // 4. From parent element
        const parent = element.closest('[data-node-id]');
        if (parent) {
            return parent.getAttribute('data-node-id');
        }
        
        return null;
    }
    
    /**
     * Add a node to the local graph pool and update indicators
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
            
            // Update indicators
            updateIndicatorsForNode(nodeId);
            
            return true;
        } catch (error) {
            console.error('Error adding node to pool:', error);
            return false;
        }
    }
    
    /**
     * Remove a node from the local graph pool and update indicators
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
            
            // Update indicators
            updateIndicatorsForNode(nodeId);
            
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
     * Update indicators for a specific node
     */
    function updateIndicatorsForNode(nodeId) {
        const elements = document.querySelectorAll(`[data-node-id="${nodeId}"]`);
        elements.forEach(applyIndicatorsToElement);
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
        await loadPoolData();
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
    
    // Public API
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
        updateAllIndicators,
        isInitialized: () => isInitialized
    };
})();

// Add to global scope
window.LocalGraphIndicators = LocalGraphIndicators;