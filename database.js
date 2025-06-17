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
  
  // Create task_categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS task_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#4285f4',
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER
    )
  `);
  
  // Create task_category_assignments table to link tasks to categories
  await db.exec(`
    CREATE TABLE IF NOT EXISTS task_category_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES task_categories (id) ON DELETE CASCADE,
      UNIQUE(task_id, category_id)
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
  
  // Add these graph tables to the initializeDatabase function

  // Create graph_vertices table - separate from outliner nodes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_vertices (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      label_zh TEXT,
      type TEXT DEFAULT 'concept',
      properties TEXT, -- JSON string for flexible properties
      source_node_id TEXT, -- Optional reference to outliner node
      x_position REAL,
      y_position REAL,
      size REAL DEFAULT 1.0,
      color TEXT DEFAULT '#666666',
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (source_node_id) REFERENCES nodes (id) ON DELETE SET NULL
    )
  `);

  // Create graph_edges table - separate from generic links
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      source_vertex_id TEXT NOT NULL,
      target_vertex_id TEXT NOT NULL,
      relationship_type TEXT DEFAULT 'relates_to',
      weight REAL DEFAULT 1.0,
      direction TEXT DEFAULT 'directed', -- 'directed', 'undirected'
      properties TEXT, -- JSON string for flexible properties
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (source_vertex_id) REFERENCES graph_vertices (id) ON DELETE CASCADE,
      FOREIGN KEY (target_vertex_id) REFERENCES graph_vertices (id) ON DELETE CASCADE,
      UNIQUE(source_vertex_id, target_vertex_id, relationship_type)
    )
  `);

  // Create graph_layouts table - store different layout configurations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_layouts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      layout_algorithm TEXT DEFAULT 'force-directed',
      layout_data TEXT, -- JSON string storing positions and parameters
      is_default BOOLEAN DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER
    )
  `);

  // Create graph_analysis_results table - store computed metrics
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_analysis_results (
      id TEXT PRIMARY KEY,
      vertex_id TEXT,
      analysis_type TEXT NOT NULL, -- 'centrality', 'community', 'clustering', etc.
      metric_name TEXT NOT NULL, -- 'betweenness', 'pagerank', 'modularity', etc.
      metric_value REAL,
      properties TEXT, -- Additional analysis data as JSON
      computed_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (vertex_id) REFERENCES graph_vertices (id) ON DELETE CASCADE
    )
  `);

  // Create graph_communities table - store community detection results
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_communities (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      vertex_id TEXT NOT NULL,
      algorithm TEXT DEFAULT 'louvain',
      modularity REAL,
      created_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (vertex_id) REFERENCES graph_vertices (id) ON DELETE CASCADE
    )
  `);

  // Add indices for graph tables performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_vertex_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_vertex_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(relationship_type);
    CREATE INDEX IF NOT EXISTS idx_graph_analysis_vertex ON graph_analysis_results(vertex_id);
    CREATE INDEX IF NOT EXISTS idx_graph_analysis_type ON graph_analysis_results(analysis_type);
    CREATE INDEX IF NOT EXISTS idx_graph_communities_community ON graph_communities(community_id);
    CREATE INDEX IF NOT EXISTS idx_graph_vertices_type ON graph_vertices(type);
  `);

  console.log(`Database for vault: ${vaultName} initialized`);

  // Create triggers for graph and word group tables
  try {
    const additionalTables = [
      'graph_vertices',
      'graph_edges', 
      'graph_layouts',
      'graph_analysis_results',
      'graph_communities',
      'word_groups',
      'word_group_items'
    ];
    
    for (const table of additionalTables) {
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
    console.log('Some additional triggers might already exist:', error.message);
  }

  // Add indices for sequence_id columns on graph and word group tables
  try {
    const graphAndWordTables = [
      'graph_vertices',
      'graph_edges',
      'graph_layouts', 
      'graph_analysis_results',
      'graph_communities',
      'word_groups',
      'word_group_items'
    ];
    
    for (const table of graphAndWordTables) {
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_sequence_id ON ${table}(sequence_id);`);
      console.log(`Created sequence_id index for ${table} table`);
    }
  } catch (error) {
    console.log('Some sequence_id indices may already exist:', error.message);
  }

  // Add indices for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_task_categories_name ON task_categories(name);
    CREATE INDEX IF NOT EXISTS idx_task_category_assignments_task_id ON task_category_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_category_assignments_category_id ON task_category_assignments(category_id);
  `);

  // Create code_entities table - stores code elements (functions, variables, classes)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'function', 'variable', 'class', 'method', 'property', 'module'
      file_path TEXT NOT NULL,
      line_number INTEGER,
      column_number INTEGER,
      scope TEXT, -- 'global', 'local', 'class', 'module'
      language TEXT DEFAULT 'javascript',
      signature TEXT, -- function signature, variable type, etc.
      documentation TEXT, -- comments, JSDoc, etc.
      complexity_score REAL DEFAULT 0,
      parameters TEXT, -- JSON string for function parameters
      return_type TEXT,
      access_modifier TEXT, -- 'public', 'private', 'protected'
      is_async BOOLEAN DEFAULT 0,
      is_static BOOLEAN DEFAULT 0,
      is_exported BOOLEAN DEFAULT 0,
      properties TEXT, -- JSON string for additional metadata
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER
    )
  `);

  // Create code_relationships table - stores relationships between code entities
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_relationships (
      id TEXT PRIMARY KEY,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL, -- 'calls', 'inherits', 'implements', 'imports', 'uses', 'defines', 'modifies'
      relationship_strength REAL DEFAULT 1.0, -- How strong the relationship is (1-10)
      context TEXT, -- Additional context about the relationship
      file_path TEXT, -- Where this relationship occurs
      line_number INTEGER, -- Where in the file
      call_count INTEGER DEFAULT 1, -- How many times this relationship occurs
      properties TEXT, -- JSON string for additional metadata
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (source_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE,
      FOREIGN KEY (target_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE,
      UNIQUE(source_entity_id, target_entity_id, relationship_type, file_path, line_number)
    )
  `);

  // Create code_projects table - group entities by project/module
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_path TEXT NOT NULL,
      language TEXT DEFAULT 'javascript',
      framework TEXT, -- 'react', 'vue', 'node', etc.
      version TEXT,
      dependencies TEXT, -- JSON string of dependencies
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER
    )
  `);

  // Create code_project_entities table - link entities to projects
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_project_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES code_projects (id) ON DELETE CASCADE,
      FOREIGN KEY (entity_id) REFERENCES code_entities (id) ON DELETE CASCADE,
      UNIQUE(project_id, entity_id)
    )
  `);

  // Create code_analysis_results table - store computed metrics
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_analysis_results (
      id TEXT PRIMARY KEY,
      entity_id TEXT,
      project_id TEXT,
      analysis_type TEXT NOT NULL, -- 'centrality', 'complexity', 'coupling', 'cohesion'
      metric_name TEXT NOT NULL, -- 'fan_in', 'fan_out', 'cyclomatic_complexity', etc.
      metric_value REAL,
      analysis_data TEXT, -- JSON string with detailed analysis
      computed_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (entity_id) REFERENCES code_entities (id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES code_projects (id) ON DELETE CASCADE
    )
  `);

  // Add indices for code graph tables
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_code_entities_type ON code_entities(type);
    CREATE INDEX IF NOT EXISTS idx_code_entities_file_path ON code_entities(file_path);
    CREATE INDEX IF NOT EXISTS idx_code_entities_name ON code_entities(name);
    CREATE INDEX IF NOT EXISTS idx_code_relationships_source ON code_relationships(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_relationships_target ON code_relationships(target_entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_relationships_type ON code_relationships(relationship_type);
    CREATE INDEX IF NOT EXISTS idx_code_project_entities_project ON code_project_entities(project_id);
    CREATE INDEX IF NOT EXISTS idx_code_project_entities_entity ON code_project_entities(entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_analysis_entity ON code_analysis_results(entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_analysis_type ON code_analysis_results(analysis_type);
  `);

  // Create code_expressions table - stores individual expressions within code
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_expressions (
      id TEXT PRIMARY KEY,
      parent_entity_id TEXT NOT NULL, -- Links to the function/method containing this expression
      expression_text TEXT NOT NULL, -- The actual code expression
      expression_type TEXT NOT NULL, -- 'assignment', 'method_call', 'binary_operation', 'unary_operation', 'literal'
      line_number INTEGER NOT NULL,
      column_start INTEGER,
      column_end INTEGER,
      complexity_level TEXT DEFAULT 'simple', -- 'simple', 'medium', 'complex'
      side_effects TEXT DEFAULT 'none', -- 'none', 'local', 'external'
      data_type TEXT, -- 'string', 'number', 'boolean', 'object', 'array', 'function'
      properties TEXT, -- JSON string for additional metadata
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (parent_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE
    )
  `);

  // Create code_variables table - stores variable declarations and references
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_variables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      declaration_type TEXT, -- 'const', 'let', 'var', 'parameter', 'property'
      data_type TEXT, -- 'string', 'number', 'boolean', 'object', 'array', 'function'
      scope_type TEXT, -- 'global', 'local', 'parameter', 'closure'
      parent_entity_id TEXT NOT NULL,
      line_number INTEGER,
      column_start INTEGER,
      column_end INTEGER,
      initial_value_type TEXT, -- 'literal', 'function_call', 'expression', 'parameter'
      mutability TEXT DEFAULT 'mutable', -- 'immutable', 'mutable'
      is_exported BOOLEAN DEFAULT 0,
      properties TEXT, -- JSON string for additional metadata
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (parent_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE
    )
  `);

  // Create code_method_calls table - stores method/function calls
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_method_calls (
      id TEXT PRIMARY KEY,
      method_name TEXT NOT NULL,
      call_type TEXT, -- 'direct', 'chained', 'nested'
      expression_type TEXT, -- Move this OUT of properties - it's important!
      module_source TEXT, -- 'built-in', 'external', 'local', 'third-party'
      chain_position TEXT, -- 'first', 'intermediate', 'last', 'standalone'
      arguments_count INTEGER DEFAULT 0,
      parent_expression_id TEXT,
      parent_entity_id TEXT NOT NULL,
      line_number INTEGER,
      column_start INTEGER,
      column_end INTEGER,
      return_type TEXT,
      is_async BOOLEAN DEFAULT 0,
      parameters_used TEXT, -- Move this OUT of properties
      external_dependencies TEXT, -- Move this OUT of properties  
      builtin_dependencies TEXT, -- Move this OUT of properties
      properties TEXT, -- JSON string for truly optional metadata only
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (parent_expression_id) REFERENCES code_expressions (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE
    )
  `);

  // Create code_data_flow table - tracks data flow between variables and expressions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS code_data_flow (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL, -- 'variable', 'method_call', 'expression', 'parameter'
      source_id TEXT NOT NULL, -- ID of the source (variable, method call, etc.)
      target_type TEXT NOT NULL, -- 'variable', 'method_call', 'expression'
      target_id TEXT NOT NULL, -- ID of the target
      flow_type TEXT NOT NULL, -- 'assignment', 'parameter_passing', 'return_value', 'transformation'
      transformation_applied TEXT, -- Description of any transformation (e.g., 'toLowerCase', 'parseInt')
      line_number INTEGER,
      parent_entity_id TEXT NOT NULL,
      properties TEXT, -- JSON string for additional metadata
      created_at INTEGER,
      updated_at INTEGER,
      sequence_id INTEGER,
      FOREIGN KEY (parent_entity_id) REFERENCES code_entities (id) ON DELETE CASCADE
    )
  `);

  // ADD THE NEW TABLE HERE - RIGHT AFTER code_data_flow
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expression_relationships (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_name TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      description TEXT,
      transformation TEXT,
      order_sequence INTEGER DEFAULT 1,
      entity_id TEXT,
      line_number INTEGER,
      project_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sequence_id INTEGER,
      FOREIGN KEY (entity_id) REFERENCES code_entities(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES code_projects(id) ON DELETE CASCADE
    )
  `);

  // Add indices for expression analysis tables
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_code_expressions_parent ON code_expressions(parent_entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_expressions_line ON code_expressions(line_number);
    CREATE INDEX IF NOT EXISTS idx_code_variables_parent ON code_variables(parent_entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_variables_name ON code_variables(name);
    CREATE INDEX IF NOT EXISTS idx_code_method_calls_parent ON code_method_calls(parent_entity_id);
    CREATE INDEX IF NOT EXISTS idx_code_method_calls_method ON code_method_calls(method_name);
    CREATE INDEX IF NOT EXISTS idx_code_data_flow_source ON code_data_flow(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_code_data_flow_target ON code_data_flow(target_type, target_id);
  `);

  // NOW create triggers and indices for ALL code graph tables (including the ones we just created)
  const codeGraphTables = [
    'code_entities',
    'code_relationships',
    'code_projects',
    // 'code_project_entities',
    'code_analysis_results',
    'code_expressions',
    'code_variables',
    'code_method_calls',
    'code_data_flow'
  ];

  // Create triggers for auto-assigning sequence IDs
  for (const table of codeGraphTables) {
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

  // Create sequence_id indices for all code graph tables
  for (const table of codeGraphTables) {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_sequence_id ON ${table}(sequence_id);`);
    console.log(`Created sequence_id index for ${table} table`);
  }

  // Run migration for existing databases
  await migrateCodeMethodCallsTable(vaultName);

  // Create simple code graph tables for the new clean system
  console.log('Creating simple code graph tables...');
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS simple_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS simple_functions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        parameters TEXT, -- JSON string of parameters
        return_type TEXT,
        is_async BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES simple_projects(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS simple_variables (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        function_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        value TEXT,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        scope TEXT, -- 'local', 'parameter', 'global'
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES simple_projects(id),
        FOREIGN KEY (function_id) REFERENCES simple_functions(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS simple_dependencies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'function', 'variable'
        source_id TEXT NOT NULL,
        target_type TEXT NOT NULL, -- 'function', 'variable', 'module'
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL, -- 'calls', 'uses', 'assigns', 'returns'
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES simple_projects(id)
      )
    `);

    console.log('Simple code graph tables created successfully');
  } catch (error) {
    console.log('Simple code graph tables may already exist:', error.message);
  }

  // Add indices for simple code graph tables
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_simple_functions_project ON simple_functions(project_id);
      CREATE INDEX IF NOT EXISTS idx_simple_variables_project ON simple_variables(project_id);
      CREATE INDEX IF NOT EXISTS idx_simple_variables_function ON simple_variables(function_id);
      CREATE INDEX IF NOT EXISTS idx_simple_dependencies_project ON simple_dependencies(project_id);
      CREATE INDEX IF NOT EXISTS idx_simple_dependencies_source ON simple_dependencies(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_simple_dependencies_target ON simple_dependencies(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_simple_projects_sequence_id ON simple_projects(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_simple_functions_sequence_id ON simple_functions(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_simple_variables_sequence_id ON simple_variables(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_simple_dependencies_sequence_id ON simple_dependencies(sequence_id);
    `);
    console.log('Simple code graph indices created successfully');
  } catch (error) {
    console.log('Simple code graph indices may already exist:', error.message);
  }

  // Add triggers for simple code graph tables
  try {
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS assign_sequence_id_simple_projects
      AFTER INSERT ON simple_projects
      FOR EACH ROW
      WHEN NEW.sequence_id IS NULL
      BEGIN
        UPDATE simple_projects 
        SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM simple_projects)
        WHERE id = NEW.id;
      END;
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS assign_sequence_id_simple_functions
      AFTER INSERT ON simple_functions
      FOR EACH ROW
      WHEN NEW.sequence_id IS NULL
      BEGIN
        UPDATE simple_functions 
        SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM simple_functions)
        WHERE id = NEW.id;
      END;
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS assign_sequence_id_simple_variables
      AFTER INSERT ON simple_variables
      FOR EACH ROW
      WHEN NEW.sequence_id IS NULL
      BEGIN
        UPDATE simple_variables 
        SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM simple_variables)
        WHERE id = NEW.id;
      END;
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS assign_sequence_id_simple_dependencies
      AFTER INSERT ON simple_dependencies
      FOR EACH ROW
      WHEN NEW.sequence_id IS NULL
      BEGIN
        UPDATE simple_dependencies 
        SET sequence_id = (SELECT COALESCE(MAX(sequence_id), 0) + 1 FROM simple_dependencies)
        WHERE id = NEW.id;
      END;
    `);

    console.log('Simple code graph triggers created successfully');
  } catch (error) {
    console.log('Simple code graph triggers may already exist:', error.message);
  }

  // Create enhanced code graph tables for the comprehensive system
  console.log('Creating enhanced code graph tables...');

  try {
    // Enhanced Projects table with additional metadata
    await db.exec(`
      CREATE TABLE IF NOT EXISTS enhanced_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        language TEXT DEFAULT 'javascript',
        framework TEXT,
        version TEXT,
        tags TEXT, -- JSON array of tags
        metadata TEXT, -- JSON object for flexible metadata
        status TEXT DEFAULT 'active', -- 'active', 'archived', 'template'
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER
      )
    `);

    // Enhanced Functions table with more detailed tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS enhanced_functions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT, -- Namespace.ClassName.methodName
        file_path TEXT NOT NULL,
        line_number INTEGER,
        end_line_number INTEGER,
        parameters TEXT, -- JSON string of parameters with types
        return_type TEXT,
        is_async BOOLEAN DEFAULT 0,
        is_static BOOLEAN DEFAULT 0,
        is_private BOOLEAN DEFAULT 0,
        complexity_score INTEGER DEFAULT 1,
        description TEXT,
        tags TEXT, -- JSON array of tags
        metadata TEXT, -- JSON object for flexible metadata
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE
      )
    `);

    // Enhanced Variables table with better typing
    await db.exec(`
      CREATE TABLE IF NOT EXISTS enhanced_variables (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        function_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        value TEXT,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        scope TEXT, -- 'local', 'parameter', 'global', 'class', 'module'
        declaration_type TEXT, -- 'const', 'let', 'var', 'parameter', 'property'
        mutability TEXT DEFAULT 'mutable', -- 'immutable', 'mutable'
        is_exported BOOLEAN DEFAULT 0,
        description TEXT,
        tags TEXT, -- JSON array of tags
        metadata TEXT, -- JSON object for flexible metadata
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE,
        FOREIGN KEY (function_id) REFERENCES enhanced_functions(id) ON DELETE CASCADE
      )
    `);

    // Enhanced Dependencies table with richer relationships
    await db.exec(`
      CREATE TABLE IF NOT EXISTS enhanced_dependencies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'function', 'variable', 'class', 'module'
        source_id TEXT NOT NULL,
        target_type TEXT NOT NULL, -- 'function', 'variable', 'class', 'module'
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        relationship_strength REAL DEFAULT 1.0, -- 0.0 to 1.0
        context TEXT, -- Additional context about the relationship
        line_number INTEGER,
        order_sequence INTEGER DEFAULT 1, -- For ordered relationships
        description TEXT,
        metadata TEXT, -- JSON object for flexible metadata
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sequence_id INTEGER,
        FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE
      )
    `);

    // Project Statistics View (computed)
    await db.exec(`
      CREATE VIEW IF NOT EXISTS project_statistics AS
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.tags,
        p.metadata,
        COUNT(DISTINCT f.id) as function_count,
        COUNT(DISTINCT v.id) as variable_count,
        COUNT(DISTINCT d.id) as dependency_count,
        AVG(f.complexity_score) as avg_complexity,
        MAX(f.updated_at) as last_function_update,
        p.created_at,
        p.updated_at
      FROM enhanced_projects p
      LEFT JOIN enhanced_functions f ON p.id = f.project_id
      LEFT JOIN enhanced_variables v ON p.id = v.project_id
      LEFT JOIN enhanced_dependencies d ON p.id = d.project_id
      GROUP BY p.id, p.name, p.description, p.status, p.tags, p.metadata, p.created_at, p.updated_at
    `);

    console.log('Enhanced code graph tables created successfully');
  } catch (error) {
    console.log('Enhanced code graph tables may already exist:', error.message);
  }

  // Add indices for enhanced code graph tables
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_functions_project ON enhanced_functions(project_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_functions_name ON enhanced_functions(name);
      CREATE INDEX IF NOT EXISTS idx_enhanced_variables_project ON enhanced_variables(project_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_variables_function ON enhanced_variables(function_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_variables_name ON enhanced_variables(name);
      CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_project ON enhanced_dependencies(project_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_source ON enhanced_dependencies(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_target ON enhanced_dependencies(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_relationship ON enhanced_dependencies(relationship_type);
      CREATE INDEX IF NOT EXISTS idx_enhanced_projects_sequence_id ON enhanced_projects(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_functions_sequence_id ON enhanced_functions(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_variables_sequence_id ON enhanced_variables(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_enhanced_dependencies_sequence_id ON enhanced_dependencies(sequence_id);
    `);
    console.log('Enhanced code graph indices created successfully');
  } catch (error) {
    console.log('Enhanced code graph indices may already exist:', error.message);
  }

  // Add triggers for enhanced code graph tables
  try {
    const enhancedTables = ['enhanced_projects', 'enhanced_functions', 'enhanced_variables', 'enhanced_dependencies'];
    
    for (const table of enhancedTables) {
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
    }
    console.log('Enhanced code graph triggers created successfully');
  } catch (error) {
    console.log('Enhanced code graph triggers may already exist:', error.message);
  }

  return db;
}

