const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const {
  getDb,
  initializeDatabase,
  populateSequenceIds,
} = require("./database");
const {
  getGraphDb,
  initializeGraphDatabase,
} = require("./plugins/graph/graph-database");
const fs = require("fs");
const path = require("path");
const nodeRoutes = require("./routes/nodeRoutes");
const crypto = require("crypto");
const axios = require("axios");
const url = require("url");
const sanitizeHtml = require("sanitize-html");
const sharp = require("sharp");
const upload = require("./middleware/upload");

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());

// Modern Express built-in parsers with increased limits
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(express.static("public"));

// Explicitly set up the attachment directory
app.use(
  "/attachment",
  express.static(path.join(__dirname, "public/attachment")),
);

// Add language preference middleware
app.use((req, res, next) => {
  req.lang = req.query.lang || "en"; // Default to English if not specified
  next();
});

// Initialize main database
let db;
initializeDatabase()
  .then((database) => {
    db = database;
    console.log("Database initialized successfully");
    return populateSequenceIds();
  })
  .then((result) => {
    console.log("Sequence IDs populated:", result);
  })
  .catch((err) => {
    console.error("Error during initialization:", err);
  });

// Initialize graph plugin database
let graphDb;
initializeGraphDatabase()
  .then((database) => {
    graphDb = database;
    console.log("Graph plugin database initialized");
  })
  .catch((err) => {
    console.error("Error initializing graph database:", err);
  });

// Add this middleware to create a fresh db connection for each request
app.use(async (req, res, next) => {
  try {
    req.db = await getDb(); // Use main database only
    next();
  } catch (err) {
    console.error("Error creating database connection:", err);
    res.status(500).json({ error: "Database connection error" });
  }
});

// Routes

// Use the node routes
app.use("/api/nodes", nodeRoutes);

// Get node above
app.get("/api/nodes/:id/above", async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    let nodeAbove;

    if (node.parent_id) {
      // If it has a parent, get siblings with position less than current node
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1",
        [node.parent_id, node.position],
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id IS NULL AND position < ? ORDER BY position DESC LIMIT 1",
        [node.position],
      );
    }

    if (nodeAbove) {
      res.json(nodeAbove);
    } else {
      res.status(404).json({ error: "No node above" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle indenting a node
app.post("/api/nodes/:id/indent", async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Can't indent a root node without siblings above it
    if (!node.parent_id && node.position === 0) {
      return res
        .status(400)
        .json({ error: "Cannot indent the first root node" });
    }

    let nodeAbove;

    if (node.parent_id) {
      // If it has a parent, get siblings with position less than current node
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1",
        [node.parent_id, node.position],
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id IS NULL AND position < ? ORDER BY position DESC LIMIT 1",
        [node.position],
      );
    }

    if (!nodeAbove) {
      return res.status(400).json({ error: "No node above to make parent" });
    }

    // Get children of the node above
    const children = await req.db.all(
      "SELECT * FROM nodes WHERE parent_id = ? ORDER BY position",
      nodeAbove.id,
    );
    const maxPosition = children.length;

    // Start a transaction
    await req.db.run("BEGIN TRANSACTION");

    // Update positions of nodes in old parent
    if (node.parent_id) {
      await req.db.run(
        "UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?",
        [node.parent_id, node.position],
      );
    } else {
      await req.db.run(
        "UPDATE nodes SET position = position - 1 WHERE parent_id IS NULL AND position > ?",
        node.position,
      );
    }

    // Update the node itself
    await req.db.run(
      "UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
      [nodeAbove.id, maxPosition, Date.now(), id],
    );

    // Ensure the parent is expanded
    await req.db.run(
      "UPDATE nodes SET is_expanded = 1, updated_at = ? WHERE id = ?",
      [Date.now(), nodeAbove.id],
    );

    await req.db.run("COMMIT");

    res.json({ success: true });
  } catch (error) {
    await req.db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});

// Handle outdenting a node
app.post("/api/nodes/:id/outdent", async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Can't outdent a root node
    if (!node.parent_id) {
      return res.status(400).json({ error: "Cannot outdent a root node" });
    }

    // Get the parent node
    const parentNode = await req.db.get(
      "SELECT * FROM nodes WHERE id = ?",
      node.parent_id,
    );

    // Start a transaction
    await req.db.run("BEGIN TRANSACTION");

    // Update positions of nodes in old parent
    await req.db.run(
      "UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?",
      [node.parent_id, node.position],
    );

    let targetPosition;

    if (parentNode.parent_id) {
      // Parent has a parent, find parent's next sibling position
      const parentSiblings = await req.db.all(
        "SELECT * FROM nodes WHERE parent_id = ? AND position > ? ORDER BY position",
        [parentNode.parent_id, parentNode.position],
      );

      if (parentSiblings.length > 0) {
        // Insert at parent's sibling position
        targetPosition = parentNode.position + 1;

        // Shift parent's siblings
        await req.db.run(
          "UPDATE nodes SET position = position + 1 WHERE parent_id = ? AND position > ?",
          [parentNode.parent_id, parentNode.position],
        );
      } else {
        // Parent is the last child, so insert at the end
        targetPosition = parentNode.position + 1;
      }

      // Update the node
      await req.db.run(
        "UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
        [parentNode.parent_id, targetPosition, Date.now(), id],
      );
    } else {
      // Parent is a root node, find position for new root node
      const rootCount = await req.db.get(
        "SELECT COUNT(*) as count FROM nodes WHERE parent_id IS NULL",
      );
      targetPosition = rootCount.count;

      // Update the node to be a root node
      await req.db.run(
        "UPDATE nodes SET parent_id = NULL, position = ?, updated_at = ? WHERE id = ?",
        [targetPosition, Date.now(), id],
      );
    }

    await req.db.run("COMMIT");

    res.json({ success: true });
  } catch (error) {
    await req.db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});

