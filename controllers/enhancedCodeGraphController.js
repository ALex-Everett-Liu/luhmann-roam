const { getDb } = require('../database');
const path = require('path');
const fs = require('fs');

/**
 * Enhanced Code Graph Controller - Full CRUD and Project Management
 * Builds upon the simple code graph with comprehensive features
 */
class EnhancedCodeGraphController {
  constructor() {
    this.currentProject = null;
    
    // Enhanced semantic relationship types with descriptions
    this.RELATIONSHIP_TYPES = {
      // Data flow relationships
      'derives_from': { label: 'derives data from', category: 'data_flow', strength: 0.8 },
      'extracts_from': { label: 'extracts value from', category: 'data_flow', strength: 0.7 },
      'transforms_via': { label: 'transforms using', category: 'data_flow', strength: 0.9 },
      'computes_from': { label: 'computes result from', category: 'data_flow', strength: 0.8 },
      'assigns_from': { label: 'assigns value from', category: 'data_flow', strength: 0.9 },
      'chains_from': { label: 'chains method from', category: 'data_flow', strength: 0.8 },
      'passes_to': { label: 'passes argument to', category: 'data_flow', strength: 0.9 },
      'chains_to': { label: 'chains to', category: 'data_flow', strength: 0.9 },
      'assigns_to': { label: 'assigns to', category: 'data_flow', strength: 0.9 },
      'returns_to': { label: 'returns value to', category: 'data_flow', strength: 0.8 },
      
      // Validation/checking relationships
      'validates_against': { label: 'validates using', category: 'validation', strength: 0.6 },
      'filters_by': { label: 'filters using', category: 'validation', strength: 0.6 },
      'checks': { label: 'performs check on', category: 'validation', strength: 0.6 },
      'compares_with': { label: 'compares against', category: 'validation', strength: 0.5 },
      'includes_check': { label: 'checks inclusion in', category: 'validation', strength: 0.6 },
      
      // Function relationships  
      'calls': { label: 'invokes function', category: 'function', strength: 0.9 },
      'invokes': { label: 'calls method on', category: 'function', strength: 0.9 },
      'calls_method_on': { label: 'calls method on', category: 'function', strength: 0.9 },
      'uses_parameter': { label: 'uses parameter', category: 'function', strength: 0.7 },
      
      // Scope relationships
      'contains': { label: 'contains', category: 'scope', strength: 1.0 },
      'defined_in': { label: 'defined within', category: 'scope', strength: 1.0 },
      'scoped_to': { label: 'scoped to', category: 'scope', strength: 1.0 },
      
      // Control flow
      'conditions_on': { label: 'conditional based on', category: 'control_flow', strength: 0.7 },
      'branches_on': { label: 'branches based on', category: 'control_flow', strength: 0.7 },
      'iterates_over': { label: 'iterates through', category: 'control_flow', strength: 0.8 },
      
      // Legacy fallback
      'uses': { label: 'uses (generic)', category: 'generic', strength: 0.5 }
    };
    
    // Templates for quick project creation
    this.PROJECT_TEMPLATES = {
      'dcim_controller': {
        name: 'DCIM Controller Analysis',
        description: 'Digital Camera Image Management Controller - generateThumbnail function analysis',
        functions: [
          {
            name: 'generateThumbnail',
            file_path: 'controllers/dcimController.js',
            line_number: 68,
            parameters: ['inputPath', 'thumbPath', 'maxSize', 'quality'],
            is_async: true
          },
          {
            name: 'path.extname',
            file_path: 'path (Node.js module)',
            line_number: 0,
            parameters: ['path'],
            is_async: false
          },
          {
            name: 'toLowerCase',
            file_path: 'built-in',
            line_number: 70,
            parameters: [],
            is_async: false
          },
          {
            name: 'includes',
            file_path: 'built-in',
            line_number: 71,
            parameters: ['searchElement'],
            is_async: false
          }
        ],
        variables: [
          {
            name: 'inputPath',
            type: 'string',
            value: 'function parameter - file path input',
            scope: 'parameter',
            line_number: 68
          },
          {
            name: 'thumbPath',
            type: 'string',
            value: 'function parameter - thumbnail output path',
            scope: 'parameter',
            line_number: 68
          },
          {
            name: 'maxSize',
            type: 'number',
            value: 'function parameter with default value: 180',
            scope: 'parameter',
            line_number: 68
          },
          {
            name: 'quality',
            type: 'number',
            value: 'function parameter with default value: 60',
            scope: 'parameter',
            line_number: 68
          },
          {
            name: 'fileExtension',
            type: 'string',
            value: 'const fileExtension - result of path.extname(inputPath).toLowerCase()',
            scope: 'local',
            line_number: 70
          },
          {
            name: 'isVideo',
            type: 'boolean',
            value: 'const isVideo - result of checking if extension is in video array',
            scope: 'local',
            line_number: 71
          },
          {
            name: 'videoExtensions',
            type: 'array',
            value: "['.mp4', '.mov', '.avi', '.mkv', '.webm']",
            scope: 'literal',
            line_number: 71
          }
        ],
        relationships: [
          // Function containment
          { source: 'generateThumbnail', target: 'inputPath', type: 'contains' },
          { source: 'generateThumbnail', target: 'thumbPath', type: 'contains' },
          { source: 'generateThumbnail', target: 'maxSize', type: 'contains' },
          { source: 'generateThumbnail', target: 'quality', type: 'contains' },
          { source: 'generateThumbnail', target: 'fileExtension', type: 'contains' },
          { source: 'generateThumbnail', target: 'isVideo', type: 'contains' },
          
          // Data flow chains
          { source: 'inputPath', target: 'path.extname', type: 'passes_to' },
          { source: 'path.extname', target: 'toLowerCase', type: 'chains_to' },
          { source: 'toLowerCase', target: 'fileExtension', type: 'assigns_to' },
          
          { source: 'videoExtensions', target: 'includes', type: 'calls_method_on' },
          { source: 'fileExtension', target: 'includes', type: 'passes_to' },
          { source: 'includes', target: 'isVideo', type: 'assigns_to' }
        ]
      }
    };
  }

