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
      
      // Create canvas
      canvas = document.createElement('canvas');
      canvas.id = 'node-grid-canvas';
      canvas.className = 'node-grid-canvas';
      canvas.width = 800;
      canvas.height = 600;
      
      // Add to container
      container.appendChild(canvas);
      
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
        // Set canvas size to match container
        canvas.width = container.clientWidth;
        canvas.height = Math.max(600, nodes.length * 20); // Ensure enough height for all nodes
        
        // Redraw
        if (nodes.length > 0) {
          renderNodes(nodes);
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
        
        const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));
        
        if (distance <= dotRadius + 2) { // +2 for better hover detection
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
        
        tooltip.innerHTML = `
          <div class="tooltip-title">${nodeContent}</div>
          <div class="tooltip-coords">Coordinates: [${coords.x}, ${coords.y}]</div>
          <div class="tooltip-id">ID: ${node.id}</div>
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
      const width = (maxX + 1) * gridSpacing;
      const height = (maxY + 1) * gridSpacing;
      
      // Only resize if needed
      if (canvas.width < width) {
        canvas.width = width;
      }
      
      if (canvas.height < height) {
        canvas.height = height;
      }
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
     * Draw a dot representing a node
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
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Draw outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add node coordinates as tiny labels
      const coords = nodeMap.get(nodeId);
      if (coords) {
        ctx.fillStyle = '#333';
        ctx.font = '8px Arial';
        ctx.fillText(`${coords.x},${coords.y}`, x + 8, y + 8);
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