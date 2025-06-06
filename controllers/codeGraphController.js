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

// Expression analysis endpoints
exports.analyzeExpression = async (req, res) => {
  try {
    const { entityId, lineNumber, codeText } = req.body;
    const db = req.db;
    
    // Parse the expression and extract components
    const analysis = await parseExpressionComponents(codeText, entityId, lineNumber);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error analyzing expression:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.saveExpressionAnalysis = async (req, res) => {
  try {
    const { entityId, lineNumber, variables, methodCalls, dataFlow } = req.body;
    const db = req.db;
    const now = Date.now();
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Save variables
      for (const variable of variables) {
        const id = uuidv4();
        await db.run(`
          INSERT INTO code_variables 
          (id, name, declaration_type, data_type, scope_type, parent_entity_id, 
           line_number, column_start, column_end, initial_value_type, mutability, 
           is_exported, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, variable.name, variable.declarationType, variable.dataType,
          variable.scopeType, entityId, lineNumber, variable.columnStart,
          variable.columnEnd, variable.initialValueType, variable.mutability,
          variable.isExported, now, now
        ]);
      }
      
      // Save method calls
      for (const methodCall of methodCalls) {
        const id = uuidv4();
        await db.run(`
          INSERT INTO code_method_calls 
          (id, method_name, call_type, expression_type, module_source, chain_position, 
           arguments_count, parent_expression_id, parent_entity_id, line_number, 
           column_start, column_end, return_type, is_async, parameters_used, 
           external_dependencies, builtin_dependencies, properties, created_at, updated_at, sequence_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, methodCall.name, methodCall.callType, methodCall.expressionType || 'call',
          methodCall.moduleSource, methodCall.chainPosition, methodCall.argumentsCount, 
          null, entityId, lineNumber, methodCall.columnStart, methodCall.columnEnd,
          methodCall.returnType, methodCall.isAsync || false, methodCall.parametersUsed,
          methodCall.externalDependencies, methodCall.builtinDependencies, null, now, now, null
        ]);
      }
      
      // Save data flow relationships
      for (const flow of dataFlow) {
        const id = uuidv4();
        await db.run(`
          INSERT INTO code_data_flow 
          (id, source_type, source_id, target_type, target_id, flow_type, 
           transformation_applied, line_number, parent_entity_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, flow.sourceType, flow.sourceId, flow.targetType, flow.targetId,
          flow.flowType, flow.transformationApplied, lineNumber, entityId, now, now
        ]);
      }
      
      await db.run('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error saving expression analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

// Variables endpoints
exports.getVariables = async (req, res) => {
  try {
    console.log('🔍 [SERVER] getVariables called with query:', req.query);
    const db = req.db;
    const { parent_entity_id, line_number } = req.query;
    
    console.log('🔍 [SERVER] Database object:', !!db);
    
    let query = 'SELECT * FROM code_variables WHERE 1=1';
    const params = [];
    
    if (parent_entity_id) {
      query += ' AND parent_entity_id = ?';
      params.push(parent_entity_id);
      console.log('🔍 [SERVER] Added parent_entity_id filter:', parent_entity_id);
    }
    
    if (line_number) {
      query += ' AND line_number = ?';
      params.push(line_number);
      console.log('🔍 [SERVER] Added line_number filter:', line_number);
    }
    
    query += ' ORDER BY sequence_id ASC, created_at DESC';
    
    console.log('🔍 [SERVER] Final query:', query);
    console.log('🔍 [SERVER] Query params:', params);
    
    const variables = await db.all(query, params);
    console.log('🔍 [SERVER] Query result:', variables);
    console.log('🔍 [SERVER] Result type:', typeof variables, 'isArray:', Array.isArray(variables));
    console.log('🔍 [SERVER] Result length:', variables?.length);
    
    res.json(variables);
  } catch (error) {
    console.error('💥 [SERVER] Error fetching variables:', error);
    console.error('💥 [SERVER] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

exports.getVariable = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const variable = await db.get('SELECT * FROM code_variables WHERE id = ?', id);
    
    if (!variable) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json(variable);
  } catch (error) {
    console.error('Error fetching variable:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createVariable = async (req, res) => {
  try {
    const {
      name, declaration_type, data_type, scope_type, parent_entity_id,
      line_number, column_start, column_end, initial_value_type,
      mutability, is_exported
    } = req.body;
    
    if (!name || !parent_entity_id) {
      return res.status(400).json({ error: 'Name and parent_entity_id are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO code_variables 
      (id, name, declaration_type, data_type, scope_type, parent_expression_id,
       parent_entity_id, line_number, column_start, column_end, initial_value_type, 
       mutability, is_exported, properties, created_at, updated_at, sequence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, declaration_type, data_type, scope_type, null, parent_entity_id,
      line_number, column_start, column_end, initial_value_type, mutability,
      is_exported || false, null, now, now, null
    ]);
    
    const variable = await db.get('SELECT * FROM code_variables WHERE id = ?', id);
    res.status(201).json(variable);
  } catch (error) {
    console.error('Error creating variable:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateVariable = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = req.db;
    const now = Date.now();
    
    const fields = Object.keys(updateData).filter(key => 
      !['id', 'created_at', 'sequence_id'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(now, id);
    
    await db.run(`
      UPDATE code_variables 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
    
    const variable = await db.get('SELECT * FROM code_variables WHERE id = ?', id);
    if (!variable) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json(variable);
  } catch (error) {
    console.error('Error updating variable:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVariable = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run('DELETE FROM code_variables WHERE id = ?', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting variable:', error);
    res.status(500).json({ error: error.message });
  }
};

// Method calls endpoints
exports.getMethodCalls = async (req, res) => {
  try {
    console.log('🔍 [SERVER] getMethodCalls called with query:', req.query);
    const db = req.db;
    const { parent_entity_id, line_number } = req.query;
    
    console.log('🔍 [SERVER] Database object:', !!db);
    
    let query = 'SELECT * FROM code_method_calls WHERE 1=1';
    const params = [];
    
    if (parent_entity_id) {
      query += ' AND parent_entity_id = ?';
      params.push(parent_entity_id);
      console.log('🔍 [SERVER] Added parent_entity_id filter:', parent_entity_id);
    }
    
    if (line_number) {
      query += ' AND line_number = ?';
      params.push(line_number);
      console.log('🔍 [SERVER] Added line_number filter:', line_number);
    }
    
    query += ' ORDER BY sequence_id ASC, created_at DESC';
    
    console.log('🔍 [SERVER] Final query:', query);
    console.log('🔍 [SERVER] Query params:', params);
    
    const methodCalls = await db.all(query, params);
    console.log('🔍 [SERVER] Query result:', methodCalls);
    console.log('🔍 [SERVER] Result type:', typeof methodCalls, 'isArray:', Array.isArray(methodCalls));
    console.log('🔍 [SERVER] Result length:', methodCalls?.length);
    
    res.json(methodCalls);
  } catch (error) {
    console.error('💥 [SERVER] Error fetching method calls:', error);
    console.error('💥 [SERVER] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

exports.getMethodCall = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const methodCall = await db.get('SELECT * FROM code_method_calls WHERE id = ?', id);
    
    if (!methodCall) {
      return res.status(404).json({ error: 'Method call not found' });
    }
    
    res.json(methodCall);
  } catch (error) {
    console.error('Error fetching method call:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createMethodCall = async (req, res) => {
  try {
    console.log('🔍 [SERVER] createMethodCall called with body:', req.body);
    
    const {
      method_name, call_type, expression_type, module_source, chain_position,
      arguments_count, parent_entity_id, line_number, column_start, column_end,
      return_type, parameters_used, external_dependencies, builtin_dependencies,
      is_async
    } = req.body;
    
    if (!method_name || !parent_entity_id) {
      return res.status(400).json({ error: 'Method name and parent_entity_id are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    // Check what columns actually exist in the table
    const tableInfo = await db.all("PRAGMA table_info(code_method_calls)");
    const existingColumns = tableInfo.map(col => col.name);
    console.log('🔍 [SERVER] Existing columns in code_method_calls:', existingColumns);
    
    // Build INSERT statement based on existing columns
    const baseColumns = ['id', 'method_name', 'call_type', 'module_source', 'chain_position', 
                         'arguments_count', 'parent_entity_id', 'line_number', 'column_start', 
                         'column_end', 'return_type', 'is_async', 'created_at', 'updated_at'];
    
    const optionalColumns = ['expression_type', 'parameters_used', 'external_dependencies', 
                            'builtin_dependencies', 'parent_expression_id', 'properties', 'sequence_id'];
    
    const columnsToInsert = baseColumns.filter(col => existingColumns.includes(col));
    const optionalColumnsToInsert = optionalColumns.filter(col => existingColumns.includes(col));
    
    const allColumns = [...columnsToInsert, ...optionalColumnsToInsert];
    
    // Build values array to match columns
    const baseValues = [id, method_name, call_type, module_source, chain_position,
                       arguments_count, parent_entity_id, line_number, column_start,
                       column_end, return_type, is_async || false, now, now];
    
    const optionalValues = [];
    if (existingColumns.includes('expression_type')) optionalValues.push(expression_type);
    if (existingColumns.includes('parameters_used')) optionalValues.push(parameters_used);
    if (existingColumns.includes('external_dependencies')) optionalValues.push(external_dependencies);
    if (existingColumns.includes('builtin_dependencies')) optionalValues.push(builtin_dependencies);
    if (existingColumns.includes('parent_expression_id')) optionalValues.push(null);
    if (existingColumns.includes('properties')) optionalValues.push(null);
    if (existingColumns.includes('sequence_id')) optionalValues.push(null);
    
    const allValues = [...baseValues, ...optionalValues];
    
    console.log('🔍 [SERVER] Columns to insert:', allColumns);
    console.log('🔍 [SERVER] Values to insert:', allValues);
    console.log('🔍 [SERVER] Column count:', allColumns.length, 'Value count:', allValues.length);
    
    const placeholders = allColumns.map(() => '?').join(', ');
    const columnsList = allColumns.join(', ');
    
    await db.run(`
      INSERT INTO code_method_calls (${columnsList})
      VALUES (${placeholders})
    `, allValues);
    
    const methodCall = await db.get('SELECT * FROM code_method_calls WHERE id = ?', id);
    console.log('✅ [SERVER] Method call created:', methodCall);
    res.status(201).json(methodCall);
  } catch (error) {
    console.error('💥 [SERVER] Error creating method call:', error);
    console.error('💥 [SERVER] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

exports.updateMethodCall = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = req.db;
    const now = Date.now();
    
    const fields = Object.keys(updateData).filter(key => 
      !['id', 'created_at', 'sequence_id'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(now, id);
    
    await db.run(`
      UPDATE code_method_calls 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
    
    const methodCall = await db.get('SELECT * FROM code_method_calls WHERE id = ?', id);
    if (!methodCall) {
      return res.status(404).json({ error: 'Method call not found' });
    }
    
    res.json(methodCall);
  } catch (error) {
    console.error('Error updating method call:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMethodCall = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run('DELETE FROM code_method_calls WHERE id = ?', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Method call not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting method call:', error);
    res.status(500).json({ error: error.message });
  }
};

// Data flow endpoints
exports.getDataFlow = async (req, res) => {
  try {
    console.log('🔍 [SERVER] getDataFlow called with query:', req.query);
    const db = req.db;
    const { parent_entity_id, line_number } = req.query;
    
    console.log('🔍 [SERVER] Database object:', !!db);
    
    let query = 'SELECT * FROM code_data_flow WHERE 1=1';
    const params = [];
    
    if (parent_entity_id) {
      query += ' AND parent_entity_id = ?';
      params.push(parent_entity_id);
      console.log('🔍 [SERVER] Added parent_entity_id filter:', parent_entity_id);
    }
    
    if (line_number) {
      query += ' AND line_number = ?';
      params.push(line_number);
      console.log('🔍 [SERVER] Added line_number filter:', line_number);
    }
    
    query += ' ORDER BY sequence_id ASC, created_at DESC';
    
    console.log('🔍 [SERVER] Final query:', query);
    console.log('🔍 [SERVER] Query params:', params);
    
    const dataFlow = await db.all(query, params);
    console.log('🔍 [SERVER] Query result:', dataFlow);
    console.log('🔍 [SERVER] Result type:', typeof dataFlow, 'isArray:', Array.isArray(dataFlow));
    console.log('🔍 [SERVER] Result length:', dataFlow?.length);
    
    res.json(dataFlow);
  } catch (error) {
    console.error('💥 [SERVER] Error fetching data flow:', error);
    console.error('💥 [SERVER] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

exports.createDataFlow = async (req, res) => {
  try {
    const {
      source_type, source_id, target_type, target_id, flow_type,
      transformation_applied, parent_entity_id, line_number
    } = req.body;
    
    if (!source_type || !target_type || !flow_type || !parent_entity_id) {
      return res.status(400).json({ error: 'Source type, target type, flow type, and parent_entity_id are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO code_data_flow 
      (id, source_type, source_id, target_type, target_id, flow_type,
       transformation_applied, line_number, parent_entity_id, properties, 
       created_at, updated_at, sequence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, source_type, source_id, target_type, target_id, flow_type,
      transformation_applied, line_number, parent_entity_id, null, now, now, null
    ]);
    
    const dataFlow = await db.get('SELECT * FROM code_data_flow WHERE id = ?', id);
    res.status(201).json(dataFlow);
  } catch (error) {
    console.error('Error creating data flow:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add missing data flow update endpoint
exports.updateDataFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = req.db;
    const now = Date.now();
    
    const fields = Object.keys(updateData).filter(key => 
      !['id', 'created_at', 'sequence_id'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(now, id);
    
    await db.run(`
      UPDATE code_data_flow 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
    
    const dataFlow = await db.get('SELECT * FROM code_data_flow WHERE id = ?', id);
    if (!dataFlow) {
      return res.status(404).json({ error: 'Data flow not found' });
    }
    
    res.json(dataFlow);
  } catch (error) {
    console.error('Error updating data flow:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add missing delete data flow endpoint
exports.deleteDataFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run('DELETE FROM code_data_flow WHERE id = ?', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Data flow not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting data flow:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get expression relationships
exports.getExpressionRelationships = async (req, res) => {
  try {
    const { entity_id, line_number } = req.query;
    
    const query = `
      SELECT * FROM expression_relationships 
      WHERE entity_id = ? AND line_number = ?
      ORDER BY order_sequence ASC
    `;
    
    const relationships = await db.all(query, [entity_id, line_number]);
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching expression relationships:', error);
    res.status(500).json({ error: 'Failed to fetch expression relationships' });
  }
};

// Create expression relationship
exports.createExpressionRelationship = async (req, res) => {
  try {
    const {
      source_type, source_name, target_type, target_name,
      relationship_type, description, transformation,
      order_sequence, entity_id, line_number, project_id
    } = req.body;
    
    const query = `
      INSERT INTO expression_relationships (
        source_type, source_name, target_type, target_name,
        relationship_type, description, transformation,
        order_sequence, entity_id, line_number, project_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    const result = await db.run(query, [
      source_type, source_name, target_type, target_name,
      relationship_type, description, transformation,
      order_sequence, entity_id, line_number, project_id
    ]);
    
    const newRelationship = await db.get(
      'SELECT * FROM expression_relationships WHERE id = ?',
      [result.lastID]
    );
    
    res.json(newRelationship);
  } catch (error) {
    console.error('Error creating expression relationship:', error);
    res.status(500).json({ error: 'Failed to create expression relationship' });
  }
};

// Delete expression relationship
exports.deleteExpressionRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.run('DELETE FROM expression_relationships WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expression relationship:', error);
    res.status(500).json({ error: 'Failed to delete expression relationship' });
  }
};