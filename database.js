const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const path = require("path");

// Create a database connection
async function getDb() {
  const dbPath = path.join(__dirname, "outliner.db");

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// Initialize database
async function initializeDatabase() {
  const db = await getDb();

  // Check if the database already has tables instead of using a global flag
  try {
    // Try to query the nodes table to see if it exists
    await db.get(
      'SELECT count(*) as count FROM sqlite_master WHERE type="table" AND name="nodes"',
    );

    // If we get here, the database already has tables
    console.log("Database already initialized, checking tables...");
  } catch (error) {
    // If we get an error, the database doesn't have tables yet
    console.log("Initializing database");
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
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (parent_id) REFERENCES nodes (id)
    )
  `);

  // Remove links table creation - pure node operations sufficient
  //
  // Links table removed as link management system was eliminated in v0.32.3
  // Database maintains simplicity with nodes, attributes, bookmarks only
  //
  // Links table previously enabled connections between nodes with:
  // - bidirectional relationships
  // - weight and description metadata
  // - complex modal management
  //
  // Now application uses pure node hierarchy exclusively

  // Add sequence_id column to nodes table
  try {
    await db.exec(`ALTER TABLE nodes ADD COLUMN sequence_id INTEGER;`);
    console.log("Added sequence_id column to nodes table");

    // Create an index on the new column for better query performance
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_nodes_sequence_id ON nodes(sequence_id);`,
    );
  } catch (error) {
    console.log(
      "sequence_id column or index already exists or other error:",
      error.message,
    );
  }

  return db;
}

async function populateSequenceIds() {
  const db = await getDb();

  // Start a transaction for consistency
  await db.run("BEGIN TRANSACTION");

  try {
    // Tables that need sequence IDs
    const tables = ["nodes"];

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

        // Get records ordered by created_at timestamp (or another appropriate column)
        // Adapt the ORDER BY column if some tables don't have created_at
        let orderByColumn = "created_at";
        const records = await db.all(
          `SELECT id FROM ${table} WHERE sequence_id IS NULL ORDER BY ${orderByColumn} ASC`,
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
    console.error("Error populating sequence IDs:", error);
    return false;
  }
}

module.exports = {
  getDb,
  initializeDatabase,
  populateSequenceIds,
};
