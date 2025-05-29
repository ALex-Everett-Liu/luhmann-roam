/**
 * Advanced Graph Analysis Visualizer
 * Neo4j Labs-inspired interface
 */
const GraphAnalysisVisualizer = (function() {
    let cy;
    let container;
    let controlPanel;
    let currentAnalysis = null;
    
    function initialize() {
      createContainer();
      createControlPanel();
      setupEventHandlers();
    }
    
    function createContainer() {
      // Create main container
      container = document.createElement('div');
      container.id = 'graph-analysis-container';
      container.className = 'graph-analysis-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #1a1a1a;
        z-index: 1000;
        display: none;
      `;
      
      // Create graph area
      const graphArea = document.createElement('div');
      graphArea.id = 'graph-canvas';
      graphArea.style.cssText = `
        width: calc(100% - 300px);
        height: 100%;
        float: left;
      `;
      
      container.appendChild(graphArea);
      document.body.appendChild(container);
    }
    
    function createControlPanel() {
      controlPanel = document.createElement('div');
      controlPanel.className = 'graph-control-panel';
      controlPanel.style.cssText = `
        width: 300px;
        height: 100%;
        background: #2a2a2a;
        color: white;
        padding: 20px;
        box-sizing: border-box;
        float: right;
        overflow-y: auto;
      `;
      
      controlPanel.innerHTML = `
        <div class="control-section">
          <h3>Graph Analysis</h3>
          <button id="close-graph-analysis" style="float: right;">×</button>
        </div>
        
        <div class="control-section">
          <h4>Layout</h4>
          <select id="graph-layout-selector">
            <option value="cose">Force-directed (Cose)</option>
            <option value="circle">Circle</option>
            <option value="grid">Grid</option>
            <option value="breadthfirst">Hierarchical</option>
            <option value="concentric">Concentric</option>
          </select>
          <button id="apply-graph-layout">Apply Layout</button>
        </div>
        
        <div class="control-section">
          <h4>Centrality Analysis</h4>
          <select id="centrality-algorithm">
            <option value="pagerank">PageRank</option>
            <option value="betweenness">Betweenness</option>
            <option value="closeness">Closeness</option>
          </select>
          <button id="run-centrality">Calculate Centrality</button>
          <div id="centrality-results"></div>
        </div>
        
        <div class="control-section">
          <h4>Community Detection</h4>
          <select id="community-algorithm">
            <option value="louvain">Louvain</option>
          </select>
          <button id="detect-communities">Detect Communities</button>
          <div id="community-results"></div>
        </div>
        
        <div class="control-section">
          <h4>Graph Statistics</h4>
          <div id="graph-stats"></div>
        </div>
        
        <div class="control-section">
          <h4>Node Information</h4>
          <div id="node-info">Select a node to see details</div>
        </div>
      `;
      
      container.appendChild(controlPanel);
    }
    
    function setupEventHandlers() {
      // Close button
      document.getElementById('close-graph-analysis').addEventListener('click', hide);
      
      // Layout controls
      document.getElementById('apply-graph-layout').addEventListener('click', applyLayout);
      
      // Analysis controls
      document.getElementById('run-centrality').addEventListener('click', runCentralityAnalysis);
      document.getElementById('detect-communities').addEventListener('click', detectCommunities);
    }
    
    async function show() {
      container.style.display = 'block';
      await loadGraphData();
    }
    
    function hide() {
      container.style.display = 'none';
    }
    
    async function loadGraphData() {
      try {
        const response = await fetch('/api/graph/analysis');
        const data = await response.json();
        
        renderGraph(data);
        updateStats(data.stats);
      } catch (error) {
        console.error('Error loading graph data:', error);
      }
    }
    
    function renderGraph(data) {
      const graphCanvas = document.getElementById('graph-canvas');
      
      cy = cytoscape({
        container: graphCanvas,
        elements: [
          ...data.vertices.map(v => ({
            data: {
              id: v.id,
              label: v.label,
              type: v.type,
              metrics: v.metrics || {}
            }
          })),
          ...data.edges.map(e => ({
            data: {
              id: e.id,
              source: e.source_vertex_id,
              target: e.target_vertex_id,
              weight: e.weight,
              type: e.relationship_type
            }
          }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#3498db',
              'label': 'data(label)',
              'width': 30,
              'height': 30,
              'font-size': '12px',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#ffffff',
              'text-outline-width': 2,
              'text-outline-color': '#2c3e50'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#95a5a6',
              'target-arrow-color': '#95a5a6',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'background-color': '#e74c3c',
              'border-width': 3,
              'border-color': '#c0392b'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          padding: 30
        }
      });
      
      // Node selection handler
      cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        showNodeInfo(node.data());
      });
    }
    
    function showNodeInfo(nodeData) {
      const nodeInfo = document.getElementById('node-info');
      let html = `
        <h5>${nodeData.label}</h5>
        <p><strong>ID:</strong> ${nodeData.id}</p>
        <p><strong>Type:</strong> ${nodeData.type}</p>
      `;
      
      if (nodeData.metrics && Object.keys(nodeData.metrics).length > 0) {
        html += '<h6>Metrics:</h6>';
        Object.entries(nodeData.metrics).forEach(([category, metrics]) => {
          html += `<p><strong>${category}:</strong></p>`;
          Object.entries(metrics).forEach(([metric, value]) => {
            html += `<p style="margin-left: 10px;">${metric}: ${value.toFixed(4)}</p>`;
          });
        });
      }
      
      nodeInfo.innerHTML = html;
    }
    
    function applyLayout() {
      const layoutName = document.getElementById('graph-layout-selector').value;
      const layout = cy.layout({ name: layoutName, animate: true });
      layout.run();
    }
    
    async function runCentralityAnalysis() {
      const algorithm = document.getElementById('centrality-algorithm').value;
      const resultsDiv = document.getElementById('centrality-results');
      
      resultsDiv.innerHTML = 'Calculating...';
      
      try {
        const response = await fetch('/api/graph/centrality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ algorithm })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update node sizes based on centrality
          updateNodeVisualization('centrality', algorithm, result.results);
          
          // Show top nodes
          const sortedNodes = Object.entries(result.results)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
          
          let html = `<h6>Top 5 by ${algorithm}:</h6>`;
          sortedNodes.forEach(([nodeId, score]) => {
            const node = cy.getElementById(nodeId);
            const label = node.data('label') || nodeId;
            html += `<p>${label}: ${score.toFixed(4)}</p>`;
          });
          
          resultsDiv.innerHTML = html;
        }
      } catch (error) {
        resultsDiv.innerHTML = 'Error calculating centrality';
        console.error('Centrality error:', error);
      }
    }
    
    async function detectCommunities() {
      const algorithm = document.getElementById('community-algorithm').value;
      const resultsDiv = document.getElementById('community-results');
      
      resultsDiv.innerHTML = 'Detecting communities...';
      
      try {
        const response = await fetch('/api/graph/communities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ algorithm })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Color nodes by community
          updateNodeVisualization('community', algorithm, result.communities);
          
          resultsDiv.innerHTML = `
            <h6>Communities Found: ${result.communityCount}</h6>
            <p>Modularity: ${result.modularity.toFixed(4)}</p>
          `;
        }
      } catch (error) {
        resultsDiv.innerHTML = 'Error detecting communities';
        console.error('Community detection error:', error);
      }
    }
    
    function updateNodeVisualization(analysisType, algorithm, results) {
      if (analysisType === 'centrality') {
        // Scale node sizes by centrality scores
        const maxScore = Math.max(...Object.values(results));
        const minScore = Math.min(...Object.values(results));
        
        Object.entries(results).forEach(([nodeId, score]) => {
          const normalizedScore = (score - minScore) / (maxScore - minScore);
          const size = 20 + (normalizedScore * 40); // 20-60px range
          
          cy.getElementById(nodeId).style({
            'width': size,
            'height': size,
            'background-color': `hsl(${normalizedScore * 240}, 70%, 50%)`
          });
        });
      } else if (analysisType === 'community') {
        // Color nodes by community
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        const communities = {};
        
        Object.entries(results).forEach(([nodeId, communityId]) => {
          if (!communities[communityId]) {
            communities[communityId] = colors[Object.keys(communities).length % colors.length];
          }
          
          cy.getElementById(nodeId).style({
            'background-color': communities[communityId]
          });
        });
      }
    }
    
    function updateStats(stats) {
      const statsDiv = document.getElementById('graph-stats');
      statsDiv.innerHTML = `
        <p><strong>Vertices:</strong> ${stats.vertexCount}</p>
        <p><strong>Edges:</strong> ${stats.edgeCount}</p>
        <p><strong>Density:</strong> ${stats.density.toFixed(4)}</p>
      `;
    }
    
    return {
      initialize,
      show,
      hide,
      isVisible: () => container && container.style.display !== 'none'
    };
  })();
  
  window.GraphAnalysisVisualizer = GraphAnalysisVisualizer;