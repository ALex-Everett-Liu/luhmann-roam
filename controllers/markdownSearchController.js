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
 * Perform advanced search with logical operators on markdown content
 * @param {string} content - The markdown content to search
 * @param {string} query - The search query with operators
 * @returns {Object} Object with matches boolean and context string
 */
function performAdvancedMarkdownSearch(content, query) {
  // Parse the advanced query similar to node search
  const { searchTerms, operators } = parseAdvancedMarkdownQuery(query);
  
  if (searchTerms.length === 0) {
    return { matches: false, context: '' };
  }
  
  // Evaluate each term
  const termResults = [];
  const contexts = [];
  
  for (const term of searchTerms) {
    let termMatch = false;
    let termContext = '';
    
    const lowerContent = content.toLowerCase();
    
    if (term.type === 'phrase') {
      // Exact phrase search
      termMatch = lowerContent.includes(term.value.toLowerCase());
      if (termMatch) {
        termContext = extractMatchContext(content, term.value);
      }
    } else if (term.type === 'whole') {
      // Whole word search using regex
      const regex = new RegExp(`\\b${term.value}\\b`, 'gi');
      termMatch = regex.test(content);
      if (termMatch) {
        termContext = extractMatchContext(content, term.value);
      }
    } else if (term.type === 'wildcard') {
      // Wildcard search (prefix)
      const regex = new RegExp(`\\b${term.value}\\w*`, 'gi');
      termMatch = regex.test(content);
      if (termMatch) {
        termContext = extractMatchContext(content, term.value);
      }
    } else {
      // Normal substring search
      termMatch = lowerContent.includes(term.value.toLowerCase());
      if (termMatch) {
        termContext = extractMatchContext(content, term.value);
      }
    }
    
    termResults.push(termMatch);
    if (termContext) {
      contexts.push(termContext);
    }
  }
  
  // Evaluate the logical expression
  let finalResult = termResults[0] || false;
  
  for (let i = 1; i < termResults.length && i - 1 < operators.length; i++) {
    const operator = operators[i - 1];
    const currentResult = termResults[i];
    
    if (operator === 'AND') {
      finalResult = finalResult && currentResult;
    } else if (operator === 'OR') {
      finalResult = finalResult || currentResult;
    } else if (operator === 'NOT') {
      finalResult = finalResult && !currentResult;
    }
  }
  
  return {
    matches: finalResult,
    context: contexts.join(' ... ')
  };
}

/**
 * Parse advanced search query for markdown search
 * @param {string} query - The search query
 * @returns {Object} Object with searchTerms array and operators array
 */
function parseAdvancedMarkdownQuery(query) {
  const searchTerms = [];
  const operators = [];
  
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
  
  // Split by logical operators and preserve operator information
  const parts = [];
  
  // Handle AND operator
  tokenizedQuery.split(/\bAND\b/).forEach((andPart, index) => {
    if (index > 0) operators.push('AND');
    
    // Handle OR operator within AND blocks
    const orParts = andPart.split(/\bOR\b/);
    if (orParts.length > 1) {
      orParts.forEach((orPart, orIndex) => {
        if (orIndex > 0) operators.push('OR');
        
        // Handle NOT operator
        const notParts = orPart.split(/\bNOT\b/);
        if (notParts.length > 1) {
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
        notParts.forEach((notPart, notIndex) => {
          if (notIndex > 0) operators.push('NOT');
          parts.push(notPart.trim());
        });
      } else {
        parts.push(andPart.trim());
      }
    }
  });
  
  // Clean up the parts and restore tokens
  const cleanParts = parts.filter(part => part.trim() !== '');
  
  for (const part of cleanParts) {
    let processedPart = part;
    
    // Restore tokens
    for (let j = 0; j < tokens.length; j++) {
      const tokenKey = `__TOKEN${j}__`;
      if (processedPart.includes(tokenKey)) {
        const token = tokens[j];
        searchTerms.push(token);
        continue;
      }
    }
    
    // Check if this part contains a token key
    if (!processedPart.includes('__TOKEN')) {
      if (processedPart.startsWith('w:')) {
        // Whole word search
        const word = processedPart.substring(2);
        searchTerms.push({ type: 'whole', value: word });
      } else {
        // Normal search term
        searchTerms.push({ type: 'normal', value: processedPart });
      }
    }
  }
  
  return { searchTerms, operators };
}

/**
 * Extract context around a match for display
 * @param {string} content - The full content
 * @param {string} searchTerm - The term that was matched
 * @param {number} contextLength - Number of characters to include around the match
 * @returns {string} Context string with highlighted match
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
    
    // Import node controller for node search
    const nodeController = require('./nodeController');
    
    // Create mock response objects for internal calls
    const mockNodeRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ status: code, data }) })
    };
    
    const mockMarkdownRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ status: code, data }) })
    };
    
    // Get node search results
    const nodeReq = { ...req, query: { q: query, lang, advanced: advanced.toString() } };
    const nodeResults = await nodeController.searchNodes(nodeReq, mockNodeRes);
    
    // Get markdown search results
    const markdownReq = { ...req, query: { q: query, lang, advanced: advanced.toString() } };
    const markdownResults = await exports.searchMarkdownFiles(markdownReq, mockMarkdownRes);
    
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