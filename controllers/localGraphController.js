const { v4: uuidv4 } = require('uuid');

/**
 * Local Graph Controller
 * Manages distance-based local graph visualization
 */

// Distance calculation cache
let distanceCache = new Map(); // centerNodeId -> { distances: Map, timestamp: number }
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate distances from center node using Dijkstra's algorithm
 * Modified to use OR condition: include nodes that satisfy distance <= maxDistance OR depth < maxDepth
 */
function calculateDistances(centerNodeId, links, maxDistance = 10, maxDepth = 5) {
  const distances = new Map();
  const depths = new Map(); // Track depth separately
  const visited = new Set();
  const queue = [{ nodeId: centerNodeId, distance: 0, depth: 0 }];
  
  distances.set(centerNodeId, 0);
  depths.set(centerNodeId, 0);
  
  // Build adjacency list for faster lookup - TREAT ALL LINKS AS BIDIRECTIONAL
  const adjacencyList = new Map();
  links.forEach(link => {
    // Add forward direction
    if (!adjacencyList.has(link.from_node_id)) {
      adjacencyList.set(link.from_node_id, []);
    }
    adjacencyList.get(link.from_node_id).push({
      nodeId: link.to_node_id,
      weight: link.weight || 1.0
    });
    
    // Add reverse direction for bidirectional graph traversal
    if (!adjacencyList.has(link.to_node_id)) {
      adjacencyList.set(link.to_node_id, []);
    }
    adjacencyList.get(link.to_node_id).push({
      nodeId: link.from_node_id,
      weight: link.weight || 1.0
    });
  });
  
  while (queue.length > 0) {
    // Sort by distance to get shortest path first
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    
    // FIXED: Exclude only if BOTH distance and depth exceed limits
    if (visited.has(current.nodeId) || 
        (current.distance > maxDistance && current.depth > maxDepth)) {
      continue;
    }
    
    visited.add(current.nodeId);
    depths.set(current.nodeId, current.depth);
    
    // Get neighbors
    const neighbors = adjacencyList.get(current.nodeId) || [];
    
    for (const neighbor of neighbors) {
      const newDistance = current.distance + neighbor.weight;
      const newDepth = current.depth + 1;
      
      // FIXED: Include neighbor if it satisfies EITHER condition
      if ((newDistance <= maxDistance || newDepth <= maxDepth) && 
          (!distances.has(neighbor.nodeId) || newDistance < distances.get(neighbor.nodeId))) {
        distances.set(neighbor.nodeId, newDistance);
        depths.set(neighbor.nodeId, newDepth);
        queue.push({
          nodeId: neighbor.nodeId,
          distance: newDistance,
          depth: newDepth
        });
      }
    }
  }
  
  // Return both distances and depths
  return { distances, depths };
}

/**
 * Get cached distances or calculate new ones
 */
function getCachedDistances(centerNodeId, links, maxDistance, maxDepth) {
  // FIXED: Include distance and depth in cache key
  const cacheKey = `${centerNodeId}-${maxDistance}-${maxDepth}`;
  const now = Date.now();
  
  // Check if cache exists and is still valid
  if (distanceCache.has(cacheKey)) {
    const cached = distanceCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }
  }
  
  // Calculate new distances and depths
  const result = calculateDistances(centerNodeId, links, maxDistance, maxDepth);
  
  // Update cache with the new key
  distanceCache.set(cacheKey, {
    result,
    timestamp: now
  });
  
  return result;
}

/**
 * Invalidate distance cache (call when links are modified)
 */
function invalidateDistanceCache() {
  distanceCache.clear();
}

/**
 * Get local graph data centered around a specific node
 */
