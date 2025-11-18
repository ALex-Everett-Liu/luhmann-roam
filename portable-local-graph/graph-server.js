const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeGraphDatabase, getGraphDb } = require("./graph-database");

const app = express();
const PORT = 3001; // Different port from main app

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize database
let db;
initializeGraphDatabase().then((database) => {
  db = database;
  console.log("Graph database ready");
});

// Middleware to attach db to requests
app.use(async (req, res, next) => {
  if (!db) {
    db = await getGraphDb();
  }
  req.db = db;
  next();
});

// ========== API ENDPOINTS ==========

// Get all graph data
app.get("/api/graph", async (req, res) => {
  try {
    const nodes = await req.db.all("SELECT * FROM graph_nodes");
    const edges = await req.db.all("SELECT * FROM graph_edges");

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
});

// Create a new node
app.post("/api/graph/nodes", async (req, res) => {
  try {
    const { id, x, y, label, color, radius, full_content } = req.body;

    await req.db.run(
      `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, x, y, label, color || "#3b82f6", radius || 20, full_content || label]
    );

    const node = await req.db.get("SELECT * FROM graph_nodes WHERE id = ?", id);
    res.json(node);
  } catch (error) {
    console.error("Error creating node:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a node
app.put("/api/graph/nodes/:id", async (req, res) => {
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

    await req.db.run(
      `UPDATE graph_nodes SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const node = await req.db.get("SELECT * FROM graph_nodes WHERE id = ?", id);
    res.json(node);
  } catch (error) {
    console.error("Error updating node:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a node
app.delete("/api/graph/nodes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated edges first
    await req.db.run(
      "DELETE FROM graph_edges WHERE from_node_id = ? OR to_node_id = ?",
      [id, id]
    );

    // Delete the node
    await req.db.run("DELETE FROM graph_nodes WHERE id = ?", id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting node:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new edge
app.post("/api/graph/edges", async (req, res) => {
  try {
    const { id, from_node_id, to_node_id, weight } = req.body;

    await req.db.run(
      `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight)
       VALUES (?, ?, ?, ?)`,
      [id, from_node_id, to_node_id, weight || 1.0]
    );

    const edge = await req.db.get("SELECT * FROM graph_edges WHERE id = ?", id);
    res.json(edge);
  } catch (error) {
    console.error("Error creating edge:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update an edge
app.put("/api/graph/edges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { weight } = req.body;

    await req.db.run(
      "UPDATE graph_edges SET weight = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [weight, id]
    );

    const edge = await req.db.get("SELECT * FROM graph_edges WHERE id = ?", id);
    res.json(edge);
  } catch (error) {
    console.error("Error updating edge:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an edge
app.delete("/api/graph/edges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.run("DELETE FROM graph_edges WHERE id = ?", id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting edge:", error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all graph data
app.delete("/api/graph/clear", async (req, res) => {
  try {
    await req.db.run("DELETE FROM graph_edges");
    await req.db.run("DELETE FROM graph_nodes");
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing graph data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Import graph data (bulk insert)
app.post("/api/graph/import", async (req, res) => {
  try {
    const { nodes, edges } = req.body;

    // Clear existing data
    await req.db.run("DELETE FROM graph_edges");
    await req.db.run("DELETE FROM graph_nodes");

    // Insert nodes
    if (nodes && nodes.length > 0) {
      const nodeStmt = await req.db.prepare(
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
      const edgeStmt = await req.db.prepare(
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
});

// Start server
app.listen(PORT, () => {
  console.log(`Graph plugin server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/index.html to use the graph plugin`);
});

