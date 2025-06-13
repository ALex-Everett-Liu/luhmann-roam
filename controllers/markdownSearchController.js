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
          // Get node information from database including timestamps
          const node = await db.get('SELECT id, content, content_zh, parent_id, created_at, updated_at FROM nodes WHERE id = ?', fileInfo.nodeId);
          
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
              contentLength: content.length,
              created_at: node.created_at,
              updated_at: node.updated_at
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
        // Use the proper advanced search logic from nodeController
        const contentField = lang === 'zh' ? 'content_zh' : 'content';
        const { clause, queryParams } = parseAdvancedQuery(query, contentField);
        
        whereClause = `WHERE ${clause}`;
        params.push(...queryParams);
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
    
    // Modified query to include timestamps and join with parent nodes to get their content
    const sqlQuery = `
      SELECT 
        n.id, 
        n.content, 
        n.content_zh, 
        n.parent_id,
        n.is_expanded,
        n.has_markdown,
        n.position,
        n.created_at,
        n.updated_at,
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
 * Parse advanced search query with logical operators
 * @param {string} query - The query string with logical operators
 * @param {string} contentField - The field to search in ('content' or 'content_zh')
 * @returns {Object} Object with clause and queryParams
 */
function parseAdvancedQuery(query, contentField) {
  // Regular expressions for parsing
  const quotedPhraseRegex = /"(.*?)"/g;
  const wholeWordRegex = /w:(\w+)/g;
  const wildcardRegex = /(\w+)\*/g;
  
  // Replace tokens to preserve them during parsing
  let tokenizedQuery = query;
  const tokens = [];
  let tokenIndex = 0;
  
  // Save quoted phrases as tokens
  let match;
  while ((match = quotedPhraseRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'phrase', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Save whole word searches as tokens
  while ((match = wholeWordRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'whole', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Save wildcard searches as tokens
  while ((match = wildcardRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'wildcard', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Split by logical operators
  const parts = [];
  const operators = [];
  
  // Handle AND operator
  tokenizedQuery.split(/\bAND\b/).forEach((andPart, index) => {
    if (index > 0) operators.push('AND');
    
    // Handle OR operator within AND blocks
    const orParts = andPart.split(/\bOR\b/);
    if (orParts.length > 1) {
      // This is an OR block
      orParts.forEach((orPart, orIndex) => {
        if (orIndex > 0) operators.push('OR');
        
        // Handle NOT operator
        const notParts = orPart.split(/\bNOT\b/);
        if (notParts.length > 1) {
          // This has a NOT clause
          notParts.forEach((notPart, notIndex) => {
            if (notIndex > 0) operators.push('NOT');
            parts.push(notPart.trim());
          });
        } else {
          parts.push(orPart.trim());
        }
      });
    } else {
      // Handle NOT operator in a non-OR block
      const notParts = andPart.split(/\bNOT\b/);
      if (notParts.length > 1) {
        // This has a NOT clause
        notParts.forEach((notPart, notIndex) => {
          if (notIndex > 0) operators.push('NOT');
          parts.push(notPart.trim());
        });
      } else {
        parts.push(andPart.trim());
      }
    }
  });
  
  // Clean up the parts to remove empty entries
  const cleanParts = parts.filter(part => part.trim() !== '');
  
  // Build the SQL clause
  let clause = '';
  const queryParams = [];
  
  for (let i = 0; i < cleanParts.length; i++) {
    let part = cleanParts[i];
    
    // Restore tokens
    for (let j = 0; j < tokens.length; j++) {
      const tokenKey = `__TOKEN${j}__`;
      if (part.includes(tokenKey)) {
        const token = tokens[j];
        part = part.replace(tokenKey, token.value);
      }
    }
    
    let partClause = '';
    
    // Check if this part is a token
    const tokenMatch = part.match(/__TOKEN(\d+)__/);
    if (tokenMatch) {
      const tokenId = parseInt(tokenMatch[1]);
      const token = tokens[tokenId];
      
      if (token.type === 'phrase') {
        // Exact phrase search
        partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        queryParams.push(`%${token.value}%`, `%${token.value}%`, `%${token.value}%`);
      } else if (token.type === 'whole') {
        // Whole word search using word boundaries in LIKE
        partClause = `(n.${contentField} REGEXP ? OR n.content REGEXP ? OR n.content_zh REGEXP ?)`;
        queryParams.push(`\\b${token.value}\\b`, `\\b${token.value}\\b`, `\\b${token.value}\\b`);
      } else if (token.type === 'wildcard') {
        // Wildcard search (prefix search)
        partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        queryParams.push(`${token.value}%`, `${token.value}%`, `${token.value}%`);
      }
    } else if (part.startsWith('w:')) {
      // Whole word search
      const word = part.substring(2);
      partClause = `(n.${contentField} REGEXP ? OR n.content REGEXP ? OR n.content_zh REGEXP ?)`;
      queryParams.push(`\\b${word}\\b`, `\\b${word}\\b`, `\\b${word}\\b`);
    } else {
      // Normal substring search
      partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
      queryParams.push(`%${part}%`, `%${part}%`, `%${part}%`);
    }
    
    // Add the operator
    if (i === 0) {
      clause = partClause;
    } else {
      const operator = operators[i - 1];
      if (operator === 'AND') {
        clause = `${clause} AND ${partClause}`;
      } else if (operator === 'OR') {
        clause = `${clause} OR ${partClause}`;
      } else if (operator === 'NOT') {
        clause = `${clause} AND NOT ${partClause}`;
      }
    }
  }
  
  return { clause, queryParams };
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
          // Get node information from database including timestamps
          const node = await db.get('SELECT id, content, content_zh, parent_id, created_at, updated_at FROM nodes WHERE id = ?', fileInfo.nodeId);
          
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
            
            // Get file stats for timestamps if not available from database
            let created_at = node.created_at;
            let updated_at = node.updated_at;
            
            if (!created_at || !updated_at) {
              try {
                const stats = fs.statSync(fileInfo.filepath);
                if (!created_at) {
                  // birthtime is creation time, but may not be available on all systems
                  // fallback to ctime (status change time) if birthtime is not available
                  created_at = stats.birthtime.getTime() || stats.ctime.getTime();
                }
                if (!updated_at) {
                  // mtime is modification time
                  updated_at = stats.mtime.getTime();
                }
              } catch (statsError) {
                console.warn(`Error getting file stats for ${fileInfo.filename}:`, statsError.message);
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
              contentLength: content.length,
              created_at: created_at,
              updated_at: updated_at
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