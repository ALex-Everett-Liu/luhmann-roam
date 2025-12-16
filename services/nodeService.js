// nodeService.js - Business logic for Node operations
const { v7: uuidv7 } = require("uuid");

/**
 * Process line breaks in node content for display
 * @param {Object} node - Node object
 * @returns {Object} Node with processed content
 */
function processNodeContent(node) {
  if (!node) return node;
  
  return {
    ...node,
    content: node.content ? node.content.replace(/\\n/g, "\n") : node.content,
    content_zh: node.content_zh
      ? node.content_zh.replace(/\\n/g, "\n")
      : node.content_zh,
  };
}

/**
 * Get all root nodes (top-level nodes)
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of processed root nodes
 */
async function getAllRootNodes(db) {
  const nodes = await db.all(`
    SELECT n.*, n.sequence_id
    FROM nodes n
    WHERE n.parent_id IS NULL
    ORDER BY n.position
  `);

  return nodes.map((node) => {
    console.log(
      `Node ${node.id} content from DB:`,
      JSON.stringify(node.content),
    );
    const processed = processNodeContent(node);
    console.log(
      `Node ${node.id} content after replace:`,
      JSON.stringify(processed.content),
    );
    return processed;
  });
}

/**
 * Get children of a node
 * @param {Object} db - Database connection
 * @param {string} parentId - Parent node ID
 * @returns {Promise<Array>} Array of processed child nodes
 */
async function getChildNodes(db, parentId) {
  const nodes = await db.all(
    `
    SELECT n.*
    FROM nodes n
    WHERE n.parent_id = ?
    ORDER BY n.position
  `,
    parentId,
  );

  return nodes.map((node) => {
    console.log(
      `Node ${node.id} content from DB:`,
      JSON.stringify(node.content),
    );
    const processed = processNodeContent(node);
    console.log(
      `Node ${node.id} content after replace:`,
      JSON.stringify(processed.content),
    );
    return processed;
  });
}

/**
 * Create a new node
 * @param {Object} db - Database connection
 * @param {Object} nodeData - Node data (content, content_zh, parent_id, position)
 * @returns {Promise<Object>} Created node
 */
async function createNode(db, nodeData) {
  const { content, content_zh, parent_id, position } = nodeData;
  const now = Date.now();
  const id = uuidv7();

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
  return node;
}

/**
 * Update a node
 * @param {Object} db - Database connection
 * @param {string} id - Node ID
 * @param {Object} nodeData - Node data to update (content, content_zh, parent_id, position, is_expanded, node_size)
 * @returns {Promise<Object>} Updated node
 */
async function updateNode(db, id, nodeData) {
  const { content, content_zh, parent_id, position, is_expanded, node_size } =
    nodeData;
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

  query += " WHERE id = ?";
  params.push(id);

  // Add these logging statements before the database update
  console.log("Executing update with query:", query);
  console.log("Executing update with params:", JSON.stringify(params));

  await db.run(query, params);
  const node = await db.get("SELECT * FROM nodes WHERE id = ?", id);

  // Add this logging statement after fetching the updated node
  console.log("Node after update from DB:", JSON.stringify(node));

  return node;
}

/**
 * Delete a node and all its children recursively
 * @param {Object} db - Database connection
 * @param {string} id - Node ID
 * @returns {Promise<void>}
 */
async function deleteNode(db, id) {
  // Start a transaction
  await db.run("BEGIN TRANSACTION");

  try {
    // Recursive function to delete children
    const deleteChildren = async (nodeId) => {
      const children = await db.all(
        "SELECT id FROM nodes WHERE parent_id = ?",
        nodeId,
      );
      for (const child of children) {
        await deleteChildren(child.id);
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
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get a single node by ID
 * @param {Object} db - Database connection
 * @param {string} id - Node ID
 * @returns {Promise<Object|null>} Node object or null if not found
 */
async function getNodeById(db, id) {
  const node = await db.get("SELECT * FROM nodes WHERE id = ?", id);

  if (!node) {
    return null;
  }

  // Process line breaks for display
  const processedNode = processNodeContent(node);

  console.log(`Node ${id} content from DB:`, JSON.stringify(node.content));
  const newContent = node.content
    ? node.content.replace(/\\n/g, "\n")
    : node.content;
  console.log(
    `Node ${id} content after replace:`,
    JSON.stringify(newContent),
  );

  return processedNode;
}

/**
 * Reorder nodes (when dragging)
 * @param {Object} db - Database connection
 * @param {Object} reorderData - Reorder data (nodeId, newParentId, newPosition)
 * @returns {Promise<Object>} Result with node info or null if not found
 */
async function reorderNodes(db, reorderData) {
  const { nodeId, newParentId, newPosition } = reorderData;

  // Start a transaction
  await db.run("BEGIN TRANSACTION");

  try {
    // Get current parent and position
    const node = await db.get(
      "SELECT parent_id, position FROM nodes WHERE id = ?",
      nodeId,
    );

    // Check if node exists
    if (!node) {
      await db.run("ROLLBACK");
      return null;
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
    return { success: true };
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Toggle node expansion
 * @param {Object} db - Database connection
 * @param {string} id - Node ID
 * @returns {Promise<Object>} Updated node with new expansion state
 */
async function toggleNode(db, id) {
  const node = await db.get("SELECT is_expanded FROM nodes WHERE id = ?", id);

  if (!node) {
    return null;
  }

  const newExpandedState = !node.is_expanded;

  await db.run(
    "UPDATE nodes SET is_expanded = ?, updated_at = ? WHERE id = ?",
    [newExpandedState, Date.now(), id],
  );

  return { id, is_expanded: newExpandedState };
}

/**
 * Get a single node by sequence ID
 * @param {Object} db - Database connection
 * @param {number} sequenceId - Sequence ID
 * @returns {Promise<Object|null>} Node object or null if not found
 */
async function getNodeBySequenceId(db, sequenceId) {
  const node = await db.get(
    "SELECT * FROM nodes WHERE sequence_id = ?",
    sequenceId,
  );

  return node || null;
}

/**
 * Check if any nodes exist in the database
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} Object with exists flag and count
 */
async function checkNodesExist(db) {
  console.log("checkNodesExist function called!");
  console.log("Database connection:", !!db);

  // Simple count query to check if any nodes exist
  const result = await db.get("SELECT COUNT(*) as count FROM nodes LIMIT 1");
  console.log("Query result:", result);

  const response = {
    exists: result.count > 0,
    count: result.count,
  };
  console.log("Sending response:", response);

  return response;
}

module.exports = {
  getAllRootNodes,
  getChildNodes,
  createNode,
  updateNode,
  deleteNode,
  getNodeById,
  reorderNodes,
  toggleNode,
  getNodeBySequenceId,
  checkNodesExist,
  processNodeContent,
};

