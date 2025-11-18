// nodeController.js - Logic for node operations
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

/**
 * Get all root nodes (top-level nodes)
 * GET /api/nodes
 */
exports.getAllRootNodes = async (req, res) => {
  try {
    const db = req.db;

    // Get nodes without link complexity
    const nodes = await db.all(`
      SELECT n.*, n.sequence_id
      FROM nodes n
      WHERE n.parent_id IS NULL
      ORDER BY n.position
    `);

    // Process line breaks for display
    const processedNodes = nodes.map((node) => {
      console.log(
        `Node ${node.id} content from DB:`,
        JSON.stringify(node.content),
      );
      const newContent = node.content
        ? node.content.replace(/\\n/g, "\n")
        : node.content;
      console.log(
        `Node ${node.id} content after replace:`,
        JSON.stringify(newContent),
      );
      return {
        ...node,
        content: newContent,
        content_zh: node.content_zh
          ? node.content_zh.replace(/\\n/g, "\n")
          : node.content_zh,
      };
    });

    res.json(processedNodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get children of a node
 * GET /api/nodes/:id/children
 */
exports.getChildNodes = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    // Get children without link complexity
    const nodes = await db.all(
      `
      SELECT n.*
      FROM nodes n
      WHERE n.parent_id = ?
      ORDER BY n.position
    `,
      id,
    );

    // Process line breaks for display
    const processedNodes = nodes.map((node) => {
      console.log(
        `Node ${node.id} content from DB:`,
        JSON.stringify(node.content),
      );
      const newContent = node.content
        ? node.content.replace(/\\n/g, "\n")
        : node.content;
      console.log(
        `Node ${node.id} content after replace:`,
        JSON.stringify(newContent),
      );
      return {
        ...node,
        content: newContent,
        content_zh: node.content_zh
          ? node.content_zh.replace(/\\n/g, "\n")
          : node.content_zh,
      };
    });

    res.json(processedNodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new node
 * POST /api/nodes
 */
exports.createNode = async (req, res) => {
  try {
    const { content, content_zh, parent_id, position } = req.body;
    const db = req.db;
    const now = Date.now();
    const id = uuidv4();

    // Get the next sequence_id by finding the maximum existing sequence_id
    const maxSequenceResult = await db.get(
      "SELECT MAX(sequence_id) as max_seq FROM nodes WHERE sequence_id IS NOT NULL"
    );
    const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

    await db.run(
      "INSERT INTO nodes (id, content, content_zh, parent_id, position, sequence_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, content, content_zh, parent_id, position, nextSequenceId, now, now],
    );

    const node = await db.get("SELECT * FROM nodes WHERE id = ?", id);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: error.message }); // If there was a duplicate, the database would reject it with a UNIQUE constraint error
  }
};

/**
 * Update a node
 * PUT /api/nodes/:id
 */
exports.updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, content_zh, parent_id, position, is_expanded, node_size } =
      req.body;
    const db = req.db;
    const now = Date.now();

    let query = "UPDATE nodes SET updated_at = ?";
    const params = [now];

    // Dynamic query building - only update fields that are provided
    if (content !== undefined) {
      query += ", content = ?";
      params.push(content);
    }

    if (content_zh !== undefined) {
      query += ", content_zh = ?";
      params.push(content_zh);
    }

    if (parent_id !== undefined) {
      query += ", parent_id = ?";
      params.push(parent_id);
    }

    if (position !== undefined) {
      query += ", position = ?";
      params.push(position);
    }

    if (is_expanded !== undefined) {
      query += ", is_expanded = ?";
      params.push(is_expanded);
    }

    if (node_size !== undefined) {
      query += ", node_size = ?";
      params.push(node_size);
    }

    query += " WHERE id = ?"; // The query is finalized by adding a WHERE clause to specify which node to update based on its ID. The id is added to the parameters array.
    params.push(id);

    // Add these logging statements before the database update
    console.log("Executing update with query:", query);
    console.log("Executing update with params:", JSON.stringify(params));

    await db.run(query, params);
    const node = await db.get("SELECT * FROM nodes WHERE id = ?", id); // Fetching the Updated Node: After the update, this line retrieves the complete record of the updated node from the database using its ID. This is useful for returning the full details of the node in the response.

    // Add this logging statement after fetching the updated node
    console.log("Node after update from DB:", JSON.stringify(node));

    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a node
 * DELETE /api/nodes/:id
 */
exports.deleteNode = async (req, res) => {
  try {
    const { id } = req.params; // Extract the node ID from the request parameters
    const db = req.db; // Get the database connection from the request object

    // Start a transaction
    await db.run("BEGIN TRANSACTION");

    // Recursive function to delete children
    const deleteChildren = async (nodeId) => {
      // takes a nodeId as an argument.
      const children = await db.all(
        "SELECT id FROM nodes WHERE parent_id = ?",
        nodeId,
      ); // retrieves all nodes that have the current node as their parent.
      for (const child of children) {
        await deleteChildren(child.id); // For each child node found, the function calls itself recursively to delete that child's children, ensuring that all descendants are deleted before the parent node.
      }

      // Delete links associated with this node
      // Links deletion removed - pure node operations
      //
      // Previously deleted links when a node was removed
      // This functionality was part of the link management system
      // that was eliminated in v0.32.3
      //
      // Now application operates with simple node hierarchy only

      // Delete the node
      await db.run("DELETE FROM nodes WHERE id = ?", nodeId);
    };

    await deleteChildren(id);

    await db.run("COMMIT");
    res.status(204).send(); // indicate that the deletion was successful and there is no content to return.
  } catch (error) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single node by ID
 * GET /api/nodes/:id
 */
exports.getNodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const node = await db.get("SELECT * FROM nodes WHERE id = ?", id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Process line breaks for display
    const processedNode = {
      ...node,
      content: node.content ? node.content.replace(/\\n/g, "\n") : node.content,
      content_zh: node.content_zh
        ? node.content_zh.replace(/\\n/g, "\n")
        : node.content_zh,
    };

    console.log(`Node ${id} content from DB:`, JSON.stringify(node.content));
    const newContent = node.content
      ? node.content.replace(/\\n/g, "\n")
      : node.content;
    console.log(
      `Node ${id} content after replace:`,
      JSON.stringify(newContent),
    );

    res.json(processedNode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reorder nodes (when dragging)
 * POST /api/nodes/reorder
 */
exports.reorderNodes = async (req, res) => {
  try {
    const { nodeId, newParentId, newPosition } = req.body;
    const db = req.db;

    // Validate input
    if (!nodeId) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: nodeId" });
    }

    // Start a transaction
    await db.run("BEGIN TRANSACTION");

    // Get current parent and position
    const node = await db.get(
      "SELECT parent_id, position FROM nodes WHERE id = ?",
      nodeId,
    );

    // Check if node exists
    if (!node) {
      await db.run("ROLLBACK");
      return res
        .status(404)
        .json({ error: `Node with ID ${nodeId} not found` });
    }

    const oldParentId = node.parent_id;
    const oldPosition = node.position;

    // Update positions of nodes in old parent
    if (oldParentId) {
      await db.run(
        "UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?",
        [oldParentId, oldPosition],
      );
    } else {
      await db.run(
        "UPDATE nodes SET position = position - 1 WHERE parent_id IS NULL AND position > ?",
        oldPosition,
      );
    }

    // Update positions of nodes in new parent
    if (newParentId) {
      await db.run(
        "UPDATE nodes SET position = position + 1 WHERE parent_id = ? AND position >= ?",
        [newParentId, newPosition],
      );
    } else {
      await db.run(
        "UPDATE nodes SET position = position + 1 WHERE parent_id IS NULL AND position >= ?",
        newPosition,
      );
    }

    // Update the node itself
    await db.run(
      "UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
      [newParentId, newPosition, Date.now(), nodeId],
    );

    await db.run("COMMIT");
    res.status(200).json({ success: true });
  } catch (error) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
};

/**
 * Toggle node expansion
 * POST /api/nodes/:id/toggle
 */
exports.toggleNode = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const node = await db.get("SELECT is_expanded FROM nodes WHERE id = ?", id);

    await db.run(
      "UPDATE nodes SET is_expanded = ?, updated_at = ? WHERE id = ?",
      [!node.is_expanded, Date.now(), id],
    );

    res.json({ id, is_expanded: !node.is_expanded });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single node by sequence ID
 * GET /api/nodes/sequence/:sequence_id
 */
exports.getNodeBySequenceId = async (req, res) => {
  try {
    const { sequence_id } = req.params;

    // Validate input
    const sequenceIdNum = parseInt(sequence_id);
    if (isNaN(sequenceIdNum) || sequenceIdNum <= 0) {
      return res.status(400).json({ error: "Invalid sequence ID format" });
    }

    const db = req.db;
    const node = await db.get(
      "SELECT * FROM nodes WHERE sequence_id = ?",
      sequenceIdNum,
    );

    if (!node) {
      return res
        .status(404)
        .json({ error: "Node not found with the provided sequence ID" });
    }

    res.json(node);
  } catch (error) {
    console.error(
      `Error retrieving node by sequence ID ${req.params.sequence_id}:`,
      error,
    );
    res
      .status(500)
      .json({ error: "Database error when retrieving node by sequence ID" });
  }
};

/**
 * Check if any nodes exist in the database
 * GET /api/nodes/exists
 */
exports.checkNodesExist = async (req, res) => {
  console.log("checkNodesExist function called!");
  try {
    const db = req.db;
    console.log("Database connection:", !!db);

    // Simple count query to check if any nodes exist
    const result = await db.get("SELECT COUNT(*) as count FROM nodes LIMIT 1");
    console.log("Query result:", result);

    const response = {
      exists: result.count > 0,
      count: result.count,
    };
    console.log("Sending response:", response);

    res.json(response);
  } catch (error) {
    console.error("Error checking if nodes exist:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add additional controller functions for other node operations...
// (Remaining operations like indenting, outdenting, fixing positions, etc.)
