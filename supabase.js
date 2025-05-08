const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Create a wrapper that mimics the SQLite interface
class SupabaseWrapper {
  constructor(client) {
    this.client = client;
  }

  // Equivalent to SQLite's db.get - get a single row
  async get(query, ...params) {
    // Parse the query to extract table name and conditions
    const { table, conditions, selectedFields } = this.parseQuery(query, params);
    
    try {
      let queryBuilder = this.client.from(table).select(selectedFields || '*');
      
      // Apply conditions if any
      if (conditions) {
        for (const [column, operator, value] of conditions) {
          queryBuilder = queryBuilder.filter(column, operator, value);
        }
      }
      
      // Limit to single row
      const { data, error } = await queryBuilder.limit(1).single();
      
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error(`Supabase get error: ${error.message}`, { query, params });
      throw error;
    }
  }

  // Equivalent to SQLite's db.all - get multiple rows
  async all(query, ...params) {
    const parsedQuery = this.parseQuery(query, params);
    
    try {
      // Special handling for JOIN queries
      if (parsedQuery.isJoinQuery) {
        // For bookmarks JOIN query
        if (query.includes('FROM bookmarks') && query.includes('JOIN nodes')) {
          // Handle manually with separate queries and client-side join
          const { data: bookmarks, error: bookmarksError } = await this.client
            .from('bookmarks')
            .select('*')
            .order('added_at', { ascending: false });
          
          if (bookmarksError) throw bookmarksError;
          
          // If there are no bookmarks, return empty array
          if (!bookmarks || bookmarks.length === 0) {
            return [];
          }
          
          // Get all node_ids from bookmarks
          const nodeIds = bookmarks.map(b => b.node_id);
          
          // Fetch the corresponding nodes
          const { data: nodes, error: nodesError } = await this.client
            .from('nodes')
            .select('id, content, content_zh')
            .in('id', nodeIds);
          
          if (nodesError) throw nodesError;
          
          // Combine the data (simulating the JOIN)
          const result = bookmarks.map(bookmark => {
            const node = nodes.find(n => n.id === bookmark.node_id) || {};
            return {
              ...bookmark,
              content: node.content,
              content_zh: node.content_zh
            };
          });
          
          return result;
        }
        
        // For other complex queries, you might need to add more special cases
        console.warn('Unhandled JOIN query:', query);
        return [];
      }
      
      // Regular query processing (no JOIN)
      let queryBuilder = this.client.from(parsedQuery.table).select(parsedQuery.selectedFields || '*');
      
      // Apply conditions if any
      if (parsedQuery.conditions) {
        for (const [column, operator, value] of parsedQuery.conditions) {
          queryBuilder = queryBuilder.filter(column, operator, value);
        }
      }
      
      // Apply ordering if any
      if (parsedQuery.orderBy) {
        for (const [column, direction] of parsedQuery.orderBy) {
          queryBuilder = queryBuilder.order(column, { ascending: direction === 'ASC' });
        }
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Supabase all error: ${error.message}`, { query, params });
      throw error;
    }
  }

  // Equivalent to SQLite's db.run - run insert, update, delete queries
  async run(query, ...params) {
    // Determine operation type (INSERT, UPDATE, DELETE)
    const operation = query.trim().split(' ')[0].toUpperCase();
    const { table, conditions, updateData, insertData } = this.parseQuery(query, params);
    
    try {
      let result;
      
      switch (operation) {
        case 'INSERT':
          result = await this.client.from(table).insert(insertData);
          break;
        case 'UPDATE':
          let updateBuilder = this.client.from(table).update(updateData);
          if (conditions) {
            for (const [column, operator, value] of conditions) {
              updateBuilder = updateBuilder.filter(column, operator, value);
            }
          }
          result = await updateBuilder;
          break;
        case 'DELETE':
          let deleteBuilder = this.client.from(table).delete();
          if (conditions) {
            for (const [column, operator, value] of conditions) {
              deleteBuilder = deleteBuilder.filter(column, operator, value);
            }
          }
          result = await deleteBuilder;
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      if (result.error) throw result.error;
      return result;
    } catch (error) {
      console.error(`Supabase run error: ${error.message}`, { query, params });
      throw error;
    }
  }

  // Implement transaction-like behavior (Supabase doesn't support true transactions)
  async begin() {
    // Supabase doesn't support true transactions, so we'll just log this
    console.log('BEGIN TRANSACTION (note: true transactions not supported in Supabase)');
  }

  async commit() {
    // Supabase doesn't support true transactions, so we'll just log this
    console.log('COMMIT (note: true transactions not supported in Supabase)');
  }

  async rollback() {
    // Supabase doesn't support true transactions, so we'll just log this
    console.log('ROLLBACK (note: true transactions not supported in Supabase)');
  }

  // Helper to execute RPC functions or raw SQL through Supabase
  async exec(query) {
    // For initial table creation and schema updates
    try {
      // Use Supabase's SQL executor
      const { data, error } = await this.client.rpc('exec_sql', { sql: query });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Supabase exec error: ${error.message}`, { query });
      throw error;
    }
  }

