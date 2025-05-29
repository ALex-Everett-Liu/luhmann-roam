const { getDb } = require('../database');
const GraphAnalyzer = require('../lib/graphAnalyzer'); // We'll create this

/**
 * Advanced graph analysis controller
 */

// Get graph data with analysis metrics
exports.getGraphWithAnalysis = async (req, res) => {
  try {
    const db = req.db;
    
    // Fetch vertices with their computed metrics
    const vertices = await db.all(`
      SELECT 
        v.*,
        GROUP_CONCAT(ar.analysis_type || ':' || ar.metric_name || ':' || ar.metric_value) as metrics
      FROM graph_vertices v
      LEFT JOIN graph_analysis_results ar ON v.id = ar.vertex_id
      GROUP BY v.id
    `);
    
    // Fetch edges
    const edges = await db.all('SELECT * FROM graph_edges');
    
    // Process metrics into structured format
    const processedVertices = vertices.map(v => ({
      ...v,
      metrics: v.metrics ? parseMetrics(v.metrics) : {},
      properties: v.properties ? JSON.parse(v.properties) : {}
    }));
    
    const processedEdges = edges.map(e => ({
      ...e,
      properties: e.properties ? JSON.parse(e.properties) : {}
    }));
    
    res.json({
      vertices: processedVertices,
      edges: processedEdges,
      stats: {
        vertexCount: vertices.length,
        edgeCount: edges.length,
        density: GraphAnalyzer.calculateDensity(vertices.length, edges.length)
      }
    });
  } catch (error) {
    console.error('Error fetching graph with analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

// Run centrality analysis
exports.runCentralityAnalysis = async (req, res) => {
  try {
    const { algorithm = 'pagerank' } = req.body;
    const db = req.db;
    
    // Get current graph data
    const vertices = await db.all('SELECT * FROM graph_vertices');
    const edges = await db.all('SELECT * FROM graph_edges');
    
    // Run analysis
    const results = await GraphAnalyzer.calculateCentrality(vertices, edges, algorithm);
    
    // Store results
    await db.run('DELETE FROM graph_analysis_results WHERE analysis_type = ?', ['centrality']);
    
    for (const [vertexId, score] of Object.entries(results)) {
      await db.run(`
        INSERT INTO graph_analysis_results 
        (id, vertex_id, analysis_type, metric_name, metric_value, computed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        require('crypto').randomUUID(),
        vertexId,
        'centrality',
        algorithm,
        score,
        Date.now()
      ]);
    }
    
    res.json({ success: true, algorithm, results });
  } catch (error) {
    console.error('Error running centrality analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

// Community detection
exports.detectCommunities = async (req, res) => {
  try {
    const { algorithm = 'louvain' } = req.body;
    const db = req.db;
    
    const vertices = await db.all('SELECT * FROM graph_vertices');
    const edges = await db.all('SELECT * FROM graph_edges');
    
    const communities = await GraphAnalyzer.detectCommunities(vertices, edges, algorithm);
    
    // Clear previous results
    await db.run('DELETE FROM graph_communities WHERE algorithm = ?', [algorithm]);
    
    // Store new results
    for (const [vertexId, communityId] of Object.entries(communities.assignments)) {
      await db.run(`
        INSERT INTO graph_communities (id, community_id, vertex_id, algorithm, modularity, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        require('crypto').randomUUID(),
        communityId,
        vertexId,
        algorithm,
        communities.modularity,
        Date.now()
      ]);
    }
    
    res.json({ 
      success: true, 
      algorithm, 
      communities: communities.assignments,
      modularity: communities.modularity,
      communityCount: Object.keys(communities.summary).length
    });
  } catch (error) {
    console.error('Error detecting communities:', error);
    res.status(500).json({ error: error.message });
  }
};

function parseMetrics(metricsString) {
  const metrics = {};
  if (metricsString) {
    metricsString.split(',').forEach(metric => {
      const [type, name, value] = metric.split(':');
      if (!metrics[type]) metrics[type] = {};
      metrics[type][name] = parseFloat(value);
    });
  }
  return metrics;
}