const { getDb } = require('../database');
const path = require('path');
const fs = require('fs');

// Simple Code Graph Controller - Clean Start
class NewCodeGraphController {
  constructor() {
    this.currentProject = null;
  }

  // Initialize database tables for the simple code graph
  async initializeDatabase() {
    const db = await getDb();
    
    // Projects table - to track different codebases/repos
    await db.run(`
      CREATE TABLE IF NOT EXISTS simple_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Add sequence_id column if it doesn't exist
    try {
      await db.run(`ALTER TABLE simple_projects ADD COLUMN sequence_id INTEGER`);
      console.log('Added sequence_id column to simple_projects');
    } catch (error) {
      // Column likely already exists
      console.log('sequence_id column already exists in simple_projects:', error.message);
    }

    // Functions table - to track functions/methods
    await db.run(`
      CREATE TABLE IF NOT EXISTS simple_functions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        parameters TEXT, -- JSON string of parameters
        return_type TEXT,
        is_async BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (project_id) REFERENCES simple_projects(id)
      )
    `);

    // Add sequence_id column if it doesn't exist
    try {
      await db.run(`ALTER TABLE simple_functions ADD COLUMN sequence_id INTEGER`);
      console.log('Added sequence_id column to simple_functions');
    } catch (error) {
      console.log('sequence_id column already exists in simple_functions:', error.message);
    }

    // Variables table - to track variables
    await db.run(`
      CREATE TABLE IF NOT EXISTS simple_variables (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        function_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        value TEXT,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        scope TEXT, -- 'local', 'parameter', 'global'
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (project_id) REFERENCES simple_projects(id),
        FOREIGN KEY (function_id) REFERENCES simple_functions(id)
      )
    `);

    // Add sequence_id column if it doesn't exist
    try {
      await db.run(`ALTER TABLE simple_variables ADD COLUMN sequence_id INTEGER`);
      console.log('Added sequence_id column to simple_variables');
    } catch (error) {
      console.log('sequence_id column already exists in simple_variables:', error.message);
    }

    // Dependencies table - to track relationships
    await db.run(`
      CREATE TABLE IF NOT EXISTS simple_dependencies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'function', 'variable'
        source_id TEXT NOT NULL,
        target_type TEXT NOT NULL, -- 'function', 'variable', 'module'
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL, -- 'calls', 'uses', 'assigns', 'returns'
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (project_id) REFERENCES simple_projects(id)
      )
    `);

    // Add sequence_id column if it doesn't exist
    try {
      await db.run(`ALTER TABLE simple_dependencies ADD COLUMN sequence_id INTEGER`);
      console.log('Added sequence_id column to simple_dependencies');
    } catch (error) {
      console.log('sequence_id column already exists in simple_dependencies:', error.message);
    }

    console.log('Simple code graph tables initialized');
  }

  // Analyze a specific function and its variables
  async analyzeFunction(projectId, functionName, filePath, lineNumber, functionText) {
    const db = await getDb();
    
    try {
      // Generate unique ID for function
      const functionId = `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Parse function parameters
      const parameters = this.extractFunctionParameters(functionText);
      const isAsync = functionText.includes('async ');
      
