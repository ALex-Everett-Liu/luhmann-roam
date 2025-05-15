// controllers/databaseExportImportController.js
const { getDb, populateSequenceIds } = require('../database');

/**
 * Export selected tables
 * POST /api/database/export
 */
exports.exportTables = async (req, res) => {
  try {
    const { tables } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: 'No tables specified for export' });
    }
    
    const db = await getDb();
    const exportData = {};
    
    // Start a transaction for consistent read
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Process each requested table
      for (const table of tables) {
        // Validate table name to prevent SQL injection
        const validTables = [
          'nodes', 'links', 'tasks', 'node_attributes', 
          'bookmarks', 'blog_pages', 'dcim_images', 
          'dcim_image_settings', 'dcim_directories', 'dev_test_entries'
        ];
        
        if (!validTables.includes(table)) {
          console.warn(`Invalid table name requested: ${table}`);
          continue;
        }
        
        // Fetch all records from the table
        const records = await db.all(`SELECT * FROM ${table}`);
        exportData[table] = records;
      }
      
      await db.run('COMMIT');
      
      // Add metadata to the export
      exportData.metadata = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        tableCount: Object.keys(exportData).length - 1, // Subtract metadata
        applicationName: 'Luhmann-Roam'
      };
      
      res.json(exportData);
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data: ' + error.message });
  }
};

/**
 * Import data
 * POST /api/database/import
 */
exports.importData = async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid import data' });
    }
    
    const { regenerateIds = true, conflictStrategy = 'replace' } = options;
    
    const db = await getDb();
    const result = {
      tablesImported: 0,
      recordsImported: 0,
      errors: []
    };
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Process each table in the import data
      for (const [tableName, records] of Object.entries(data)) {
        // Skip metadata
        if (tableName === 'metadata') continue;
        
        // Validate table name to prevent SQL injection
        const validTables = [
          'nodes', 'links', 'tasks', 'node_attributes', 
          'bookmarks', 'blog_pages', 'dcim_images', 
          'dcim_image_settings', 'dcim_directories', 'dev_test_entries'
        ];
        
        if (!validTables.includes(tableName)) {
          result.errors.push(`Invalid table name: ${tableName}`);
          continue;
        }
        
        if (!Array.isArray(records)) {
          result.errors.push(`Data for table ${tableName} is not an array`);
          continue;
        }
        
        // Process each record
        for (const record of records) {
          try {
            const recordData = { ...record };
            
            // Handle sequence_id based on options
            if (regenerateIds) {
              delete recordData.sequence_id;
            }
            
            // Check if record already exists
            const existingRecord = await db.get(
              `SELECT id FROM ${tableName} WHERE id = ?`, 
              recordData.id
            );
            
            if (existingRecord) {
              // Handle according to conflict strategy
              if (conflictStrategy === 'skip') {
                continue;
              } else if (conflictStrategy === 'replace') {
                await db.run(`DELETE FROM ${tableName} WHERE id = ?`, recordData.id);
              } 
              // For 'merge', we'll update the existing record
            }
            
            if (!existingRecord || conflictStrategy === 'replace') {
              // For new records or complete replacement
              // Build the insert statement dynamically
              const columns = Object.keys(recordData);
              const placeholders = columns.map(() => '?').join(',');
              const values = columns.map(col => recordData[col]);
              
              await db.run(
                `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`, 
                values
              );
            } else if (conflictStrategy === 'merge') {
              // Update existing record with new values
              const setClause = Object.keys(recordData)
                .filter(col => col !== 'id') // Don't update the ID
                .map(col => `${col} = ?`)
                .join(',');
              
              const values = Object.keys(recordData)
                .filter(col => col !== 'id')
                .map(col => recordData[col]);
              
              // Add the ID for the WHERE clause
              values.push(recordData.id);
              
              await db.run(
                `UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE id = ?`,
                [...values, Date.now(), recordData.id]
              );
            }
            
            result.recordsImported++;
          } catch (error) {
            result.errors.push(`Error importing record in ${tableName}: ${error.message}`);
          }
        }
        
        result.tablesImported++;
      }
      
      // If regenerating sequence IDs, update them after import
      if (regenerateIds) {
        await populateSequenceIds();
      }
      
      await db.run('COMMIT');
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data: ' + error.message });
  }
};

/**
 * List all available tables
 * GET /api/database/tables
 */
exports.listTables = async (req, res) => {
  try {
    const db = await getDb();
    
    // Query SQLite master table to get all table names
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    // Extract just the table names
    const tableNames = tables.map(table => table.name);
    
    res.json({ tables: tableNames });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ error: 'Failed to list database tables: ' + error.message });
  }
};

/**
 * Get table schema
 * GET /api/database/schema/:table
 */
exports.getTableSchema = async (req, res) => {
  try {
    const { table } = req.params;
    const db = await getDb();
    
    // Validate table name to prevent SQL injection
    const validTables = [
      'nodes', 'links', 'tasks', 'node_attributes', 
      'bookmarks', 'blog_pages', 'dcim_images', 
      'dcim_image_settings', 'dcim_directories', 'dev_test_entries'
    ];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    // Get table schema information
    const schema = await db.all(`PRAGMA table_info(${table})`);
    
    res.json({ table, schema });
  } catch (error) {
    console.error(`Error getting schema for table ${req.params.table}:`, error);
    res.status(500).json({ error: 'Failed to get table schema: ' + error.message });
  }
};