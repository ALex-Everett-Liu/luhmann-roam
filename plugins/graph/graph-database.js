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
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create graph_edges table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (from_node_id) REFERENCES graph_nodes (id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES graph_nodes (id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges(to_node_id);
  `);

  console.log("Graph plugin database initialized");
  return db;
}

module.exports = {
  getGraphDb,
  initializeGraphDatabase,
};

