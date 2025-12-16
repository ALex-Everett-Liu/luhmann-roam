const express = require("express");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  initializeGraphDatabase,
  getGraphDb,
  populateGraphSequenceIds,
} = require("./graph-database");

const app = express();
const PORT = 8036; // Different port from main app

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3003",
      "http://localhost:3000",
      "http://127.0.0.1:3003",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static(__dirname));

// Initialize database
let db;
initializeGraphDatabase()
  .then((database) => {
    db = database;
    console.log("Graph database ready");
    return populateGraphSequenceIds();
  })
  .then((result) => {
    console.log("Graph sequence IDs populated:", result);
  })
  .catch((err) => {
    console.error("Error initializing graph database:", err);
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

    // Generate UUID v4 if not provided
    const nodeId = id || uuidv4();
    const now = Date.now();

    // Get the next sequence_id by finding the maximum existing sequence_id
    const maxSequenceResult = await req.db.get(
      "SELECT MAX(sequence_id) as max_seq FROM graph_nodes WHERE sequence_id IS NOT NULL",
    );
    const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

    await req.db.run(
      `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content, sequence_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nodeId,
        x,
        y,
        label,
        color || "#3b82f6",
        radius || 20,
        full_content || label,
        nextSequenceId,
        now,
        now,
      ],
    );

    const node = await req.db.get(
      "SELECT * FROM graph_nodes WHERE id = ?",
      nodeId,
    );
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

    await req.db.run(
      `UPDATE graph_nodes SET ${updates.join(", ")} WHERE id = ?`,
      values,
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
      [id, id],
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

    // Generate UUID v4 if not provided
    const edgeId = id || uuidv4();
    const now = Date.now();

    // Get the next sequence_id by finding the maximum existing sequence_id
    const maxSequenceResult = await req.db.get(
      "SELECT MAX(sequence_id) as max_seq FROM graph_edges WHERE sequence_id IS NOT NULL",
    );
    const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

    await req.db.run(
      `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight, sequence_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        edgeId,
        from_node_id,
        to_node_id,
        weight || 1.0,
        nextSequenceId,
        now,
        now,
      ],
    );

    const edge = await req.db.get(
      "SELECT * FROM graph_edges WHERE id = ?",
      edgeId,
    );
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
    const now = Date.now();

    await req.db.run(
      "UPDATE graph_edges SET weight = ?, updated_at = ? WHERE id = ?",
      [weight, now, id],
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

    // Get max sequence IDs for nodes and edges
    const maxNodeSequenceResult = await req.db.get(
      "SELECT MAX(sequence_id) as max_seq FROM graph_nodes WHERE sequence_id IS NOT NULL",
    );
    const maxEdgeSequenceResult = await req.db.get(
      "SELECT MAX(sequence_id) as max_seq FROM graph_edges WHERE sequence_id IS NOT NULL",
    );
    let nextNodeSequenceId = (maxNodeSequenceResult?.max_seq || 0) + 1;
    let nextEdgeSequenceId = (maxEdgeSequenceResult?.max_seq || 0) + 1;

    // Insert nodes
    if (nodes && nodes.length > 0) {
      const nodeStmt = await req.db.prepare(
        `INSERT INTO graph_nodes (id, x, y, label, color, radius, full_content, sequence_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          updatedAt,
        );
      }
      await nodeStmt.finalize();
    }

    // Insert edges
    if (edges && edges.length > 0) {
      const edgeStmt = await req.db.prepare(
        `INSERT INTO graph_edges (id, from_node_id, to_node_id, weight, sequence_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
          updatedAt,
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
  console.log(
    `Open http://localhost:${PORT}/index.html to use the graph plugin`,
  );
});