      // Insert function record
      await db.run(`
        INSERT INTO simple_functions (
          id, project_id, name, file_path, line_number, parameters, is_async
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [functionId, projectId, functionName, filePath, lineNumber, JSON.stringify(parameters), isAsync]);
      
      console.log(`Recorded function: ${functionName} in ${filePath}:${lineNumber}`);
      return functionId;
    } catch (error) {
      console.error('Error analyzing function:', error);
      throw error;
    }
  }

  // Analyze variables within a function
  async analyzeVariable(projectId, functionId, variableName, type, value, filePath, lineNumber, scope = 'local') {
    const db = await getDb();
    
    try {
      const variableId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_variables (
          id, project_id, function_id, name, type, value, file_path, line_number, scope
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [variableId, projectId, functionId, variableName, type, value, filePath, lineNumber, scope]);
      
      console.log(`Recorded variable: ${variableName} = ${value} in ${filePath}:${lineNumber}`);
      return variableId;
    } catch (error) {
      console.error('Error analyzing variable:', error);
      throw error;
    }
  }

  // Record dependencies between code elements
  async recordDependency(projectId, sourceType, sourceId, targetType, targetId, relationshipType) {
    const db = await getDb();
    
    try {
      const dependencyId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_dependencies (
          id, project_id, source_type, source_id, target_type, target_id, relationship_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [dependencyId, projectId, sourceType, sourceId, targetType, targetId, relationshipType]);
      
      console.log(`Recorded dependency: ${sourceType}:${sourceId} -> ${relationshipType} -> ${targetType}:${targetId}`);
      return dependencyId;
    } catch (error) {
      console.error('Error recording dependency:', error);
      throw error;
    }
  }

  // Create or get project
  async createProject(name, projectPath, description = '') {
    const db = await getDb();
    
    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_projects (id, name, path, description)
        VALUES (?, ?, ?, ?)
      `, [projectId, name, projectPath, description]);
      
      console.log(`Created project: ${name} at ${projectPath}`);
      return projectId;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Helper function to extract function parameters
  extractFunctionParameters(functionText) {
    const match = functionText.match(/\(([^)]*)\)/);
    if (!match) return [];
    
    const paramString = match[1];
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const cleanParam = param.trim();
      const [name, defaultValue] = cleanParam.split('=').map(s => s.trim());
      return {
        name: name,
        defaultValue: defaultValue || null,
        type: this.inferParameterType(defaultValue)
      };
    });
  }

  // Helper to infer parameter type from default value
  inferParameterType(defaultValue) {
    if (!defaultValue) return 'unknown';
    if (defaultValue === 'null') return 'null';
    if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    if (!isNaN(defaultValue)) return 'number';
    if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) return 'string';
    return 'unknown';
  }

  // Generate visualization data
  async getVisualizationData(projectId) {
    const db = await getDb();
    
    try {
      // Get all functions
      const functions = await db.all(`
        SELECT * FROM simple_functions WHERE project_id = ?
      `, [projectId]);

      // Get all variables
      const variables = await db.all(`
        SELECT * FROM simple_variables WHERE project_id = ?
      `, [projectId]);

      // Get all dependencies
      const dependencies = await db.all(`
        SELECT * FROM simple_dependencies WHERE project_id = ?
      `, [projectId]);

      return {
        functions,
        variables,
        dependencies,
        nodes: this.buildGraphNodes(functions, variables),
        edges: this.buildGraphEdges(dependencies, functions, variables)
      };
    } catch (error) {
      console.error('Error getting visualization data:', error);
      throw error;
    }
  }

  // Build graph nodes for visualization
  buildGraphNodes(functions, variables) {
    const nodes = [];
    
    // Add function nodes
    functions.forEach(func => {
      nodes.push({
        id: func.id,
        label: func.name,
        type: 'function',
        file: func.file_path,
        line: func.line_number,
        isAsync: func.is_async,
        parameters: JSON.parse(func.parameters || '[]')
      });
    });

    // Add variable nodes
    variables.forEach(vari => {
      nodes.push({
        id: vari.id,
        label: vari.name,
        type: 'variable',
        file: vari.file_path,
        line: vari.line_number,
        value: vari.value,
        scope: vari.scope
      });
    });

    return nodes;
  }

  // Build graph edges for visualization
  buildGraphEdges(dependencies, functions, variables) {
    // Create a set of all valid node IDs
    const validNodeIds = new Set();
    functions.forEach(func => validNodeIds.add(func.id));
    variables.forEach(vari => validNodeIds.add(vari.id));
    
    // Filter dependencies to only include those with valid source and target nodes
    const validDependencies = dependencies.filter(dep => {
      const hasValidSource = validNodeIds.has(dep.source_id);
      const hasValidTarget = validNodeIds.has(dep.target_id);
      
      if (!hasValidSource) {
        console.log(`Skipping dependency with invalid source: ${dep.source_id}`);
      }
      if (!hasValidTarget) {
        console.log(`Skipping dependency with invalid target: ${dep.target_id}`);
      }
      
      return hasValidSource && hasValidTarget;
    });
    
    return validDependencies.map(dep => ({
      id: dep.id,
      source: dep.source_id,
      target: dep.target_id,
      relationship: dep.relationship_type,
      sourceType: dep.source_type,
      targetType: dep.target_type
    }));
  }
}

