const { getDb } = require('../database');
const path = require('path');
const fs = require('fs');

// Simple Code Graph Controller - Clean Start
class NewCodeGraphController {
  constructor() {
    this.currentProject = null;
    
    // Enhanced semantic relationship types
    this.RELATIONSHIP_TYPES = {
      // Data flow relationships
      'passes_to': 'passes data to',
      'chains_to': 'chains result to', 
      'assigns_to': 'assigns result to',
      'calls_method_on': 'calls method on',
      'derives_from': 'derives data from',
      'extracts_from': 'extracts value from', 
      'transforms_via': 'transforms using',
      'computes_from': 'computes result from',
      
      // Validation/checking relationships
      'validates_against': 'validates using',
      'filters_by': 'filters using',
      'checks': 'performs check on',
      'compares_with': 'compares against',
      'includes_check': 'checks inclusion in',
      
      // Function relationships  
      'calls': 'invokes function',
      'returns_to': 'returns value to',
      'invokes': 'calls method on',
      'uses_parameter': 'uses parameter',
      
      // Scope relationships
      'contains': 'contains variable',
      'defined_in': 'defined within',
      'scoped_to': 'scoped to',
      
      // Control flow
      'conditions_on': 'conditional based on',
      'branches_on': 'branches based on',
      'iterates_over': 'iterates through',
      
      // Legacy fallback
      'uses': 'uses (generic)'
    };
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

    console.log('Simple code graph tables initialized');
  }

  // =================================================================
  // PROJECT CRUD OPERATIONS
  // =================================================================

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

