const express = require('express');
const router = express.Router();
const enhancedCodeGraphController = require('../controllers/enhancedCodeGraphController');
const newCodeGraphController = require('../controllers/newCodeGraphController');

// =================================================================
// PROJECT ROUTES - Enhanced with full CRUD
// =================================================================

// Get all projects with statistics
router.get('/projects', async (req, res) => {
  try {
    const projects = await enhancedCodeGraphController.getProjectsWithStats();
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific project
router.get('/projects/:projectId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.getProject(req.params.projectId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create project (delegate to original controller)
router.post('/projects', async (req, res) => {
  try {
    const { name, path, description } = req.body;
    
    if (!name || !path) {
      return res.status(400).json({ success: false, error: 'Name and path are required' });
    }
    
    const projectId = await newCodeGraphController.createProject(name, path, description);
    const project = await enhancedCodeGraphController.getProject(projectId);
    
    res.json({ success: true, projectId, project: project.project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update project
router.put('/projects/:projectId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateProject(req.params.projectId, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete project
router.delete('/projects/:projectId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteProject(req.params.projectId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =================================================================
// FUNCTION ROUTES - Enhanced with full CRUD
// =================================================================

// Get functions for a project
router.get('/projects/:projectId/functions', async (req, res) => {
  try {
    const functions = await enhancedCodeGraphController.getFunctions(req.params.projectId);
    res.json({ success: true, functions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create function (delegate to original controller)
router.post('/projects/:projectId/functions', async (req, res) => {
  try {
    const { name, filePath, lineNumber, functionText, isAsync } = req.body;
    
    if (!name || !filePath) {
      return res.status(400).json({ success: false, error: 'Name and filePath are required' });
    }
    
    const functionId = await newCodeGraphController.analyzeFunction(
      req.params.projectId, name, filePath, lineNumber, functionText
    );
    
    res.json({ success: true, functionId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update function
router.put('/functions/:functionId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateFunction(req.params.functionId, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete function
router.delete('/functions/:functionId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteFunction(req.params.functionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =================================================================
// VARIABLE ROUTES - Enhanced with full CRUD
// =================================================================

// Get variables for a project (optionally filtered by function)
router.get('/projects/:projectId/variables', async (req, res) => {
  try {
    const { functionId } = req.query;
    const variables = await enhancedCodeGraphController.getVariables(req.params.projectId, functionId);
    res.json({ success: true, variables });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create variable (delegate to original controller)
router.post('/projects/:projectId/variables', async (req, res) => {
  try {
    const { functionId, name, type, value, filePath, lineNumber, scope } = req.body;
    
    if (!name || !filePath) {
      return res.status(400).json({ success: false, error: 'Name and filePath are required' });
    }
    
    const variableId = await newCodeGraphController.analyzeVariable(
      req.params.projectId, functionId, name, type, value, filePath, lineNumber, scope
    );
    
    res.json({ success: true, variableId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update variable
router.put('/variables/:variableId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateVariable(req.params.variableId, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete variable
router.delete('/variables/:variableId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteVariable(req.params.variableId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =================================================================
// DEPENDENCY ROUTES - Enhanced with full CRUD
// =================================================================

// Get dependencies for a project
router.get('/projects/:projectId/dependencies', async (req, res) => {
  try {
    const dependencies = await enhancedCodeGraphController.getDependencies(req.params.projectId);
    res.json({ success: true, dependencies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create dependency
router.post('/projects/:projectId/dependencies', async (req, res) => {
  try {
    const { sourceType, sourceId, targetType, targetId, relationshipType } = req.body;
    
    if (!sourceType || !sourceId || !targetType || !targetId || !relationshipType) {
      return res.status(400).json({ 
        success: false, 
        error: 'sourceType, sourceId, targetType, targetId, and relationshipType are required' 
      });
    }
    
    const result = await enhancedCodeGraphController.createDependency(
      req.params.projectId, sourceType, sourceId, targetType, targetId, relationshipType
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update dependency
router.put('/dependencies/:dependencyId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateDependency(req.params.dependencyId, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete dependency
router.delete('/dependencies/:dependencyId', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteDependency(req.params.dependencyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =================================================================
// VISUALIZATION ROUTES
// =================================================================

// Get visualization data for a project
router.get('/projects/:projectId/visualization', async (req, res) => {
  try {
    const visualizationData = await enhancedCodeGraphController.getVisualizationData(req.params.projectId);
    res.json({ success: true, visualization: visualizationData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =================================================================
// TEMPLATE & UTILITY ROUTES
// =================================================================

// Get available relationship types
router.get('/relationship-types', async (req, res) => {
  try {
    const relationshipTypes = enhancedCodeGraphController.getRelationshipTypes();
    res.json({ success: true, relationshipTypes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create and save DCIM example project to database
router.post('/create-saved-dcim-example', async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.createAndSaveDcimExample();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize database tables (delegate to original)
router.post('/initialize', async (req, res) => {
  try {
    await newCodeGraphController.initializeDatabase();
    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;