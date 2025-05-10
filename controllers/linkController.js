// linkController.js - Logic for link operations
const { v4: uuidv4 } = require('uuid');

/**
 * Get all links for a node (both incoming and outgoing)
 * GET /api/nodes/:id/links
 */
exports.getNodeLinks = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Get outgoing links (from this node to others)
    const outgoingLinks = await db.all(
      'SELECT l.*, n.content, n.content_zh FROM links l JOIN nodes n ON l.to_node_id = n.id WHERE l.from_node_id = ?',
      id
    );
    
    // Get incoming links (from others to this node)
    const incomingLinks = await db.all(
      'SELECT l.*, n.content, n.content_zh FROM links l JOIN nodes n ON l.from_node_id = n.id WHERE l.to_node_id = ?',
      id
    );
    
    res.json({
      outgoing: outgoingLinks,
      incoming: incomingLinks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new link
 * POST /api/links
 */
exports.createLink = async (req, res) => {
  try {
    const { from_node_id, to_node_id, weight, description } = req.body;
    const db = req.db;
    
    // Validate that both nodes exist
    const fromNode = await db.get('SELECT id FROM nodes WHERE id = ?', from_node_id);
    const toNode = await db.get('SELECT id FROM nodes WHERE id = ?', to_node_id);
    
    if (!fromNode || !toNode) {
      return res.status(400).json({ error: 'One or both nodes do not exist' });
    }
    
    // Check if link already exists
    const existingLink = await db.get(
      'SELECT id FROM links WHERE from_node_id = ? AND to_node_id = ?',
      [from_node_id, to_node_id]
    );
    
    if (existingLink) {
      return res.status(400).json({ error: 'Link already exists between these nodes' });
    }
    
    const now = Date.now();
    const id = uuidv4();
    
    await db.run(
      'INSERT INTO links (id, from_node_id, to_node_id, weight, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, from_node_id, to_node_id, weight || 1.0, description || '', now, now]
    );
    
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a link
 * PUT /api/links/:id
 */
exports.updateLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { weight, description } = req.body;
    const db = req.db;
    const now = Date.now();
    
    let query = 'UPDATE links SET updated_at = ?';
    const params = [now];
    
    if (weight !== undefined) {
      query += ', weight = ?';
      params.push(weight);
    }
    
    if (description !== undefined) {
      query += ', description = ?';
      params.push(description);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.run(query, params);
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a link
 * DELETE /api/links/:id
 */
exports.deleteLink = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    await db.run('DELETE FROM links WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLinkBySequenceId = async (req, res) => {
  try {
    const { sequence_id } = req.params;
    
    // Validate input
    const sequenceIdNum = parseInt(sequence_id);
    if (isNaN(sequenceIdNum) || sequenceIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid sequence ID format' });
    }
    
    const db = req.db;
    const link = await db.get('SELECT * FROM links WHERE sequence_id = ?', sequenceIdNum);
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found with the provided sequence ID' });
    }
    
    res.json(link);
  } catch (error) {
    console.error(`Error retrieving link by sequence ID ${req.params.sequence_id}:`, error);
    res.status(500).json({ error: 'Database error when retrieving link by sequence ID' });
  }
};