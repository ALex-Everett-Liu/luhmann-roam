const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const {
  getDb,
  initializeDatabase,
  populateSequenceIds,
} = require("./database");
const fs = require("fs");
const path = require("path");
const nodeRoutes = require("./routes/nodeRoutes");
const webpConverterRoutes = require("./routes/webpConverterRoutes");
const imageViewerRoutes = require("./routes/imageViewerRoutes");
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

// Use the WebP converter plugin routes
app.use("/api/plugins/webp-converter", webpConverterRoutes);

// Use the Image Viewer plugin routes
app.use("/api/plugins/image-viewer", imageViewerRoutes);

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

// Serve WebP converter plugin static files
app.use("/plugins/webp-converter", express.static(path.join(__dirname, "plugins", "webp-converter")));

// Serve Image Viewer plugin static files
app.use("/plugins/image-viewer", express.static(path.join(__dirname, "plugins", "image-viewer")));

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

    const backups = [];

    // Backup main database
    const mainDbPath = path.join(__dirname, "outliner.db");
    const mainBackupFilename = `main-${timestamp}.db`;
    const mainBackupPath = path.join(backupDir, mainBackupFilename);

    if (fs.existsSync(mainDbPath)) {
      fs.copyFileSync(mainDbPath, mainBackupPath);
      backups.push({
        type: "main",
        filename: mainBackupFilename,
      });
      console.log(`Main database backup created: ${mainBackupFilename}`);
    } else {
      console.warn("Main database file not found, skipping backup");
    }

    if (backups.length === 0) {
      throw new Error("No databases found to backup");
    }

    res.status(200).json({
      success: true,
      backups: backups,
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


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebP Converter plugin available at /plugins/webp-converter/index.html`);
  console.log(`Image Viewer plugin available at /plugins/image-viewer/index.html`);
});

module.exports = app;
