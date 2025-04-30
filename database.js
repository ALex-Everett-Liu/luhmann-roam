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
      node_size INTEGER DEFAULT 20,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (parent_id) REFERENCES nodes (id)
    )
  `);

    // Add node_size column to existing tables if it doesn't exist
    try {
      await db.exec(`ALTER TABLE nodes ADD COLUMN node_size INTEGER DEFAULT 20`);
      console.log('Added node_size column to nodes table');
    } catch (error) {
      // Column likely already exists, which is fine
      console.log('node_size column already exists or other error:', error.message);
    }
  
  // Create links table
  await db.exec(`    CREATE TABLE IF NOT EXISTS links (
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
  
  // Create node_attributes table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS node_attributes (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE,
      UNIQUE(node_id, key)
    )
  `);
  
  // Create bookmarks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      title TEXT,
      added_at INTEGER,
      created_at INTEGER,
      FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
    )
  `);
  
  // Create blog_pages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      template_id TEXT,
      title TEXT,
      slug TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);
  
  // Create dcim_images table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dcim_images (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT,
      file_size INTEGER,
      rating INTEGER,
      ranking REAL,
      tags TEXT,
      creation_time INTEGER,
      person TEXT,
      location TEXT, 
      type TEXT,
      thumbnail_path TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
  
  // Create dcim_image_settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dcim_image_settings (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (image_id) REFERENCES dcim_images (id) ON DELETE CASCADE
    )
  `);
  
  // Create dcim_directories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dcim_directories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
  
  // Add file_path column to dcim_images table if it doesn't exist
  try {
    await db.exec(`ALTER TABLE dcim_images ADD COLUMN file_path TEXT`);
    console.log('Added file_path column to dcim_images table');
  } catch (error) {
    // Column likely already exists, which is fine
    console.log('file_path column already exists or other error:', error.message);
  }
  
  console.log('Database initialized');
  return db;
}

/**
 * Updates the dcim_images table to change ranking column from INTEGER to REAL
 * @returns {Promise<boolean>} Success status
 */
async function updateDcimImagesRankingToReal() {
  console.log('Running migration: Convert dcim_images.ranking from INTEGER to REAL');
  const db = await getDb();
  
  try {
    // Start a transaction for safety
    await db.run('BEGIN TRANSACTION');
    
    // 1. Create a new table with the correct schema
    await db.run(`
      CREATE TABLE IF NOT EXISTS dcim_images_new (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        url TEXT,
        file_path TEXT,
        file_size INTEGER,
        rating INTEGER,
        ranking REAL,
        tags TEXT,
        creation_time INTEGER,
        person TEXT,
        location TEXT, 
        type TEXT,
        thumbnail_path TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);
    
    // 2. Copy data from the old table to the new one
    await db.run(`
      INSERT INTO dcim_images_new
      SELECT id, filename, url, file_path, file_size, rating, CAST(ranking AS REAL), 
             tags, creation_time, person, location, type, thumbnail_path, created_at, updated_at
      FROM dcim_images
    `);
    
    // 3. Drop the old table
    await db.run('DROP TABLE dcim_images');
    
    // 4. Rename the new table to the original name
    await db.run('ALTER TABLE dcim_images_new RENAME TO dcim_images');
    
    // Commit the transaction
    await db.run('COMMIT');
    
    console.log('Successfully converted dcim_images.ranking from INTEGER to REAL');
    return true;
  } catch (error) {
    // Rollback in case of error
    await db.run('ROLLBACK');
    console.error('Error converting dcim_images.ranking to REAL:', error);
    return false;
  }
}

module.exports = { getDb, initializeDatabase, updateDcimImagesRankingToReal }; 