  // Helper to parse SQL queries into Supabase API calls
  parseQuery(query, params = []) {
    const result = {};
    
    query = query.trim();
    
    // Handle JOIN queries differently
    if (query.includes('JOIN')) {
      // For JOIN queries, we need special handling
      if (query.includes('SELECT') && query.includes('FROM')) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        if (fromMatch) {
          result.table = fromMatch[1];
          result.isJoinQuery = true;
          
          // We'll need to manually process this in the calling function
          result.rawQuery = query;
          result.rawParams = params;
          return result;
        }
      }
    }
    
    // Extract table name (regular case)
    if (query.includes('FROM')) {
      const fromMatch = query.match(/FROM\s+(\w+)(?:\s+\w+)?/i);
      if (fromMatch) {
        result.table = fromMatch[1];
      }
    } else if (query.includes('INTO')) {
      const intoMatch = query.match(/INTO\s+(\w+)/i);
      if (intoMatch) {
        result.table = intoMatch[1];
      }
    } else if (query.includes('UPDATE')) {
      const updateMatch = query.match(/UPDATE\s+(\w+)/i);
      if (updateMatch) {
        result.table = updateMatch[1];
      }
    } else if (query.includes('DELETE FROM')) {
      const deleteMatch = query.match(/DELETE FROM\s+(\w+)/i);
      if (deleteMatch) {
        result.table = deleteMatch[1];
      }
    }
    
    // Extract selected fields
    if (query.includes('SELECT')) {
      const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
      if (selectMatch && selectMatch[1] !== '*') {
        result.selectedFields = selectMatch[1];
      }
    }
    
