// devTestService.js - Service for dev test panel operations
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

/**
 * Initialize the dev test database table
 */
exports.initializeDevTestTable = async function() {
  try {
    const db = await getDb();
    
    // Create dev_test_entries table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS dev_test_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        status TEXT DEFAULT 'pending',
        test_data TEXT,
        test_result TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        sequence_id INTEGER
      )
    `);
    
    // Create trigger for auto-assigning sequence IDs
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS assign_sequence_id_dev_test_entries
      AFTER INSERT ON dev_test_entries
      FOR EACH ROW
      WHEN NEW.sequence_id IS NULL
      BEGIN
        UPDATE dev_test_entries 
        SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM dev_test_entries)
        WHERE id = NEW.id;
      END;
    `);
    
    // Create index for performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dev_test_entries_type_category 
      ON dev_test_entries(type, category);
    `);
    
    console.log('Dev test entries table initialized');
    return true;
  } catch (error) {
    console.error('Error initializing dev test table:', error);
    return false;
  }
};

/**
 * Get all dev test entries with optional filtering by type and category
 */
exports.getDevTestEntries = async function(type = null, category = null) {
  try {
    const db = await getDb();
    
    let query = 'SELECT * FROM dev_test_entries';
    const params = [];
    
    if (type || category) {
      query += ' WHERE';
      
      if (type) {
        query += ' type = ?';
        params.push(type);
      }
      
      if (type && category) {
        query += ' AND';
      }
      
      if (category) {
        query += ' category = ?';
        params.push(category);
      }
    }
    
    query += ' ORDER BY category, type, name';
    
    return await db.all(query, params);
  } catch (error) {
    console.error('Error getting dev test entries:', error);
    throw error;
  }
};

/**
 * Create a new dev test entry
 */
exports.createDevTestEntry = async function(entryData) {
  try {
    const db = await getDb();
    const { type, name, description, category, test_data } = entryData;
    
    if (!type || !name) {
      throw new Error('Type and name are required fields');
    }
    
    const id = require('crypto').randomUUID();
    const now = Date.now();
    
    await db.run(
      `INSERT INTO dev_test_entries 
       (id, type, name, description, category, test_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, name, description || null, category || null, test_data || null, now, now]
    );
    
    return await db.get('SELECT * FROM dev_test_entries WHERE id = ?', id);
  } catch (error) {
    console.error('Error creating dev test entry:', error);
    throw error;
  }
};

/**
 * Update a dev test entry
 */
exports.updateDevTestEntry = async function(id, entryData) {
  try {
    const db = await getDb();
    const now = Date.now();
    
    // Build update query dynamically based on provided fields
    const allowedFields = ['type', 'name', 'description', 'category', 'status', 'test_data', 'test_result'];
    const updates = [];
    const params = [];
    
    allowedFields.forEach(field => {
      if (entryData[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(entryData[field]);
      }
    });
    
    if (updates.length === 0) {
      throw new Error('No valid fields provided for update');
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    params.push(id); // For WHERE clause
    
    await db.run(
      `UPDATE dev_test_entries SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    return await db.get('SELECT * FROM dev_test_entries WHERE id = ?', id);
  } catch (error) {
    console.error('Error updating dev test entry:', error);
    throw error;
  }
};

/**
 * Delete a dev test entry
 */
exports.deleteDevTestEntry = async function(id) {
  try {
    const db = await getDb();
    await db.run('DELETE FROM dev_test_entries WHERE id = ?', id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting dev test entry:', error);
    throw error;
  }
};

/**
 * Run a test against a function or API and record the result
 */
exports.runTest = async function(id, testData = null) {
  try {
    const db = await getDb();
    const entry = await db.get('SELECT * FROM dev_test_entries WHERE id = ?', id);
    
    if (!entry) {
      throw new Error('Test entry not found');
    }
    
    // Use provided testData or the stored test_data
    const dataToTest = testData || JSON.parse(entry.test_data || '{}');
    
    let result;
    let status = 'failed';
    
    try {
      // Run the test based on the entry type
      switch (entry.type) {
        case 'function':
          // For functions, we'd need to implement a way to run them safely
          result = { message: 'Function testing not fully implemented' };
          status = 'pending';
          break;
          
        case 'api':
          // For APIs we can use fetch or axios to test endpoints
          // This is a placeholder, real implementation would need more context
          result = { message: 'API testing not fully implemented' };
          status = 'pending';
          break;
          
        default:
          result = { error: 'Unknown test type' };
      }
      
      // Update the test entry with results
      await db.run(
        'UPDATE dev_test_entries SET test_result = ?, status = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(result), status, Date.now(), id]
      );
      
      return { 
        id, 
        status,
        result,
        success: true
      };
    } catch (testError) {
      // Test execution failed
      const errorResult = { 
        error: testError.message,
        stack: testError.stack
      };
      
      await db.run(
        'UPDATE dev_test_entries SET test_result = ?, status = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(errorResult), 'error', Date.now(), id]
      );
      
      return {
        id,
        status: 'error',
        result: errorResult,
        success: false
      };
    }
  } catch (error) {
    console.error('Error running test:', error);
    throw error;
  }
};

/**
 * Get statistics about code structure
 */
exports.getCodeStatistics = async function() {
  // This is a simplified version that could be expanded
  const baseDir = path.join(__dirname, '..');
  
  try {
    // Get list of JavaScript files
    const jsFiles = await findFiles(baseDir, '.js');
    
    // Analyze files
    let totalFunctions = 0;
    let totalVariables = 0;
    let totalLOC = 0;
    
    const fileStats = [];
    
    for (const file of jsFiles) {
      const content = await fs.promises.readFile(file, 'utf8');
      const relativePath = path.relative(baseDir, file);
      
      // Simple analysis (could be more sophisticated)
      const functionMatches = content.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
      const arrowFunctions = content.match(/=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g) || [];
      const variables = content.match(/(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g) || [];
      const lines = content.split('\n').length;
      
      const fileStat = {
        path: relativePath,
        functions: functionMatches.length + arrowFunctions.length,
        variables: variables.length,
        lines: lines
      };
      
      totalFunctions += fileStat.functions;
      totalVariables += fileStat.variables;
      totalLOC += lines;
      
      fileStats.push(fileStat);
    }
    
    return {
      totalFiles: fileStats.length,
      totalFunctions,
      totalVariables,
      totalLOC,
      files: fileStats
    };
  } catch (error) {
    console.error('Error getting code statistics:', error);
    throw error;
  }
};

/**
 * Helper function to find files recursively
 */
async function findFiles(dir, ext) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    // Process each file
    const files = await Promise.all(entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and .git directories
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          return [];
        }
        return findFiles(fullPath, ext);
      } else if (entry.name.endsWith(ext)) {
        return [fullPath];
      }
      return [];
    }));
    
    return files.flat();
  } catch (error) {
    console.error(`Error searching directory ${dir}:`, error);
    return [];
  }
}