  // =================================================================
  // DATABASE INITIALIZATION
  // =================================================================

  async initializeDatabase() {
    const db = await getDb();
    
    try {
      // Enhanced Projects table with additional metadata
      await db.run(`
        CREATE TABLE IF NOT EXISTS enhanced_projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          description TEXT,
          language TEXT DEFAULT 'javascript',
          framework TEXT,
          version TEXT,
          tags TEXT, -- JSON array of tags
          metadata TEXT, -- JSON object for flexible metadata
          status TEXT DEFAULT 'active', -- 'active', 'archived', 'template'
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          sequence_id INTEGER
        )
      `);

      // Enhanced Functions table with more detailed tracking
      await db.run(`
        CREATE TABLE IF NOT EXISTS enhanced_functions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT, -- Namespace.ClassName.methodName
          file_path TEXT NOT NULL,
          line_number INTEGER,
          end_line_number INTEGER,
          parameters TEXT, -- JSON string of parameters with types
          return_type TEXT,
          is_async BOOLEAN DEFAULT 0,
          is_static BOOLEAN DEFAULT 0,
          is_private BOOLEAN DEFAULT 0,
          complexity_score INTEGER DEFAULT 1,
          description TEXT,
          tags TEXT, -- JSON array of tags
          metadata TEXT, -- JSON object for flexible metadata
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          sequence_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE
        )
      `);

      // Enhanced Variables table with better typing
      await db.run(`
        CREATE TABLE IF NOT EXISTS enhanced_variables (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          function_id TEXT,
          name TEXT NOT NULL,
          type TEXT,
          value TEXT,
          file_path TEXT NOT NULL,
          line_number INTEGER,
          scope TEXT, -- 'local', 'parameter', 'global', 'class', 'module'
          declaration_type TEXT, -- 'const', 'let', 'var', 'parameter', 'property'
          mutability TEXT DEFAULT 'mutable', -- 'immutable', 'mutable'
          is_exported BOOLEAN DEFAULT 0,
          description TEXT,
          tags TEXT, -- JSON array of tags
          metadata TEXT, -- JSON object for flexible metadata
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          sequence_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (function_id) REFERENCES enhanced_functions(id) ON DELETE CASCADE
        )
      `);

      // Enhanced Dependencies table with richer relationships
      await db.run(`
        CREATE TABLE IF NOT EXISTS enhanced_dependencies (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          source_type TEXT NOT NULL, -- 'function', 'variable', 'class', 'module'
          source_id TEXT NOT NULL,
          target_type TEXT NOT NULL, -- 'function', 'variable', 'class', 'module'
          target_id TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          relationship_strength REAL DEFAULT 1.0, -- 0.0 to 1.0
          context TEXT, -- Additional context about the relationship
          line_number INTEGER,
          order_sequence INTEGER DEFAULT 1, -- For ordered relationships
          description TEXT,
          metadata TEXT, -- JSON object for flexible metadata
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          sequence_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE
        )
      `);

      // Project Statistics View (computed)
      await db.run(`
        CREATE VIEW IF NOT EXISTS project_statistics AS
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.tags,
          p.metadata,
          COUNT(DISTINCT f.id) as function_count,
          COUNT(DISTINCT v.id) as variable_count,
          COUNT(DISTINCT d.id) as dependency_count,
          AVG(f.complexity_score) as avg_complexity,
          MAX(f.updated_at) as last_function_update,
          p.created_at,
          p.updated_at
        FROM enhanced_projects p
        LEFT JOIN enhanced_functions f ON p.id = f.project_id
        LEFT JOIN enhanced_variables v ON p.id = v.project_id
        LEFT JOIN enhanced_dependencies d ON p.id = d.project_id
        GROUP BY p.id, p.name, p.description, p.status, p.tags, p.metadata, p.created_at, p.updated_at
      `);

      // Add indices for performance
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_enhanced_functions_project ON enhanced_functions(project_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_functions_name ON enhanced_functions(name);
        CREATE INDEX IF NOT EXISTS idx_enhanced_variables_project ON enhanced_variables(project_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_variables_function ON enhanced_variables(function_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_variables_name ON enhanced_variables(name);
        CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_project ON enhanced_dependencies(project_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_source ON enhanced_dependencies(source_type, source_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_target ON enhanced_dependencies(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_relationship ON enhanced_dependencies(relationship_type);
      `);

      console.log('Enhanced code graph tables initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Error initializing enhanced code graph database:', error);
      throw error;
    }
  }

  // =================================================================
  // PROJECT CRUD OPERATIONS
  // =================================================================

  async createProject(projectData) {
    const db = await getDb();
    
    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const {
        name,
        path: projectPath,
        description = '',
        language = 'javascript',
        framework = null,
        version = null,
        tags = [],
        metadata = {},
        status = 'active'
      } = projectData;

      await db.run(`
        INSERT INTO enhanced_projects (
          id, name, path, description, language, framework, version, 
          tags, metadata, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId, name, projectPath, description, language, framework, version,
        JSON.stringify(tags), JSON.stringify(metadata), status
      ]);

      console.log(`Created enhanced project: ${name} (${projectId})`);
      return { success: true, projectId, project: await this.getProject(projectId) };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async getProject(projectId) {
    const db = await getDb();
    
    try {
      const project = await db.get(`
        SELECT * FROM enhanced_projects WHERE id = ?
      `, [projectId]);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Parse JSON fields
      project.tags = JSON.parse(project.tags || '[]');
      project.metadata = JSON.parse(project.metadata || '{}');

      return project;
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  async getAllProjects() {
    const db = await getDb();
    
    try {
      const projects = await db.all(`
        SELECT * FROM project_statistics ORDER BY updated_at DESC
      `);

      return projects.map(project => ({
        ...project,
        tags: JSON.parse(project.tags || '[]'),
        metadata: JSON.parse(project.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw error;
    }
  }

  async updateProject(projectId, updateData) {
    const db = await getDb();
    
    try {
      const setClause = [];
      const params = [];
      
      const allowedFields = [
        'name', 'path', 'description', 'language', 'framework', 
        'version', 'tags', 'metadata', 'status'
      ];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          // JSON stringify for array/object fields
          if (['tags', 'metadata'].includes(key)) {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClause.push('updated_at = ?');
      params.push(Math.floor(Date.now() / 1000));
      params.push(projectId);
      
      await db.run(`
        UPDATE enhanced_projects 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Updated project: ${projectId}`);
      return { success: true, project: await this.getProject(projectId) };
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    const db = await getDb();
    
    try {
      // Get project info before deletion
      const project = await this.getProject(projectId);
      
      // Delete project (cascading will delete related data)
      await db.run('DELETE FROM enhanced_projects WHERE id = ?', [projectId]);
      
      console.log(`Deleted project: ${project.name} (${projectId})`);
      return { success: true, deletedProject: project };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // =================================================================
  // FUNCTION CRUD OPERATIONS
  // =================================================================

  async createFunction(functionData) {
    const db = await getDb();
    
    try {
      const functionId = `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const {
        project_id,
        name,
        full_name = null,
        file_path,
        line_number = null,
        end_line_number = null,
        parameters = [],
        return_type = null,
        is_async = false,
        is_static = false,
        is_private = false,
        complexity_score = 1,
        description = null,
        tags = [],
        metadata = {}
      } = functionData;

      await db.run(`
        INSERT INTO enhanced_functions (
          id, project_id, name, full_name, file_path, line_number, end_line_number,
          parameters, return_type, is_async, is_static, is_private, 
          complexity_score, description, tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        functionId, project_id, name, full_name, file_path, line_number, end_line_number,
        JSON.stringify(parameters), return_type, is_async, is_static, is_private,
        complexity_score, description, JSON.stringify(tags), JSON.stringify(metadata)
      ]);

      console.log(`Created function: ${name} (${functionId})`);
      return { success: true, functionId, function: await this.getFunction(functionId) };
    } catch (error) {
      console.error('Error creating function:', error);
      throw error;
    }
  }

  async getFunction(functionId) {
    const db = await getDb();
    
    try {
      const func = await db.get(`
        SELECT * FROM enhanced_functions WHERE id = ?
      `, [functionId]);
      
      if (!func) {
        throw new Error('Function not found');
      }

      // Parse JSON fields
      func.parameters = JSON.parse(func.parameters || '[]');
      func.tags = JSON.parse(func.tags || '[]');
      func.metadata = JSON.parse(func.metadata || '{}');

      return func;
    } catch (error) {
      console.error('Error getting function:', error);
      throw error;
    }
  }

  async getFunctionsByProject(projectId) {
    const db = await getDb();
    
    try {
      const functions = await db.all(`
        SELECT * FROM enhanced_functions 
        WHERE project_id = ? 
        ORDER BY name
      `, [projectId]);

      return functions.map(func => ({
        ...func,
        parameters: JSON.parse(func.parameters || '[]'),
        tags: JSON.parse(func.tags || '[]'),
        metadata: JSON.parse(func.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting functions by project:', error);
      throw error;
    }
  }

  async updateFunction(functionId, updateData) {
    const db = await getDb();
    
    try {
      const setClause = [];
      const params = [];
      
      const allowedFields = [
        'name', 'full_name', 'file_path', 'line_number', 'end_line_number',
        'parameters', 'return_type', 'is_async', 'is_static', 'is_private',
        'complexity_score', 'description', 'tags', 'metadata'
      ];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          // JSON stringify for array/object fields
          if (['parameters', 'tags', 'metadata'].includes(key)) {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClause.push('updated_at = ?');
      params.push(Math.floor(Date.now() / 1000));
      params.push(functionId);
      
      await db.run(`
        UPDATE enhanced_functions 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Updated function: ${functionId}`);
      return { success: true, function: await this.getFunction(functionId) };
    } catch (error) {
      console.error('Error updating function:', error);
      throw error;
    }
  }

  async deleteFunction(functionId) {
    const db = await getDb();
    
    try {
      // Get function info before deletion
      const func = await this.getFunction(functionId);
      
      // Delete function (cascading will delete related data)
      await db.run('DELETE FROM enhanced_functions WHERE id = ?', [functionId]);
      
      console.log(`Deleted function: ${func.name} (${functionId})`);
      return { success: true, deletedFunction: func };
    } catch (error) {
      console.error('Error deleting function:', error);
      throw error;
    }
  }

  // =================================================================
  // VARIABLE CRUD OPERATIONS
  // =================================================================

  async createVariable(variableData) {
    const db = await getDb();
    
    try {
      const variableId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const {
        project_id,
        function_id = null,
        name,
        type = null,
        value = null,
        file_path,
        line_number = null,
        scope = 'local',
        declaration_type = null,
        mutability = 'mutable',
        is_exported = false,
        description = null,
        tags = [],
        metadata = {}
      } = variableData;

      await db.run(`
        INSERT INTO enhanced_variables (
          id, project_id, function_id, name, type, value, file_path, line_number,
          scope, declaration_type, mutability, is_exported, description, tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        variableId, project_id, function_id, name, type, value, file_path, line_number,
        scope, declaration_type, mutability, is_exported, description, 
        JSON.stringify(tags), JSON.stringify(metadata)
      ]);

      console.log(`Created variable: ${name} (${variableId})`);
      return { success: true, variableId, variable: await this.getVariable(variableId) };
    } catch (error) {
      console.error('Error creating variable:', error);
      throw error;
    }
  }

  async getVariable(variableId) {
    const db = await getDb();
    
    try {
      const variable = await db.get(`
        SELECT * FROM enhanced_variables WHERE id = ?
      `, [variableId]);
      
      if (!variable) {
        throw new Error('Variable not found');
      }

      // Parse JSON fields
      variable.tags = JSON.parse(variable.tags || '[]');
      variable.metadata = JSON.parse(variable.metadata || '{}');

      return variable;
    } catch (error) {
      console.error('Error getting variable:', error);
      throw error;
    }
  }

  async getVariablesByProject(projectId) {
    const db = await getDb();
    
    try {
      const variables = await db.all(`
        SELECT * FROM enhanced_variables 
        WHERE project_id = ? 
        ORDER BY name
      `, [projectId]);

      return variables.map(variable => ({
        ...variable,
        tags: JSON.parse(variable.tags || '[]'),
        metadata: JSON.parse(variable.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting variables by project:', error);
      throw error;
    }
  }

  async getVariablesByFunction(functionId) {
    const db = await getDb();
    
    try {
      const variables = await db.all(`
        SELECT * FROM enhanced_variables 
        WHERE function_id = ? 
        ORDER BY name
      `, [functionId]);

      return variables.map(variable => ({
        ...variable,
        tags: JSON.parse(variable.tags || '[]'),
        metadata: JSON.parse(variable.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting variables by function:', error);
      throw error;
    }
  }

  async updateVariable(variableId, updateData) {
    const db = await getDb();
    
    try {
      const setClause = [];
      const params = [];
      
      const allowedFields = [
        'name', 'type', 'value', 'file_path', 'line_number', 'scope',
        'declaration_type', 'mutability', 'is_exported', 'description', 'tags', 'metadata'
      ];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          // JSON stringify for array/object fields
          if (['tags', 'metadata'].includes(key)) {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClause.push('updated_at = ?');
      params.push(Math.floor(Date.now() / 1000));
      params.push(variableId);
      
      await db.run(`
        UPDATE enhanced_variables 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Updated variable: ${variableId}`);
      return { success: true, variable: await this.getVariable(variableId) };
    } catch (error) {
      console.error('Error updating variable:', error);
      throw error;
    }
  }

  async deleteVariable(variableId) {
    const db = await getDb();
    
    try {
      // Get variable info before deletion
      const variable = await this.getVariable(variableId);
      
      // Delete variable
      await db.run('DELETE FROM enhanced_variables WHERE id = ?', [variableId]);
      
      console.log(`Deleted variable: ${variable.name} (${variableId})`);
      return { success: true, deletedVariable: variable };
    } catch (error) {
      console.error('Error deleting variable:', error);
      throw error;
    }
  }

  // =================================================================
  // DEPENDENCY CRUD OPERATIONS
  // =================================================================

  async createDependency(dependencyData) {
    const db = await getDb();
    
    try {
      const dependencyId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const {
        project_id,
        source_type,
        source_id,
        target_type,
        target_id,
        relationship_type,
        relationship_strength = null,
        context = null,
        line_number = null,
        order_sequence = 1,
        description = null,
        metadata = {}
      } = dependencyData;

      // Auto-calculate strength if not provided
      const strength = relationship_strength || 
        this.RELATIONSHIP_TYPES[relationship_type]?.strength || 0.5;

      await db.run(`
        INSERT INTO enhanced_dependencies (
          id, project_id, source_type, source_id, target_type, target_id,
          relationship_type, relationship_strength, context, line_number,
          order_sequence, description, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dependencyId, project_id, source_type, source_id, target_type, target_id,
        relationship_type, strength, context, line_number, order_sequence,
        description, JSON.stringify(metadata)
      ]);

      console.log(`Created dependency: ${source_type}:${source_id} -> ${relationship_type} -> ${target_type}:${target_id}`);
      return { success: true, dependencyId, dependency: await this.getDependency(dependencyId) };
    } catch (error) {
      console.error('Error creating dependency:', error);
      throw error;
    }
  }

  async getDependency(dependencyId) {
    const db = await getDb();
    
    try {
      const dependency = await db.get(`
        SELECT * FROM enhanced_dependencies WHERE id = ?
      `, [dependencyId]);
      
      if (!dependency) {
        throw new Error('Dependency not found');
      }

      // Parse JSON fields
      dependency.metadata = JSON.parse(dependency.metadata || '{}');

      return dependency;
    } catch (error) {
      console.error('Error getting dependency:', error);
      throw error;
    }
  }

  async getDependenciesByProject(projectId) {
    const db = await getDb();
    
    try {
      const dependencies = await db.all(`
        SELECT * FROM enhanced_dependencies 
        WHERE project_id = ? 
        ORDER BY order_sequence, created_at
      `, [projectId]);

      return dependencies.map(dependency => ({
        ...dependency,
        metadata: JSON.parse(dependency.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting dependencies by project:', error);
      throw error;
    }
  }

  async updateDependency(dependencyId, updateData) {
    const db = await getDb();
    
    try {
      const setClause = [];
      const params = [];
      
      const allowedFields = [
        'source_type', 'source_id', 'target_type', 'target_id',
        'relationship_type', 'relationship_strength', 'context', 'line_number',
        'order_sequence', 'description', 'metadata'
      ];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          // JSON stringify for object fields
          if (['metadata'].includes(key)) {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClause.push('updated_at = ?');
      params.push(Math.floor(Date.now() / 1000));
      params.push(dependencyId);
      
      await db.run(`
        UPDATE enhanced_dependencies 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Updated dependency: ${dependencyId}`);
      return { success: true, dependency: await this.getDependency(dependencyId) };
    } catch (error) {
      console.error('Error updating dependency:', error);
      throw error;
    }
  }

  async deleteDependency(dependencyId) {
    const db = await getDb();
    
    try {
      // Get dependency info before deletion
      const dependency = await this.getDependency(dependencyId);
      
      // Delete dependency
      await db.run('DELETE FROM enhanced_dependencies WHERE id = ?', [dependencyId]);
      
      console.log(`Deleted dependency: ${dependencyId}`);
      return { success: true, deletedDependency: dependency };
    } catch (error) {
      console.error('Error deleting dependency:', error);
      throw error;
    }
  }

  // =================================================================
  // TEMPLATE SYSTEM
  // =================================================================

  async createProjectFromTemplate(templateName, customName = null) {
    try {
      console.log(`Creating project from template: ${templateName}`);
      
      const template = this.PROJECT_TEMPLATES[templateName];
      if (!template) {
        console.error(`Template '${templateName}' not found. Available templates:`, Object.keys(this.PROJECT_TEMPLATES));
        throw new Error(`Template '${templateName}' not found`);
      }

      console.log(`Found template:`, template.name);

      // Create project
      const projectData = {
        name: customName || template.name,
        path: template.path || 'template-generated',
        description: template.description,
        status: 'active',
        tags: JSON.stringify(['template', templateName]),
        metadata: JSON.stringify({ template: templateName, generated: true })
      };

      console.log(`Creating project with data:`, projectData);
      const { projectId } = await this.createProject(projectData);
      console.log(`Created project with ID: ${projectId}`);

      // Create functions
      const functionMap = new Map(); // name -> id mapping
      console.log(`Creating ${template.functions.length} functions...`);
      
      for (const funcData of template.functions) {
        console.log(`Creating function: ${funcData.name}`);
        
        const { functionId } = await this.createFunction({
          project_id: projectId,
          name: funcData.name,
          file_path: funcData.file_path,
          line_number: funcData.line_number,
          parameters: JSON.stringify(funcData.parameters || []),
          is_async: funcData.is_async || false,
          complexity_score: 1,
          description: `Template function: ${funcData.name}`
        });
        
        functionMap.set(funcData.name, functionId);
        console.log(`Created function ${funcData.name} with ID: ${functionId}`);
      }

      // Create variables
      const variableMap = new Map(); // name -> id mapping
      console.log(`Creating ${template.variables.length} variables...`);
      
      for (const varData of template.variables) {
        console.log(`Creating variable: ${varData.name}`);
        
        // Determine function_id for parameters and local variables
        let functionId = null;
        if (varData.scope === 'parameter' || varData.scope === 'local') {
          functionId = functionMap.get('generateThumbnail');
        }
        
        const { variableId } = await this.createVariable({
          project_id: projectId,
          function_id: functionId,
          name: varData.name,
          type: varData.type,
          value: varData.value,
          file_path: 'controllers/dcimController.js', // Default for template
          line_number: varData.line_number,
          scope: varData.scope,
          declaration_type: varData.scope === 'parameter' ? 'parameter' : 'const',
          description: `Template variable: ${varData.name}`
        });
        
        variableMap.set(varData.name, variableId);
        console.log(`Created variable ${varData.name} with ID: ${variableId}`);
      }

      // Create relationships
      console.log(`Creating ${template.relationships.length} relationships...`);
      
      for (const relData of template.relationships) {
        console.log(`Creating relationship: ${relData.source} -> ${relData.type} -> ${relData.target}`);
        
        const sourceId = functionMap.get(relData.source) || variableMap.get(relData.source);
        const targetId = functionMap.get(relData.target) || variableMap.get(relData.target);
        
        if (sourceId && targetId) {
          const sourceType = functionMap.has(relData.source) ? 'function' : 'variable';
          const targetType = functionMap.has(relData.target) ? 'function' : 'variable';
          
          await this.createDependency({
            project_id: projectId,
            source_type: sourceType,
            source_id: sourceId,
            target_type: targetType,
            target_id: targetId,
            relationship_type: relData.type,
            relationship_strength: 0.8,
            description: `Template relationship: ${relData.source} ${relData.type} ${relData.target}`
          });
          
          console.log(`Created relationship: ${sourceType}:${sourceId} -> ${relData.type} -> ${targetType}:${targetId}`);
        } else {
          console.warn(`Skipping relationship - missing source or target: ${relData.source} -> ${relData.target}`);
          console.warn(`Source ID: ${sourceId}, Target ID: ${targetId}`);
        }
      }

      console.log(`Successfully created project from template '${templateName}': ${projectId}`);
      return { 
        success: true, 
        projectId, 
        project: await this.getProject(projectId),
        template: templateName,
        created_elements: {
          functions: functionMap.size,
          variables: variableMap.size,
          relationships: template.relationships.length
        }
      };
    } catch (error) {
      console.error('Error creating project from template:', error);
      throw error;
    }
  }

  async getAvailableTemplates() {
    return Object.keys(this.PROJECT_TEMPLATES).map(templateName => ({
      name: templateName,
      display_name: this.PROJECT_TEMPLATES[templateName].name,
      description: this.PROJECT_TEMPLATES[templateName].description,
      function_count: this.PROJECT_TEMPLATES[templateName].functions.length,
      variable_count: this.PROJECT_TEMPLATES[templateName].variables.length,
      relationship_count: this.PROJECT_TEMPLATES[templateName].relationships.length
    }));
  }

  // =================================================================
  // VISUALIZATION DATA GENERATION
  // =================================================================

  async getVisualizationData(projectId) {
    const db = await getDb();
    
    try {
      // Get all project data
      const functions = await this.getFunctionsByProject(projectId);
      const variables = await this.getVariablesByProject(projectId);
      const dependencies = await this.getDependenciesByProject(projectId);

      // Build nodes for visualization
      const nodes = [
        ...functions.map(func => ({
          id: func.id,
          label: func.name,
          type: 'function',
          file: func.file_path,
          line: func.line_number,
          isAsync: func.is_async,
          isStatic: func.is_static,
          isPrivate: func.is_private,
          complexity: func.complexity_score,
          parameters: func.parameters,
          returnType: func.return_type,
          description: func.description,
          tags: func.tags,
          metadata: func.metadata
        })),
        ...variables.map(variable => ({
          id: variable.id,
          label: variable.name,
          type: 'variable',
          file: variable.file_path,
          line: variable.line_number,
          value: variable.value,
          scope: variable.scope,
          declarationType: variable.declaration_type,
          mutability: variable.mutability,
          isExported: variable.is_exported,
          description: variable.description,
          tags: variable.tags,
          metadata: variable.metadata
        }))
      ];

      // Build edges for visualization
      const edges = dependencies.map(dep => ({
        id: dep.id,
        source: dep.source_id,
        target: dep.target_id,
        relationship: dep.relationship_type,
        strength: dep.relationship_strength,
        sourceType: dep.source_type,
        targetType: dep.target_type,
        context: dep.context,
        line: dep.line_number,
        order: dep.order_sequence,
        description: dep.description,
        metadata: dep.metadata
      }));

      return {
        project_id: projectId,
        functions,
        variables,
        dependencies,
        nodes,
        edges,
        statistics: {
          function_count: functions.length,
          variable_count: variables.length,
          dependency_count: dependencies.length,
          relationship_types: [...new Set(dependencies.map(d => d.relationship_type))],
          avg_complexity: functions.reduce((sum, f) => sum + f.complexity_score, 0) / functions.length || 0
        }
      };
    } catch (error) {
      console.error('Error getting visualization data:', error);
      throw error;
    }
  }

  // =================================================================
  // ANALYSIS AND METRICS
  // =================================================================

  async getProjectAnalytics(projectId) {
    const db = await getDb();
    
    try {
      // Get comprehensive project statistics
      const stats = await db.get(`
        SELECT * FROM project_statistics WHERE id = ?
      `, [projectId]);

      // Get relationship breakdown
      const relationshipStats = await db.all(`
        SELECT 
          relationship_type,
          COUNT(*) as count,
          AVG(relationship_strength) as avg_strength
        FROM enhanced_dependencies 
        WHERE project_id = ?
        GROUP BY relationship_type
        ORDER BY count DESC
      `, [projectId]);

      // Get complexity distribution
      const complexityStats = await db.all(`
        SELECT 
          complexity_score,
          COUNT(*) as count
        FROM enhanced_functions 
        WHERE project_id = ?
        GROUP BY complexity_score
        ORDER BY complexity_score
      `, [projectId]);

      // Get scope distribution
      const scopeStats = await db.all(`
        SELECT 
          scope,
          COUNT(*) as count
        FROM enhanced_variables 
        WHERE project_id = ?
        GROUP BY scope
        ORDER BY count DESC
      `, [projectId]);

      return {
        project_stats: stats,
        relationship_breakdown: relationshipStats,
        complexity_distribution: complexityStats,
        scope_distribution: scopeStats,
        total_elements: (stats?.function_count || 0) + (stats?.variable_count || 0),
        connectivity: (stats?.dependency_count || 0) / 
          Math.max(1, (stats?.function_count || 0) + (stats?.variable_count || 0))
      };
    } catch (error) {
      console.error('Error getting project analytics:', error);
      throw error;
    }
  }
}

// Controller instance
const enhancedCodeGraphController = new EnhancedCodeGraphController();

// =================================================================
// EXPRESS ROUTE HANDLERS
// =================================================================

// Database initialization
exports.initializeDatabase = async (req, res) => {
  try {
    await enhancedCodeGraphController.initializeDatabase();
    res.json({ success: true, message: 'Enhanced code graph database initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Project CRUD
exports.createProject = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.createProject(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await enhancedCodeGraphController.getProject(req.params.projectId);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await enhancedCodeGraphController.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateProject(
      req.params.projectId, 
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteProject(req.params.projectId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function CRUD
exports.createFunction = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.createFunction(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFunction = async (req, res) => {
  try {
    const func = await enhancedCodeGraphController.getFunction(req.params.functionId);
    res.json(func);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFunctionsByProject = async (req, res) => {
  try {
    const functions = await enhancedCodeGraphController.getFunctionsByProject(req.params.projectId);
    res.json(functions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFunction = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.updateFunction(
      req.params.functionId, 
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteFunction = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.deleteFunction(req.params.functionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Variable CRUD
exports.createVariable = async (req, res) => {
  try {
    const result = await enhancedCodeGraphController.createVariable(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVariable = async (req, res) => {
  try {
    const variable = await enhancedCodeGraphController.getVariable(req.params.variableId);
    res.json(variable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVariablesByProject = async (req, res) => {
    try {
        const variables = await enhancedCodeGraphController.getVariablesByProject(req.params.projectId);
        res.json(variables);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
};
    
exports.getVariablesByFunction = async (req, res) => {
    try {
    const variables = await enhancedCodeGraphController.getVariablesByFunction(req.params.functionId);
    res.json(variables);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.updateVariable = async (req, res) => {
    try {
    const result = await enhancedCodeGraphController.updateVariable(
        req.params.variableId, 
        req.body
    );
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.deleteVariable = async (req, res) => {
    try {
    const result = await enhancedCodeGraphController.deleteVariable(req.params.variableId);
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

// Dependency CRUD
exports.createDependency = async (req, res) => {
    try {
    const result = await enhancedCodeGraphController.createDependency(req.body);
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.getDependency = async (req, res) => {
    try {
    const dependency = await enhancedCodeGraphController.getDependency(req.params.dependencyId);
    res.json(dependency);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.getDependenciesByProject = async (req, res) => {
    try {
    const dependencies = await enhancedCodeGraphController.getDependenciesByProject(req.params.projectId);
    res.json(dependencies);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.updateDependency = async (req, res) => {
    try {
    const result = await enhancedCodeGraphController.updateDependency(
        req.params.dependencyId, 
        req.body
    );
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.deleteDependency = async (req, res) => {
    try {
    const result = await enhancedCodeGraphController.deleteDependency(req.params.dependencyId);
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

// Template system
exports.createProjectFromTemplate = async (req, res) => {
    try {
    const { templateName, customName } = req.body;
    const result = await enhancedCodeGraphController.createProjectFromTemplate(templateName, customName);
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.getAvailableTemplates = async (req, res) => {
    try {
    const templates = await enhancedCodeGraphController.getAvailableTemplates();
    res.json(templates);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

// Visualization and analytics
exports.getVisualizationData = async (req, res) => {
    try {
    const data = await enhancedCodeGraphController.getVisualizationData(req.params.projectId);
    res.json(data);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

exports.getProjectAnalytics = async (req, res) => {
    try {
    const analytics = await enhancedCodeGraphController.getProjectAnalytics(req.params.projectId);
    res.json(analytics);
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
};

// Export the controller instance for direct use
exports.enhancedCodeGraphController = enhancedCodeGraphController;