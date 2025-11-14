const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Create a database connection
async function getDb(vaultName) {
  const dbName = vaultName || global.currentVault || 'main';
  const dbPath = dbName === 'main'
    ? path.join(__dirname, 'outliner.db')
    : path.join(__dirname, 'vaults', `${dbName}.db`);

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Initialize database
async function initializeDatabase(vaultName) {
  const db = await getDb(vaultName);

  // Check if the database already has tables instead of using a global flag
  try {
    // Try to query the nodes table to see if it exists
    await db.get('SELECT count(*) as count FROM sqlite_master WHERE type="table" AND name="nodes"');

    // If we get here, the database already has tables
    console.log(`Database ${vaultName} already initialized, checking tables...`);
  } catch (error) {
    // If we get an error, the database doesn't have tables yet
    console.log(`Initializing database for vault: ${vaultName}`);
  }

  // Always proceed with ensuring all tables exist (won't harm if they already do)

  // Create nodes table (minimal version - removed has_markdown and node_size fields)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      content TEXT,
      content_zh TEXT,
      parent_id TEXT,
      position INTEGER,
      is_expanded BOOLEAN DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (parent_id) REFERENCES nodes (id)
    )
  `);

  // Create links table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (from_node_id) REFERENCES nodes (id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES nodes (id) ON DELETE CASCADE
    )
  `);

  // Add sequence_id column to nodes table
  try {
    await db.exec(`ALTER TABLE nodes ADD COLUMN sequence_id INTEGER;`);
    console.log('Added sequence_id column to nodes table');

    // Create an index on the new column for better query performance
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_sequence_id ON nodes(sequence_id);`);
  } catch (error) {
    console.log('sequence_id column or index already exists or other error:', error.message);
  }

  console.log(`Database for vault: ${vaultName} initialized`);

  return db;
}

// Add this function after the existing functions in database.js
async function migrateCodeMethodCallsTable(vaultName = 'default') {
  try {
    const db = await getDb(vaultName);
    console.log(`Migrating code_method_calls table for vault: ${vaultName}`);

    // Check if expression_type column exists
    const tableInfo = await db.all("PRAGMA table_info(code_method_calls)");
    const columnNames = tableInfo.map(col => col.name);

    console.log('Existing columns:', columnNames);

    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'expression_type', definition: 'TEXT' },
      { name: 'parameters_used', definition: 'TEXT' },
      { name: 'external_dependencies', definition: 'TEXT' },
      { name: 'builtin_dependencies', definition: 'TEXT' },
      { name: 'sequence_id', definition: 'INTEGER' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        await db.exec(`ALTER TABLE code_method_calls ADD COLUMN ${column.name} ${column.definition}`);
      }
    }

    console.log(`Migration completed for vault: ${vaultName}`);
    return true;
  } catch (error) {
    console.error(`Error migrating vault ${vaultName}:`, error);
    return false;
  }
}

module.exports = { getDb, initializeDatabase, migrateCodeMethodCallsTable };