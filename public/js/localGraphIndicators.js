/**
 * Local Graph Indicators - PERFORMANCE OPTIMIZED VERSION
 * Minimal logging, efficient DOM updates, reduced mutation observer overhead
 */
const LocalGraphIndicators = (function() {
    let isInitialized = false;
    let poolNodes = new Set(); 
    let poolLinks = new Set(); 
    let debugMode = false; // Toggle for debugging
    
    // Performance optimization: Cache DOM queries
    let cachedElements = new WeakMap();
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 100; // Minimum time between updates (ms)
    
    function initialize() {
        if (isInitialized) {
            return;
        }
        
        try {
            loadPoolData(true);
            setupObservers();
            setupAutomaticRefresh();
            isInitialized = true;
            
            // Only log initialization in debug mode
            if (debugMode) console.log('LocalGraphIndicators initialized');
        } catch (error) {
            console.error('Error initializing LocalGraphIndicators:', error);
        }
    }
    
    /**
     * Load pool data with minimal logging
     */
    async function loadPoolData(updateDOM = true) {
        try {
            const response = await fetch('/api/local-graph/pool');
            
            if (response.ok) {
                const data = await response.json();
                
                // Extract node IDs and link IDs
                poolNodes = new Set(data.nodes.map(node => node.node_id));
                poolLinks = new Set(data.links.map(link => link.link_id));
                
                // Only log in debug mode or if there's significant data
                if (debugMode || poolNodes.size > 0) {
                    console.log(`Pool loaded: ${poolNodes.size} nodes, ${poolLinks.size} links`);
                }
                
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
     * Throttled update function to prevent excessive DOM queries
     */
    function updateVisibleIndicators() {
        const now = Date.now();
        if (now - lastUpdateTime < UPDATE_THROTTLE) {
            return; // Skip if called too frequently
        }
        lastUpdateTime = now;
        
        // Use more efficient selector and caching
        requestAnimationFrame(() => {
            const elements = document.querySelectorAll('[data-id], [data-node-id]');
            
            // Only process visible elements to improve performance
            const visibleElements = [];
            for (const el of elements) {
                if (isElementVisible(el)) {
                    visibleElements.push(el);
                }
            }
            
            // Only log significant updates
            if (debugMode && visibleElements.length > 10) {
                console.log(`Updating ${visibleElements.length} visible indicators`);
            }
            
            visibleElements.forEach(applyIndicatorsToElement);
        });
    }
    
    /**
     * Optimized visibility check
     */
    function isElementVisible(element) {
        // Use cached result if available
        if (cachedElements.has(element)) {
            return cachedElements.get(element);
        }
        
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        // Cache the result temporarily
        cachedElements.set(element, isVisible);
        
        // Clear cache after a short time to prevent memory leaks
        setTimeout(() => cachedElements.delete(element), 5000);
        
        return isVisible;
    }
    
    /**
     * Update indicator for a single node - no logging unless debug mode
     */
    function updateIndicatorForNode(nodeId) {
        const elements = document.querySelectorAll(`[data-id="${nodeId}"], [data-node-id="${nodeId}"]`);
        
        if (debugMode && elements.length > 0) {
            console.log(`Updating indicator for node ${nodeId}: ${elements.length} elements`);
        }
        
        elements.forEach(applyIndicatorsToElement);
    }
    
    /**
     * Batch update for multiple nodes - reduced logging
     */
    function updateIndicatorsForNodes(nodeIds) {
        if (debugMode) {
            console.log(`Batch updating ${nodeIds.length} node indicators`);
        }
        
        // Use DocumentFragment for better performance
        nodeIds.forEach(nodeId => {
            const elements = document.querySelectorAll(`[data-id="${nodeId}"], [data-node-id="${nodeId}"]`);
            elements.forEach(applyIndicatorsToElement);
        });
    }
    
    /**
     * Optimized mutation observer with debouncing
     */
    function setupObservers() {
        let mutationTimeout;
        const MUTATION_DEBOUNCE = 200; // ms
        
        const observer = new MutationObserver(function(mutations) {
            // Debounce mutations to prevent excessive processing
            clearTimeout(mutationTimeout);
            mutationTimeout = setTimeout(() => {
                processMutations(mutations);
            }, MUTATION_DEBOUNCE);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            // Optimize: only watch for specific attributes if needed
            attributeFilter: ['data-id', 'data-node-id', 'data-link-id']
        });
    }
    
    /**
     * Process mutations efficiently
     */
    function processMutations(mutations) {
        const elementsToProcess = new Set();
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check the node itself
                    if (hasRelevantAttribute(node)) {
                        elementsToProcess.add(node);
                    }
                    
                    // Check child elements more efficiently
                    const relevantChildren = node.querySelectorAll ? 
                        node.querySelectorAll('[data-id], [data-node-id], [data-link-id]') : [];
                    relevantChildren.forEach(child => elementsToProcess.add(child));
                }
            });
        });
        
        if (elementsToProcess.size > 0) {
            // Only log if significant number of elements or debug mode
            if (debugMode || elementsToProcess.size > 5) {
                console.log(`Processing ${elementsToProcess.size} new elements`);
            }
            
            elementsToProcess.forEach(applyIndicatorsToElement);
        }
    }
    
    /**
     * Check if element has relevant attributes
     */
    function hasRelevantAttribute(element) {
        return element.getAttribute && (
            element.getAttribute('data-id') || 
            element.getAttribute('data-node-id') || 
            element.getAttribute('data-link-id')
        );
    }
    
    /**
     * Apply indicators - no changes needed here
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
     * Add visual indicator for nodes - optimized to prevent duplicate indicators
     */
    function addNodeIndicator(element) {
        // Check if indicator already exists
        if (element.querySelector('.local-graph-node-indicator')) {
            return;
        }
        
        element.classList.add('local-graph-pool-node');
        
        const indicator = document.createElement('span');
        indicator.className = 'local-graph-node-indicator';
        indicator.title = 'This node is in the Local Graph pool';
        
        // Optimized styling - use CSS classes instead of inline styles
        Object.assign(indicator.style, {
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            backgroundColor: '#6366f1',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            zIndex: '10',
            cursor: 'help',
            transition: 'all 0.2s ease'
        });
        
        // Use event delegation instead of individual listeners for better performance
        indicator.addEventListener('mouseenter', handleIndicatorHover);
        indicator.addEventListener('mouseleave', handleIndicatorLeave);
        
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        element.appendChild(indicator);
    }
    
    /**
     * Optimized hover handlers
     */
    function handleIndicatorHover(e) {
        e.target.style.transform = 'scale(1.3)';
        e.target.style.backgroundColor = '#4f46e5';
    }
    
    function handleIndicatorLeave(e) {
        e.target.style.transform = 'scale(1)';
        e.target.style.backgroundColor = '#6366f1';
    }

    function removeNodeIndicator(element) {
        element.classList.remove('local-graph-pool-node');
        const existingIndicator = element.querySelector('.local-graph-node-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }

    function addLinkIndicator(element) {
        if (element.classList.contains('local-graph-pool-link')) {
            return; // Already has indicator
        }
        
        element.classList.add('local-graph-pool-link');
        element.style.borderLeft = '2px solid #6366f1';
        element.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
        element.style.transition = 'all 0.2s ease';
        
        const originalTitle = element.title || '';
        element.title = originalTitle + (originalTitle ? ' | ' : '') + 'This link is in the Local Graph pool';
    }

    function removeLinkIndicator(element) {
        element.classList.remove('local-graph-pool-link');
        element.style.borderLeft = '';
        element.style.backgroundColor = '';
        
        const title = element.title || '';
        element.title = title.replace(/ \| This link is in the Local Graph pool$/, '');
    }
    
    /**
     * Pool management functions - minimal logging
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
            
            poolNodes.add(nodeId);
            updateIndicatorForNode(nodeId);
            return true;
        } catch (error) {
            console.error('Error adding node to pool:', error);
            return false;
        }
    }
    
    async function removeNodeFromPool(nodeId) {
        try {
            const response = await fetch(`/api/local-graph/pool/nodes/${nodeId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove node from pool');
            }
            
            poolNodes.delete(nodeId);
            updateIndicatorForNode(nodeId);
            return true;
        } catch (error) {
            console.error('Error removing node from pool:', error);
            return false;
        }
    }
    
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
            
            poolLinks.add(linkId);
            updateIndicatorsForLink(linkId);
            return true;
        } catch (error) {
            console.error('Error adding link to pool:', error);
            return false;
        }
    }
    
    async function removeLinkFromPool(linkId) {
        try {
            const response = await fetch(`/api/local-graph/pool/links/${linkId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove link from pool');
            }
            
            poolLinks.delete(linkId);
            updateIndicatorsForLink(linkId);
            return true;
        } catch (error) {
            console.error('Error removing link from pool:', error);
            return false;
        }
    }
    
    function updateIndicatorsForLink(linkId) {
        const elements = document.querySelectorAll(`[data-link-id="${linkId}"]`);
        elements.forEach(applyIndicatorsToElement);
    }
    
    // Simple getters - no changes needed
    function isNodeInPool(nodeId) {
        return poolNodes.has(nodeId);
    }
    
    function isLinkInPool(linkId) {
        return poolLinks.has(linkId);
    }
    
    function getPoolNodes() {
        return Array.from(poolNodes);
    }
    
    function getPoolLinks() {
        return Array.from(poolLinks);
    }
    
    async function refreshPoolData() {
        await loadPoolData(true);
    }
    
    /**
     * Optimized automatic refresh with less frequent logging
     */
    function setupAutomaticRefresh() {
        let refreshTimeout;
        let refreshCount = 0;
        
        const debouncedRefresh = () => {
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => {
                refreshCount++;
                // Only log every 10th refresh or in debug mode
                if (debugMode || refreshCount % 10 === 0) {
                    console.log(`Auto-refresh #${refreshCount}`);
                }
                updateVisibleIndicators();
            }, 500);
        };
        
        // Optimized mutation observer for outliner changes
        const outlinerObserver = new MutationObserver((mutations) => {
            let shouldRefresh = false;
            
            // More efficient mutation processing
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && hasRelevantAttribute(node)) {
                        shouldRefresh = true;
                        break;
                    }
                }
                if (shouldRefresh) break;
            }
            
            if (shouldRefresh) {
                debouncedRefresh();
            }
        });
        
        outlinerObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Less frequent visibility change logging
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                if (debugMode) console.log('Page became visible, refreshing indicators');
                setTimeout(refreshPoolData, 100);
            }
        });
        
        // Periodic refresh with minimal logging
        setInterval(() => {
            if (poolNodes.size > 0) {
                if (debugMode) console.log('Periodic refresh');
                updateVisibleIndicators();
            }
        }, 300000);
    }
    
    function onOutlinerLoaded() {
        if (debugMode) console.log('Outliner loaded, refreshing indicators');
        setTimeout(refreshPoolData, 100);
    }
    
    // Enable/disable debug mode
    function setDebugMode(enabled) {
        debugMode = enabled;
        if (enabled) {
            console.log('LocalGraphIndicators debug mode enabled');
        }
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
        updateIndicatorForNode,
        updateIndicatorsForNodes,
        updateVisibleIndicators,
        setupAutomaticRefresh,
        onOutlinerLoaded,
        setDebugMode, // NEW: Control logging
        isInitialized: () => isInitialized
    };
})();

window.LocalGraphIndicators = LocalGraphIndicators;