const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

/**
 * Code Graph Management Controller
 * Manual management of code entities and their relationships
 */

// Get all entities with filtering and pagination
exports.getAllEntities = async (req, res) => {
  try {
    const db = req.db;
    const { type, file_path, project_id, search, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT e.*, p.name as project_name
      FROM code_entities e
      LEFT JOIN code_project_entities pe ON e.id = pe.entity_id
      LEFT JOIN code_projects p ON pe.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) {
      query += ` AND e.type = ?`;
      params.push(type);
    }
    
    if (file_path) {
      query += ` AND e.file_path LIKE ?`;
      params.push(`%${file_path}%`);
    }
    
    if (project_id) {
      query += ` AND pe.project_id = ?`;
      params.push(project_id);
    }
    
    if (search) {
      query += ` AND (e.name LIKE ? OR e.documentation LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY e.sequence_id ASC, e.created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const entities = await db.all(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM code_entities e
      LEFT JOIN code_project_entities pe ON e.id = pe.entity_id
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    if (type) countQuery += ` AND e.type = ?`;
    if (file_path) countQuery += ` AND e.file_path LIKE ?`;
    if (project_id) countQuery += ` AND pe.project_id = ?`;
    if (search) countQuery += ` AND (e.name LIKE ? OR e.documentation LIKE ?)`;
    
    const { total } = await db.get(countQuery, countParams);
    
    res.json({
      entities: entities.map(e => ({
        ...e,
        parameters: e.parameters ? JSON.parse(e.parameters) : null,
        properties: e.properties ? JSON.parse(e.properties) : {}
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single entity
exports.getEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const entity = await db.get(`
      SELECT e.*, p.name as project_name
      FROM code_entities e
      LEFT JOIN code_project_entities pe ON e.id = pe.entity_id
      LEFT JOIN code_projects p ON pe.project_id = p.id
      WHERE e.id = ?
    `, id);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    res.json({
      ...entity,
      parameters: entity.parameters ? JSON.parse(entity.parameters) : null,
      properties: entity.properties ? JSON.parse(entity.properties) : {}
    });
  } catch (error) {
    console.error('Error fetching entity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create entity
exports.createEntity = async (req, res) => {
  try {
    const {
      name, type, file_path, line_number, column_number, scope, language,
      signature, documentation, parameters, return_type, access_modifier,
      is_async, is_static, is_exported, properties, project_id
    } = req.body;
    
    if (!name || !type || !file_path) {
      return res.status(400).json({ error: 'Name, type, and file_path are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO code_entities 
      (id, name, type, file_path, line_number, column_number, scope, language,
       signature, documentation, parameters, return_type, access_modifier,
       is_async, is_static, is_exported, properties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, type, file_path, line_number, column_number, scope, language || 'javascript',
      signature, documentation, 
      parameters ? JSON.stringify(parameters) : null,
      return_type, access_modifier,
      is_async || false, is_static || false, is_exported || false,
      properties ? JSON.stringify(properties) : null,
      now, now
    ]);
    
    // Link to project if provided
    if (project_id) {
      const linkId = uuidv4();
      await db.run(`
        INSERT INTO code_project_entities (id, project_id, entity_id, created_at)
        VALUES (?, ?, ?, ?)
      `, [linkId, project_id, id, now]);
    }
    
    const entity = await db.get('SELECT * FROM code_entities WHERE id = ?', id);
    res.status(201).json({
      ...entity,
      parameters: entity.parameters ? JSON.parse(entity.parameters) : null,
      properties: entity.properties ? JSON.parse(entity.properties) : {}
    });
  } catch (error) {
    console.error('Error creating entity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update entity
exports.updateEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = req.db;
    const now = Date.now();
    
    // Build dynamic update query
    const fields = Object.keys(updateData).filter(key => 
      !['id', 'created_at', 'sequence_id'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Handle JSON fields
    if (updateData.parameters) {
      updateData.parameters = JSON.stringify(updateData.parameters);
    }
    if (updateData.properties) {
      updateData.properties = JSON.stringify(updateData.properties);
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(now, id);
    
    await db.run(`
      UPDATE code_entities 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
    
    const entity = await db.get('SELECT * FROM code_entities WHERE id = ?', id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    res.json({
      ...entity,
      parameters: entity.parameters ? JSON.parse(entity.parameters) : null,
      properties: entity.properties ? JSON.parse(entity.properties) : {}
    });
  } catch (error) {
    console.error('Error updating entity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete entity
exports.deleteEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete relationships first
      await db.run('DELETE FROM code_relationships WHERE source_entity_id = ? OR target_entity_id = ?', id, id);
      
      // Delete project associations
      await db.run('DELETE FROM code_project_entities WHERE entity_id = ?', id);
      
      // Delete analysis results
      await db.run('DELETE FROM code_analysis_results WHERE entity_id = ?', id);
      
      // Delete entity
      const result = await db.run('DELETE FROM code_entities WHERE id = ?', id);
      
      if (result.changes === 0) {
        throw new Error('Entity not found');
      }
      
      await db.run('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all relationships
exports.getAllRelationships = async (req, res) => {
  try {
    const db = req.db;
    const { type, source_entity_id, target_entity_id, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT r.*, 
        se.name as source_name, se.type as source_type,
        te.name as target_name, te.type as target_type
      FROM code_relationships r
      JOIN code_entities se ON r.source_entity_id = se.id
      JOIN code_entities te ON r.target_entity_id = te.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) {
      query += ` AND r.relationship_type = ?`;
      params.push(type);
    }
    
    if (source_entity_id) {
      query += ` AND r.source_entity_id = ?`;
      params.push(source_entity_id);
    }
    
    if (target_entity_id) {
      query += ` AND r.target_entity_id = ?`;
      params.push(target_entity_id);
    }
    
    query += ` ORDER BY r.sequence_id ASC, r.created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const relationships = await db.all(query, params);
    
    res.json(relationships.map(r => ({
      ...r,
      properties: r.properties ? JSON.parse(r.properties) : {}
    })));
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create relationship
exports.createRelationship = async (req, res) => {
  try {
    const {
      source_entity_id, target_entity_id, relationship_type, relationship_strength,
      context, file_path, line_number, call_count, properties
    } = req.body;
    
    if (!source_entity_id || !target_entity_id || !relationship_type) {
      return res.status(400).json({ error: 'Source entity, target entity, and relationship type are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO code_relationships 
      (id, source_entity_id, target_entity_id, relationship_type, relationship_strength,
       context, file_path, line_number, call_count, properties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, source_entity_id, target_entity_id, relationship_type, relationship_strength || 1.0,
      context, file_path, line_number, call_count || 1,
      properties ? JSON.stringify(properties) : null,
      now, now
    ]);
    
    const relationship = await db.get(`
      SELECT r.*, 
        se.name as source_name, se.type as source_type,
        te.name as target_name, te.type as target_type
      FROM code_relationships r
      JOIN code_entities se ON r.source_entity_id = se.id
      JOIN code_entities te ON r.target_entity_id = te.id
      WHERE r.id = ?
    `, id);
    
    res.status(201).json({
      ...relationship,
      properties: relationship.properties ? JSON.parse(relationship.properties) : {}
    });
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update relationship
exports.updateRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const { relationship_type, relationship_strength, context, file_path, line_number, call_count, properties } = req.body;
    
    const db = req.db;
    const now = Date.now();
    
    await db.run(`
      UPDATE code_relationships 
      SET relationship_type = ?, relationship_strength = ?, context = ?, 
          file_path = ?, line_number = ?, call_count = ?, properties = ?, updated_at = ?
      WHERE id = ?
    `, [
      relationship_type, relationship_strength, context, file_path, line_number, call_count,
      properties ? JSON.stringify(properties) : null, now, id
    ]);
    
    const relationship = await db.get(`
      SELECT r.*, 
        se.name as source_name, se.type as source_type,
        te.name as target_name, te.type as target_type
      FROM code_relationships r
      JOIN code_entities se ON r.source_entity_id = se.id
      JOIN code_entities te ON r.target_entity_id = te.id
      WHERE r.id = ?
    `, id);
    
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    res.json({
      ...relationship,
      properties: relationship.properties ? JSON.parse(relationship.properties) : {}
    });
  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete relationship
exports.deleteRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run('DELETE FROM code_relationships WHERE id = ?', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const db = req.db;
    
    const projects = await db.all(`
      SELECT p.*, 
        COUNT(pe.entity_id) as entity_count
      FROM code_projects p
      LEFT JOIN code_project_entities pe ON p.id = pe.project_id
      GROUP BY p.id
      ORDER BY p.sequence_id ASC, p.created_at DESC
    `);
    
    res.json(projects.map(p => ({
      ...p,
      dependencies: p.dependencies ? JSON.parse(p.dependencies) : []
    })));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create project
exports.createProject = async (req, res) => {
  try {
    const { name, description, base_path, language, framework, version, dependencies } = req.body;
    
    if (!name || !base_path) {
      return res.status(400).json({ error: 'Name and base_path are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO code_projects 
      (id, name, description, base_path, language, framework, version, dependencies, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, description, base_path, language || 'javascript', framework, version,
      dependencies ? JSON.stringify(dependencies) : null,
      now, now
    ]);
    
    const project = await db.get('SELECT * FROM code_projects WHERE id = ?', id);
    res.status(201).json({
      ...project,
      dependencies: project.dependencies ? JSON.parse(project.dependencies) : []
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, base_path, language, framework, version, dependencies } = req.body;
    
    const db = req.db;
    const now = Date.now();
    
    await db.run(`
      UPDATE code_projects 
      SET name = ?, description = ?, base_path = ?, language = ?, 
          framework = ?, version = ?, dependencies = ?, updated_at = ?
      WHERE id = ?
    `, [
      name, description, base_path, language, framework, version,
      dependencies ? JSON.stringify(dependencies) : null, now, id
    ]);
    
    const project = await db.get('SELECT * FROM code_projects WHERE id = ?', id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({
      ...project,
      dependencies: project.dependencies ? JSON.parse(project.dependencies) : []
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete project-entity associations
      await db.run('DELETE FROM code_project_entities WHERE project_id = ?', id);
      
      // Delete analysis results for this project
      await db.run('DELETE FROM code_analysis_results WHERE project_id = ?', id);
      
      // Delete project
      const result = await db.run('DELETE FROM code_projects WHERE id = ?', id);
      
      if (result.changes === 0) {
        throw new Error('Project not found');
      }
      
      await db.run('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get graph visualization data
exports.getGraphVisualization = async (req, res) => {
  try {
    const db = req.db;
    const { project_id, type_filter, relationship_filter } = req.query;
    
    // Get entities
    let entityQuery = `
      SELECT e.*, p.name as project_name
      FROM code_entities e
      LEFT JOIN code_project_entities pe ON e.id = pe.entity_id
      LEFT JOIN code_projects p ON pe.project_id = p.id
      WHERE 1=1
    `;
    const entityParams = [];
    
    if (project_id) {
      entityQuery += ` AND pe.project_id = ?`;
      entityParams.push(project_id);
    }
    
    if (type_filter) {
      entityQuery += ` AND e.type = ?`;
      entityParams.push(type_filter);
    }
    
    const entities = await db.all(entityQuery, entityParams);
    
    // Get relationships
    let relationshipQuery = `
      SELECT r.*, 
        se.name as source_name, te.name as target_name
      FROM code_relationships r
      JOIN code_entities se ON r.source_entity_id = se.id
      JOIN code_entities te ON r.target_entity_id = te.id
      WHERE r.source_entity_id IN (${entities.map(() => '?').join(',')})
        AND r.target_entity_id IN (${entities.map(() => '?').join(',')})
    `;
    const relationshipParams = [...entities.map(e => e.id), ...entities.map(e => e.id)];
    
    if (relationship_filter) {
      relationshipQuery += ` AND r.relationship_type = ?`;
      relationshipParams.push(relationship_filter);
    }
    
    const relationships = await db.all(relationshipQuery, relationshipParams);
    
    res.json({
      nodes: entities.map(e => ({
        id: e.id,
        label: e.name,
        type: e.type,
        file_path: e.file_path,
        project_name: e.project_name,
        complexity_score: e.complexity_score,
        properties: e.properties ? JSON.parse(e.properties) : {}
      })),
      edges: relationships.map(r => ({
        id: r.id,
        source: r.source_entity_id,
        target: r.target_entity_id,
        type: r.relationship_type,
        strength: r.relationship_strength,
        call_count: r.call_count,
        properties: r.properties ? JSON.parse(r.properties) : {}
      }))
    });
  } catch (error) {
    console.error('Error getting graph visualization:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get data flow for an entity
exports.getDataFlow = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { depth = 2 } = req.query;
    const db = req.db;
    
    const visited = new Set();
    const nodes = [];
    const edges = [];
    
    async function traverse(currentId, currentDepth) {
      if (currentDepth > depth || visited.has(currentId)) return;
      
      visited.add(currentId);
      
      // Get current entity
      const entity = await db.get('SELECT * FROM code_entities WHERE id = ?', currentId);
      if (entity) {
        nodes.push({
          id: entity.id,
          label: entity.name,
          type: entity.type,
          file_path: entity.file_path,
          depth: currentDepth
        });
      }
      
      // Get relationships
      const relationships = await db.all(`
        SELECT r.*, 
          se.name as source_name, te.name as target_name
        FROM code_relationships r
        JOIN code_entities se ON r.source_entity_id = se.id
        JOIN code_entities te ON r.target_entity_id = te.id
        WHERE r.source_entity_id = ? OR r.target_entity_id = ?
      `, currentId, currentId);
      
      for (const rel of relationships) {
        edges.push({
          id: rel.id,
          source: rel.source_entity_id,
          target: rel.target_entity_id,
          type: rel.relationship_type,
          strength: rel.relationship_strength
        });
        
        // Traverse connected entities
        const nextId = rel.source_entity_id === currentId ? rel.target_entity_id : rel.source_entity_id;
        await traverse(nextId, currentDepth + 1);
      }
    }
    
    await traverse(entityId, 0);
    
    res.json({ nodes, edges });
  } catch (error) {
    console.error('Error getting data flow:', error);
    res.status(500).json({ error: error.message });
  }
};

// Analyze complexity
exports.analyzeComplexity = async (req, res) => {
  try {
    const db = req.db;
    const { project_id } = req.body;
    
    // Get entities for analysis
    let query = `SELECT e.* FROM code_entities e`;
    const params = [];
    
    if (project_id) {
      query += ` 
        JOIN code_project_entities pe ON e.id = pe.entity_id 
        WHERE pe.project_id = ?
      `;
      params.push(project_id);
    }
    
    const entities = await db.all(query, params);
    
    const results = [];
    const now = Date.now();
    
    for (const entity of entities) {
      // Calculate fan-in (how many entities call this one)
      const fanIn = await db.get(`
        SELECT COUNT(*) as count 
        FROM code_relationships 
        WHERE target_entity_id = ? AND relationship_type IN ('calls', 'uses')
      `, entity.id);
      
      // Calculate fan-out (how many entities this one calls)
      const fanOut = await db.get(`
        SELECT COUNT(*) as count 
        FROM code_relationships 
        WHERE source_entity_id = ? AND relationship_type IN ('calls', 'uses')
      `, entity.id);
      
      // Simple complexity calculation
      const complexity = (fanIn.count * 0.3) + (fanOut.count * 0.7) + (entity.complexity_score || 0);
      
      // Store analysis result
      const resultId = uuidv4();
      await db.run(`
        INSERT INTO code_analysis_results 
        (id, entity_id, analysis_type, metric_name, metric_value, analysis_data, computed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        resultId, entity.id, 'complexity', 'weighted_complexity', complexity,
        JSON.stringify({ fan_in: fanIn.count, fan_out: fanOut.count }),
        now
      ]);
      
      results.push({
        entity_id: entity.id,
        entity_name: entity.name,
        complexity,
        fan_in: fanIn.count,
        fan_out: fanOut.count
      });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error analyzing complexity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Analyze dependencies
exports.analyzeDependencies = async (req, res) => {
  try {
    const db = req.db;
    const { project_id } = req.body;
    
    // Get dependency relationships
    let query = `
      SELECT r.*, se.name as source_name, te.name as target_name
      FROM code_relationships r
      JOIN code_entities se ON r.source_entity_id = se.id
      JOIN code_entities te ON r.target_entity_id = te.id
      WHERE r.relationship_type IN ('imports', 'uses', 'depends_on')
    `;
    const params = [];
    
    if (project_id) {
      query += ` 
        AND EXISTS (
          SELECT 1 FROM code_project_entities pe1 
          WHERE pe1.entity_id = se.id AND pe1.project_id = ?
        )
        AND EXISTS (
          SELECT 1 FROM code_project_entities pe2 
          WHERE pe2.entity_id = te.id AND pe2.project_id = ?
        )
      `;
      params.push(project_id, project_id);
    }
    
    const dependencies = await db.all(query, params);
    
    // Analyze dependency patterns
    const dependencyMap = {};
    const circularDependencies = [];
    
    dependencies.forEach(dep => {
      if (!dependencyMap[dep.source_entity_id]) {
        dependencyMap[dep.source_entity_id] = [];
      }
      dependencyMap[dep.source_entity_id].push(dep.target_entity_id);
    });
    
    // Simple circular dependency detection
    function hasCircularDependency(entityId, visited = new Set(), path = []) {
      if (path.includes(entityId)) {
        return path.slice(path.indexOf(entityId));
      }
      
      if (visited.has(entityId)) return null;
      visited.add(entityId);
      
      const deps = dependencyMap[entityId] || [];
      for (const depId of deps) {
        const cycle = hasCircularDependency(depId, visited, [...path, entityId]);
        if (cycle) return cycle;
      }
      
      return null;
    }
    
    Object.keys(dependencyMap).forEach(entityId => {
      const cycle = hasCircularDependency(entityId);
      if (cycle) {
        circularDependencies.push(cycle);
      }
    });
    
    res.json({
      success: true,
      dependencies: dependencies.length,
      circular_dependencies: circularDependencies.length,
      dependency_details: dependencies,
      circular_details: circularDependencies
    });
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    res.status(500).json({ error: error.message });
  }
};

// Analyze coupling
exports.analyzeCoupling = async (req, res) => {
  try {
    const db = req.db;
    const { project_id } = req.body;
    
    // Get entities and their relationships
    let entityQuery = `SELECT e.* FROM code_entities e`;
    const entityParams = [];
    
    if (project_id) {
      entityQuery += ` 
        JOIN code_project_entities pe ON e.id = pe.entity_id 
        WHERE pe.project_id = ?
      `;
      entityParams.push(project_id);
    }
    
    const entities = await db.all(entityQuery, entityParams);
    
    const couplingResults = [];
    
    for (const entity of entities) {
      // Calculate efferent coupling (outgoing dependencies)
      const efferent = await db.get(`
        SELECT COUNT(DISTINCT target_entity_id) as count
        FROM code_relationships
        WHERE source_entity_id = ?
      `, entity.id);
      
      // Calculate afferent coupling (incoming dependencies)
      const afferent = await db.get(`
        SELECT COUNT(DISTINCT source_entity_id) as count
        FROM code_relationships
        WHERE target_entity_id = ?
      `, entity.id);
      
      // Calculate instability (I = Ce / (Ce + Ca))
      const totalCoupling = efferent.count + afferent.count;
      const instability = totalCoupling > 0 ? efferent.count / totalCoupling : 0;
      
      couplingResults.push({
        entity_id: entity.id,
        entity_name: entity.name,
        efferent_coupling: efferent.count,
        afferent_coupling: afferent.count,
        instability: instability,
        coupling_level: instability > 0.7 ? 'high' : instability > 0.3 ? 'medium' : 'low'
      });
    }
    
    res.json({
      success: true,
      results: couplingResults
    });
  } catch (error) {
    console.error('Error analyzing coupling:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get analysis metrics
exports.getAnalysisMetrics = async (req, res) => {
  try {
    const db = req.db;
    const { project_id } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (project_id) {
      whereClause = 'WHERE project_id = ?';
      params.push(project_id);
    }
    
    const metrics = await db.all(`
      SELECT analysis_type, metric_name, AVG(metric_value) as avg_value, 
             COUNT(*) as count, MIN(metric_value) as min_value, MAX(metric_value) as max_value
      FROM code_analysis_results
      ${whereClause}
      GROUP BY analysis_type, metric_name
      ORDER BY analysis_type, metric_name
    `, params);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting analysis metrics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Import from files (placeholder for future implementation)
exports.importFromFiles = async (req, res) => {
  try {
    const { file_paths, project_id } = req.body;
    
    if (!file_paths || !Array.isArray(file_paths)) {
      return res.status(400).json({ error: 'file_paths array is required' });
    }
    
    // This would be implemented to parse actual code files
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'File import functionality not yet implemented',
      files_to_process: file_paths.length
    });
  } catch (error) {
    console.error('Error importing from files:', error);
    res.status(500).json({ error: error.message });
  }
};