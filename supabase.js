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
      
      // First try to get a single record
      // but handle the case when no records or multiple records are returned
      const { data, error } = await queryBuilder.limit(1);
      
      if (error) throw error;
      
      // Return the first item if available, otherwise null
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`Supabase get error: ${error.message}`, { query, params });
      throw error;
    }
  }

  // Equivalent to SQLite's db.all - get multiple rows
  async all(query, ...params) {
    const parsedQuery = this.parseQuery(query, params);
    
    try {
      // Special case for node query with link_count subquery
      if (query.includes('SELECT n.*') && 
          query.includes('COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id') &&
          query.includes('FROM nodes n')) {
        
        // Get the base nodes
        let nodeQuery = this.client.from('nodes').select('*');
        
        // Add parent condition if needed
        if (query.includes('WHERE n.parent_id IS NULL')) {
          nodeQuery = nodeQuery.is('parent_id', null);
        } else if (query.includes('WHERE n.parent_id =')) {
          // Extract parent_id from query
          const parentMatch = query.match(/WHERE\s+n\.parent_id\s+=\s+['"']?([^'"\s]+)['"']?/i) || 
                              query.match(/WHERE\s+n\.parent_id\s+=\s+\?/i);
          
          if (parentMatch && params.length > 0) {
            const parentId = params[0];
            nodeQuery = nodeQuery.eq('parent_id', parentId);
          }
        }
        
        // Add ordering
        if (query.includes('ORDER BY n.position')) {
          nodeQuery = nodeQuery.order('position', { ascending: true });
        }
        
        // Execute the query
        const { data: nodes, error: nodesError } = await nodeQuery;
        
        if (nodesError) throw nodesError;
        if (!nodes || nodes.length === 0) return [];
        
        // Get all links
        const { data: links, error: linksError } = await this.client.from('links').select('*');
        if (linksError) throw linksError;
        
        // Calculate link_count for each node
        const result = nodes.map(node => {
          const linkCount = links ? links.filter(link => 
            link.from_node_id === node.id || link.to_node_id === node.id
          ).length : 0;
          
          return {
            ...node,
            link_count: linkCount
          };
        });
        
        return result;
      }
      
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
    
    try {
      let result;
      
      switch (operation) {
        case 'INSERT':
          // Handle insert - existing code is fine
          const { table: insertTable, insertData } = this.parseQuery(query, params);
          
          // Special handling for tasks table
          if (insertTable === 'tasks' && params.length === 1 && Array.isArray(params[0])) {
            // Handle the case where params are passed as a nested array
            const taskParams = params[0];
            
            // Extract column names from the query
            const columnsMatch = query.match(/\(([^)]+)\)\s+VALUES/i);
            let columns = [];
            if (columnsMatch) {
              columns = columnsMatch[1].split(',').map(col => col.trim());
            }
            
            // Create proper insert data object
            const properInsertData = {};
            for (let i = 0; i < columns.length; i++) {
              properInsertData[columns[i]] = taskParams[i];
            }
            
            console.log('Inserting task with data:', properInsertData);
            
            // Use the properly formatted insert data
            result = await this.client.from(insertTable).insert(properInsertData);
          } else {
            // Regular insert
            const { table, insertData } = this.parseQuery(query, params);
            result = await this.client.from(table).insert(insertData);
          }
          break;
        
        case 'UPDATE':
          // For UPDATE queries, we need to handle queries with WHERE clauses specially
          // Special case for UPDATE tasks SET is_active = 0, updated_at = ? WHERE is_active = 1
          if (query.includes('UPDATE tasks') && query.includes('WHERE is_active = 1')) {
            // Set all active tasks to inactive
            const updateData = {};
            
            // Extract the SET clause
            const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
            if (setMatch) {
              const setClauses = setMatch[1].split(',').map(clause => clause.trim());
              
              // Build update data
              let paramIndex = 0;
              for (const clause of setClauses) {
                const parts = clause.split('=').map(part => part.trim());
                if (parts.length === 2) {
                  if (parts[1] === '?') {
                    updateData[parts[0]] = params[paramIndex++];
                  } else {
                    // Handle literal values like is_active = 0
                    updateData[parts[0]] = parts[1] === '0' ? false : 
                                          parts[1] === '1' ? true : 
                                          parts[1];
                  }
                }
              }
            }
            
            // Apply the update to all rows where is_active is true
            result = await this.client.from('tasks')
              .update(updateData)
              .eq('is_active', true);
          } 
          // Special case for UPDATE tasks SET is_active = 1, start_time = ?, updated_at = ? WHERE id = ?
          else if (query.includes('UPDATE tasks') && query.includes('SET is_active = 1') && query.includes('WHERE id =')) {
            // Parse the WHERE id = ? clause
            const idMatch = query.match(/WHERE\s+id\s+=\s+\?/i);
            const idParamIndex = params.length - 1; // Last parameter is usually the ID
            const taskId = params[idParamIndex];
            
            // Extract the SET clause
            const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
            if (setMatch) {
              const setClauses = setMatch[1].split(',').map(clause => clause.trim());
              
              // Build update data
              const updateData = {};
              let paramIndex = 0;
              for (const clause of setClauses) {
                const parts = clause.split('=').map(part => part.trim());
                if (parts.length === 2) {
                  if (parts[1] === '?') {
                    updateData[parts[0]] = params[paramIndex++];
                  } else {
                    // Handle literal values like is_active = 1
                    updateData[parts[0]] = parts[1] === '0' ? false : 
                                          parts[1] === '1' ? true : 
                                          parts[1];
                  }
                }
              }
              
              result = await this.client.from('tasks')
                .update(updateData)
                .eq('id', taskId);
            }
          }
          // Handle the more general case
          else {
            const { table, conditions, updateData } = this.parseQuery(query, params);
            
            let updateBuilder = this.client.from(table).update(updateData);
            
            if (conditions && conditions.length > 0) {
              for (const [column, operator, value] of conditions) {
                updateBuilder = updateBuilder.filter(column, operator, value);
              }
            }
            
            result = await updateBuilder;
          }
          break;
        
        case 'DELETE':
          // DELETE handling remains the same
          const { table: deleteTable, conditions: deleteConditions } = this.parseQuery(query, params);
          
          let deleteBuilder = this.client.from(deleteTable).delete();
          if (deleteConditions) {
            for (const [column, operator, value] of deleteConditions) {
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
      const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        
        // Track parameter index
        let paramIndex = 0;
        
        // Handle basic WHERE id = ? conditions
        const equalsConditions = whereClause.match(/(\w+)\s*=\s*\?/g);
        if (equalsConditions) {
          equalsConditions.forEach(condition => {
            const column = condition.match(/(\w+)\s*=/)[1];
            result.conditions.push([column, 'eq', params[paramIndex++]]);
          });
        }
        
        // Handle IS NULL conditions
        const nullConditions = whereClause.match(/(\w+)\s+IS\s+NULL/gi);
        if (nullConditions) {
          nullConditions.forEach(condition => {
            const column = condition.match(/(\w+)\s+IS/i)[1];
            result.conditions.push([column, 'is', null]);
          });
        }
        
        // Handle IS NOT NULL conditions
        const notNullConditions = whereClause.match(/(\w+)\s+IS\s+NOT\s+NULL/gi);
        if (notNullConditions) {
          notNullConditions.forEach(condition => {
            const column = condition.match(/(\w+)\s+IS/i)[1];
            result.conditions.push([column, 'not.is', null]);
          });
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