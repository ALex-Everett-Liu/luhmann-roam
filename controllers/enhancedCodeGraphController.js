const { getDb } = require('../database');
const path = require('path');
const fs = require('fs');
const newCodeGraphController = require('./newCodeGraphController');

/**
 * Enhanced Code Graph Controller - Extends the existing controller with full CRUD operations
 * Makes the code graph system persistent and scalable
 */
class EnhancedCodeGraphController {
  constructor() {
    // Inherit relationship types from the base controller
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

  // =================================================================
  // PROJECT MANAGEMENT - Enhanced CRUD Operations
  // =================================================================

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
        return { success: false, error: 'No valid fields to update' };
      }
      
      values.push(Date.now()); // updated_at
      values.push(projectId);
      
      await db.run(`
        UPDATE simple_projects 
        SET ${updateFields.join(', ')}, updated_at = ?
        WHERE id = ?
      `, values);
      
      const updatedProject = await db.get('SELECT * FROM simple_projects WHERE id = ?', projectId);
      return { success: true, project: updatedProject };
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    const db = await getDb();
    
    try {
      // Start transaction
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

  async getProjectsWithStats() {
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
      console.error('Error getting projects with stats:', error);
      throw error;
    }
  }

  async getProject(projectId) {
    const db = await getDb();
    
    try {
      const project = await db.get('SELECT * FROM simple_projects WHERE id = ?', projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }
      
      return { success: true, project };
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  // =================================================================
  // FUNCTION MANAGEMENT - Enhanced CRUD Operations
  // =================================================================

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
        return { success: false, error: 'No valid fields to update' };
      }
      
      values.push(functionId);
      
      await db.run(`
        UPDATE simple_functions 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedFunction = await db.get('SELECT * FROM simple_functions WHERE id = ?', functionId);
      return { success: true, function: updatedFunction };
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

  // =================================================================
  // VARIABLE MANAGEMENT - Enhanced CRUD Operations
  // =================================================================

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
        return { success: false, error: 'No valid fields to update' };
      }
      
      values.push(variableId);
      
      await db.run(`
        UPDATE simple_variables 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedVariable = await db.get('SELECT * FROM simple_variables WHERE id = ?', variableId);
      return { success: true, variable: updatedVariable };
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

  // =================================================================
  // DEPENDENCY MANAGEMENT - Enhanced CRUD Operations
  // =================================================================

  async createDependency(projectId, sourceType, sourceId, targetType, targetId, relationshipType) {
    const db = await getDb();
    
    try {
      // Validate relationship type
      if (!this.RELATIONSHIP_TYPES[relationshipType]) {
        return { success: false, error: `Invalid relationship type: ${relationshipType}` };
      }
      
      const dependencyId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.run(`
        INSERT INTO simple_dependencies (
          id, project_id, source_type, source_id, target_type, target_id, relationship_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [dependencyId, projectId, sourceType, sourceId, targetType, targetId, relationshipType]);
      
      const createdDependency = await db.get('SELECT * FROM simple_dependencies WHERE id = ?', dependencyId);
      return { success: true, dependencyId, dependency: createdDependency };
    } catch (error) {
      console.error('Error creating dependency:', error);
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
            return { success: false, error: `Invalid relationship type: ${value}` };
          }
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }
      
      values.push(dependencyId);
      
      await db.run(`
        UPDATE simple_dependencies 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);
      
      const updatedDependency = await db.get('SELECT * FROM simple_dependencies WHERE id = ?', dependencyId);
      return { success: true, dependency: updatedDependency };
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

  // =================================================================
  // TEMPLATE CREATION - Save DCIM Example to Database
  // =================================================================

  async createAndSaveDcimExample() {
    try {
      // Create the project first
      const projectResult = await newCodeGraphController.createProject(
        'DCIM Controller (Saved)',
        'controllers/dcimController.js',
        'Digital Camera Image Management Controller - Saved to Database'
      );
      
      const projectId = projectResult;

      // Create the generateThumbnail function
      const functionId = await newCodeGraphController.analyzeFunction(
        projectId,
        'generateThumbnail',
        'controllers/dcimController.js',
        68,
        'async function generateThumbnail(inputPath, thumbPath, maxSize = 180, quality = 60)'
      );

      // Create all variables and dependencies as in the original example
      const inputPathParamId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'inputPath', 'string', 'function parameter - file path input',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const thumbPathParamId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'thumbPath', 'string', 'function parameter - thumbnail output path',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const maxSizeParamId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'maxSize', 'number', 'function parameter with default value: 180',
        'controllers/dcimController.js', 68, 'parameter'
      );

      const qualityParamId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'quality', 'number', 'function parameter with default value: 60',
        'controllers/dcimController.js', 68, 'parameter'
      );

      // Create external function nodes
      const pathExtnameId = await newCodeGraphController.analyzeFunction(
        projectId, 'path.extname', 'path (Node.js module)', 0,
        'function extname(path) - extracts file extension from path'
      );

      const toLowerCaseId = await newCodeGraphController.analyzeBuiltinMethod(
        projectId, 'toLowerCase', 'string', 'controllers/dcimController.js', 70
      );

      const includesMethodId = await newCodeGraphController.analyzeBuiltinMethod(
        projectId, 'includes', 'array', 'controllers/dcimController.js', 71
      );

      // Create literal array node
      const videoExtensionsArrayId = await newCodeGraphController.analyzeLiteral(
        projectId, functionId, 'videoExtensions', "['.mp4', '.mov', '.avi', '.mkv', '.webm']",
        'array', 'controllers/dcimController.js', 71
      );

      // Create local variables
      const fileExtensionVarId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'fileExtension', 'string',
        'const fileExtension - result of path.extname(inputPath).toLowerCase()',
        'controllers/dcimController.js', 70, 'local'
      );

      const isVideoVarId = await newCodeGraphController.analyzeVariable(
        projectId, functionId, 'isVideo', 'boolean',
        'const isVideo - result of checking if extension is in video array',
        'controllers/dcimController.js', 71, 'local'
      );

      // Record all dependencies
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', inputPathParamId, 'contains');
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', thumbPathParamId, 'contains');
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', maxSizeParamId, 'contains');
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', qualityParamId, 'contains');
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', fileExtensionVarId, 'contains');
      await newCodeGraphController.recordDependency(projectId, 'function', functionId, 'variable', isVideoVarId, 'contains');

      // Chain 1: inputPath → path.extname → toLowerCase → fileExtension
      await newCodeGraphController.recordDependency(projectId, 'variable', inputPathParamId, 'function', pathExtnameId, 'passes_to');
      await newCodeGraphController.recordDependency(projectId, 'function', pathExtnameId, 'function', toLowerCaseId, 'chains_to');
      await newCodeGraphController.recordDependency(projectId, 'function', toLowerCaseId, 'variable', fileExtensionVarId, 'assigns_to');

      // Chain 2: videoExtensions → includes (with fileExtension as parameter) → isVideo
      await newCodeGraphController.recordDependency(projectId, 'variable', videoExtensionsArrayId, 'function', includesMethodId, 'calls_method_on');
      await newCodeGraphController.recordDependency(projectId, 'variable', fileExtensionVarId, 'function', includesMethodId, 'passes_to');
      await newCodeGraphController.recordDependency(projectId, 'function', includesMethodId, 'variable', isVideoVarId, 'assigns_to');

      return {
        success: true,
        message: 'DCIM example created and permanently saved to database',
        projectId,
        functionId,
        variables: { 
          fileExtensionVarId, isVideoVarId, inputPathParamId,
          thumbPathParamId, maxSizeParamId, qualityParamId, videoExtensionsArrayId 
        },
        functions: { pathExtnameId, toLowerCaseId, includesMethodId }
      };

    } catch (error) {
      console.error('Error creating and saving DCIM example:', error);
      throw error;
    }
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  getRelationshipTypes() {
    return this.RELATIONSHIP_TYPES;
  }

  // Delegate to original controller for visualization
  async getVisualizationData(projectId) {
    return newCodeGraphController.getVisualizationData(projectId);
  }
}

module.exports = new EnhancedCodeGraphController();