// graphController.js - HTTP logic for Graph Plugin operations
const graphService = require("../services/graphService");

/**
 * Get all graph data
 * GET /api/plugins/graph
 */
exports.getAllGraphData = async (req, res) => {
  try {
    const graphData = await graphService.getAllGraphData(req.graphDb);
    res.json(graphData);
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
    const node = await graphService.createNode(req.graphDb, req.body);
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
    const node = await graphService.updateNode(req.graphDb, id, req.body);
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
    await graphService.deleteNode(req.graphDb, id);
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
    const edge = await graphService.createEdge(req.graphDb, req.body);
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
    const edge = await graphService.updateEdge(req.graphDb, id, req.body);
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
    await graphService.deleteEdge(req.graphDb, id);
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
    await graphService.clearAllData(req.graphDb);
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
    const imported = await graphService.importGraphData(req.graphDb, req.body);
    res.json({
      success: true,
      imported,
    });
  } catch (error) {
    console.error("Error importing graph data:", error);
    res.status(500).json({ error: error.message });
  }
};

