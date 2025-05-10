// attributeController.js - Logic for node attribute operations
const { v4: uuidv4 } = require('uuid');

/**
 * Get attributes for a node
 * GET /api/nodes/:id/attributes
 */
exports.getNodeAttributes = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const attributes = await db.all(
      'SELECT * FROM node_attributes WHERE node_id = ? ORDER BY key',
      id
    );
    
    res.json(attributes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new attribute
 * POST /api/node-attributes
 */
exports.createAttribute = async (req, res) => {
  try {
    const { node_id, key, value } = req.body;
    const db = req.db;
    
    // Validate input
    if (!node_id || !key) {
      return res.status(400).json({ error: 'Node ID and attribute key are required' });
    }
    
    // Check if node exists
    const node = await db.get('SELECT id FROM nodes WHERE id = ?', node_id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Check if attribute already exists for this node
    const existingAttr = await db.get(
      'SELECT id FROM node_attributes WHERE node_id = ? AND key = ?',
      [node_id, key]
    );
    
    const now = Date.now();
    let attribute;
    
    if (existingAttr) {
      // Update existing attribute
      await db.run(
        'UPDATE node_attributes SET value = ?, updated_at = ? WHERE id = ?',
        [value, now, existingAttr.id]
      );
      attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', existingAttr.id);
    } else {
      // Create new attribute
      const id = uuidv4();
      await db.run(
        'INSERT INTO node_attributes (id, node_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, node_id, key, value, now, now]
      );
      attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    }
    
    res.status(201).json(attribute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update an attribute
 * PUT /api/node-attributes/:id
 */
exports.updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    const db = req.db;
    const now = Date.now();
    
    await db.run(
      'UPDATE node_attributes SET value = ?, updated_at = ? WHERE id = ?',
      [value, now, id]
    );
    
    const attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    
    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    res.json(attribute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete an attribute
 * DELETE /api/node-attributes/:id
 */
exports.deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    await db.run('DELETE FROM node_attributes WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Query nodes by attributes
 * POST /api/nodes/query
 */
exports.queryNodesByAttributes = async (req, res) => {
  try {
    console.log("Received query request with raw body:", JSON.stringify(req.body));
    console.log("Query string:", req.body.query);
    const { query, sortBy, sortOrder, page = 1, pageSize = 20 } = req.body;
    const db = req.db;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    try {
      // First get all nodes with their attributes
      const nodes = await db.all(`
        SELECT n.*, GROUP_CONCAT(a.key || ':' || a.value, ';') as attributes
        FROM nodes n
        LEFT JOIN node_attributes a ON n.id = a.node_id
        GROUP BY n.id
      `);
      
      // Get all node attributes for filtering logic
      const allNodeAttributes = await db.all(`
        SELECT node_id, key, value
        FROM node_attributes
      `);
      
      // Create a map of node_id to attributes for easier access
      const nodeAttributesMap = {};
      allNodeAttributes.forEach(attr => {
        if (!nodeAttributesMap[attr.node_id]) {
          nodeAttributesMap[attr.node_id] = [];
        }
        nodeAttributesMap[attr.node_id].push({ key: attr.key, value: attr.value });
      });
      
      // Parse the query for conditions
      const conditions = query.split('AND').map(part => part.trim());
      
      console.log('Query received:', query);
      console.log('Conditions:', conditions);
      
      // Filter nodes based on the query conditions
      let matchingNodes = nodes.filter(node => {
        const nodeId = node.id;
        
        if (!nodeAttributesMap[node.id]) {
          return false;
        }
        
        const nodeAttrs = nodeAttributesMap[node.id];
        
        try {
          const allConditionsMet = conditions.every(condition => {
            // For each condition, check if node has matching attribute
            const parsedCondition = parseCondition(condition);
            if (!parsedCondition || parsedCondition.length !== 3) {
              return false;
            }
            
            const [key, operator, value] = parsedCondition;
            
            const attr = nodeAttrs.find(a => a.key === key);
            if (!attr) {
              return false;
            }
            
            return compareValues(attr.value, operator, value);
          });
          
          return allConditionsMet;
        } catch (conditionError) {
          console.error(`Error evaluating condition for node ${nodeId}:`, conditionError);
          return false;
        }
      });
      
      // Apply sorting if a sort field is provided
      if (sortBy) {
        matchingNodes.sort((a, b) => {
          const aAttrs = nodeAttributesMap[a.id] || [];
          const bAttrs = nodeAttributesMap[b.id] || [];
          
          const aAttr = aAttrs.find(attr => attr.key === sortBy);
          const bAttr = bAttrs.find(attr => attr.key === sortBy);
          
          const aValue = aAttr ? aAttr.value : '';
          const bValue = bAttr ? bAttr.value : '';
          
          // Try to sort numerically if both values are numbers
          if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
            return sortOrder === 'desc' 
              ? parseFloat(bValue) - parseFloat(aValue) 
              : parseFloat(aValue) - parseFloat(bValue);
          }
          
          // Otherwise sort alphabetically
          return sortOrder === 'desc'
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        });
      }
      
      // Calculate pagination
      const totalResults = matchingNodes.length;
      const totalPages = Math.ceil(totalResults / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalResults);
      
      // Get the subset of nodes for the current page
      const paginatedNodes = matchingNodes.slice(startIndex, endIndex);
      
      // Enhance the result with attribute details
      const resultNodes = paginatedNodes.map(node => {
        return {
          ...node,
          attributes: nodeAttributesMap[node.id] || []
        };
      });
      
      // Send the results with pagination metadata
      console.log(`Query returned ${totalResults} total results, ${resultNodes.length} on current page`);
      res.json({
        results: resultNodes,
        pagination: {
          page,
          pageSize,
          totalResults,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return res.status(500).json({ error: `Database operation failed: ${dbError.message}` });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: `Failed to execute query: ${error.message}` });
  }
};

// Helper function to parse a condition
function parseCondition(condition) {
  console.log('Parsing condition:', condition);
  
  try {
    // Remove any escape characters that might have been added in JSON encoding
    const cleanCondition = condition.replace(/\\"/g, '"').replace(/\\'/g, "'");
    console.log('Cleaned condition:', cleanCondition);
    
    // Handle key:* format (wildcard/existence check)
    const wildcardMatch = cleanCondition.match(/([^:]+):\s*\*/);
    if (wildcardMatch) {
      const key = wildcardMatch[1].trim();
      console.log('Parsed wildcard check:', key, 'exists');
      return [key, 'exists', '*'];
    }
    
    // Handle key:"" format (empty value check)
    const emptyMatch = cleanCondition.match(/([^:]+):\s*["']["']/);
    if (emptyMatch) {
      const key = emptyMatch[1].trim();
      console.log('Parsed empty value check:', key, 'exists');
      return [key, 'exists', ''];
    }
    
    // Handle key:"value" format (with quotes)
    const quotedMatch = cleanCondition.match(/([^:]+):\s*["']([^"']+)["']/);
    if (quotedMatch) {
      const key = quotedMatch[1].trim();
      const value = quotedMatch[2].trim();
      console.log('Parsed quoted value:', key, '=', value);
      return [key, '=', value];
    }
    
    // Handle colon format without quotes (key:value)
    const colonMatch = cleanCondition.match(/([^:]+):\s*([^"'\s]+)/);
    if (colonMatch) {
      const key = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      console.log('Parsed colon format:', key, '=', value);
      return [key, '=', value];
    }
    
    // Check for operators
    const operatorMatch = cleanCondition.match(/\s*(=|!=|>|<|>=|<=)\s*/);
    if (operatorMatch) {
      const parts = cleanCondition.split(operatorMatch[0]);
      const key = parts[0].trim();
      const operator = operatorMatch[1].trim();
      let value = parts[1].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      console.log('Parsed with operator:', key, operator, value);
      return [key, operator, value];
    }
    
    // Simple key=value case
    const parts = cleanCondition.split(/\s+/);
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const operator = '=';
      const value = parts.slice(1).join(' ').trim();
      
      // Remove quotes if present
      let cleanValue = value;
      if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
          (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.substring(1, cleanValue.length - 1);
      }
      
      console.log('Parsed simple case:', key, operator, cleanValue);
      return [key, operator, cleanValue];
    }
    
    console.error('Could not parse condition:', cleanCondition);
    return null;
  } catch (error) {
    console.error('Error parsing condition:', condition, error);
    return null;
  }
}

// Helper function to compare values based on operator
function compareValues(attrValue, operator, queryValue) {
  console.log(`Comparing: "${attrValue}" ${operator} "${queryValue}"`);
  
  // Special case for existence check
  if (operator === 'exists') {
    // If we get here, the attribute exists (since we found it in the node's attributes)
    return true;
  }
  
  // Handle numeric comparisons
  if (['>', '<', '>=', '<='].includes(operator)) {
    const numAttrValue = parseFloat(attrValue);
    const numQueryValue = parseFloat(queryValue);
    
    if (!isNaN(numAttrValue) && !isNaN(numQueryValue)) {
      switch(operator) {
        case '>': return numAttrValue > numQueryValue;
        case '<': return numAttrValue < numQueryValue;
        case '>=': return numAttrValue >= numQueryValue;
        case '<=': return numAttrValue <= numQueryValue;
      }
    }
  }
  
  // Handle string comparisons - use case-insensitive comparison
  switch(operator) {
    case '=':
      return attrValue.toLowerCase() === queryValue.toLowerCase();
    case '!=':
      return attrValue.toLowerCase() !== queryValue.toLowerCase();
    default:
      return attrValue.toLowerCase() === queryValue.toLowerCase();
  }
}

/**
 * Get a single attribute by sequence ID
 * GET /api/node-attributes/sequence/:sequence_id
 */
exports.getAttributeBySequenceId = async (req, res) => {
  try {
    const { sequence_id } = req.params;
    
    // Validate input
    const sequenceIdNum = parseInt(sequence_id);
    if (isNaN(sequenceIdNum) || sequenceIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid sequence ID format' });
    }
    
    const db = req.db;
    const attribute = await db.get('SELECT * FROM node_attributes WHERE sequence_id = ?', sequenceIdNum);
    
    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found with the provided sequence ID' });
    }
    
    res.json(attribute);
  } catch (error) {
    console.error(`Error retrieving attribute by sequence ID ${req.params.sequence_id}:`, error);
    res.status(500).json({ error: 'Database error when retrieving attribute by sequence ID' });
  }
};