const { v4: uuidv4 } = require('uuid');

/**
 * Global Graph Controller
 * Manages global graph visualization with multiple layouts and centrality analysis
 */

// Analysis results cache
let analysisCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Build adjacency list from links (bidirectional)
 */
function buildAdjacencyList(links) {
  const adjacencyList = new Map();
  
  links.forEach(link => {
    // Add forward direction
    if (!adjacencyList.has(link.from_node_id)) {
      adjacencyList.set(link.from_node_id, []);
    }
    adjacencyList.get(link.from_node_id).push({
      nodeId: link.to_node_id,
      weight: link.weight || 1.0,
      linkId: link.id
    });
    
    // Add reverse direction for bidirectional graph traversal
    if (!adjacencyList.has(link.to_node_id)) {
      adjacencyList.set(link.to_node_id, []);
    }
    adjacencyList.get(link.to_node_id).push({
      nodeId: link.from_node_id,
      weight: link.weight || 1.0,
      linkId: link.id
    });
  });
  
  return adjacencyList;
}

/**
 * Calculate degree centrality for all nodes
 */
function calculateDegreeCentrality(nodes, adjacencyList) {
  const centrality = new Map();
  
  nodes.forEach(node => {
    const degree = adjacencyList.get(node.id)?.length || 0;
    centrality.set(node.id, degree);
  });
  
  return centrality;
}

/**
 * Calculate betweenness centrality using Brandes' algorithm
 */
function calculateBetweennessCentrality(nodes, adjacencyList) {
  const centrality = new Map();
  const nodeIds = nodes.map(n => n.id);
  
  // Initialize all centralities to 0
  nodeIds.forEach(nodeId => centrality.set(nodeId, 0));
  
  // For each node as source
  nodeIds.forEach(source => {
    // BFS to find shortest paths
    const stack = [];
    const predecessors = new Map();
    const sigma = new Map(); // number of shortest paths
    const delta = new Map(); // dependency
    const distance = new Map();
    const queue = [source];
    
    nodeIds.forEach(nodeId => {
      predecessors.set(nodeId, []);
      sigma.set(nodeId, 0);
      delta.set(nodeId, 0);
      distance.set(nodeId, -1);
    });
    
    sigma.set(source, 1);
    distance.set(source, 0);
    
    // BFS
    while (queue.length > 0) {
      const current = queue.shift();
      stack.push(current);
      
      const neighbors = adjacencyList.get(current) || [];
      neighbors.forEach(neighbor => {
        const nodeId = neighbor.nodeId;
        
        // First time we see this node
        if (distance.get(nodeId) < 0) {
          queue.push(nodeId);
          distance.set(nodeId, distance.get(current) + 1);
        }
        
        // Shortest path to nodeId via current?
        if (distance.get(nodeId) === distance.get(current) + 1) {
          sigma.set(nodeId, sigma.get(nodeId) + sigma.get(current));
          predecessors.get(nodeId).push(current);
        }
      });
    }
    
    // Accumulation
    while (stack.length > 0) {
      const w = stack.pop();
      predecessors.get(w).forEach(v => {
        delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      });
      
      if (w !== source) {
        centrality.set(w, centrality.get(w) + delta.get(w));
      }
    }
  });
  
  // Normalize for undirected graph
  centrality.forEach((value, nodeId) => {
    centrality.set(nodeId, value / 2);
  });
  
  return centrality;
}

/**
 * Calculate closeness centrality
 */
function calculateClosenessCentrality(nodes, adjacencyList) {
  const centrality = new Map();
  const nodeIds = nodes.map(n => n.id);
  
  nodeIds.forEach(source => {
    const distances = dijkstraDistances(source, adjacencyList, nodeIds);
    const validDistances = Array.from(distances.values()).filter(d => d > 0 && d < Infinity);
    
    if (validDistances.length > 0) {
      const sumDistances = validDistances.reduce((sum, d) => sum + d, 0);
      const closeness = (validDistances.length * (validDistances.length - 1)) / (2 * sumDistances);
      centrality.set(source, closeness);
    } else {
      centrality.set(source, 0);
    }
  });
  
  return centrality;
}

/**
 * Dijkstra's algorithm for shortest paths
 */
