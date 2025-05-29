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

  // Add parent_id column to dcim_images table for subsidiary images
  try {
    await db.exec(`ALTER TABLE dcim_images ADD COLUMN parent_id TEXT`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_parent_id ON dcim_images(parent_id)`);
    console.log('Added parent_id column to dcim_images table');
  } catch (error) {
    // Column likely already exists, which is fine
    console.log('parent_id column already exists or other error:', error.message);
  }

// Create metro_stations table
await db.exec(`
  CREATE TABLE IF NOT EXISTS metro_stations (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    x REAL,
    y REAL,
    interchange BOOLEAN DEFAULT 0,
    terminal BOOLEAN DEFAULT 0,
    description TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    sequence_id INTEGER,
    FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
  )
`);

// Add transit_type column to metro_stations table if it doesn't exist
try {
  await db.exec(`ALTER TABLE metro_stations ADD COLUMN transit_type TEXT DEFAULT 'metro'`);
  console.log('Added transit_type column to metro_stations table');
} catch (error) {
  // Column likely already exists, which is fine
  console.log('transit_type column already exists in metro_stations or other error:', error.message);
}

// Add city column to metro_stations table if it doesn't exist
try {
  await db.exec(`ALTER TABLE metro_stations ADD COLUMN city TEXT DEFAULT ''`);
  console.log('Added city column to metro_stations table');
} catch (error) {
  // Column likely already exists, which is fine
  console.log('city column already exists in metro_stations or other error:', error.message);
}

// Create metro_lines table
await db.exec(`
  CREATE TABLE IF NOT EXISTS metro_lines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    stations TEXT,
    curved BOOLEAN DEFAULT 0,
    description TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    sequence_id INTEGER
  )
`);

// Add transit_type column to metro_lines table if it doesn't exist
try {
  await db.exec(`ALTER TABLE metro_lines ADD COLUMN transit_type TEXT DEFAULT 'metro'`);
  console.log('Added transit_type column to metro_lines table');
} catch (error) {
  // Column likely already exists, which is fine
  console.log('transit_type column already exists in metro_lines or other error:', error.message);
}

// Add city column to metro_lines table if it doesn't exist
try {
  await db.exec(`ALTER TABLE metro_lines ADD COLUMN city TEXT DEFAULT ''`);
  console.log('Added city column to metro_lines table');
} catch (error) {
  // Column likely already exists, which is fine
  console.log('city column already exists in metro_lines or other error:', error.message);
}

  // Add indices for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_metro_stations_node_id ON metro_stations(node_id);
    CREATE INDEX IF NOT EXISTS idx_metro_stations_sequence_id ON metro_stations(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_metro_lines_sequence_id ON metro_lines(sequence_id);
  `);

  // Add city indices to metro tables
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_metro_stations_city ON metro_stations(city);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_metro_lines_city ON metro_lines(city);`);
    console.log('Added city indices to metro tables');
  } catch (error) {
    console.log('City indices may already exist:', error.message);
  }

  // Add triggers for auto-assigning sequence IDs
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS assign_sequence_id_metro_stations
    AFTER INSERT ON metro_stations
    FOR EACH ROW
    WHEN NEW.sequence_id IS NULL
    BEGIN
      UPDATE metro_stations 
      SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM metro_stations)
      WHERE id = NEW.id;
    END;
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS assign_sequence_id_metro_lines
    AFTER INSERT ON metro_lines
    FOR EACH ROW
    WHEN NEW.sequence_id IS NULL
    BEGIN
      UPDATE metro_lines 
      SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM metro_lines)
      WHERE id = NEW.id;
    END;
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
  
  // Create triggers for auto-assigning sequence IDs in all tables
  try {
    const tables = [
      'nodes',
      'links', 
      'node_attributes',
      'tasks',
      'bookmarks',
      'blog_pages',
      'dcim_images'
    ];
    
    for (const table of tables) {
      await db.exec(`
        CREATE TRIGGER IF NOT EXISTS assign_sequence_id_${table}
        AFTER INSERT ON ${table}
        FOR EACH ROW
        WHEN NEW.sequence_id IS NULL
        BEGIN
          UPDATE ${table} 
          SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM ${table})
          WHERE id = NEW.id;
        END;
      `);
      console.log(`Created trigger for auto-assigning sequence IDs in ${table}`);
    }
  } catch (error) {
    console.log('Some triggers might already exist:', error.message);
  }
  
  // Create compound indices for common query patterns
  try {
    // Index for fast retrieval of children ordered by position
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_parent_position 
      ON nodes(parent_id, position);
    `);
    
    // Index for timestamp-based queries with sequence ID
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_created_sequence 
      ON nodes(created_at, sequence_id);
    `);
    
    console.log('Created compound indices for improved performance');
  } catch (error) {
    console.log('Some indices may already exist:', error.message);
  }
  
  // Add sequence_id columns to all tables
  try {
    // Tables that need sequence_id columns
    const tables = [
      'links',
      'node_attributes',
      'tasks',
      'bookmarks',
      'blog_pages',
      'dcim_images'
    ];
    
    for (const table of tables) {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN sequence_id INTEGER;`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_sequence_id ON ${table}(sequence_id);`);
      console.log(`Added sequence_id column and index to ${table} table`);
    }
  } catch (error) {
    console.log('Some sequence_id columns might already exist:', error.message);
  }
  
  // Add compound indices for better performance on each table
  try {
    // Nodes table (you already have these)
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_parent_position 
      ON nodes(parent_id, position);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_created_sequence 
      ON nodes(created_at, sequence_id);
      'dcim_images'
    `);
    
    // Links table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_links_from_to 
      ON links(from_node_id, to_node_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_links_created_sequence 
      ON links(created_at, sequence_id);
    `);
    
    // Node attributes table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_node_attributes_node_key 
      ON node_attributes(node_id, key);
    `);
    
    // Tasks table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_date_completed 
      ON tasks(date, is_completed);
    `);
    
    // Bookmarks table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_added_sequence 
      ON bookmarks(added_at, sequence_id);
    `);
    
    // Blog pages table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_blog_pages_node 
      ON blog_pages(node_id);
    `);
    
    // DCIM images table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dcim_images_creation_sequence 
      ON dcim_images(creation_time, sequence_id);
    `);
    
    console.log('Created compound indices for improved performance on all tables');
  } catch (error) {
    console.log('Some indices may already exist:', error.message);
  }

  // Add variable-specific columns to dev_test_entries table
  try {
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
        
        /* Variable-specific fields */
        variable_value TEXT,
        variable_method TEXT,
        variable_params TEXT,
        variable_source_file TEXT,
        variable_line_number INTEGER,
        
        created_at INTEGER,
        updated_at INTEGER,
        sequence_id INTEGER
      )
    `);
    console.log('Added variable-specific columns to dev_test_entries table');
  } catch (error) {
    // Columns likely already exist, which is fine
    console.log('Variable-specific columns may already exist or other error:', error.message);
  }
  
  // Create word_groups table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS word_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER
    )
  `);
  
  // Create word_group_items table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS word_group_items (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      word TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES word_groups (id) ON DELETE CASCADE,
      UNIQUE(group_id, word)
    )
  `);
  
  // Add indices for word groups
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_word_group_items_group_id ON word_group_items(group_id);
    CREATE INDEX IF NOT EXISTS idx_word_group_items_word ON word_group_items(word);
    CREATE INDEX IF NOT EXISTS idx_word_groups_name ON word_groups(name);
  `);
  
  console.log(`Database for vault: ${vaultName} initialized`);
  return db;
}

