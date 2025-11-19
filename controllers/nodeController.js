// nodeController.js - HTTP logic for Node operations
const nodeService = require("../services/nodeService");

/**
 * Get all root nodes (top-level nodes)
 * GET /api/nodes
 */
exports.getAllRootNodes = async (req, res) => {
  try {
    const nodes = await nodeService.getAllRootNodes(req.db);
    res.json(nodes);
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
    const nodes = await nodeService.getChildNodes(req.db, id);
    res.json(nodes);
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
    const node = await nodeService.createNode(req.db, req.body);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a node
 * PUT /api/nodes/:id
 */
exports.updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    const node = await nodeService.updateNode(req.db, id, req.body);
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
    const { id } = req.params;
    await nodeService.deleteNode(req.db, id);
    res.status(204).send();
  } catch (error) {
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
    const node = await nodeService.getNodeById(req.db, id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    res.json(node);
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

    // Validate input
    if (!nodeId) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: nodeId" });
    }

    const result = await nodeService.reorderNodes(req.db, {
      nodeId,
      newParentId,
      newPosition,
    });

    if (!result) {
      return res
        .status(404)
        .json({ error: `Node with ID ${nodeId} not found` });
    }

    res.status(200).json(result);
  } catch (error) {
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
    const result = await nodeService.toggleNode(req.db, id);

    if (!result) {
      return res.status(404).json({ error: "Node not found" });
    }

    res.json(result);
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

    const node = await nodeService.getNodeBySequenceId(req.db, sequenceIdNum);

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
  try {
    const response = await nodeService.checkNodesExist(req.db);
    res.json(response);
  } catch (error) {
    console.error("Error checking if nodes exist:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add additional controller functions for other node operations...
// (Remaining operations like indenting, outdenting, fixing positions, etc.)
