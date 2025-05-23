// markdownSearchController.js - Logic for markdown file search operations
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

// Define markdown directory path
const markdownDir = path.join(__dirname, '..', 'markdown');

/**
 * Search through all markdown files
 * GET /api/markdown/search?q=query&lang=en&advanced=false
 */
exports.searchMarkdownFiles = async (req, res) => {
  try {
    const query = req.query.q;
    const lang = req.query.lang || 'en';
    const advanced = req.query.advanced === 'true';
    
    // Minimum query length check
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    // Get database connection to fetch node info
    const db = req.db;
    
    // Check if markdown directory exists
    if (!fs.existsSync(markdownDir)) {
      return res.json([]);
    }
    
    // Get all markdown files
    const markdownFiles = fs.readdirSync(markdownDir)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        filename: file,
        nodeId: file.replace('.md', ''),
        filepath: path.join(markdownDir, file)
      }));
    
    const results = [];
    
    // Search through each markdown file
    for (const fileInfo of markdownFiles) {
      try {
        // Read file content
        const content = fs.readFileSync(fileInfo.filepath, 'utf8');
        
        // Skip empty files
        if (!content.trim()) {
          continue;
        }
        
        // Perform search based on mode
        let matches = false;
        let matchContext = '';
        
        if (advanced) {
          // Use advanced search logic similar to node search
          const searchResult = performAdvancedMarkdownSearch(content, query);
          matches = searchResult.matches;
          matchContext = searchResult.context;
        } else {
          // Simple case-insensitive search
          const lowerContent = content.toLowerCase();
          const lowerQuery = query.toLowerCase();
          matches = lowerContent.includes(lowerQuery);
          
          if (matches) {
            matchContext = extractMatchContext(content, query);
          }
        }
        
        if (matches) {
          // Get node information from database
          const node = await db.get('SELECT id, content, content_zh, parent_id FROM nodes WHERE id = ?', fileInfo.nodeId);
          
          if (node) {
            // Get node content based on language
            const nodeContent = lang === 'zh' ? (node.content_zh || node.content) : node.content;
            
            // Get parent info if exists
            let parentContent = null;
            if (node.parent_id) {
              const parent = await db.get('SELECT content, content_zh FROM nodes WHERE id = ?', node.parent_id);
              if (parent) {
                parentContent = lang === 'zh' ? (parent.content_zh || parent.content) : parent.content;
              }
            }
            
            results.push({
              id: node.id,
              type: 'markdown',
              nodeContent: nodeContent,
              markdownContent: content,
              matchContext: matchContext,
              parent_id: node.parent_id,
              parent_content: parentContent,
              filename: fileInfo.filename,
              contentLength: content.length
            });
          }
        }
      } catch (fileError) {
        console.warn(`Error reading markdown file ${fileInfo.filename}:`, fileError.message);
        continue;
      }
    }
    
    // Sort results by relevance (you can implement more sophisticated scoring)
    results.sort((a, b) => {
      // Prioritize by match context length and content length
      const scoreA = a.matchContext.length + (a.contentLength / 1000);
      const scoreB = b.matchContext.length + (b.contentLength / 1000);
      return scoreB - scoreA;
    });
    
    // Limit results to prevent overwhelming the UI
    const limitedResults = results.slice(0, 50);
    
    res.json(limitedResults);
  } catch (error) {
    console.error('Error searching markdown files:', error);
    res.status(500).json({ error: 'Error searching markdown files' });
  }
};

/**
 * Get combined search results (both nodes and markdown)
 * GET /api/search/combined?q=query&lang=en&advanced=false
 */
exports.getCombinedSearchResults = async (req, res) => {
  try {
    const query = req.query.q;
    const lang = req.query.lang || 'en';
    const advanced = req.query.advanced === 'true';
    
    if (!query || query.length < 2) {
      return res.json({
        nodes: [],
        markdown: [],
        total: 0
      });
    }
    
    // Prepare promises for both searches
    const nodeSearchPromise = searchNodes(req);
    const markdownSearchPromise = searchMarkdownFilesInternal(req);
    
    // Execute both searches in parallel
    const [nodeResults, markdownResults] = await Promise.all([
      nodeSearchPromise,
      markdownSearchPromise
    ]);
    
    res.json({
      nodes: Array.isArray(nodeResults) ? nodeResults : [],
      markdown: Array.isArray(markdownResults) ? markdownResults : [],
      total: (Array.isArray(nodeResults) ? nodeResults.length : 0) + 
             (Array.isArray(markdownResults) ? markdownResults.length : 0)
    });
    
  } catch (error) {
    console.error('Error in combined search:', error);
    res.status(500).json({ error: 'Error performing combined search' });
  }
};

/**
 * Internal function to search nodes (replicates node controller logic)
 */
