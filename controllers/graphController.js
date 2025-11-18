// graphController.js - Business logic for Graph Plugin operations

/**
 * Get all graph data
 * GET /api/plugins/graph
 */
exports.getAllGraphData = async (req, res) => {
  try {
    const nodes = await req.graphDb.all("SELECT * FROM graph_nodes");
    const edges = await req.graphDb.all("SELECT * FROM graph_edges");

    res.json({
      nodes,
      edges,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching graph data:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new node
 * POST /api/plugins/graph/nodes
 */
exports.createNode = async (req, res) => {
  try {
    const { id, x, y, label, color, radius, full_content } = req.body;

    await req.graphDb.run(
      `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, x, y, label, color || "#3b82f6", radius || 20, full_content || label]
    );

    const node = await req.graphDb.get("SELECT * FROM graph_nodes WHERE id = ?", id);
    res.json(node);
  } catch (error) {
    console.error("Error creating node:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a node
 * PUT /api/plugins/graph/nodes/:id
 */
exports.updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, label, color, radius, full_content } = req.body;

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

    updates.push("updated_at = strftime('%s', 'now')");
    values.push(id);

    await req.graphDb.run(
      `UPDATE graph_nodes SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const node = await req.graphDb.get("SELECT * FROM graph_nodes WHERE id = ?", id);
    res.json(node);
  } catch (error) {
    console.error("Error updating node:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a node
 * DELETE /api/plugins/graph/nodes/:id
 */
exports.deleteNode = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated edges first
    await req.graphDb.run(
      "DELETE FROM graph_edges WHERE from_node_id = ? OR to_node_id = ?",
      [id, id]
    );

    // Delete the node
    await req.graphDb.run("DELETE FROM graph_nodes WHERE id = ?", id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting node:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new edge
 * POST /api/plugins/graph/edges
 */
exports.createEdge = async (req, res) => {
  try {
    const { id, from_node_id, to_node_id, weight } = req.body;

    await req.graphDb.run(
      `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight)
       VALUES (?, ?, ?, ?)`,
      [id, from_node_id, to_node_id, weight || 1.0]
    );

    const edge = await req.graphDb.get("SELECT * FROM graph_edges WHERE id = ?", id);
    res.json(edge);
  } catch (error) {
    console.error("Error creating edge:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update an edge
 * PUT /api/plugins/graph/edges/:id
 */
exports.updateEdge = async (req, res) => {
  try {
    const { id } = req.params;
    const { weight } = req.body;

    await req.graphDb.run(
      "UPDATE graph_edges SET weight = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [weight, id]
    );

    const edge = await req.graphDb.get("SELECT * FROM graph_edges WHERE id = ?", id);
    res.json(edge);
  } catch (error) {
    console.error("Error updating edge:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete an edge
 * DELETE /api/plugins/graph/edges/:id
 */
exports.deleteEdge = async (req, res) => {
  try {
    const { id } = req.params;
    await req.graphDb.run("DELETE FROM graph_edges WHERE id = ?", id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting edge:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clear all graph data
 * DELETE /api/plugins/graph/clear
 */
exports.clearAllData = async (req, res) => {
  try {
    await req.graphDb.run("DELETE FROM graph_edges");
    await req.graphDb.run("DELETE FROM graph_nodes");
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing graph data:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Import graph data (bulk insert)
 * POST /api/plugins/graph/import
 */
exports.importGraphData = async (req, res) => {
  try {
    const { nodes, edges } = req.body;

    // Clear existing data
    await req.graphDb.run("DELETE FROM graph_edges");
    await req.graphDb.run("DELETE FROM graph_nodes");

    // Insert nodes
    if (nodes && nodes.length > 0) {
      const nodeStmt = await req.graphDb.prepare(
        `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const node of nodes) {
        await nodeStmt.run(
          node.id,
          node.x,
          node.y,
          node.label,
          node.color || "#3b82f6",
          node.radius || 20,
          node.fullContent || node.full_content || node.label
        );
      }
      await nodeStmt.finalize();
    }

    // Insert edges
    if (edges && edges.length > 0) {
      const edgeStmt = await req.graphDb.prepare(
        `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight)
         VALUES (?, ?, ?, ?)`
      );

      for (const edge of edges) {
        await edgeStmt.run(
          edge.id,
          edge.from || edge.from_node_id,
          edge.to || edge.to_node_id,
          edge.weight || 1.0
        );
      }
      await edgeStmt.finalize();
    }

    res.json({
      success: true,
      imported: {
        nodes: nodes?.length || 0,
        edges: edges?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error importing graph data:", error);
    res.status(500).json({ error: error.message });
  }
};

