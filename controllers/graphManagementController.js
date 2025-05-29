const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

/**
 * Graph Data Management Controller
 * CRUD operations for vertices and edges
 */

// Get all vertices
exports.getAllVertices = async (req, res) => {
  try {
    const db = req.db;
    const vertices = await db.all(`
      SELECT v.*, n.content as source_node_content, n.content_zh as source_node_content_zh
      FROM graph_vertices v
      LEFT JOIN nodes n ON v.source_node_id = n.id
      ORDER BY v.created_at DESC
    `);
    
    res.json(vertices.map(v => ({
      ...v,
      properties: v.properties ? JSON.parse(v.properties) : {}
    })));
  } catch (error) {
    console.error('Error fetching vertices:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all edges
exports.getAllEdges = async (req, res) => {
  try {
    const db = req.db;
    const edges = await db.all(`
      SELECT e.*, 
        sv.label as source_label, 
        tv.label as target_label
      FROM graph_edges e
      JOIN graph_vertices sv ON e.source_vertex_id = sv.id
      JOIN graph_vertices tv ON e.target_vertex_id = tv.id
      ORDER BY e.created_at DESC
    `);
    
    res.json(edges.map(e => ({
      ...e,
      properties: e.properties ? JSON.parse(e.properties) : {}
    })));
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create vertex
exports.createVertex = async (req, res) => {
  try {
    const { label, label_zh, type, properties, source_node_id, x_position, y_position, size, color } = req.body;
    
    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO graph_vertices 
      (id, label, label_zh, type, properties, source_node_id, x_position, y_position, size, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, label, label_zh, type || 'concept', 
      properties ? JSON.stringify(properties) : null,
      source_node_id, x_position, y_position, size || 1.0, color || '#666666',
      now, now
    ]);
    
    const vertex = await db.get('SELECT * FROM graph_vertices WHERE id = ?', id);
    res.status(201).json({
      ...vertex,
      properties: vertex.properties ? JSON.parse(vertex.properties) : {}
    });
  } catch (error) {
    console.error('Error creating vertex:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create edge
exports.createEdge = async (req, res) => {
  try {
    const { source_vertex_id, target_vertex_id, relationship_type, weight, direction, properties } = req.body;
    
    if (!source_vertex_id || !target_vertex_id) {
      return res.status(400).json({ error: 'Source and target vertex IDs are required' });
    }
    
    const db = req.db;
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO graph_edges 
      (id, source_vertex_id, target_vertex_id, relationship_type, weight, direction, properties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, source_vertex_id, target_vertex_id, 
      relationship_type || 'relates_to', weight || 1.0, direction || 'directed',
      properties ? JSON.stringify(properties) : null,
      now, now
    ]);
    
    const edge = await db.get(`
      SELECT e.*, 
        sv.label as source_label, 
        tv.label as target_label
      FROM graph_edges e
      JOIN graph_vertices sv ON e.source_vertex_id = sv.id
      JOIN graph_vertices tv ON e.target_vertex_id = tv.id
      WHERE e.id = ?
    `, id);
    
    res.status(201).json({
      ...edge,
      properties: edge.properties ? JSON.parse(edge.properties) : {}
    });
  } catch (error) {
    console.error('Error creating edge:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update vertex
exports.updateVertex = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, label_zh, type, properties, x_position, y_position, size, color } = req.body;
    
    const db = req.db;
    const now = Date.now();
    
    await db.run(`
      UPDATE graph_vertices 
      SET label = ?, label_zh = ?, type = ?, properties = ?, 
          x_position = ?, y_position = ?, size = ?, color = ?, updated_at = ?
      WHERE id = ?
    `, [
      label, label_zh, type, 
      properties ? JSON.stringify(properties) : null,
      x_position, y_position, size, color, now, id
    ]);
    
    const vertex = await db.get('SELECT * FROM graph_vertices WHERE id = ?', id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    
    res.json({
      ...vertex,
      properties: vertex.properties ? JSON.parse(vertex.properties) : {}
    });
  } catch (error) {
    console.error('Error updating vertex:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update edge
exports.updateEdge = async (req, res) => {
  try {
    const { id } = req.params;
    const { relationship_type, weight, direction, properties } = req.body;
    
    const db = req.db;
    const now = Date.now();
    
    await db.run(`
      UPDATE graph_edges 
      SET relationship_type = ?, weight = ?, direction = ?, properties = ?, updated_at = ?
      WHERE id = ?
    `, [relationship_type, weight, direction, properties ? JSON.stringify(properties) : null, now, id]);
    
    const edge = await db.get(`
      SELECT e.*, 
        sv.label as source_label, 
        tv.label as target_label
      FROM graph_edges e
      JOIN graph_vertices sv ON e.source_vertex_id = sv.id
      JOIN graph_vertices tv ON e.target_vertex_id = tv.id
      WHERE e.id = ?
    `, id);
    
    if (!edge) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    res.json({
      ...edge,
      properties: edge.properties ? JSON.parse(edge.properties) : {}
    });
  } catch (error) {
    console.error('Error updating edge:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete vertex
exports.deleteVertex = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Check if vertex exists
    const vertex = await db.get('SELECT * FROM graph_vertices WHERE id = ?', id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    
    // Delete vertex (edges will be deleted by CASCADE)
    await db.run('DELETE FROM graph_vertices WHERE id = ?', id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vertex:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete edge
exports.deleteEdge = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Check if edge exists
    const edge = await db.get('SELECT * FROM graph_edges WHERE id = ?', id);
    if (!edge) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    await db.run('DELETE FROM graph_edges WHERE id = ?', id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: error.message });
  }
};

// Import vertices from outliner nodes
exports.importFromNodes = async (req, res) => {
  try {
    const { node_ids } = req.body; // Array of node IDs to import
    
    if (!Array.isArray(node_ids) || node_ids.length === 0) {
      return res.status(400).json({ error: 'Node IDs array is required' });
    }
    
    const db = req.db;
    const imported = [];
    
    for (const nodeId of node_ids) {
      // Check if already imported
      const existing = await db.get('SELECT id FROM graph_vertices WHERE source_node_id = ?', nodeId);
      if (existing) continue;
      
      // Get node data
      const node = await db.get('SELECT * FROM nodes WHERE id = ?', nodeId);
      if (!node) continue;
      
      const id = uuidv4();
      const now = Date.now();
      
      await db.run(`
        INSERT INTO graph_vertices 
        (id, label, label_zh, type, source_node_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id, node.content || 'Untitled', node.content_zh, 'imported_node', nodeId, now, now
      ]);
      
      imported.push(id);
    }
    
    res.json({ success: true, imported_count: imported.length, vertex_ids: imported });
  } catch (error) {
    console.error('Error importing from nodes:', error);
    res.status(500).json({ error: error.message });
  }
};