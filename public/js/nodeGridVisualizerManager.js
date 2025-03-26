/**
 * NodeGridVisualizer - Provides a grid visualization of nodes from the outliner
 * Each node is represented as a dot with coordinates [x,y] where:
 * - x represents the depth level (1 = root, 2 = child, etc.)
 * - y represents the sequential order (1, 2, 3, etc.)
 */
const NodeGridVisualizer = (function() {
    // Private variables
    let canvas = null;
    let ctx = null;
    let nodes = [];
    let nodeMap = new Map(); // Maps node IDs to grid coordinates
    let dotRadius = 5;
    let gridSpacing = 40;
    let tooltip = null;
    let currentTooltipNodeId = null;
    let currentLanguage = 'en';
  
    /**
     * Initialize the visualizer
     */
    function initialize() {
      if (window.I18n) {
        currentLanguage = I18n.getCurrentLanguage();
      }
      
      createCanvas();
      createTooltip();
      setupEventListeners();
      
      console.log('NodeGridVisualizer initialized');
    }
    
    /**
     * Create the canvas element
     */
    function createCanvas() {
      // Create container
      const container = document.createElement('div');
      container.id = 'node-grid-container';
      container.className = 'node-grid-container';
      
      // Create controls
      const controls = document.createElement('div');
      controls.className = 'node-grid-controls';
      
      // Fullscreen button
      const fullscreenButton = document.createElement('button');
      fullscreenButton.innerHTML = '🔍';
      fullscreenButton.title = 'Toggle fullscreen';
      fullscreenButton.addEventListener('click', toggleFullscreen);
      controls.appendChild(fullscreenButton);
      
      // Zoom in button
      const zoomInButton = document.createElement('button');
      zoomInButton.innerHTML = '➕';
      zoomInButton.title = 'Zoom in';
      zoomInButton.addEventListener('click', () => adjustZoom(1.2));
      controls.appendChild(zoomInButton);
      
      // Zoom out button
      const zoomOutButton = document.createElement('button');
      zoomOutButton.innerHTML = '➖';
      zoomOutButton.title = 'Zoom out';
      zoomOutButton.addEventListener('click', () => adjustZoom(0.8));
      controls.appendChild(zoomOutButton);
      
      // Scroll to bottom button
      const scrollBottomButton = document.createElement('button');
      scrollBottomButton.innerHTML = '⬇️';
      scrollBottomButton.title = 'Scroll to bottom';
      scrollBottomButton.addEventListener('click', scrollToBottom);
      controls.appendChild(scrollBottomButton);
      
      // Create canvas
      canvas = document.createElement('canvas');
      canvas.id = 'node-grid-canvas';
      canvas.className = 'node-grid-canvas';
      canvas.width = 1200; // Larger initial size
      canvas.height = 800;
      
      // Add legend
      const legend = createLegend();
      
      // Add to container
      container.appendChild(canvas);
      container.appendChild(controls);
      container.appendChild(legend);
      
      // Find the sidebar and add the container after it
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.parentNode) {
        // Insert after sidebar but before content
        const content = document.querySelector('.content');
        if (content) {
          sidebar.parentNode.insertBefore(container, content);
        } else {
          sidebar.parentNode.appendChild(container);
        }
      } else {
        // Fallback - add to body
        document.body.appendChild(container);
      }
      
      // Get context
      ctx = canvas.getContext('2d');
    }
    
    /**
     * Create tooltip element
     */
    function createTooltip() {
      tooltip = document.createElement('div');
      tooltip.id = 'node-grid-tooltip';
      tooltip.className = 'node-grid-tooltip';
      tooltip.style.display = 'none';
      tooltip.style.position = 'absolute';
      document.body.appendChild(tooltip);
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
      if (!canvas) return;
      
      // Mouse move for tooltip
      canvas.addEventListener('mousemove', handleMouseMove);
      
      // Mouse leave to hide tooltip
      canvas.addEventListener('mouseleave', function() {
        hideTooltip();
      });
      
      // Click to focus on node
      canvas.addEventListener('click', handleCanvasClick);
      
      // Window resize to adjust canvas size
      window.addEventListener('resize', handleResize);
      
      // Listen for language changes
      document.addEventListener('languageChanged', function(e) {
        if (e.detail && e.detail.language) {
          currentLanguage = e.detail.language;
          // Redraw with new language
          if (nodes.length > 0) {
            renderNodes(nodes);
          }
        }
      });
    }
    
    /**
     * Handle canvas resize
     */
    function handleResize() {
      if (!canvas) return;
      
      const container = document.getElementById('node-grid-container');
      if (container) {
        // Don't resize canvas to container dimensions
        // Instead, call adjustCanvasSize to ensure all nodes are visible
        adjustCanvasSize();
        
        // Redraw
        if (nodes.length > 0) {
          renderNodes();
        }
      }
    }
    
    /**
     * Handle mouse move over canvas
     */
    function handleMouseMove(e) {
      if (!canvas || !ctx || nodes.length === 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      let hoverNodeId = null;
      
      // Check if mouse is over any dot
      for (const [nodeId, coords] of nodeMap.entries()) {
        const dotX = coords.canvasX;
        const dotY = coords.canvasY;
        
        // Get the node to check its size
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;
        
        // Calculate radius based on node_size
        const nodeSize = node.node_size || 20;
        const radius = (nodeSize / 20) * dotRadius * 1.2;
        
        const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));
        
        if (distance <= radius + 2) { // +2 for better hover detection
          hoverNodeId = nodeId;
          break;
        }
      }
      
      if (hoverNodeId) {
        showTooltip(hoverNodeId, e.clientX, e.clientY);
      } else {
        hideTooltip();
      }
    }
    
    /**
     * Handle click on canvas
     */
    function handleCanvasClick(e) {
      if (!canvas || nodes.length === 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if click is on any dot
      for (const [nodeId, coords] of nodeMap.entries()) {
        const dotX = coords.canvasX;
        const dotY = coords.canvasY;
        
        const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));
        
        if (distance <= dotRadius + 2) {
          // Focus on this node if BreadcrumbManager is available
          if (window.BreadcrumbManager) {
            BreadcrumbManager.focusOnNode(nodeId);
          }
          break;
        }
      }
    }
    
    /**
     * Show tooltip for a node
     */
    function showTooltip(nodeId, clientX, clientY) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        hideTooltip();
        return;
      }
      
      // Only update if it's a different node
      if (currentTooltipNodeId !== nodeId) {
        currentTooltipNodeId = nodeId;
        
        const coords = nodeMap.get(nodeId);
        const nodeContent = currentLanguage === 'en' ? 
          node.content : (node.content_zh || node.content);
        
        // Add node size information to the tooltip
        const nodeSize = node.node_size || 20; // Default to 20 if not set
        tooltip.innerHTML = `
          <div class="tooltip-title">${nodeContent}</div>
          <div class="tooltip-coords">Coordinates: [${coords.x}, ${coords.y}]</div>
          <div class="tooltip-id">ID: ${node.id}</div>
          <div class="tooltip-size">Node Size: ${nodeSize}</div>
        `;
      }
      
      // Position the tooltip
      tooltip.style.left = (clientX + 10) + 'px';
      tooltip.style.top = (clientY + 10) + 'px';
      tooltip.style.display = 'block';
    }
    
    /**
     * Hide tooltip
     */
    function hideTooltip() {
      if (tooltip) {
        tooltip.style.display = 'none';
        currentTooltipNodeId = null;
      }
    }
    
    /**
     * Visualize nodes on the grid
     * @param {Array} nodeData - Array of node objects
     */
    function visualizeNodes(nodeData) {
      if (!canvas || !ctx) {
        console.error('Canvas not initialized');
        return;
      }
      
      nodes = nodeData;
      
      // Calculate grid coordinates
      calculateGridCoordinates(nodes);
      
      // Adjust canvas size if needed
      adjustCanvasSize();
      
      // Render nodes
      renderNodes(nodes);
    }
    
    /**
     * Calculate grid coordinates for all nodes
     */
    function calculateGridCoordinates(nodeData) {
      nodeMap.clear();
      
      let nextY = 1; // Start Y at 1
      
      // Process root nodes first
      for (const node of nodeData) {
        // Process this node and its descendants recursively
        processNode(node, 1, nextY++);
      }
    }
    
    /**
     * Process a node and its descendants recursively to assign coordinates
     */
    function processNode(node, x, y) {
      // Assign coordinates to this node
      nodeMap.set(node.id, { x, y, canvasX: x * gridSpacing, canvasY: y * gridSpacing });
      
      let nextY = y + 1;
      
      // Process children if available and node is expanded
      if (node.children && node.is_expanded) {
        // This is not working correctly because it's using an async operation 
        // but not waiting for it to complete before returning
        for (const child of node.children) {
          processNode(child, x + 1, nextY);
          nextY++;
        }
      }
      
      return nextY;
    }
    
    /**
     * Get children for a node, either from loaded data or via API
     */
    async function getNodeChildren(node) {
      if (node.children) {
        return node.children;
      }
      
      // Fetch children via API
      try {
        return await window.fetchChildren(node.id);
      } catch (error) {
        console.error(`Error fetching children for node ${node.id}:`, error);
        return [];
      }
    }
    
    /**
     * Adjust canvas size based on node count and distribution
     */
    function adjustCanvasSize() {
      if (!canvas) return;
      
      // Find max X and Y coordinates
      let maxX = 1;
      let maxY = 1;
      
      for (const coords of nodeMap.values()) {
        maxX = Math.max(maxX, coords.x);
        maxY = Math.max(maxY, coords.y);
      }
      
      // Add padding
      const width = (maxX + 1) * gridSpacing + 100; // Add extra padding for right edge
      const height = (maxY + 1) * gridSpacing + 100; // Add extra padding for bottom edge
      
      // Set canvas size to accommodate all nodes
      canvas.width = Math.max(width, 1200); // Ensure minimum width
      canvas.height = Math.max(height, 800); // Ensure minimum height
      
      console.log(`Canvas resized to ${canvas.width} × ${canvas.height} to fit nodes with max coordinates [${maxX}, ${maxY}]`);
    }
    
    /**
     * Render nodes on the canvas
     */
    function renderNodes() {
      if (!canvas || !ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid lines
      drawGrid();
      
      // Draw dots for all nodes
      for (const [nodeId, coords] of nodeMap.entries()) {
        drawNodeDot(nodeId, coords.canvasX, coords.canvasY);
      }
      
      // Draw connections between parent and child nodes
      drawConnections();
      
      // Draw connections for links between nodes
      drawLinkConnections();
    }
    
    /**
     * Draw grid lines
     */
    function drawGrid() {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      
      // Calculate number of lines needed
      const xLines = Math.floor(canvas.width / gridSpacing);
      const yLines = Math.floor(canvas.height / gridSpacing);
      
      // Draw vertical lines
      for (let i = 1; i <= xLines; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSpacing, 0);
        ctx.lineTo(i * gridSpacing, canvas.height);
        ctx.stroke();
        
        // Add X-axis labels
        ctx.fillStyle = '#999';
        ctx.font = '10px Arial';
        ctx.fillText(i.toString(), i * gridSpacing, 10);
      }
      
      // Draw horizontal lines
      for (let i = 1; i <= yLines; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSpacing);
        ctx.lineTo(canvas.width, i * gridSpacing);
        ctx.stroke();
        
        // Add Y-axis labels
        ctx.fillStyle = '#999';
        ctx.font = '10px Arial';
        ctx.fillText(i.toString(), 5, i * gridSpacing + 3);
      }
    }
    
    /**
     * Draw a dot representing a node (improved for better visibility)
     */
    function drawNodeDot(nodeId, x, y) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Use different colors for different node types
      let fillColor = '#4285F4'; // Default blue
      
      // Change color if node has markdown
      if (node.has_markdown) {
        fillColor = '#0F9D58'; // Green
      }
      
      // Use node_size to determine dot radius, or fall back to default
      const nodeSize = node.node_size || 20;
      // Scale the radius based on node_size and grid spacing
      const radius = (nodeSize / 20) * dotRadius * 1.2;
      
      // Draw dot with a subtle glow effect
      ctx.beginPath();
      ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Draw outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Add node coordinates as tiny labels
      const coords = nodeMap.get(nodeId);
      if (coords) {
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText(`${coords.x},${coords.y}`, x + radius + 3, y + 3);
      }
    }
    
    /**
     * Draw connections between parent and child nodes
     */
    function drawConnections() {
      // Create a map of parent-child relationships
      const relationships = new Map();
      
      // First pass: identify parent-child relationships
      for (const node of nodes) {
        if (node.parent_id) {
          if (!relationships.has(node.parent_id)) {
            relationships.set(node.parent_id, []);
          }
          relationships.get(node.parent_id).push(node.id);
        }
      }
      
      // Second pass: draw connections
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      
      for (const [parentId, childIds] of relationships.entries()) {
        const parentCoords = nodeMap.get(parentId);
        if (!parentCoords) continue;
        
        for (const childId of childIds) {
          const childCoords = nodeMap.get(childId);
          if (!childCoords) continue;
          
          // Draw line from parent to child
          ctx.beginPath();
          ctx.moveTo(parentCoords.canvasX, parentCoords.canvasY);
          ctx.lineTo(childCoords.canvasX, childCoords.canvasY);
          ctx.stroke();
        }
      }
    }
    
    /**
     * Draw connections between linked nodes (separate from parent-child relationships)
     */
    function drawLinkConnections() {
      // Set styling for link connections - make them distinct from parent-child connections
      ctx.strokeStyle = '#e74c3c'; // Red color for links
      ctx.lineWidth = 1.5;
      
      // Use dashed lines for links to differentiate from parent-child solid lines
      ctx.setLineDash([4, 3]);
      
      // Create a map to store all links we'll draw
      const linkMap = new Map();
      
      // Collect all node IDs in the visualization
      const nodeIds = Array.from(nodeMap.keys());
      
      // Process each node to find its links
      for (const node of nodes) {
        // Skip nodes without links
        if (!node.links || (!node.links.outgoing && !node.links.incoming)) {
          continue;
        }
        
        // Process outgoing links
        if (node.links.outgoing) {
          for (const link of node.links.outgoing) {
            // Only draw the link if both nodes are in the visualization
            if (nodeMap.has(link.to_node_id)) {
              // Create a unique key for this link to avoid drawing duplicates
              const linkKey = `${node.id}-${link.to_node_id}`;
              
              // Store the link data with its weight
              linkMap.set(linkKey, {
                fromId: node.id,
                toId: link.to_node_id,
                weight: link.weight || 1
              });
            }
          }
        }
        
        // We don't need to process incoming links as they would be covered by other nodes' outgoing links
      }
      
      // Draw all the links
      for (const [key, link] of linkMap.entries()) {
        const fromCoords = nodeMap.get(link.fromId);
        const toCoords = nodeMap.get(link.toId);
        
        if (!fromCoords || !toCoords) continue;
        
        // Draw line from source to target
        ctx.beginPath();
        ctx.moveTo(fromCoords.canvasX, fromCoords.canvasY);
        ctx.lineTo(toCoords.canvasX, toCoords.canvasY);
        
        // Optional: Adjust line width based on link weight
        ctx.lineWidth = Math.max(0.5, Math.min(3, link.weight));
        
        ctx.stroke();
      }
      
      // Reset line dash to solid lines for other drawing operations
      ctx.setLineDash([]);
    }
    
    /**
     * Load and visualize all nodes
     */
    async function loadAndVisualizeAllNodes() {
      try {
        console.log('Loading all nodes for grid visualization...');
        const response = await fetch(`/api/nodes?lang=${currentLanguage}`);
        const rootNodes = await response.json();
        
        console.log(`Loaded ${rootNodes.length} root nodes, starting sequential coordinate assignment`);
        
        // Clear previous data
        nodes = [];
        nodeMap.clear();
        
        // Create a flat array for all visible nodes with their hierarchy info
        let allNodes = [];
        let flattenedIndex = 1; // Start Y at 1
        
        // First, collect all visible nodes in a flat structure
        for (const rootNode of rootNodes) {
          await collectNodesRecursively(rootNode, 1, null, allNodes);
        }
        
        console.log(`Collected ${allNodes.length} total nodes for visualization`);
        
        // Then assign sequential y-coordinates
        allNodes.forEach((nodeInfo, index) => {
          const y = index + 1; // Sequential y-coordinate starting from 1
          const { node, depth, parentId } = nodeInfo;
          
          // Add to our nodes collection
          nodes.push(node);
          
          // Set coordinates in the map
          nodeMap.set(node.id, { 
            x: depth, 
            y: y, 
            canvasX: depth * gridSpacing, 
            canvasY: y * gridSpacing 
          });
          
          console.log(`Node ${node.id} assigned coordinates [${depth},${y}] (content: ${node.content.substring(0, 20)}...)`);
        });
        
        console.log(`Total nodes processed: ${nodes.length}`);
        
        // Fetch links for all nodes in the visualization
        await fetchNodesLinks();
        
        // Adjust canvas size
        adjustCanvasSize();
        
        // Render nodes
        renderNodes();
      } catch (error) {
        console.error('Error loading nodes for visualization:', error);
      }
    }
    
    /**
     * Helper function to collect all nodes recursively
     */
    async function collectNodesRecursively(node, depth, parentId, allNodes) {
      // Add this node to our collection
      allNodes.push({ node, depth, parentId });
      
      // If the node is expanded, collect its children
      if (node.is_expanded) {
        try {
          // Fetch the node's children
          let children = [];
          try {
            // Use direct API call for consistency
            const response = await fetch(`/api/nodes/${node.id}/children?lang=${currentLanguage}`);
            children = await response.json();
            console.log(`Fetched ${children.length} children for node ${node.id}`);
          } catch (error) {
            console.error(`Error fetching children for node ${node.id}:`, error);
            children = [];
          }
          
          // Process each child
          for (const child of children) {
            await collectNodesRecursively(child, depth + 1, node.id, allNodes);
          }
        } catch (error) {
          console.error(`Error processing children for node ${node.id}:`, error);
        }
      }
    }
    
    /**
     * Fetch links for all nodes in the visualization
     */
    async function fetchNodesLinks() {
      try {
        // Create a map of node IDs in our visualization
        const nodeIdsInVisualization = new Set(nodes.map(node => node.id));
        
        // Fetch links for each node
        for (const node of nodes) {
          const response = await fetch(`/api/nodes/${node.id}/links`);
          const linkData = await response.json();
          
          // Store the links with the node
          node.links = linkData;
        }
        
        console.log('Fetched links for all nodes in visualization');
      } catch (error) {
        console.error('Error fetching node links:', error);
      }
    }
    
    /**
     * Update language setting
     */
    function updateLanguage(language) {
      currentLanguage = language;
      
      // Reload and redraw with new language
      if (canvas && ctx) {
        loadAndVisualizeAllNodes();
      }
    }
    
    /**
     * Toggle visibility of the grid visualizer
     */
    function toggleVisibility() {
      const container = document.getElementById('node-grid-container');
      if (container) {
        if (container.style.display === 'none') {
          container.style.display = 'block';
          loadAndVisualizeAllNodes(); // Refresh data when showing
        } else {
          container.style.display = 'none';
          hideTooltip();
        }
      }
    }
    
    /**
     * Create a legend for the visualization
     */
    function createLegend() {
      const legend = document.createElement('div');
      legend.className = 'node-grid-legend';
      
      // Regular node
      const regularNode = document.createElement('div');
      regularNode.className = 'node-grid-legend-item';
      
      const regularColor = document.createElement('div');
      regularColor.className = 'node-grid-legend-color';
      regularColor.style.backgroundColor = '#4285F4';
      
      regularNode.appendChild(regularColor);
      regularNode.appendChild(document.createTextNode('Regular node'));
      
      // Markdown node
      const markdownNode = document.createElement('div');
      markdownNode.className = 'node-grid-legend-item';
      
      const markdownColor = document.createElement('div');
      markdownColor.className = 'node-grid-legend-color';
      markdownColor.style.backgroundColor = '#0F9D58';
      
      markdownNode.appendChild(markdownColor);
      markdownNode.appendChild(document.createTextNode('Node with markdown'));
      
      // Add connection types to the legend
      const parentChildConn = document.createElement('div');
      parentChildConn.className = 'node-grid-legend-item';
      
      const parentChildLine = document.createElement('div');
      parentChildLine.className = 'node-grid-legend-line';
      parentChildLine.style.backgroundColor = '#bbb';
      
      parentChildConn.appendChild(parentChildLine);
      parentChildConn.appendChild(document.createTextNode('Parent-child connection'));
      
      const linkConn = document.createElement('div');
      linkConn.className = 'node-grid-legend-item';
      
      const linkLine = document.createElement('div');
      linkLine.className = 'node-grid-legend-line link-line';
      linkLine.style.backgroundColor = '#e74c3c';
      
      linkConn.appendChild(linkLine);
      linkConn.appendChild(document.createTextNode('Link connection'));
      
      legend.appendChild(regularNode);
      legend.appendChild(markdownNode);
      legend.appendChild(parentChildConn);
      legend.appendChild(linkConn);
      
      return legend;
    }
    
    /**
     * Toggle fullscreen mode
     */
    function toggleFullscreen() {
      const container = document.getElementById('node-grid-container');
      if (!container) return;
      
      if (container.classList.contains('node-grid-fullscreen')) {
        // Exit fullscreen
        container.classList.remove('node-grid-fullscreen');
        document.body.style.overflow = '';
      } else {
        // Enter fullscreen
        container.classList.add('node-grid-fullscreen');
        document.body.style.overflow = 'hidden';
      }
      
      // Adjust canvas size and redraw
      handleResize();
    }
    
    /**
     * Adjust zoom level
     */
    function adjustZoom(factor) {
      // Change grid spacing to zoom in/out
      gridSpacing = Math.max(20, Math.min(100, gridSpacing * factor));
      
      // Recalculate node positions based on new grid spacing
      for (const [nodeId, coords] of nodeMap.entries()) {
        coords.canvasX = coords.x * gridSpacing;
        coords.canvasY = coords.y * gridSpacing;
      }
      
      // Adjust canvas size and redraw
      adjustCanvasSize();
      renderNodes();
    }
    
    // Add this function to scroll to the bottom of the graph
    function scrollToBottom() {
      const container = document.getElementById('node-grid-container');
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    
    // Public API
    return {
      initialize,
      visualizeNodes,
      loadAndVisualizeAllNodes,
      updateLanguage,
      toggleVisibility
    };
  })();
  
  // Make it available globally
  window.NodeGridVisualizer = NodeGridVisualizer;