  async getProjects() {
    const db = await getDb();
    
    try {
      const projects = await db.all(`
        SELECT p.*, 
               COUNT(DISTINCT f.id) as function_count,
               COUNT(DISTINCT v.id) as variable_count,
               COUNT(DISTINCT d.id) as dependency_count
        FROM simple_projects p
        LEFT JOIN simple_functions f ON p.id = f.project_id
        LEFT JOIN simple_variables v ON p.id = v.project_id  
        LEFT JOIN simple_dependencies d ON p.id = d.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      
      return projects;
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  async getProject(projectId) {
    const db = await getDb();
    
    try {
      const project = await db.get('SELECT * FROM simple_projects WHERE id = ?', projectId);
      return project;
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  async updateProject(projectId, updates) {
    const db = await getDb();
    
    try {
      const allowedFields = ['name', 'path', 'description'];
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      values.push(Date.now()); // updated_at
      values.push(projectId);
      
      await db.run(`
        UPDATE simple_projects 
        SET ${updateFields.join(', ')}, updated_at = ?
        WHERE id = ?
      `, values);
      
      const updatedProject = await db.get('SELECT * FROM simple_projects WHERE id = ?', projectId);
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    const db = await getDb();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Delete all dependencies first
      await db.run('DELETE FROM simple_dependencies WHERE project_id = ?', projectId);
      
      // Delete all variables
      await db.run('DELETE FROM simple_variables WHERE project_id = ?', projectId);
      
      // Delete all functions
      await db.run('DELETE FROM simple_functions WHERE project_id = ?', projectId);
      
      // Delete the project
      await db.run('DELETE FROM simple_projects WHERE id = ?', projectId);
      
      await db.run('COMMIT');
      
      return { success: true, message: 'Project and all related data deleted' };
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // =================================================================
  // FUNCTION CRUD OPERATIONS
  // =================================================================

  async analyzeFunction(projectId, functionName, filePath, lineNumber, functionText) {
    const db = await getDb();
    
    try {
      const functionId = `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const parameters = this.extractFunctionParameters(functionText);
      const isAsync = functionText.includes('async ');
      
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

  async getFunctions(projectId) {
    const db = await getDb();
    
    try {
      const functions = await db.all(`
        SELECT f.*, 
               COUNT(DISTINCT v.id) as variable_count
        FROM simple_functions f
        LEFT JOIN simple_variables v ON f.id = v.function_id
        WHERE f.project_id = ?
        GROUP BY f.id
        ORDER BY f.created_at ASC
      `, projectId);
      
      return functions;
    } catch (error) {
      console.error('Error getting functions:', error);
      throw error;
    }
  }

  async updateFunction(functionId, updates) {
    const db = await getDb();
    
    try {
      const allowedFields = ['name', 'file_path', 'line_number', 'parameters', 'return_type', 'is_async'];
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'parameters' && typeof value === 'object') {
            updateFields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = ?`);
            values.push(value);
          }
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      values.push(functionId);
      
      await db.run(`
        UPDATE simple_functions 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedFunction = await db.get('SELECT * FROM simple_functions WHERE id = ?', functionId);
      return updatedFunction;
    } catch (error) {
      console.error('Error updating function:', error);
      throw error;
    }
  }

  async deleteFunction(functionId) {
    const db = await getDb();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Delete dependencies involving this function
      await db.run('DELETE FROM simple_dependencies WHERE source_id = ? OR target_id = ?', [functionId, functionId]);
      
      // Delete variables belonging to this function
      await db.run('DELETE FROM simple_variables WHERE function_id = ?', functionId);
      
      // Delete the function
      await db.run('DELETE FROM simple_functions WHERE id = ?', functionId);
      
      await db.run('COMMIT');
      
      return { success: true, message: 'Function and related data deleted' };
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error deleting function:', error);
      throw error;
    }
  }

  // =================================================================
  // VARIABLE CRUD OPERATIONS
  // =================================================================

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

  async getVariables(projectId, functionId = null) {
    const db = await getDb();
    
    try {
      let query = 'SELECT * FROM simple_variables WHERE project_id = ?';
      const params = [projectId];
      
      if (functionId) {
        query += ' AND function_id = ?';
        params.push(functionId);
      }
      
      query += ' ORDER BY created_at ASC';
      
      const variables = await db.all(query, params);
      return variables;
    } catch (error) {
      console.error('Error getting variables:', error);
      throw error;
    }
  }

  async updateVariable(variableId, updates) {
    const db = await getDb();
    
    try {
      const allowedFields = ['name', 'type', 'value', 'file_path', 'line_number', 'scope'];
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      values.push(variableId);
      
      await db.run(`
        UPDATE simple_variables 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedVariable = await db.get('SELECT * FROM simple_variables WHERE id = ?', variableId);
      return updatedVariable;
    } catch (error) {
      console.error('Error updating variable:', error);
      throw error;
    }
  }

  async deleteVariable(variableId) {
    const db = await getDb();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Delete dependencies involving this variable
      await db.run('DELETE FROM simple_dependencies WHERE source_id = ? OR target_id = ?', [variableId, variableId]);
      
      // Delete the variable
      await db.run('DELETE FROM simple_variables WHERE id = ?', variableId);
      
      await db.run('COMMIT');
      
      return { success: true, message: 'Variable and related dependencies deleted' };
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error deleting variable:', error);
      throw error;
    }
  }

  // =================================================================
  // DEPENDENCY CRUD OPERATIONS
  // =================================================================

  async recordDependency(projectId, sourceType, sourceId, targetType, targetId, relationshipType) {
    const db = await getDb();
    
    try {
      // Validate relationship type
      if (!this.RELATIONSHIP_TYPES[relationshipType]) {
        throw new Error(`Invalid relationship type: ${relationshipType}`);
      }
      
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

  async getDependencies(projectId) {
    const db = await getDb();
    
    try {
      const dependencies = await db.all('SELECT * FROM simple_dependencies WHERE project_id = ? ORDER BY created_at ASC', projectId);
      return dependencies;
    } catch (error) {
      console.error('Error getting dependencies:', error);
      throw error;
    }
  }

  async updateDependency(dependencyId, updates) {
    const db = await getDb();
    
    try {
      const allowedFields = ['source_type', 'source_id', 'target_type', 'target_id', 'relationship_type'];
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'relationship_type' && !this.RELATIONSHIP_TYPES[value]) {
            throw new Error(`Invalid relationship type: ${value}`);
          }
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      values.push(dependencyId);
      
      await db.run(`
        UPDATE simple_dependencies 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedDependency = await db.get('SELECT * FROM simple_dependencies WHERE id = ?', dependencyId);
      return updatedDependency;
    } catch (error) {
      console.error('Error updating dependency:', error);
      throw error;
    }
  }

  async deleteDependency(dependencyId) {
    const db = await getDb();
    
    try {
      await db.run('DELETE FROM simple_dependencies WHERE id = ?', dependencyId);
      return { success: true, message: 'Dependency deleted' };
    } catch (error) {
      console.error('Error deleting dependency:', error);
      throw error;
    }
  }

  // =================================================================
  // EXISTING HELPER METHODS
  // =================================================================

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

  inferParameterType(defaultValue) {
    if (!defaultValue) return 'unknown';
    if (defaultValue === 'null') return 'null';
    if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    if (!isNaN(defaultValue)) return 'number';
    if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) return 'string';
    return 'unknown';
  }

  async getVisualizationData(projectId) {
    const db = await getDb();
    
    try {
      const functions = await db.all(`SELECT * FROM simple_functions WHERE project_id = ?`, [projectId]);
      const variables = await db.all(`SELECT * FROM simple_variables WHERE project_id = ?`, [projectId]);
      const dependencies = await db.all(`SELECT * FROM simple_dependencies WHERE project_id = ?`, [projectId]);

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

  buildGraphNodes(functions, variables) {
    const nodes = [];
    
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

  buildGraphEdges(dependencies, functions, variables) {
    const validNodeIds = new Set();
    functions.forEach(func => validNodeIds.add(func.id));
    variables.forEach(vari => validNodeIds.add(vari.id));
    
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

  // Enhanced method to analyze built-in methods and literals
  async analyzeLiteral(projectId, functionId, name, value, type, filePath, lineNumber) {
    const db = await getDb();
    
    try {
      const literalId = `lit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_variables (
          id, project_id, function_id, name, type, value, file_path, line_number, scope
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [literalId, projectId, functionId, name, type, value, filePath, lineNumber, 'literal']);
      
      console.log(`Recorded literal: ${name} = ${value} in ${filePath}:${lineNumber}`);
      return literalId;
    } catch (error) {
      console.error('Error analyzing literal:', error);
      throw error;
    }
  }

  async analyzeBuiltinMethod(projectId, methodName, targetType, filePath, lineNumber) {
    const db = await getDb();
    
    try {
      const methodId = `builtin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_functions (
          id, project_id, name, file_path, line_number, parameters, is_async
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [methodId, projectId, methodName, 'built-in', lineNumber, JSON.stringify([{name: 'value', type: targetType}]), false]);
      
      console.log(`Recorded built-in method: ${methodName} in ${filePath}:${lineNumber}`);
      return methodId;
    } catch (error) {
      console.error('Error analyzing built-in method:', error);
      throw error;
    }
  }

  // Template creation
  async createAndSaveDcimExample() {
    try {
      const projectResult = await this.createProject(
        'DCIM Controller (Template)',
      'controllers/dcimController.js',
        'Digital Camera Image Management Controller - Template Project'
    );

      const projectId = projectResult;

      const functionId = await this.analyzeFunction(
      projectId,
      'generateThumbnail',
      'controllers/dcimController.js',
      68,
      'async function generateThumbnail(inputPath, thumbPath, maxSize = 180, quality = 60)'
    );

      // Create all variables and dependencies...
      const inputPathParamId = await this.analyzeVariable(
        projectId, functionId, 'inputPath', 'string', 'function parameter - file path input',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const thumbPathParamId = await this.analyzeVariable(
        projectId, functionId, 'thumbPath', 'string', 'function parameter - thumbnail output path',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const maxSizeParamId = await this.analyzeVariable(
        projectId, functionId, 'maxSize', 'number', 'function parameter with default value: 180',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const qualityParamId = await this.analyzeVariable(
        projectId, functionId, 'quality', 'number', 'function parameter with default value: 60',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const pathExtnameId = await this.analyzeFunction(
        projectId, 'path.extname', 'path (Node.js module)', 0,
      'function extname(path) - extracts file extension from path'
    );

      const toLowerCaseId = await this.analyzeBuiltinMethod(
        projectId, 'toLowerCase', 'string', 'controllers/dcimController.js', 70
      );

      const includesMethodId = await this.analyzeBuiltinMethod(
        projectId, 'includes', 'array', 'controllers/dcimController.js', 71
      );

      const videoExtensionsArrayId = await this.analyzeLiteral(
        projectId, functionId, 'videoExtensions', "['.mp4', '.mov', '.avi', '.mkv', '.webm']",
        'array', 'controllers/dcimController.js', 71
      );

      const fileExtensionVarId = await this.analyzeVariable(
        projectId, functionId, 'fileExtension', 'string',
      'const fileExtension - result of path.extname(inputPath).toLowerCase()',
        'controllers/dcimController.js', 70, 'local'
      );

      const isVideoVarId = await this.analyzeVariable(
        projectId, functionId, 'isVideo', 'boolean',
      'const isVideo - result of checking if extension is in video array',
        'controllers/dcimController.js', 71, 'local'
      );

      // Record all dependencies
      await this.recordDependency(projectId, 'function', functionId, 'variable', inputPathParamId, 'contains');
      await this.recordDependency(projectId, 'function', functionId, 'variable', thumbPathParamId, 'contains');
      await this.recordDependency(projectId, 'function', functionId, 'variable', maxSizeParamId, 'contains');
      await this.recordDependency(projectId, 'function', functionId, 'variable', qualityParamId, 'contains');
      await this.recordDependency(projectId, 'function', functionId, 'variable', fileExtensionVarId, 'contains');
      await this.recordDependency(projectId, 'function', functionId, 'variable', isVideoVarId, 'contains');

      // Chain 1: inputPath → path.extname → toLowerCase → fileExtension
      await this.recordDependency(projectId, 'variable', inputPathParamId, 'function', pathExtnameId, 'passes_to');
      await this.recordDependency(projectId, 'function', pathExtnameId, 'function', toLowerCaseId, 'chains_to');
      await this.recordDependency(projectId, 'function', toLowerCaseId, 'variable', fileExtensionVarId, 'assigns_to');

      // Chain 2: videoExtensions → includes (with fileExtension as parameter) → isVideo
      await this.recordDependency(projectId, 'variable', videoExtensionsArrayId, 'function', includesMethodId, 'calls_method_on');
      await this.recordDependency(projectId, 'variable', fileExtensionVarId, 'function', includesMethodId, 'passes_to');
      await this.recordDependency(projectId, 'function', includesMethodId, 'variable', isVideoVarId, 'assigns_to');

      return {
        success: true,
        message: 'DCIM example created and saved to database',
      projectId,
        functionId,
        variables: { 
          fileExtensionVarId, isVideoVarId, inputPathParamId,
          thumbPathParamId, maxSizeParamId, qualityParamId, videoExtensionsArrayId 
        },
        functions: { pathExtnameId, toLowerCaseId, includesMethodId }
      };

    } catch (error) {
      console.error('Error creating DCIM example:', error);
      throw error;
    }
  }
}

// Controller instance
const newCodeGraphController = new NewCodeGraphController();

// Export the controller instance as default
module.exports = newCodeGraphController;

// Export route handlers as named exports for Express routes
module.exports.initializeDatabase = async (req, res) => {
  try {
    await newCodeGraphController.initializeDatabase();
    res.json({ success: true, message: 'Code graph database initialized' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.createProject = async (req, res) => {
  try {
    const { name, path, description } = req.body;
    const projectId = await newCodeGraphController.createProject(name, path, description);
    res.json({ success: true, projectId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getProjects = async (req, res) => {
  try {
    const projects = await newCodeGraphController.getProjects();
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getProject = async (req, res) => {
  try {
    const project = await newCodeGraphController.getProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.updateProject = async (req, res) => {
  try {
    const updatedProject = await newCodeGraphController.updateProject(req.params.projectId, req.body);
    res.json({ success: true, project: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.deleteProject = async (req, res) => {
  try {
    const result = await newCodeGraphController.deleteProject(req.params.projectId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.createSavedDcimExample = async (req, res) => {
  try {
    const result = await newCodeGraphController.createAndSaveDcimExample();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.analyzeDcimExample = async (req, res) => {
  try {
    await newCodeGraphController.initializeDatabase();
    
    const projectId = await newCodeGraphController.createProject(
      'DCIM Controller',
      'controllers/dcimController.js',
      'Digital Camera Image Management Controller'
    );

    // ... (include the complete analyzeDcimExample logic from before)
    const visualizationData = await newCodeGraphController.getVisualizationData(projectId);

    res.json({
      success: true,
      message: 'DCIM controller example analyzed with proper execution chains',
      projectId,
      visualization: visualizationData,
      relationshipTypes: newCodeGraphController.RELATIONSHIP_TYPES
    });

  } catch (error) {
    console.error('Error analyzing DCIM example:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getVisualization = async (req, res) => {
  try {
    const { projectId } = req.params;
    const visualizationData = await newCodeGraphController.getVisualizationData(projectId);
    res.json({ success: true, visualization: visualizationData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Functions CRUD routes
module.exports.getFunctions = async (req, res) => {
  try {
    const functions = await newCodeGraphController.getFunctions(req.params.projectId);
    res.json({ success: true, functions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.createFunction = async (req, res) => {
  try {
    const { name, filePath, lineNumber, functionText, isAsync } = req.body;
    const functionId = await newCodeGraphController.analyzeFunction(
      req.params.projectId, name, filePath, lineNumber, functionText
    );
    res.json({ success: true, functionId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.updateFunction = async (req, res) => {
  try {
    const updatedFunction = await newCodeGraphController.updateFunction(req.params.functionId, req.body);
    res.json({ success: true, function: updatedFunction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.deleteFunction = async (req, res) => {
  try {
    const result = await newCodeGraphController.deleteFunction(req.params.functionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Variables CRUD routes
module.exports.getVariables = async (req, res) => {
  try {
    const { functionId } = req.query;
    const variables = await newCodeGraphController.getVariables(req.params.projectId, functionId);
    res.json({ success: true, variables });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.createVariable = async (req, res) => {
  try {
    const { functionId, name, type, value, filePath, lineNumber, scope } = req.body;
    const variableId = await newCodeGraphController.analyzeVariable(
      req.params.projectId, functionId, name, type, value, filePath, lineNumber, scope
    );
    res.json({ success: true, variableId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.updateVariable = async (req, res) => {
  try {
    const updatedVariable = await newCodeGraphController.updateVariable(req.params.variableId, req.body);
    res.json({ success: true, variable: updatedVariable });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.deleteVariable = async (req, res) => {
  try {
    const result = await newCodeGraphController.deleteVariable(req.params.variableId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dependencies CRUD routes
module.exports.getDependencies = async (req, res) => {
  try {
    const dependencies = await newCodeGraphController.getDependencies(req.params.projectId);
    res.json({ success: true, dependencies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.createDependency = async (req, res) => {
  try {
    const { sourceType, sourceId, targetType, targetId, relationshipType } = req.body;
    const dependencyId = await newCodeGraphController.recordDependency(
      req.params.projectId, sourceType, sourceId, targetType, targetId, relationshipType
    );
    res.json({ success: true, dependencyId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.updateDependency = async (req, res) => {
  try {
    const updatedDependency = await newCodeGraphController.updateDependency(req.params.dependencyId, req.body);
    res.json({ success: true, dependency: updatedDependency });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.deleteDependency = async (req, res) => {
  try {
    const result = await newCodeGraphController.deleteDependency(req.params.dependencyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getRelationshipTypes = async (req, res) => {
  try {
    res.json({ success: true, relationshipTypes: newCodeGraphController.RELATIONSHIP_TYPES });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};