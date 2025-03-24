// codeAnalysisService.js - Service for code analysis operations
const fs = require('fs');
const path = require('path');

/**
 * Analyzes the entire codebase
 * @returns {Object} Code structure analysis
 */
exports.analyzeCodebase = async function() {
  const structure = {
    modules: {},
    functionCount: 0,
    variableCount: 0,
    relationships: []
  };
  
  try {
    // Get list of all JavaScript files
    const jsFiles = await getJavaScriptFiles();
    
    // Process each file
    for (const file of jsFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const fileStructure = parseJavaScriptFile(content, file);
        structure.modules[file] = fileStructure;
        structure.functionCount += fileStructure.functions.length;
        structure.variableCount += fileStructure.variables.length;
        
        // Add relationships
        fileStructure.imports.forEach(importItem => {
          structure.relationships.push({
            from: file,
            to: importItem,
            type: 'import'
          });
        });
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
        // Continue with next file instead of failing completely
      }
    }
    
    return structure;
  } catch (error) {
    console.error('Error in analyzeCodebase:', error);
    // Return a valid structure even on error
    return structure;
  }
};

/**
 * Gets all JavaScript files in the application
 * @returns {string[]} Array of file paths
 */
async function getJavaScriptFiles() {
  try {
    const baseDir = path.join(__dirname, '..', 'public/js');
    const serverFiles = [
      path.join(__dirname, '..', 'server.js'),
      path.join(__dirname, '..', 'database.js')
    ];
    
    // Make sure directories exist before trying to read them
    if (!fs.existsSync(baseDir)) {
      console.warn(`Directory ${baseDir} does not exist`);
      return serverFiles; // Just return server files if public/js doesn't exist
    }
    
    const clientFiles = await findFiles(baseDir, '.js');
    return [...serverFiles, ...clientFiles];
  } catch (error) {
    console.error('Error getting JavaScript files:', error);
    return []; // Return empty array on error
  }
}

/**
 * Recursively finds files with a specific extension
 * @param {string} dir - Directory to search
 * @param {string} ext - File extension to look for
 * @returns {string[]} Array of file paths
 */
async function findFiles(dir, ext) {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  const result = [];
  
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      const nestedFiles = await findFiles(res, ext);
      result.push(...nestedFiles);
    } else if (file.name.endsWith(ext)) {
      result.push(res);
    }
  }
  
  return result;
}

/**
 * Parses a JavaScript file to extract its structure
 * @param {string} content - File content
 * @param {string} filename - File path
 * @returns {Object} Structure of the JavaScript file
 */
function parseJavaScriptFile(content, filename) {
  const functions = [];
  const variables = [];
  const imports = [];
  
  // Find function declarations
  const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push({
      name: match[1],
      position: match.index
    });
  }
  
  // Find arrow functions assigned to variables
  const arrowFuncPattern = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
  while ((match = arrowFuncPattern.exec(content)) !== null) {
    functions.push({
      name: match[1],
      position: match.index,
      type: 'arrow'
    });
  }
  
  // Find variable declarations
  const varPattern = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
  while ((match = varPattern.exec(content)) !== null) {
    variables.push({
      name: match[1],
      position: match.index
    });
  }
  
  // Find requires (Node.js imports)
  const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = requirePattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return {
    functions,
    variables,
    imports,
    complexity: calculateComplexity(content),
    loc: content.split('\n').length
  };
}

/**
 * Calculates code complexity
 * @param {string} content - File content
 * @returns {number} Complexity score
 */
function calculateComplexity(content) {
  // Simple complexity metric based on conditional statements, loops and functions
  let complexity = 0;
  
  // Count conditional statements
  const ifCount = (content.match(/if\s*\(/g) || []).length;
  const switchCount = (content.match(/switch\s*\(/g) || []).length;
  
  // Count loops
  const forCount = (content.match(/for\s*\(/g) || []).length;
  const whileCount = (content.match(/while\s*\(/g) || []).length;
  
  // Count function declarations
  const functionCount = (content.match(/function\s+/g) || []).length;
  
  // Weighted sum
  complexity = ifCount + switchCount * 2 + forCount + whileCount + functionCount * 0.5;
  
  return complexity;
}