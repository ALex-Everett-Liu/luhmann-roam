// graphService.js - Business logic for Graph Plugin operations
const { v4: uuidv4 } = require("uuid");

/**
 * Get all graph data
 * @param {Object} graphDb - Database connection
 * @returns {Promise<Object>} Graph data with nodes, edges, and metadata
 */
async function getAllGraphData(graphDb) {
  const nodes = await graphDb.all("SELECT * FROM graph_nodes");
  const edges = await graphDb.all("SELECT * FROM graph_edges");

  return {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      exportedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a new node
 * @param {Object} graphDb - Database connection
 * @param {Object} nodeData - Node data (id, x, y, label, color, radius, full_content)
 * @returns {Promise<Object>} Created node
 */
async function createNode(graphDb, nodeData) {
  const { id, x, y, label, color, radius, full_content } = nodeData;
  
  // Generate UUID v4 if not provided
  const nodeId = id || uuidv4();
  const now = Date.now();

  // Get the next sequence_id by finding the maximum existing sequence_id
  const maxSequenceResult = await graphDb.get(
    "SELECT MAX(sequence_id) as max_seq FROM graph_nodes WHERE sequence_id IS NOT NULL"
  );
  const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

  await graphDb.run(
    `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content, sequence_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nodeId, x, y, label, color || "#3b82f6", radius || 20, full_content || label, nextSequenceId, now, now]
  );

  const node = await graphDb.get("SELECT * FROM graph_nodes WHERE id = ?", nodeId);
  return node;
}

/**
 * Update a node
 * @param {Object} graphDb - Database connection
 * @param {string} id - Node ID
 * @param {Object} nodeData - Node data to update (x, y, label, color, radius, full_content)
 * @returns {Promise<Object>} Updated node
 */
async function updateNode(graphDb, id, nodeData) {
  const { x, y, label, color, radius, full_content } = nodeData;
  const now = Date.now();

  const updates = [];
  const values = [];

  if (x !== undefined) {
    updates.push("x = ?");
    values.push(x);
  }
  if (y !== undefined) {
    updates.push("y = ?");
    values.push(y);
  }
  if (label !== undefined) {
    updates.push("label = ?");
    values.push(label);
  }
  if (color !== undefined) {
    updates.push("color = ?");
    values.push(color);
  }
  if (radius !== undefined) {
    updates.push("radius = ?");
    values.push(radius);
  }
  if (full_content !== undefined) {
    updates.push("full_content = ?");
    values.push(full_content);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await graphDb.run(
    `UPDATE graph_nodes SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const node = await graphDb.get("SELECT * FROM graph_nodes WHERE id = ?", id);
  return node;
}

/**
 * Delete a node
 * @param {Object} graphDb - Database connection
 * @param {string} id - Node ID
 * @returns {Promise<void>}
 */
async function deleteNode(graphDb, id) {
  // Delete associated edges first
  await graphDb.run(
    "DELETE FROM graph_edges WHERE from_node_id = ? OR to_node_id = ?",
    [id, id]
  );

  // Delete the node
  await graphDb.run("DELETE FROM graph_nodes WHERE id = ?", id);
}

/**
 * Create a new edge
 * @param {Object} graphDb - Database connection
 * @param {Object} edgeData - Edge data (id, from_node_id, to_node_id, weight)
 * @returns {Promise<Object>} Created edge
 */
async function createEdge(graphDb, edgeData) {
  const { id, from_node_id, to_node_id, weight } = edgeData;
  
  // Generate UUID v4 if not provided
  const edgeId = id || uuidv4();
  const now = Date.now();

  // Get the next sequence_id by finding the maximum existing sequence_id
  const maxSequenceResult = await graphDb.get(
    "SELECT MAX(sequence_id) as max_seq FROM graph_edges WHERE sequence_id IS NOT NULL"
  );
  const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

  await graphDb.run(
    `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight, sequence_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [edgeId, from_node_id, to_node_id, weight || 1.0, nextSequenceId, now, now]
  );

  const edge = await graphDb.get("SELECT * FROM graph_edges WHERE id = ?", edgeId);
  return edge;
}

/**
 * Update an edge
 * @param {Object} graphDb - Database connection
 * @param {string} id - Edge ID
 * @param {Object} edgeData - Edge data to update (weight)
 * @returns {Promise<Object>} Updated edge
 */
async function updateEdge(graphDb, id, edgeData) {
  const { weight } = edgeData;
  const now = Date.now();

  await graphDb.run(
    "UPDATE graph_edges SET weight = ?, updated_at = ? WHERE id = ?",
    [weight, now, id]
  );

  const edge = await graphDb.get("SELECT * FROM graph_edges WHERE id = ?", id);
  return edge;
}

/**
 * Delete an edge
 * @param {Object} graphDb - Database connection
 * @param {string} id - Edge ID
 * @returns {Promise<void>}
 */
async function deleteEdge(graphDb, id) {
  await graphDb.run("DELETE FROM graph_edges WHERE id = ?", id);
}

/**
 * Clear all graph data
 * @param {Object} graphDb - Database connection
 * @returns {Promise<void>}
 */
async function clearAllData(graphDb) {
  await graphDb.run("DELETE FROM graph_edges");
  await graphDb.run("DELETE FROM graph_nodes");
}

/**
 * Import graph data (bulk insert)
 * @param {Object} graphDb - Database connection
 * @param {Object} importData - Import data (nodes, edges)
 * @returns {Promise<Object>} Import result with counts
 */
async function importGraphData(graphDb, importData) {
  const { nodes, edges } = importData;

  // Clear existing data
  await graphDb.run("DELETE FROM graph_edges");
  await graphDb.run("DELETE FROM graph_nodes");

  // Get max sequence IDs for nodes and edges
  const maxNodeSequenceResult = await graphDb.get(
    "SELECT MAX(sequence_id) as max_seq FROM graph_nodes WHERE sequence_id IS NOT NULL"
  );
  const maxEdgeSequenceResult = await graphDb.get(
    "SELECT MAX(sequence_id) as max_seq FROM graph_edges WHERE sequence_id IS NOT NULL"
  );
  let nextNodeSequenceId = (maxNodeSequenceResult?.max_seq || 0) + 1;
  let nextEdgeSequenceId = (maxEdgeSequenceResult?.max_seq || 0) + 1;

  // Insert nodes
  if (nodes && nodes.length > 0) {
    const nodeStmt = await graphDb.prepare(
      `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content, sequence_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = Date.now();
    for (const node of nodes) {
      // Generate UUID v4 if not provided
      const nodeId = node.id || uuidv4();
      // Use existing timestamps if provided, otherwise use current time
      const createdAt = node.created_at || now;
      const updatedAt = node.updated_at || now;
      await nodeStmt.run(
        nodeId,
        node.x,
        node.y,
        node.label,
        node.color || "#3b82f6",
        node.radius || 20,
        node.fullContent || node.full_content || node.label,
        nextNodeSequenceId++,
        createdAt,
        updatedAt
      );
    }
    await nodeStmt.finalize();
  }

  // Insert edges
  if (edges && edges.length > 0) {
    const edgeStmt = await graphDb.prepare(
      `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight, sequence_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const now = Date.now();
    for (const edge of edges) {
      // Generate UUID v4 if not provided
      const edgeId = edge.id || uuidv4();
      // Use existing timestamps if provided, otherwise use current time
      const createdAt = edge.created_at || now;
      const updatedAt = edge.updated_at || now;
      await edgeStmt.run(
        edgeId,
        edge.from || edge.from_node_id,
        edge.to || edge.to_node_id,
        edge.weight || 1.0,
        nextEdgeSequenceId++,
        createdAt,
        updatedAt
      );
    }
    await edgeStmt.finalize();
  }

  return {
    nodes: nodes?.length || 0,
    edges: edges?.length || 0,
  };
}

module.exports = {
  getAllGraphData,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  updateEdge,
  deleteEdge,
  clearAllData,
  importGraphData,
};