exports.getLocalGraph = async (req, res) => {
  try {
    const { centerNodeId } = req.params;
    const { 
      maxDistance = 5, 
      maxDepth = 3,
      includeNodeContent = true 
    } = req.query;
    
    const db = req.db;
    
    // Validate center node exists
    const centerNode = await db.get('SELECT * FROM nodes WHERE id = ?', centerNodeId);
    if (!centerNode) {
      return res.status(404).json({ error: 'Center node not found' });
    }
    
    // Get all links for distance calculation
    const links = await db.all('SELECT * FROM links');
    
    // Calculate distances and depths from center node
    const { distances, depths } = getCachedDistances(
      centerNodeId, 
      links, 
      parseFloat(maxDistance), 
      parseInt(maxDepth)
    );
    
    // Get node IDs within distance threshold
    const nodeIdsInRange = Array.from(distances.keys());
    
    if (nodeIdsInRange.length === 0) {
      return res.json({
        centerNode,
        nodes: [centerNode],
        links: [],
        distances: { [centerNodeId]: 0 },
        depths: { [centerNodeId]: 0 },
        stats: {
          nodeCount: 1,
          linkCount: 0,
          maxDistance: parseFloat(maxDistance),
          maxDepth: parseInt(maxDepth)
        }
      });
    }
    
    // Get nodes within distance threshold
    const placeholders = nodeIdsInRange.map(() => '?').join(',');
    let nodesQuery = `SELECT * FROM nodes WHERE id IN (${placeholders})`;
    const nodes = await db.all(nodesQuery, nodeIdsInRange);
    
    // Get links between nodes in range
    const linksInRange = links.filter(link => 
      distances.has(link.from_node_id) && distances.has(link.to_node_id)
    );
    
    // Convert distances and depths Maps to objects for JSON response
    const distancesObject = {};
    const depthsObject = {};
    distances.forEach((distance, nodeId) => {
      distancesObject[nodeId] = distance;
    });
    depths.forEach((depth, nodeId) => {
      depthsObject[nodeId] = depth;
    });
    
    res.json({
      centerNode,
      nodes,
      links: linksInRange,
      distances: distancesObject,
      depths: depthsObject, // Include depths in response
      stats: {
        nodeCount: nodes.length,
        linkCount: linksInRange.length,
        maxDistance: parseFloat(maxDistance),
        maxDepth: parseInt(maxDepth)
      }
    });
  } catch (error) {
    console.error('Error getting local graph:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new node in the local graph and main outliner
 */
exports.createNodeInLocalGraph = async (req, res) => {
  try {
    const { 
      content, 
      content_zh, 
      parentNodeId,
      linkTargets = [], // Array of {targetNodeId, weight, description}
      centerNodeId // For context
    } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const db = req.db;
    const nodeId = uuidv4();
    const now = Date.now();
    
    // Start transaction for ALL operations
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Determine position in outliner
      let position = 0;
      if (parentNodeId) {
        // Get children count for position
        const childrenCount = await db.get(
          'SELECT COUNT(*) as count FROM nodes WHERE parent_id = ?', 
          parentNodeId
        );
        position = childrenCount.count;
      } else {
        // Get root nodes count for position
        const rootCount = await db.get(
          'SELECT COUNT(*) as count FROM nodes WHERE parent_id IS NULL'
        );
        position = rootCount.count;
      }
      
      // Create the node in outliner
      await db.run(`
        INSERT INTO nodes (id, content, content_zh, parent_id, position, created_at, updated_at, is_expanded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [nodeId, content, content_zh, parentNodeId, position, now, now, true]);
      
      // Add node to pool within the same transaction
      console.log('Adding node to local graph pool:', nodeId);
      const poolId = uuidv4();
      
      await db.run(`
        INSERT INTO local_graph_pool (id, node_id, added_at, notes)
        VALUES (?, ?, ?, ?)
      `, [poolId, nodeId, now, 'Created via Local Graph Manager']);
      
      console.log('Successfully added node to pool with ID:', poolId);
      
      // Create multiple links if specified
      const createdLinks = [];
      for (const linkTarget of linkTargets) {
        const linkId = uuidv4();
        await db.run(`
          INSERT INTO links (id, from_node_id, to_node_id, weight, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [linkId, linkTarget.targetNodeId, nodeId, linkTarget.weight, linkTarget.description, now, now]);
        
        // Add the link to the pool within the same transaction
        const poolLinkId = uuidv4();
        await db.run(`
          INSERT INTO local_graph_pool_links (id, link_id, added_at)
          VALUES (?, ?, ?)
        `, [poolLinkId, linkId, now]);
        
        createdLinks.push({
          id: linkId,
          from_node_id: linkTarget.targetNodeId,
          to_node_id: nodeId,
          weight: linkTarget.weight,
          description: linkTarget.description
        });
      }
      
      // Commit all operations together
      await db.run('COMMIT');
      
      if (createdLinks.length > 0) {
        invalidateDistanceCache();
      }
      
      const newNode = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
      
      res.status(201).json({
        node: newNode,
        links: createdLinks
      });
      
    } catch (error) {
      console.error('Error in transaction:', error);
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating node in local graph:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get suggested parent nodes for placing new nodes
 */
exports.getSuggestedParents = async (req, res) => {
  try {
    const { centerNodeId } = req.params;
    const db = req.db;
    
    // Get center node and its ancestors
    const centerNode = await db.get('SELECT * FROM nodes WHERE id = ?', centerNodeId);
    if (!centerNode) {
      return res.status(404).json({ error: 'Center node not found' });
    }
    
    const suggestions = [centerNode];
    
    // Get parent chain
    let currentNode = centerNode;
    while (currentNode.parent_id) {
      const parent = await db.get('SELECT * FROM nodes WHERE id = ?', currentNode.parent_id);
      if (parent) {
        suggestions.unshift(parent); // Add to beginning
        currentNode = parent;
      } else {
        break;
      }
    }
    
    // Get direct children of center node
    const children = await db.all(
      'SELECT * FROM nodes WHERE parent_id = ? ORDER BY position LIMIT 5',
      centerNodeId
    );
    suggestions.push(...children);
    
    // Get siblings of center node
    if (centerNode.parent_id) {
      const siblings = await db.all(
        'SELECT * FROM nodes WHERE parent_id = ? AND id != ? ORDER BY position LIMIT 3',
        [centerNode.parent_id, centerNodeId]
      );
      suggestions.push(...siblings);
    }
    
    // Remove duplicates and add root option
    const uniqueSuggestions = suggestions.filter((node, index, array) => 
      array.findIndex(n => n.id === node.id) === index
    );
    
    // Add "Create as root" option
    uniqueSuggestions.push({
      id: null,
      content: '(Create as root node)',
      content_zh: '(创建为根节点)',
      isRootOption: true
    });
    
    res.json(uniqueSuggestions);
  } catch (error) {
    console.error('Error getting suggested parents:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Focus a node in the main outliner (returns navigation info)
 */
exports.focusNodeInOutliner = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const db = req.db;
    
    // Get the node and its path to root
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Build path to root for expansion
    const pathToRoot = [];
    let currentNode = node;
    
    while (currentNode) {
      pathToRoot.unshift(currentNode.id);
      if (currentNode.parent_id) {
        currentNode = await db.get('SELECT * FROM nodes WHERE id = ?', currentNode.parent_id);
      } else {
        break;
      }
    }
    
    res.json({
      nodeId,
      pathToRoot,
      node
    });
  } catch (error) {
    console.error('Error focusing node in outliner:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all nodes and links in the local graph pool
 * GET /api/local-graph/pool
 */
exports.getLocalGraphPool = async (req, res) => {
    try {
      const db = req.db;
      
      // Get all nodes in the pool with their details
      const poolNodes = await db.all(`
        SELECT 
          lgp.*,
          n.content,
          n.content_zh,
          n.parent_id,
          n.position,
          n.created_at as node_created_at,
          n.updated_at as node_updated_at
        FROM local_graph_pool lgp
        JOIN nodes n ON lgp.node_id = n.id
        ORDER BY lgp.added_at DESC
      `);
      
      // Get all links in the pool with their details
      const poolLinks = await db.all(`
        SELECT 
          lgpl.*,
          l.from_node_id,
          l.to_node_id,
          COALESCE(lgpl.weight_override, l.weight) as effective_weight,
          l.description,
          l.created_at as link_created_at,
          l.updated_at as link_updated_at
        FROM local_graph_pool_links lgpl
        JOIN links l ON lgpl.link_id = l.id
        ORDER BY lgpl.added_at DESC
      `);
      
      // Filter links to only include those where both nodes are in the pool
      const poolNodeIds = new Set(poolNodes.map(pn => pn.node_id));
      const validPoolLinks = poolLinks.filter(link => 
        poolNodeIds.has(link.from_node_id) && poolNodeIds.has(link.to_node_id)
      );
      
      res.json({
        nodes: poolNodes,
        links: validPoolLinks,
        stats: {
          nodeCount: poolNodes.length,
          linkCount: validPoolLinks.length
        }
      });
    } catch (error) {
      console.error('Error getting local graph pool:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
  /**
   * Add a node to the local graph pool
   * POST /api/local-graph/pool/nodes
   */
  exports.addNodeToPool = async (req, res) => {
    try {
      const { nodeId, notes } = req.body;
      
      if (!nodeId) {
        return res.status(400).json({ error: 'Node ID is required' });
      }
      
      const db = req.db;
      const now = Date.now();
      
      // Check if node exists
      const node = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      
      // Check if already in pool
      const existing = await db.get('SELECT id FROM local_graph_pool WHERE node_id = ?', nodeId);
      if (existing) {
        return res.status(409).json({ error: 'Node already in local graph pool' });
      }
      
      // Add to pool
      const poolId = uuidv4();
      await db.run(`
        INSERT INTO local_graph_pool (id, node_id, added_at, notes)
        VALUES (?, ?, ?, ?)
      `, [poolId, nodeId, now, notes]);
      
      // Get the created pool entry
      const poolEntry = await db.get('SELECT * FROM local_graph_pool WHERE id = ?', poolId);
      
      res.status(201).json(poolEntry);
    } catch (error) {
      console.error('Error adding node to pool:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
  /**
   * Remove a node from the local graph pool
   * DELETE /api/local-graph/pool/nodes/:nodeId
   */
  exports.removeNodeFromPool = async (req, res) => {
    try {
      const { nodeId } = req.params;
      const db = req.db;
      
      // Remove from pool
      const result = await db.run('DELETE FROM local_graph_pool WHERE node_id = ?', nodeId);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Node not found in pool' });
      }
      
      res.json({ success: true, message: 'Node removed from local graph pool' });
    } catch (error) {
      console.error('Error removing node from pool:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
  /**
   * Add a link to the local graph pool
   * POST /api/local-graph/pool/links
   */
  exports.addLinkToPool = async (req, res) => {
    try {
      const { linkId, weightOverride } = req.body;
      
      if (!linkId) {
        return res.status(400).json({ error: 'Link ID is required' });
      }
      
      const db = req.db;
      const now = Date.now();
      
      // Check if link exists
      const link = await db.get('SELECT * FROM links WHERE id = ?', linkId);
      if (!link) {
        return res.status(404).json({ error: 'Link not found' });
      }
      
      // Check if both nodes are in the pool
      const fromNodeInPool = await db.get('SELECT id FROM local_graph_pool WHERE node_id = ?', link.from_node_id);
      const toNodeInPool = await db.get('SELECT id FROM local_graph_pool WHERE node_id = ?', link.to_node_id);
      
      if (!fromNodeInPool || !toNodeInPool) {
        return res.status(400).json({ error: 'Both nodes must be in the pool before adding the link' });
      }
      
      // Check if already in pool
      const existing = await db.get('SELECT id FROM local_graph_pool_links WHERE link_id = ?', linkId);
      if (existing) {
        return res.status(409).json({ error: 'Link already in local graph pool' });
      }
      
      // Add to pool
      const poolLinkId = uuidv4();
      await db.run(`
        INSERT INTO local_graph_pool_links (id, link_id, added_at, weight_override)
        VALUES (?, ?, ?, ?)
      `, [poolLinkId, linkId, now, weightOverride]);
      
      // Get the created pool entry
      const poolEntry = await db.get('SELECT * FROM local_graph_pool_links WHERE id = ?', poolLinkId);
      
      res.status(201).json(poolEntry);
    } catch (error) {
      console.error('Error adding link to pool:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
  /**
   * Remove a link from the local graph pool
   * DELETE /api/local-graph/pool/links/:linkId
   */
  exports.removeLinkFromPool = async (req, res) => {
    try {
      const { linkId } = req.params;
      const db = req.db;
      
      // Remove from pool
      const result = await db.run('DELETE FROM local_graph_pool_links WHERE link_id = ?', linkId);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Link not found in pool' });
      }
      
      res.json({ success: true, message: 'Link removed from local graph pool' });
    } catch (error) {
      console.error('Error removing link from pool:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
  /**
   * Check if a node is in the local graph pool
   * GET /api/local-graph/pool/check-node/:nodeId
   */
  exports.checkNodeInPool = async (req, res) => {
    try {
      const { nodeId } = req.params;
      const db = req.db;
      
      const poolEntry = await db.get('SELECT * FROM local_graph_pool WHERE node_id = ?', nodeId);
      
      res.json({
        inPool: !!poolEntry,
        poolEntry: poolEntry || null
      });
    } catch (error) {
      console.error('Error checking node in pool:', error);
      res.status(500).json({ error: error.message });
    }
  };

// Export cache invalidation function for use by link routes
exports.invalidateDistanceCache = invalidateDistanceCache;

/**
 * Search nodes within the local graph pool
 * GET /api/local-graph/pool/search?q=query&limit=10
 */
exports.searchPoolNodes = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }
    
    const db = req.db;
    
    // Search only within nodes that are in the local graph pool
    const poolNodes = await db.all(`
      SELECT 
        n.id,
        n.content,
        n.content_zh,
        n.parent_id,
        n.position,
        lgp.added_at,
        lgp.notes
      FROM local_graph_pool lgp
      JOIN nodes n ON lgp.node_id = n.id
      WHERE (
        n.content LIKE ? OR 
        n.content_zh LIKE ? OR
        LOWER(n.content) LIKE ? OR
        LOWER(n.content_zh) LIKE ?
      )
      ORDER BY lgp.added_at DESC
      LIMIT ?
    `, [
      `%${query}%`,
      `%${query}%`, 
      `%${query.toLowerCase()}%`,
      `%${query.toLowerCase()}%`,
      parseInt(limit)
    ]);
    
    res.json(poolNodes);
  } catch (error) {
    console.error('Error searching pool nodes:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all quick access nodes for the user
 * GET /api/local-graph/quick-access
 */
exports.getQuickAccessNodes = async (req, res) => {
  try {
    const db = req.db;
    
    // Get quick access nodes with node details, ordered by usage count and last used
    const quickAccessNodes = await db.all(`
      SELECT 
        qa.*,
        n.content,
        n.content_zh,
        n.parent_id,
        n.position
      FROM local_graph_quick_access qa
      JOIN nodes n ON qa.node_id = n.id
      ORDER BY qa.usage_count DESC, qa.last_used_at DESC
      LIMIT 10
    `);
    
    res.json(quickAccessNodes);
  } catch (error) {
    console.error('Error getting quick access nodes:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add a node to quick access
 * POST /api/local-graph/quick-access
 */
exports.addToQuickAccess = async (req, res) => {
  try {
    const { nodeId, maxDistance, maxDepth } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'Node ID is required' });
    }
    
    const db = req.db;
    const now = Date.now();
    
    // Check if node exists
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Check if already in quick access
    const existing = await db.get('SELECT * FROM local_graph_quick_access WHERE node_id = ?', nodeId);
    
    if (existing) {
      // Update existing entry
      await db.run(`
        UPDATE local_graph_quick_access 
        SET max_distance = ?, max_depth = ?, last_used_at = ?, usage_count = usage_count + 1
        WHERE node_id = ?
      `, [maxDistance || 5, maxDepth || 3, now, nodeId]);
      
      res.json({ message: 'Quick access updated!' });
    } else {
      // Create new entry
      const quickAccessId = uuidv4();
      await db.run(`
        INSERT INTO local_graph_quick_access (id, node_id, max_distance, max_depth, created_at, last_used_at, usage_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [quickAccessId, nodeId, maxDistance || 5, maxDepth || 3, now, now, 1]);
      
      res.json({ message: 'Added to quick access!' });
    }
  } catch (error) {
    console.error('Error adding to quick access:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove a node from quick access
 * DELETE /api/local-graph/quick-access/:quickAccessId
 */
exports.removeFromQuickAccess = async (req, res) => {
  try {
    const { quickAccessId } = req.params;
    const db = req.db;
    
    const result = await db.run('DELETE FROM local_graph_quick_access WHERE id = ?', quickAccessId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Quick access entry not found' });
    }
    
    res.json({ success: true, message: 'Removed from quick access' });
  } catch (error) {
    console.error('Error removing from quick access:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update usage count for a quick access node
 * POST /api/local-graph/quick-access/:nodeId/use
 */
exports.useQuickAccessNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const db = req.db;
    const now = Date.now();
    
    const result = await db.run(`
      UPDATE local_graph_quick_access 
      SET usage_count = usage_count + 1, last_used_at = ?
      WHERE node_id = ?
    `, [now, nodeId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Quick access entry not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating quick access usage:', error);
    res.status(500).json({ error: error.message });
  }
};

