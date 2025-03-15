const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Create a database connection
async function getDb() {
  return open({
    filename: path.join(__dirname, 'outliner.db'),
    driver: sqlite3.Database
  });
}

// Initialize database
async function initializeDatabase() {
  const db = await getDb();
  
  // Create nodes table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      content TEXT,
      content_zh TEXT,
      parent_id TEXT,
      position INTEGER,
      is_expanded BOOLEAN DEFAULT 1,
      has_markdown BOOLEAN DEFAULT 0,
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
  
  // Create tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time INTEGER,
      total_duration INTEGER DEFAULT 0,
      is_completed BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
  
  console.log('Database initialized');
  return db;
}

module.exports = { getDb, initializeDatabase }; 