async function searchNodes(req) {
  try {
    const query = req.query.q;
    const lang = req.query.lang || 'en';
    const advanced = req.query.advanced === 'true';
    
    const db = req.db;
    
    // Base WHERE clause
    let whereClause = '';
    const params = [];
    
    // Build WHERE clause based on parameters
    if (query && query.length >= 2) {
      if (advanced) {
        // For now, use simple search for advanced - you can implement advanced parsing later
        const searchQuery = `%${query}%`;
        const contentField = lang === 'zh' ? 'content_zh' : 'content';
        
        whereClause = `WHERE (n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        params.push(searchQuery, searchQuery, searchQuery);
      } else {
        // Simple search
        const searchQuery = `%${query}%`;
        const contentField = lang === 'zh' ? 'content_zh' : 'content';
        
        whereClause = `WHERE (n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        params.push(searchQuery, searchQuery, searchQuery);
      }
    }
    
    // If no search query, return empty array
    if (!whereClause) {
      return [];
    }
    
    // Modified query to join with parent nodes to get their content
    const sqlQuery = `
      SELECT 
        n.id, 
        n.content, 
        n.content_zh, 
        n.parent_id,
        n.is_expanded,
        n.has_markdown,
        n.position,
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count,
        p.content as parent_content,
        p.content_zh as parent_content_zh
      FROM 
        nodes n
      LEFT JOIN 
        nodes p ON n.parent_id = p.id
      ${whereClause}
      ORDER BY 
        n.content
      LIMIT 100
    `;
    
    const nodes = await db.all(sqlQuery, params);
    return nodes;
  } catch (error) {
    console.error('Error searching nodes:', error);
    return [];
  }
}

/**
 * Internal function to search markdown files
 */
async function searchMarkdownFilesInternal(req) {
  try {
    const query = req.query.q;
    const lang = req.query.lang || 'en';
    const advanced = req.query.advanced === 'true';
    
    // Minimum query length check
    if (!query || query.length < 2) {
      return [];
    }
    
    // Get database connection to fetch node info
    const db = req.db;
    
    // Check if markdown directory exists
    if (!fs.existsSync(markdownDir)) {
      return [];
    }
    
    // Get all markdown files
    const markdownFiles = fs.readdirSync(markdownDir)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        filename: file,
        nodeId: file.replace('.md', ''),
        filepath: path.join(markdownDir, file)
      }));
    
    const results = [];
    
    // Search through each markdown file
    for (const fileInfo of markdownFiles) {
      try {
        // Read file content
        const content = fs.readFileSync(fileInfo.filepath, 'utf8');
        
        // Skip empty files
        if (!content.trim()) {
          continue;
        }
        
        // Perform search based on mode
        let matches = false;
        let matchContext = '';
        
        if (advanced) {
          // Use advanced search logic similar to node search
          const searchResult = performAdvancedMarkdownSearch(content, query);
          matches = searchResult.matches;
          matchContext = searchResult.context;
        } else {
          // Simple case-insensitive search
          const lowerContent = content.toLowerCase();
          const lowerQuery = query.toLowerCase();
          matches = lowerContent.includes(lowerQuery);
          
          if (matches) {
            matchContext = extractMatchContext(content, query);
          }
        }
        
        if (matches) {
          // Get node information from database
          const node = await db.get('SELECT id, content, content_zh, parent_id FROM nodes WHERE id = ?', fileInfo.nodeId);
          
          if (node) {
            // Get node content based on language
            const nodeContent = lang === 'zh' ? (node.content_zh || node.content) : node.content;
            
            // Get parent info if exists
            let parentContent = null;
            if (node.parent_id) {
              const parent = await db.get('SELECT content, content_zh FROM nodes WHERE id = ?', node.parent_id);
              if (parent) {
                parentContent = lang === 'zh' ? (parent.content_zh || parent.content) : parent.content;
              }
            }
            
            results.push({
              id: node.id,
              type: 'markdown',
              nodeContent: nodeContent,
              markdownContent: content,
              matchContext: matchContext,
              parent_id: node.parent_id,
              parent_content: parentContent,
              filename: fileInfo.filename,
              contentLength: content.length
            });
          }
        }
      } catch (fileError) {
        console.warn(`Error reading markdown file ${fileInfo.filename}:`, fileError.message);
        continue;
      }
    }
    
    // Sort results by relevance
    results.sort((a, b) => {
      const scoreA = a.matchContext.length + (a.contentLength / 1000);
      const scoreB = b.matchContext.length + (b.contentLength / 1000);
      return scoreB - scoreA;
    });
    
    // Limit results to prevent overwhelming the UI
    return results.slice(0, 50);
  } catch (error) {
    console.error('Error searching markdown files:', error);
    return [];
  }
}

/**
 * Perform advanced search with logical operators on markdown content
 */
function performAdvancedMarkdownSearch(content, query) {
  // For now, implement basic search. You can enhance this later with the full advanced logic
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  const matches = lowerContent.includes(lowerQuery);
  const context = matches ? extractMatchContext(content, query) : '';
  
  return { matches, context };
}

/**
 * Extract context around a match for display
 */
function extractMatchContext(content, searchTerm, contextLength = 150) {
  const lowerContent = content.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  
  const matchIndex = lowerContent.indexOf(lowerTerm);
  if (matchIndex === -1) {
    return content.substring(0, Math.min(contextLength, content.length));
  }
  
  const start = Math.max(0, matchIndex - Math.floor(contextLength / 2));
  const end = Math.min(content.length, matchIndex + searchTerm.length + Math.floor(contextLength / 2));
  
  let context = content.substring(start, end);
  
  // Add ellipsis if we're not at the start or end
  if (start > 0) {
    context = '...' + context;
  }
  if (end < content.length) {
    context = context + '...';
  }
  
  return context;
}