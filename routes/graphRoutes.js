// graphRoutes.js - Routes for Graph Plugin API operations
const express = require("express");
const graphController = require("../controllers/graphController");
const { getGraphDb } = require("../plugins/graph/graph-database");

const router = express.Router();

// Middleware to attach graph database to requests
router.use(async (req, res, next) => {
  try {
    req.graphDb = await getGraphDb();
    next();
  } catch (error) {
    console.error("Error attaching graph database:", error);
    res.status(500).json({ error: "Graph database connection error" });
  }
});

// Get all graph data
router.get("/", graphController.getAllGraphData);

// Create a new node
router.post("/nodes", graphController.createNode);

// Update a node
router.put("/nodes/:id", graphController.updateNode);

// Delete a node
router.delete("/nodes/:id", graphController.deleteNode);

// Create a new edge
router.post("/edges", graphController.createEdge);

// Update an edge
router.put("/edges/:id", graphController.updateEdge);

// Delete an edge
router.delete("/edges/:id", graphController.deleteEdge);

// Clear all graph data
router.delete("/clear", graphController.clearAllData);

// Import graph data (bulk insert)
router.post("/import", graphController.importGraphData);

module.exports = router;