// Move node up
app.post("/api/nodes/:id/move-up", async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Can't move up if it's already at the top
    if (node.position === 0) {
      return res.status(400).json({ error: "Node is already at the top" });
    }

    // Start a transaction
    await req.db.run("BEGIN TRANSACTION");

    // Find the node directly above this one
    let nodeAbove;
    if (node.parent_id) {
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id = ? AND position = ?",
        [node.parent_id, node.position - 1],
      );
    } else {
      nodeAbove = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?",
        [node.position - 1],
      );
    }

    if (!nodeAbove) {
      await req.db.run("ROLLBACK");
      return res.status(400).json({ error: "No node above to swap with" });
    }

    // Swap positions
    await req.db.run(
      "UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?",
      [node.position, Date.now(), nodeAbove.id],
    );

    await req.db.run(
      "UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?",
      [node.position - 1, Date.now(), id],
    );

    await req.db.run("COMMIT");

    res.json({ success: true });
  } catch (error) {
    await req.db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});

// Move node down
app.post("/api/nodes/:id/move-down", async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Find the node directly below this one
    let nodeBelow;
    if (node.parent_id) {
      nodeBelow = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id = ? AND position = ?",
        [node.parent_id, node.position + 1],
      );
    } else {
      nodeBelow = await req.db.get(
        "SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?",
        [node.position + 1],
      );
    }

    // Can't move down if it's already at the bottom
    if (!nodeBelow) {
      return res.status(400).json({ error: "Node is already at the bottom" });
    }

    // Start a transaction
    await req.db.run("BEGIN TRANSACTION");

    // Swap positions
    await req.db.run(
      "UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?",
      [node.position, Date.now(), nodeBelow.id],
    );

    await req.db.run(
      "UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?",
      [node.position + 1, Date.now(), id],
    );

    await req.db.run("COMMIT");

    res.json({ success: true });
  } catch (error) {
    await req.db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});

// Add this middleware to ensure correct MIME types for CSS files
app.use("*.css", (req, res, next) => {
  res.header("Content-Type", "text/css");
  next();
});

// Add a debug endpoint to get full node info
app.get("/api/debug/node/:id", async (req, res) => {
  try {
    const db = await getDb();
    const node = await db.get(
      "SELECT * FROM nodes WHERE id = ?",
      req.params.id,
    );

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    res.json({
      node,
      message: "This is the complete node data, including node_size field",
      has_node_size_field: node.hasOwnProperty("node_size"),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/css", express.static(path.join(__dirname, "public", "css")));
app.use("/fonts", express.static(path.join(__dirname, "public", "fonts")));

// Serve graph plugin static files
app.use("/plugins/graph", express.static(path.join(__dirname, "plugins", "graph")));

app.post("/api/backup", async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");

    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Generate timestamp for filename
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-") // Replace colons with hyphens for valid filename
      .replace(/\..+/, ""); // Remove milliseconds

    // Define source path for main database
    const dbPath = path.join(__dirname, "outliner.db");
    const backupFilename = `main-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);

    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);

    console.log(`Database backup created: ${backupFilename}`);

    res.status(200).json({
      success: true,
      filename: backupFilename,
      vault: "main",
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== Graph Plugin API Routes ==========

// Middleware to attach graph database to requests
app.use("/api/plugins/graph", async (req, res, next) => {
  if (!graphDb) {
    graphDb = await getGraphDb();
  }
  req.graphDb = graphDb;
  next();
});

// Get all graph data
app.get("/api/plugins/graph", async (req, res) => {
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
});

// Create a new node
app.post("/api/plugins/graph/nodes", async (req, res) => {
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
});

// Update a node
app.put("/api/plugins/graph/nodes/:id", async (req, res) => {
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
});

// Delete a node
app.delete("/api/plugins/graph/nodes/:id", async (req, res) => {
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
});

// Create a new edge
app.post("/api/plugins/graph/edges", async (req, res) => {
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
});

// Update an edge
app.put("/api/plugins/graph/edges/:id", async (req, res) => {
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
});

// Delete an edge
app.delete("/api/plugins/graph/edges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await req.graphDb.run("DELETE FROM graph_edges WHERE id = ?", id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting edge:", error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all graph data
app.delete("/api/plugins/graph/clear", async (req, res) => {
  try {
    await req.graphDb.run("DELETE FROM graph_edges");
    await req.graphDb.run("DELETE FROM graph_nodes");
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing graph data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Import graph data (bulk insert)
app.post("/api/plugins/graph/import", async (req, res) => {
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Graph plugin available at /plugins/graph/index.html`);
});

module.exports = app;