// Function to add sequence_id columns to existing tables that might not have them
async function addMissingSequenceIdColumns() {
  const db = await getDb();
  
  try {
    // Tables that might need sequence_id columns added
    const tablesToUpdate = [
      'graph_layouts',
      'graph_analysis_results', 
      'graph_communities'
    ];
    
    for (const table of tablesToUpdate) {
      try {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN sequence_id INTEGER;`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_sequence_id ON ${table}(sequence_id);`);
        console.log(`Added sequence_id column and index to ${table} table`);
      } catch (error) {
        // Column likely already exists, which is fine
        console.log(`sequence_id column may already exist in ${table} or other error:`, error.message);
      }
    }
  } catch (error) {
    console.log('Error adding missing sequence_id columns:', error.message);
  }
}

// Function to populate sequence IDs for graph and word group tables specifically
async function populateGraphAndWordGroupSequenceIds() {
  const db = await getDb();
  
  // Start a transaction for consistency
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Graph and word group tables that need sequence IDs
    const graphAndWordTables = [
      'graph_vertices',
      'graph_edges',
      'graph_layouts',
      'graph_analysis_results',
      'graph_communities',
      'word_groups',
      'word_group_items'
    ];
    
    // Process each table
    for (const table of graphAndWordTables) {
      try {
        // First check if we need to populate sequence IDs for this table
        const unpopulatedCount = await db.get(
          `SELECT COUNT(*) as count FROM ${table} WHERE sequence_id IS NULL`
        );
        
        if (unpopulatedCount.count > 0) {
          console.log(`Found ${unpopulatedCount.count} records in ${table} without sequence IDs. Populating...`);
          
          // Get records ordered by appropriate timestamp column
          let orderByColumn = 'created_at';
          if (table === 'graph_analysis_results') {
            orderByColumn = 'computed_at';
          }
          
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
      } catch (error) {
        console.log(`Error processing table ${table}:`, error.message);
        // Continue with other tables
      }
    }
    
    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error populating graph and word group sequence IDs:', error);
    return false;
  }
}