    // Extract conditions (WHERE clause)
    if (query.includes('WHERE')) {
      result.conditions = [];
      // This is a simplification - in a real app you'd need more sophisticated SQL parsing
      const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        
        // Find WHERE conditions with placeholders and map to params
        let paramIndex = 0;
        // Handle basic WHERE id = ? conditions
        const idCondition = whereClause.match(/(\w+)\s*=\s*\?/);
        if (idCondition) {
          result.conditions.push([idCondition[1], 'eq', params[paramIndex++]]);
        }
      }
    }
    
    // Extract ORDER BY
    if (query.includes('ORDER BY')) {
      result.orderBy = [];
      const orderMatch = query.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
      if (orderMatch) {
        const orderClause = orderMatch[1];
        const orderParts = orderClause.split(',').map(part => part.trim());
        
        for (const part of orderParts) {
          // Handle table.column format in ORDER BY
          const tableColumnMatch = part.match(/(\w+)\.(\w+)(?:\s+(ASC|DESC))?/i);
          if (tableColumnMatch) {
            const column = tableColumnMatch[2];
            const direction = (tableColumnMatch[3] || 'ASC').toUpperCase();
            result.orderBy.push([column, direction]);
          } else {
            // Standard column format
            const [column, direction = 'ASC'] = part.split(/\s+/);
            result.orderBy.push([column, direction]);
          }
        }
      }
    }
    
    // Handle INSERT queries
    if (query.startsWith('INSERT INTO')) {
      const valuesMatch = query.match(/VALUES\s*\(([?,\s]+)\)/i);
      if (valuesMatch) {
        // Count placeholders to determine how many params to use
        const placeholders = valuesMatch[1].split(',');
        
        // Extract column names
        const columnsMatch = query.match(/\(([^)]+)\)\s+VALUES/i);
        let columns = [];
        if (columnsMatch) {
          columns = columnsMatch[1].split(',').map(col => col.trim());
        }
        
        // Create insert data object
        result.insertData = {};
        for (let i = 0; i < columns.length; i++) {
          result.insertData[columns[i]] = params[i];
        }
      }
    }
    
    // Handle UPDATE queries
    if (query.startsWith('UPDATE')) {
      const setMatch = query.match(/SET\s+(.+?)(?:WHERE|$)/i);
      if (setMatch) {
        const setClauses = setMatch[1].split(',').map(clause => clause.trim());
        result.updateData = {};
        
        let paramIndex = 0;
        for (const clause of setClauses) {
          const parts = clause.split('=').map(part => part.trim());
          if (parts.length === 2 && parts[1] === '?') {
            result.updateData[parts[0]] = params[paramIndex++];
          }
        }
      }
    }
    
    return result;
  }
}

// Create a database connection
async function getDb() {
  return new SupabaseWrapper(supabase);
}

// Initialize database
async function initializeDatabase() {
  // Create tables in Supabase
  const createTablesSQL = `
  -- Create nodes table
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    content TEXT,
    content_zh TEXT,
    parent_id TEXT REFERENCES nodes(id),
    position INTEGER,
    is_expanded BOOLEAN DEFAULT true,
    has_markdown BOOLEAN DEFAULT false,
    node_size INTEGER DEFAULT 20,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create links table
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    from_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    to_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    weight REAL DEFAULT 1.0,
    description TEXT,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create tasks table
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time BIGINT,
    total_duration BIGINT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create node_attributes table
  CREATE TABLE IF NOT EXISTS node_attributes (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    created_at BIGINT,
    updated_at BIGINT,
    UNIQUE(node_id, key)
  );

  -- Create bookmarks table
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT,
    added_at BIGINT,
    created_at BIGINT
  );

  -- Create blog_pages table
  CREATE TABLE IF NOT EXISTS blog_pages (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    template_id TEXT,
    title TEXT,
    slug TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create dcim_images table
  CREATE TABLE IF NOT EXISTS dcim_images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT,
    file_path TEXT,
    file_size BIGINT,
    rating INTEGER,
    ranking REAL,
    tags TEXT,
    creation_time BIGINT,
    person TEXT,
    location TEXT, 
    type TEXT,
    thumbnail_path TEXT,
    parent_id TEXT,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create dcim_image_settings table
  CREATE TABLE IF NOT EXISTS dcim_image_settings (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL REFERENCES dcim_images(id) ON DELETE CASCADE,
    settings_json TEXT NOT NULL,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create dcim_directories table
  CREATE TABLE IF NOT EXISTS dcim_directories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at BIGINT,
    updated_at BIGINT
  );

  -- Create index for parent-child relationships
  CREATE INDEX IF NOT EXISTS idx_parent_id ON nodes(parent_id);
  CREATE INDEX IF NOT EXISTS idx_dcim_parent_id ON dcim_images(parent_id);
  `;
  
  console.log('Initializing Supabase database...');
  
  try {
    // You'll need to create a stored procedure in Supabase to execute SQL
    // Or create these tables manually through the Supabase UI
    
    // For a proper implementation, you would need to:
    // 1. Create these tables via the Supabase UI SQL editor
    // 2. Or create a migration script that uses the Supabase API

    console.log('Database initialized');
    return new SupabaseWrapper(supabase);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = { getDb, initializeDatabase, supabase };