function dijkstraDistances(source, adjacencyList, nodeIds) {
  const distances = new Map();
  const visited = new Set();
  const queue = [{ nodeId: source, distance: 0 }];
  
  nodeIds.forEach(nodeId => distances.set(nodeId, Infinity));
  distances.set(source, 0);
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);
    
    const neighbors = adjacencyList.get(current.nodeId) || [];
    neighbors.forEach(neighbor => {
      const newDistance = current.distance + neighbor.weight;
      if (newDistance < distances.get(neighbor.nodeId)) {
        distances.set(neighbor.nodeId, newDistance);
        queue.push({ nodeId: neighbor.nodeId, distance: newDistance });
      }
    });
  }
  
  return distances;
}

/**
 * Calculate PageRank centrality
 */
function calculatePageRankCentrality(nodes, adjacencyList, damping = 0.85, iterations = 100) {
  const centrality = new Map();
  const nodeIds = nodes.map(n => n.id);
  const numNodes = nodeIds.length;
  
  if (numNodes === 0) return centrality;
  
  // Initialize all nodes with equal probability
  nodeIds.forEach(nodeId => centrality.set(nodeId, 1.0 / numNodes));
  
  for (let i = 0; i < iterations; i++) {
    const newCentrality = new Map();
    
    nodeIds.forEach(nodeId => {
      let sum = 0;
      
      // Find all nodes that link to this node
      nodeIds.forEach(otherNodeId => {
        const neighbors = adjacencyList.get(otherNodeId) || [];
        const hasLinkToNode = neighbors.some(n => n.nodeId === nodeId);
        
        if (hasLinkToNode) {
          const outDegree = neighbors.length;
          sum += centrality.get(otherNodeId) / outDegree;
        }
      });
      
      newCentrality.set(nodeId, (1 - damping) / numNodes + damping * sum);
    });
    
    // Update centrality values
    newCentrality.forEach((value, nodeId) => centrality.set(nodeId, value));
  }
  
  return centrality;
}

/**
 * Calculate eigenvector centrality
 */
function calculateEigenvectorCentrality(nodes, adjacencyList, iterations = 100) {
  const centrality = new Map();
  const nodeIds = nodes.map(n => n.id);
  const numNodes = nodeIds.length;
  
  if (numNodes === 0) return centrality;
  
  // Initialize with equal values
  nodeIds.forEach(nodeId => centrality.set(nodeId, 1.0));
  
  for (let i = 0; i < iterations; i++) {
    const newCentrality = new Map();
    let norm = 0;
    
    nodeIds.forEach(nodeId => {
      let sum = 0;
      const neighbors = adjacencyList.get(nodeId) || [];
      neighbors.forEach(neighbor => {
        sum += centrality.get(neighbor.nodeId);
      });
      newCentrality.set(nodeId, sum);
      norm += sum * sum;
    });
    
    // Normalize
    norm = Math.sqrt(norm);
    if (norm > 0) {
      newCentrality.forEach((value, nodeId) => {
        centrality.set(nodeId, value / norm);
      });
    }
  }
  
  return centrality;
}

/**
 * Detect communities using simple modularity-based clustering
 */
function detectCommunities(nodes, adjacencyList) {
  const communities = new Map();
  const nodeIds = nodes.map(n => n.id);
  let communityId = 0;
  const visited = new Set();
  
  // Simple connected components as communities
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      const community = [];
      const queue = [nodeId];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        
        visited.add(current);
        community.push(current);
        
        const neighbors = adjacencyList.get(current) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor.nodeId)) {
            queue.push(neighbor.nodeId);
          }
        });
      }
      
      community.forEach(nodeId => communities.set(nodeId, communityId));
      communityId++;
    }
  });
  
  return communities;
}

/**
 * Calculate force-directed layout positions
 */