async function populateSequenceIds() {
  const db = await getDb();
  
  // Start a transaction for consistency
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Tables that need sequence IDs - including enhanced code graph tables
    const tables = [
      'nodes',
      'links', 
      'node_attributes',
      'tasks',
      'bookmarks',
      'blog_pages',
      'dcim_images',
      'metro_stations',
      'metro_lines',
      'graph_vertices',
      'graph_edges',
      'graph_layouts',
      'graph_analysis_results',
      'graph_communities',
      'word_groups',
      'word_group_items',
      'simple_projects',
      'simple_functions',
      'simple_variables',
      'simple_dependencies',
      'enhanced_projects',
      'enhanced_functions',
      'enhanced_variables',
      'enhanced_dependencies'
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
        let orderByColumn = 'created_at';
        if (table === 'blog_pages') {
          orderByColumn = 'created_at';
        } else if (table === 'graph_analysis_results') {
          orderByColumn = 'computed_at';
        } else if (table === 'bookmarks') {
          orderByColumn = 'added_at';
        } else if (table === 'dcim_images') {
          orderByColumn = 'creation_time';
        }
        
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

module.exports = { getDb, initializeDatabase, populateSequenceIds, addMissingSequenceIdColumns, populateGraphAndWordGroupSequenceIds, migrateCodeMethodCallsTable }; 