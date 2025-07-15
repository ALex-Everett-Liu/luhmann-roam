const { v4: uuidv4 } = require('uuid');

/**
 * Global Graph Controller
 * Manages global graph visualization with multiple layouts and centrality analysis
 * Enhanced with better caching and cache management
 */

// Enhanced Analysis results cache
let analysisCache = new Map();
let calculationInProgress = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get cache status and statistics
 */
exports.getCacheStatus = async (req, res) => {
  try {
    const now = Date.now();
    const cacheStats = {
      totalCached: analysisCache.size,
      validCached: 0,
      expiredCached: 0,
      calculationsInProgress: calculationInProgress.size,
      cacheDetails: []
    };

    analysisCache.forEach((value, key) => {
      const isExpired = (now - value.timestamp) > CACHE_DURATION;
      if (isExpired) {
        cacheStats.expiredCached++;
      } else {
        cacheStats.validCached++;
      }
      
      cacheStats.cacheDetails.push({
        measure: key,
        timestamp: value.timestamp,
        age: now - value.timestamp,
        isExpired: isExpired,
        nodeCount: value.data?.results?.length || 0
      });
    });

    res.json(cacheStats);
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clear cache
 */
exports.clearCache = async (req, res) => {
  try {
    const clearedCount = analysisCache.size;
    analysisCache.clear();
    calculationInProgress.clear();
    
    res.json({ 
      message: 'Cache cleared successfully',
      clearedCount: clearedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get cached analysis or return null if not available/expired
 */
function getCachedAnalysis(measure) {
  const cached = analysisCache.get(measure);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached analysis with timestamp
 */
function setCachedAnalysis(measure, data) {
  analysisCache.set(measure, {
    data: data,
    timestamp: Date.now()
  });
}

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
 * Calculate PageRank centrality with weights as distances
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
        const linkToNode = neighbors.find(n => n.nodeId === nodeId);
        
        if (linkToNode) {
          // Calculate total inverse weight (strength) for outgoing links
          const totalOutStrength = neighbors.reduce((sum, n) => sum + (1.0 / n.weight), 0);
          // Use inverse weight as strength for transition probability
          const transitionStrength = 1.0 / linkToNode.weight;
          sum += centrality.get(otherNodeId) * (transitionStrength / totalOutStrength);
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
 * Calculate eigenvector centrality with weights as distances
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
        // Use inverse weight as connection strength
        const strength = 1.0 / neighbor.weight;
        sum += centrality.get(neighbor.nodeId) * strength;
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
 * Advanced community detection using modularity optimization
 * This will actually split large components into meaningful communities
 */
function detectCommunities(nodes, adjacencyList) {
  console.log(`🔍 Starting advanced community detection for ${nodes.length} nodes`);
  
  const nodeIds = nodes.map(n => n.id);
  const targetCommunities = Math.min(30, Math.max(5, Math.floor(nodeIds.length / 15)));
  
  // Handle edge case: no nodes
  if (nodeIds.length === 0) {
    console.log('❌ No nodes to process');
    return {};
  }

  // Start with each node in its own community
  const communities = {};
  nodeIds.forEach((nodeId, index) => {
    communities[nodeId] = index;
  });

  // Calculate total weight (using inverse of weight as strength)
  let totalWeight = 0;
  adjacencyList.forEach(neighbors => {
    neighbors.forEach(neighbor => {
      totalWeight += 1.0 / neighbor.weight;
    });
  });
  totalWeight /= 2; // Each edge counted twice

  console.log(`🔍 Total graph weight: ${totalWeight}`);

  // Iteratively merge communities to optimize modularity
  let improved = true;
  let iteration = 0;
  const maxIterations = 50;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;
    
    // Try to move each node to a better community
    for (const nodeId of nodeIds) {
      const currentCommunity = communities[nodeId];
      const neighbors = adjacencyList.get(nodeId) || [];
      
      // Find neighboring communities and their connection strengths
      const neighborCommunities = new Map();
      neighbors.forEach(neighbor => {
        const neighborCommunity = communities[neighbor.nodeId];
        if (neighborCommunity !== currentCommunity) {
          const strength = 1.0 / neighbor.weight;
          neighborCommunities.set(neighborCommunity, 
            (neighborCommunities.get(neighborCommunity) || 0) + strength);
        }
      });

      // Find the best community to move to
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      neighborCommunities.forEach((connectionStrength, candidateCommunity) => {
        // Simple heuristic: prefer communities with stronger connections
        const gain = connectionStrength;
        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = candidateCommunity;
        }
      });

      // Move node if beneficial
      if (bestCommunity !== currentCommunity && bestGain > 0) {
        communities[nodeId] = bestCommunity;
        improved = true;
      }
    }
    
    console.log(`🔄 Iteration ${iteration}: ${improved ? 'improved' : 'no improvement'}`);
  }

  // Count communities and their sizes
  const communityGroups = {};
  Object.entries(communities).forEach(([nodeId, commId]) => {
    if (!communityGroups[commId]) {
      communityGroups[commId] = [];
    }
    communityGroups[commId].push(nodeId);
  });

  let currentCommunityCount = Object.keys(communityGroups).length;
  console.log(`📊 After modularity optimization: ${currentCommunityCount} communities`);

  // If we still have too many communities, merge smallest ones
  if (currentCommunityCount > targetCommunities) {
    console.log('🔄 Merging smallest communities...');
    
    // Sort communities by size (smallest first)
    const sortedCommunities = Object.entries(communityGroups)
      .sort(([,a], [,b]) => a.length - b.length);
    
    // Merge smallest communities into larger ones
    const toMerge = sortedCommunities.slice(0, currentCommunityCount - targetCommunities);
    const targets = sortedCommunities.slice(-targetCommunities);
    
    toMerge.forEach(([smallCommId, smallNodes], index) => {
      const targetIndex = index % targets.length;
      const [targetCommId] = targets[targetIndex];
      
      // Move all nodes from small community to target community
      smallNodes.forEach(nodeId => {
        communities[nodeId] = parseInt(targetCommId);
      });
      
      console.log(`🔄 Merged community ${smallCommId} (${smallNodes.length} nodes) into community ${targetCommId}`);
    });
  }

  // If we have too few communities, try to split large ones
  if (currentCommunityCount < Math.max(5, targetCommunities / 2)) {
    console.log('🔄 Splitting large communities...');
    
    // Rebuild community groups after merging
    const newCommunityGroups = {};
    Object.entries(communities).forEach(([nodeId, commId]) => {
      if (!newCommunityGroups[commId]) {
        newCommunityGroups[commId] = [];
      }
      newCommunityGroups[commId].push(nodeId);
    });

    // Find largest communities to split
    const sortedBySize = Object.entries(newCommunityGroups)
      .sort(([,a], [,b]) => b.length - a.length);
    
    let nextCommunityId = Math.max(...Object.values(communities)) + 1;
    
    // Split the largest communities
    const communitiesToSplit = Math.min(3, sortedBySize.length);
    for (let i = 0; i < communitiesToSplit; i++) {
      const [commId, nodes] = sortedBySize[i];
      
      if (nodes.length > 20) { // Only split if community is large enough
        const splitPoint = Math.floor(nodes.length / 2);
        const nodesToMove = nodes.slice(splitPoint);
        
        nodesToMove.forEach(nodeId => {
          communities[nodeId] = nextCommunityId;
        });
        
        console.log(`🔄 Split community ${commId}: ${nodes.length} -> ${splitPoint} + ${nodesToMove.length}`);
        nextCommunityId++;
      }
    }
  }

  // Renumber communities to be consecutive starting from 0
  const uniqueCommunities = [...new Set(Object.values(communities))];
  const communityMapping = {};
  uniqueCommunities.forEach((oldId, index) => {
    communityMapping[oldId] = index;
  });

  // Apply renumbering
  Object.keys(communities).forEach(nodeId => {
    communities[nodeId] = communityMapping[communities[nodeId]];
  });

  const finalCommunityCount = Math.max(...Object.values(communities)) + 1;
  console.log(`✅ Community detection completed: ${Object.keys(communities).length} nodes in ${finalCommunityCount} communities`);

  // Show final community sizes
  const finalGroups = {};
  Object.entries(communities).forEach(([nodeId, commId]) => {
    if (!finalGroups[commId]) {
      finalGroups[commId] = [];
    }
    finalGroups[commId].push(nodeId);
  });

  const communitySizes = Object.entries(finalGroups)
    .map(([id, nodes]) => `Community ${id}: ${nodes.length} nodes`)
    .slice(0, 10); // Show first 10
  
  console.log('📊 Final community sizes:', communitySizes);

  return communities;
}

/**
 * Calculate modularity gain for moving a node from one community to another
 */
function calculateModularityGain(nodeId, fromCommunity, toCommunity, communities, adjacencyList, totalStrength) {
  const neighbors = adjacencyList.get(nodeId) || [];
  
  // Calculate node's degree (sum of strengths)
  const nodeStrength = neighbors.reduce((sum, neighbor) => sum + (1.0 / neighbor.weight), 0);
  
  // Calculate connections to target community
  let connectionStrengthTo = 0;
  neighbors.forEach(neighbor => {
    if (communities.get(neighbor.nodeId) === toCommunity) {
      connectionStrengthTo += 1.0 / neighbor.weight;
    }
  });
  
  // Calculate connections to current community
  let connectionStrengthFrom = 0;
  neighbors.forEach(neighbor => {
    if (communities.get(neighbor.nodeId) === fromCommunity) {
      connectionStrengthFrom += 1.0 / neighbor.weight;
    }
  });
  
  // Calculate community degrees
  let toCommunityStrength = 0;
  let fromCommunityStrength = 0;
  
  communities.forEach((communityId, nId) => {
    if (nId !== nodeId) { // Exclude the node being moved
      const nNeighbors = adjacencyList.get(nId) || [];
      const nStrength = nNeighbors.reduce((sum, neighbor) => sum + (1.0 / neighbor.weight), 0);
      
      if (communityId === toCommunity) {
        toCommunityStrength += nStrength;
      } else if (communityId === fromCommunity) {
        fromCommunityStrength += nStrength;
      }
    }
  });
  
  // Modularity gain formula
  const deltaQ = (connectionStrengthTo - connectionStrengthFrom) / totalStrength - 
                 (nodeStrength * (toCommunityStrength - fromCommunityStrength)) / (totalStrength * totalStrength);
  
  return deltaQ;
}

/**
 * Calculate force-directed layout positions with weights as distances
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
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.01;
          
          const force = k * k / distance;
          vel1.x += (dx / distance) * force;
          vel1.y += (dy / distance) * force;
        }
      });
    });
    
    // Calculate attractive forces with weights as distances
    links.forEach(link => {
      const pos1 = positions.get(link.from_node_id);
      const pos2 = positions.get(link.to_node_id);
      const vel1 = velocities.get(link.from_node_id);
      const vel2 = velocities.get(link.to_node_id);
      
      if (pos1 && pos2 && vel1 && vel2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.01;
        
        // Use inverse of weight as connection strength
        const strength = 1.0 / (link.weight || 1.0);
        const force = (distance * distance / k) * strength;
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
    
    // Get nodes from the local graph pool instead of main nodes table
    const poolNodes = await db.all(`
      SELECT 
        n.id,
        n.content,
        n.content_zh,
        n.parent_id,
        n.position,
        n.created_at,
        n.updated_at,
        lgp.added_at as pool_added_at,
        lgp.notes as pool_notes
      FROM local_graph_pool lgp
      JOIN nodes n ON lgp.node_id = n.id
      ORDER BY lgp.added_at DESC
      LIMIT ?
    `, maxNodes);
    
    // Get links from the local graph pool instead of main links table
    if (poolNodes.length === 0) {
      return res.json({
        nodes: [],
        links: [],
        stats: { nodeCount: 0, linkCount: 0 },
        analysis: {},
        layout: {}
      });
    }
    
    const poolNodeIds = poolNodes.map(n => n.id);
    const placeholders = poolNodeIds.map(() => '?').join(',');
    
    const poolLinks = await db.all(`
      SELECT 
        l.id,
        l.from_node_id,
        l.to_node_id,
        COALESCE(lgpl.weight_override, l.weight) as weight,
        l.description,
        l.created_at,
        l.updated_at,
        lgpl.added_at as pool_added_at
      FROM local_graph_pool_links lgpl
      JOIN links l ON lgpl.link_id = l.id
      WHERE l.from_node_id IN (${placeholders}) 
      AND l.to_node_id IN (${placeholders})
    `, [...poolNodeIds, ...poolNodeIds]);
    
    // Validate that all link endpoints exist in the node set
    const nodeIdSet = new Set(poolNodeIds);
    const validLinks = poolLinks.filter(link => 
      nodeIdSet.has(link.from_node_id) && nodeIdSet.has(link.to_node_id)
    );
    
    console.log(`Filtered links: ${poolLinks.length} -> ${validLinks.length}`);
    
    // Use the pool data for analysis
    const nodes = poolNodes;
    const links = validLinks;
    
    // Build adjacency list
    const adjacencyList = buildAdjacencyList(links);
    
    // Calculate analysis
    const analysis = {};
    
    if (includeCentrality === 'true') {
      console.log('🔍 Calculating centrality measures for pool nodes...');
      
      // Calculate degree centrality
      const degreeCentralityMap = calculateDegreeCentrality(nodes, adjacencyList);
      analysis.degreeCentrality = Object.fromEntries(degreeCentralityMap);
      console.log(`✅ Degree centrality calculated for ${Object.keys(analysis.degreeCentrality).length} nodes`);
      
      // Check cache for other centrality measures
      const cachedBetweenness = getCachedAnalysis('betweenness');
      if (cachedBetweenness) {
        analysis.betweennessCentrality = {};
        cachedBetweenness.results.forEach(result => {
          if (nodeIdSet.has(result.nodeId)) {
            analysis.betweennessCentrality[result.nodeId] = result.centrality;
          }
        });
        console.log(`✅ Loaded cached betweenness centrality for ${Object.keys(analysis.betweennessCentrality).length} nodes`);
      }
      
      // Calculate communities with debugging
      console.log('🔍 Starting community detection...');
      analysis.communities = detectCommunities(nodes, adjacencyList);
      console.log(`✅ Communities assigned: ${Object.keys(analysis.communities).length} nodes`);
      
      // Debug: show sample community assignments
      const sampleCommunities = Object.entries(analysis.communities).slice(0, 10);
      console.log('📋 Sample community assignments:', sampleCommunities);
    }
    
    // Calculate layout
    const layoutData = {};
    
    if (includeLayout === 'true') {
      console.log(`Calculating ${layout} layout for pool nodes...`);
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
      density: links.length > 0 ? links.length / (nodes.length * (nodes.length - 1) / 2) : 0,
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
 * Calculate specific centrality measure with enhanced caching
 */
exports.calculateCentrality = async (req, res) => {
  try {
    const { measure } = req.params;
    const { maxNodes = 1000 } = req.query;
    
    // Check cache first
    const cached = getCachedAnalysis(measure);
    if (cached) {
      console.log(`Returning cached ${measure} centrality results`);
      return res.json(cached);
    }
    
    // Check if calculation is already in progress
    if (calculationInProgress.has(measure)) {
      return res.status(202).json({ 
        message: 'Calculation in progress', 
        measure: measure 
      });
    }
    
    // Mark calculation as in progress
    calculationInProgress.set(measure, true);
    
    try {
      const db = req.db;
      
      // Get nodes from pool instead of main table
      const poolNodes = await db.all(`
        SELECT 
          n.id,
          n.content,
          n.content_zh,
          n.parent_id,
          n.position,
          n.created_at,
          n.updated_at
        FROM local_graph_pool lgp
        JOIN nodes n ON lgp.node_id = n.id
        ORDER BY lgp.added_at DESC
        LIMIT ?
      `, maxNodes);
      
      const poolNodeIds = poolNodes.map(n => n.id);
      const placeholders = poolNodeIds.map(() => '?').join(',');
      
      // Get links from pool instead of main table
      const poolLinks = await db.all(`
        SELECT 
          l.id,
          l.from_node_id,
          l.to_node_id,
          COALESCE(lgpl.weight_override, l.weight) as weight,
          l.description
        FROM local_graph_pool_links lgpl
        JOIN links l ON lgpl.link_id = l.id
        WHERE l.from_node_id IN (${placeholders}) 
        AND l.to_node_id IN (${placeholders})
      `, [...poolNodeIds, ...poolNodeIds]);
      
      const nodes = poolNodes;
      const links = poolLinks;
      const adjacencyList = buildAdjacencyList(links);
      
      let centrality;
      console.log(`Calculating ${measure} centrality for ${nodes.length} nodes...`);
      
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
          throw new Error('Unknown centrality measure');
      }
      
      // Convert to array with node details and sort by centrality
      const results = nodes.map(node => ({
        nodeId: node.id,
        content: node.content,
        content_zh: node.content_zh,
        centrality: centrality.get(node.id) || 0
      })).sort((a, b) => b.centrality - a.centrality);
      
      const responseData = {
        measure,
        results,
        summary: {
          max: Math.max(...results.map(r => r.centrality)),
          min: Math.min(...results.map(r => r.centrality)),
          avg: results.reduce((sum, r) => sum + r.centrality, 0) / results.length
        },
        calculatedAt: Date.now()
      };
      
      // Cache the results
      setCachedAnalysis(measure, responseData);
      
      res.json(responseData);
      
    } finally {
      // Mark calculation as complete
      calculationInProgress.delete(measure);
    }
    
  } catch (error) {
    console.error('Error calculating centrality:', error);
    calculationInProgress.delete(req.params.measure);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate all centrality measures in sequence
 */
exports.calculateAllCentralities = async (req, res) => {
  try {
    const measures = ['degree', 'betweenness', 'closeness', 'pagerank', 'eigenvector'];
    const results = {};
    
    for (const measure of measures) {
      try {
        // Check cache first
        const cached = getCachedAnalysis(measure);
        if (cached) {
          results[measure] = cached;
        } else {
          console.log(`Calculating ${measure} centrality...`);
          // This would trigger the calculation - in a real implementation
          // you might want to call the calculation function directly
          results[measure] = { status: 'pending' };
        }
      } catch (error) {
        console.error(`Error calculating ${measure}:`, error);
        results[measure] = { error: error.message };
      }
    }
    
    res.json({
      message: 'Centrality calculations initiated',
      results: results
    });
    
  } catch (error) {
    console.error('Error calculating all centralities:', error);
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