const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const path = require("path");

// Create a database connection for the graph plugin
async function getGraphDb() {
  const dbPath = path.join(__dirname, "graph.db");

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// Initialize graph database
async function initializeGraphDatabase() {
  const db = await getGraphDb();

  // Create graph_nodes table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      x REAL NOT NULL,
      y REAL NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      radius REAL DEFAULT 20,
      full_content TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  // Create graph_edges table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (from_node_id) REFERENCES graph_nodes (id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES graph_nodes (id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges(to_node_id);
  `);

  // Add sequence_id columns to graph_nodes and graph_edges tables
  try {
    await db.exec(`ALTER TABLE graph_nodes ADD COLUMN sequence_id INTEGER;`);
    console.log("Added sequence_id column to graph_nodes table");
    
    // Create an index on the new column for better query performance
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_graph_nodes_sequence_id ON graph_nodes(sequence_id);`,
    );
  } catch (error) {
    console.log(
      "sequence_id column or index already exists in graph_nodes or other error:",
      error.message,
    );
  }

  try {
    await db.exec(`ALTER TABLE graph_edges ADD COLUMN sequence_id INTEGER;`);
    console.log("Added sequence_id column to graph_edges table");
    
    // Create an index on the new column for better query performance
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_graph_edges_sequence_id ON graph_edges(sequence_id);`,
    );
  } catch (error) {
    console.log(
      "sequence_id column or index already exists in graph_edges or other error:",
      error.message,
    );
  }

  console.log("Graph plugin database initialized");
  return db;
}

async function populateGraphSequenceIds() {
  const db = await getGraphDb();

  // Start a transaction for consistency
  await db.run("BEGIN TRANSACTION");

  try {
    // Tables that need sequence IDs
    const tables = ["graph_nodes", "graph_edges"];

    // Process each table
    for (const table of tables) {
      // First check if we need to populate sequence IDs for this table
      const unpopulatedCount = await db.get(
        `SELECT COUNT(*) as count FROM ${table} WHERE sequence_id IS NULL`,
      );

      if (unpopulatedCount.count > 0) {
        console.log(
          `Found ${unpopulatedCount.count} records in ${table} without sequence IDs. Populating...`,
        );

        // Get the maximum existing sequence_id to avoid conflicts
        const maxSequenceResult = await db.get(
          `SELECT MAX(sequence_id) as max_seq FROM ${table} WHERE sequence_id IS NOT NULL`
        );
        const startSequenceId = (maxSequenceResult?.max_seq || 0) + 1;

        // Get records ordered by created_at timestamp
        const records = await db.all(
          `SELECT id FROM ${table} WHERE sequence_id IS NULL ORDER BY created_at ASC`,
        );

        // Assign sequence IDs sequentially starting from the next available ID
        for (let i = 0; i < records.length; i++) {
          await db.run(`UPDATE ${table} SET sequence_id = ? WHERE id = ?`, [
            startSequenceId + i,
            records[i].id,
          ]);
        }

        console.log(
          `Successfully populated sequence IDs for ${records.length} records in ${table} (starting from ${startSequenceId})`,
        );
      } else {
        console.log(`All records in ${table} already have sequence IDs`);
      }
    }

    await db.run("COMMIT");
    return true;
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error populating graph sequence IDs:", error);
    return false;
  }
}

module.exports = {
  getGraphDb,
  initializeGraphDatabase,
  populateGraphSequenceIds,
};