function calculateForceDirectedLayout(nodes, links, width = 800, height = 600, iterations = 300) {
  const positions = new Map();
  const velocities = new Map();
  const nodeIds = nodes.map(n => n.id);
  
  // Initialize random positions
  nodeIds.forEach(nodeId => {
    positions.set(nodeId, {
      x: Math.random() * width,
      y: Math.random() * height
    });
    velocities.set(nodeId, { x: 0, y: 0 });
  });
  
  const k = Math.sqrt((width * height) / nodeIds.length); // Optimal distance
  const cooling = 0.95;
  let temperature = width / 10;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Calculate repulsive forces
    nodeIds.forEach(nodeId1 => {
      const pos1 = positions.get(nodeId1);
      const vel1 = velocities.get(nodeId1);
      
      nodeIds.forEach(nodeId2 => {
        if (nodeId1 !== nodeId2) {
          const pos2 = positions.get(nodeId2);
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.01; // Avoid division by zero
          
          const force = k * k / distance;
          vel1.x += (dx / distance) * force;
          vel1.y += (dy / distance) * force;
        }
      });
    });
    
    // Calculate attractive forces
    links.forEach(link => {
      const pos1 = positions.get(link.from_node_id);
      const pos2 = positions.get(link.to_node_id);
      const vel1 = velocities.get(link.from_node_id);
      const vel2 = velocities.get(link.to_node_id);
      
      if (pos1 && pos2 && vel1 && vel2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.01;
        
        const force = distance * distance / k;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        vel1.x += fx;
        vel1.y += fy;
        vel2.x -= fx;
        vel2.y -= fy;
      }
    });
    
    // Update positions
    nodeIds.forEach(nodeId => {
      const pos = positions.get(nodeId);
      const vel = velocities.get(nodeId);
      
      const velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (velocity > temperature) {
        vel.x = (vel.x / velocity) * temperature;
        vel.y = (vel.y / velocity) * temperature;
      }
      
      pos.x += vel.x;
      pos.y += vel.y;
      
      // Keep within bounds
      pos.x = Math.max(50, Math.min(width - 50, pos.x));
      pos.y = Math.max(50, Math.min(height - 50, pos.y));
      
      // Reset velocity
      vel.x *= 0.9;
      vel.y *= 0.9;
    });
    
    temperature *= cooling;
  }
  
  return positions;
}

/**
 * Calculate circular layout positions
 */
function calculateCircularLayout(nodes, centerX = 400, centerY = 300, radius = 250) {
  const positions = new Map();
  const nodeIds = nodes.map(n => n.id);
  const angleStep = (2 * Math.PI) / nodeIds.length;
  
  nodeIds.forEach((nodeId, index) => {
    const angle = index * angleStep;
    positions.set(nodeId, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  });
  
  return positions;
}

/**
 * Calculate hierarchical layout positions
 */
function calculateHierarchicalLayout(nodes, links, width = 800, height = 600) {
  const positions = new Map();
  const adjacencyList = buildAdjacencyList(links);
  const levels = new Map();
  const visited = new Set();
  const nodeIds = nodes.map(n => n.id);
  
  // Find root nodes (nodes with no incoming edges or highest degree)
  const inDegree = new Map();
  nodeIds.forEach(nodeId => inDegree.set(nodeId, 0));
  
  links.forEach(link => {
    inDegree.set(link.to_node_id, inDegree.get(link.to_node_id) + 1);
  });
  
  const roots = nodeIds.filter(nodeId => inDegree.get(nodeId) === 0);
  if (roots.length === 0) {
    // If no clear roots, pick nodes with highest degree
    const degrees = calculateDegreeCentrality(nodes, adjacencyList);
    const maxDegree = Math.max(...Array.from(degrees.values()));
    roots.push(...nodeIds.filter(nodeId => degrees.get(nodeId) === maxDegree).slice(0, 3));
  }
  
  // BFS to assign levels
  const queue = roots.map(nodeId => ({ nodeId, level: 0 }));
  roots.forEach(nodeId => {
    levels.set(nodeId, 0);
    visited.add(nodeId);
  });
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift();
    const neighbors = adjacencyList.get(nodeId) || [];
    
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor.nodeId)) {
        levels.set(neighbor.nodeId, level + 1);
        visited.add(neighbor.nodeId);
        queue.push({ nodeId: neighbor.nodeId, level: level + 1 });
      }
    });
  }
  
  // Assign remaining unvisited nodes to level 0
  nodeIds.forEach(nodeId => {
    if (!levels.has(nodeId)) {
      levels.set(nodeId, 0);
    }
  });
  
  // Group nodes by level
  const levelGroups = new Map();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level).push(nodeId);
  });
  
  // Position nodes
  const maxLevel = Math.max(...Array.from(levels.values()));
  const levelHeight = height / (maxLevel + 1);
  
  levelGroups.forEach((nodeIds, level) => {
    const y = (level + 0.5) * levelHeight;
    const nodeWidth = width / (nodeIds.length + 1);
    
    nodeIds.forEach((nodeId, index) => {
      positions.set(nodeId, {
        x: (index + 1) * nodeWidth,
        y: y
      });
    });
  });
  
  return positions;
}

/**
 * Get global graph data with analysis
 */
