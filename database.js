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
  
  console.log('Database initialized');
  return db;
}

module.exports = { getDb, initializeDatabase }; 