// Controller instance
const newCodeGraphController = new NewCodeGraphController();

// Express route handlers
exports.initializeDatabase = async (req, res) => {
  try {
    await newCodeGraphController.initializeDatabase();
    res.json({ success: true, message: 'Code graph database initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, path, description } = req.body;
    const projectId = await newCodeGraphController.createProject(name, path, description);
    res.json({ success: true, projectId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Analyze the specific example from dcimController.js
exports.analyzeDcimExample = async (req, res) => {
  try {
    // Initialize database first
    await newCodeGraphController.initializeDatabase();
    
    // Create project for dcim controller
    const projectId = await newCodeGraphController.createProject(
      'DCIM Controller',
      'controllers/dcimController.js',
      'Digital Camera Image Management Controller'
    );

    // Analyze the generateThumbnail function (line 68)
    const functionId = await newCodeGraphController.analyzeFunction(
      projectId,
      'generateThumbnail',
      'controllers/dcimController.js',
      68,
      'async function generateThumbnail(inputPath, thumbPath, maxSize = 180, quality = 60)'
    );

    // Analyze the fileExtension variable (line 70)
    const fileExtensionVarId = await newCodeGraphController.analyzeVariable(
      projectId,
      functionId,
      'fileExtension',
      'string',
      'path.extname(inputPath).toLowerCase()',
      'controllers/dcimController.js',
      70,
      'local'
    );

    // Analyze the isVideo variable (line 71)
    const isVideoVarId = await newCodeGraphController.analyzeVariable(
      projectId,
      functionId,
      'isVideo',
      'boolean',
      "['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(fileExtension)",
      'controllers/dcimController.js',
      71,
      'local'
    );

    // Create external function nodes for dependencies
    const pathExtnameId = await newCodeGraphController.analyzeFunction(
      projectId,
      'path.extname',
      'path (Node.js module)',
      0,
      'function extname(path)'
    );

    // Create parameter nodes
    const inputPathVarId = await newCodeGraphController.analyzeVariable(
      projectId,
      functionId,
      'inputPath',
      'string',
      'function parameter',
      'controllers/dcimController.js',
      68,
      'parameter'
    );

    // Record dependencies with proper node IDs
    // fileExtension depends on path.extname and inputPath
    await newCodeGraphController.recordDependency(
      projectId,
      'variable', fileExtensionVarId,
      'function', pathExtnameId,  // Now points to actual node
      'uses'
    );

    await newCodeGraphController.recordDependency(
      projectId,
      'variable', fileExtensionVarId,
      'variable', inputPathVarId,  // Now points to actual node
      'uses'
    );

    // isVideo depends on fileExtension
    await newCodeGraphController.recordDependency(
      projectId,
      'variable', isVideoVarId,
      'variable', fileExtensionVarId,
      'uses'
    );

    // Get visualization data
    const visualizationData = await newCodeGraphController.getVisualizationData(projectId);

    res.json({
      success: true,
      message: 'DCIM controller example analyzed successfully',
      projectId,
      functionId,
      variables: { fileExtensionVarId, isVideoVarId, inputPathVarId },
      visualization: visualizationData
    });

  } catch (error) {
    console.error('Error analyzing DCIM example:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getVisualization = async (req, res) => {
  try {
    const { projectId } = req.params;
    const visualizationData = await newCodeGraphController.getVisualizationData(projectId);
    res.json(visualizationData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const db = await getDb();
    const projects = await db.all('SELECT * FROM simple_projects ORDER BY created_at DESC');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};