exports.getGlobalGraph = async (req, res) => {
  try {
    const { 
      layout = 'force-directed',
      includeCentrality = true,
      includeLayout = true,
      maxNodes = 1000
    } = req.query;
    
    const db = req.db;
    
    // Get all nodes (with limit)
    const nodes = await db.all(`SELECT * FROM nodes ORDER BY created_at DESC LIMIT ?`, maxNodes);
    
    // Get all links between the selected nodes
    if (nodes.length === 0) {
      return res.json({
        nodes: [],
        links: [],
        stats: { nodeCount: 0, linkCount: 0 },
        analysis: {},
        layout: {}
      });
    }
    
    const nodeIds = nodes.map(n => n.id);
    const placeholders = nodeIds.map(() => '?').join(',');
    
    const links = await db.all(`
      SELECT * FROM links 
      WHERE from_node_id IN (${placeholders}) 
      AND to_node_id IN (${placeholders})
    `, [...nodeIds, ...nodeIds]);
    
    // Build adjacency list
    const adjacencyList = buildAdjacencyList(links);
    
    // Calculate analysis
    const analysis = {};
    
    if (includeCentrality === 'true') {
      console.log('Calculating centrality measures...');
      analysis.degreeCentrality = Object.fromEntries(calculateDegreeCentrality(nodes, adjacencyList));
      analysis.betweennessCentrality = Object.fromEntries(calculateBetweennessCentrality(nodes, adjacencyList));
      analysis.closenessCentrality = Object.fromEntries(calculateClosenessCentrality(nodes, adjacencyList));
      analysis.pageRankCentrality = Object.fromEntries(calculatePageRankCentrality(nodes, adjacencyList));
      analysis.eigenvectorCentrality = Object.fromEntries(calculateEigenvectorCentrality(nodes, adjacencyList));
      analysis.communities = Object.fromEntries(detectCommunities(nodes, adjacencyList));
    }
    
    // Calculate layout
    const layoutData = {};
    
    if (includeLayout === 'true') {
      console.log(`Calculating ${layout} layout...`);
      let positions;
      
      switch (layout) {
        case 'force-directed':
          positions = calculateForceDirectedLayout(nodes, links);
          break;
        case 'circular':
          positions = calculateCircularLayout(nodes);
          break;
        case 'hierarchical':
          positions = calculateHierarchicalLayout(nodes, links);
          break;
        default:
          positions = calculateForceDirectedLayout(nodes, links);
      }
      
      layoutData.positions = Object.fromEntries(positions);
      layoutData.type = layout;
    }
    
    // Calculate basic stats
    const stats = {
      nodeCount: nodes.length,
      linkCount: links.length,
      density: links.length / (nodes.length * (nodes.length - 1) / 2),
      averageDegree: nodes.length > 0 ? (links.length * 2) / nodes.length : 0,
      components: analysis.communities ? Math.max(...Object.values(analysis.communities)) + 1 : 1
    };
    
    res.json({
      nodes,
      links,
      stats,
      analysis,
      layout: layoutData
    });
    
  } catch (error) {
    console.error('Error getting global graph:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get graph statistics
 */
exports.getGraphStats = async (req, res) => {
  try {
    const db = req.db;
    
    const nodeCount = await db.get('SELECT COUNT(*) as count FROM nodes');
    const linkCount = await db.get('SELECT COUNT(*) as count FROM links');
    
    // Get degree distribution
    const degreeQuery = `
      SELECT node_degrees.degree, COUNT(*) as count
      FROM (
        SELECT nodes.id, COALESCE(link_counts.degree, 0) as degree
        FROM nodes
        LEFT JOIN (
          SELECT from_node_id as node_id, COUNT(*) as degree
          FROM links
          GROUP BY from_node_id
          UNION ALL
          SELECT to_node_id as node_id, COUNT(*) as degree
          FROM links
          GROUP BY to_node_id
        ) link_counts ON nodes.id = link_counts.node_id
      ) node_degrees
      GROUP BY node_degrees.degree
      ORDER BY node_degrees.degree
    `;
    
    const degreeDistribution = await db.all(degreeQuery);
    
    res.json({
      nodeCount: nodeCount.count,
      linkCount: linkCount.count,
      density: linkCount.count / (nodeCount.count * (nodeCount.count - 1) / 2),
      averageDegree: nodeCount.count > 0 ? (linkCount.count * 2) / nodeCount.count : 0,
      degreeDistribution
    });
    
  } catch (error) {
    console.error('Error getting graph stats:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate specific centrality measure
 */
exports.calculateCentrality = async (req, res) => {
  try {
    const { measure } = req.params;
    const { maxNodes = 1000 } = req.query;
    
    const db = req.db;
    
    // Get nodes and links
    const nodes = await db.all(`SELECT * FROM nodes LIMIT ?`, maxNodes);
    const nodeIds = nodes.map(n => n.id);
    const placeholders = nodeIds.map(() => '?').join(',');
    
    const links = await db.all(`
      SELECT * FROM links 
      WHERE from_node_id IN (${placeholders}) 
      AND to_node_id IN (${placeholders})
    `, [...nodeIds, ...nodeIds]);
    
    const adjacencyList = buildAdjacencyList(links);
    
    let centrality;
    switch (measure) {
      case 'degree':
        centrality = calculateDegreeCentrality(nodes, adjacencyList);
        break;
      case 'betweenness':
        centrality = calculateBetweennessCentrality(nodes, adjacencyList);
        break;
      case 'closeness':
        centrality = calculateClosenessCentrality(nodes, adjacencyList);
        break;
      case 'pagerank':
        centrality = calculatePageRankCentrality(nodes, adjacencyList);
        break;
      case 'eigenvector':
        centrality = calculateEigenvectorCentrality(nodes, adjacencyList);
        break;
      default:
        return res.status(400).json({ error: 'Unknown centrality measure' });
    }
    
    // Convert to array with node details and sort by centrality
    const results = nodes.map(node => ({
      nodeId: node.id,
      content: node.content,
      content_zh: node.content_zh,
      centrality: centrality.get(node.id) || 0
    })).sort((a, b) => b.centrality - a.centrality);
    
    res.json({
      measure,
      results,
      summary: {
        max: Math.max(...results.map(r => r.centrality)),
        min: Math.min(...results.map(r => r.centrality)),
        avg: results.reduce((sum, r) => sum + r.centrality, 0) / results.length
      }
    });
    
  } catch (error) {
    console.error('Error calculating centrality:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search nodes in global graph
 */
exports.searchNodes = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }
    
    const db = req.db;
    
    const nodes = await db.all(`
      SELECT id, content, content_zh, created_at, updated_at
      FROM nodes
      WHERE (
        content LIKE ? OR 
        content_zh LIKE ? OR
        LOWER(content) LIKE ? OR
        LOWER(content_zh) LIKE ?
      )
      ORDER BY created_at DESC
      LIMIT ?
    `, [
      `%${query}%`,
      `%${query}%`, 
      `%${query.toLowerCase()}%`,
      `%${query.toLowerCase()}%`,
      parseInt(limit)
    ]);
    
    res.json(nodes);
  } catch (error) {
    console.error('Error searching nodes:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get node neighbors
 */
exports.getNodeNeighbors = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { depth = 1 } = req.query;
    
    const db = req.db;
    
    // Get the target node
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Get neighbors up to specified depth
    const visitedNodes = new Set([nodeId]);
    const neighbors = [];
    const queue = [{ nodeId, currentDepth: 0 }];
    
    while (queue.length > 0) {
      const { nodeId: currentNodeId, currentDepth } = queue.shift();
      
      if (currentDepth < parseInt(depth)) {
        // Get direct neighbors
        const directNeighbors = await db.all(`
          SELECT DISTINCT n.*, 'outgoing' as relationship
          FROM nodes n
          JOIN links l ON n.id = l.to_node_id
          WHERE l.from_node_id = ?
          UNION
          SELECT DISTINCT n.*, 'incoming' as relationship
          FROM nodes n
          JOIN links l ON n.id = l.from_node_id
          WHERE l.to_node_id = ?
        `, [currentNodeId, currentNodeId]);
        
        directNeighbors.forEach(neighbor => {
          if (!visitedNodes.has(neighbor.id)) {
            visitedNodes.add(neighbor.id);
            neighbors.push({
              ...neighbor,
              depth: currentDepth + 1
            });
            queue.push({ nodeId: neighbor.id, currentDepth: currentDepth + 1 });
          }
        });
      }
    }
    
    res.json({
      centerNode: node,
      neighbors,
      stats: {
        totalNeighbors: neighbors.length,
        maxDepth: parseInt(depth)
      }
    });
    
  } catch (error) {
    console.error('Error getting node neighbors:', error);
    res.status(500).json({ error: error.message });
  }
};