async function populateSequenceIds() {
  const db = await getDb();
  
  // Start a transaction for consistency
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Tables that need sequence IDs
    const tables = [
      'nodes',
      'links', 
      'node_attributes',
      'tasks',
      'bookmarks',
      'blog_pages',
    ];
    
    // Process each table
    for (const table of tables) {
      // First check if we need to populate sequence IDs for this table
      const unpopulatedCount = await db.get(
        `SELECT COUNT(*) as count FROM ${table} WHERE sequence_id IS NULL`
      );
      
      if (unpopulatedCount.count > 0) {
        console.log(`Found ${unpopulatedCount.count} records in ${table} without sequence IDs. Populating...`);
        
        // Get records ordered by created_at timestamp (or another appropriate column)
        // Adapt the ORDER BY column if some tables don't have created_at
        const orderByColumn = table === 'blog_pages' ? 'created_at' : 'created_at';
        
        const records = await db.all(
          `SELECT id FROM ${table} ORDER BY ${orderByColumn} ASC`
        );
        
        // Assign sequence IDs sequentially
        for (let i = 0; i < records.length; i++) {
          await db.run(
            `UPDATE ${table} SET sequence_id = ? WHERE id = ?`,
            [i + 1, records[i].id]
          );
        }
        
        console.log(`Successfully populated sequence IDs for ${records.length} records in ${table}`);
      } else {
        console.log(`All records in ${table} already have sequence IDs`);
      }
    }
    
    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error populating sequence IDs:', error);
    return false;
  }
}

module.exports = { getDb, initializeDatabase , populateSequenceIds }; 