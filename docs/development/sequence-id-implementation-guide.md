# Sequence ID Assignment and Population Guide

This guide explains how to implement a Sequence ID system for your database tables. Sequence IDs provide a stable, sequential identifier for records that persists across operations and can be used for referencing, ordering, or display purposes.

## Overview

**Sequence IDs** are auto-incrementing integer identifiers assigned to database records. Unlike primary keys (which may be UUIDs or other formats), sequence IDs:
- Provide human-readable sequential numbers (1, 2, 3, ...)
- Are stable and don't change when records are modified
- Can be used for user-facing references (e.g., "Node #123")
- Enable consistent ordering based on creation time

## Implementation Steps

### Step 1: Database Schema Modification

Add a `sequence_id` column to your target table(s). This can be done via migration or during table initialization.

#### For New Tables

```sql
CREATE TABLE IF NOT EXISTS your_table (
  id TEXT PRIMARY KEY,
  -- other columns...
  sequence_id INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_your_table_sequence_id ON your_table(sequence_id);
```

#### For Existing Tables (Migration)

```sql
-- Add the column (safe to run multiple times)
ALTER TABLE your_table ADD COLUMN sequence_id INTEGER;

-- Create index
CREATE INDEX IF NOT EXISTS idx_your_table_sequence_id ON your_table(sequence_id);
```

#### In Your Database Initialization Code

```javascript
// database.js or similar
async function initializeDatabase() {
  const db = await getDb();
  
  // ... existing table creation code ...
  
  // Add sequence_id column to existing tables
  try {
    await db.exec(`ALTER TABLE your_table ADD COLUMN sequence_id INTEGER;`);
    console.log("Added sequence_id column to your_table");
    
    // Create index for better query performance
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_your_table_sequence_id ON your_table(sequence_id);`
    );
  } catch (error) {
    // Column already exists or other error - safe to ignore
    console.log("sequence_id column or index already exists or other error:", error.message);
  }
  
  return db;
}
```

### Step 2: Create Population Function

Create a function to populate sequence IDs for existing records that have NULL values.

```javascript
// database.js or similar
async function populateSequenceIds() {
  const db = await getDb();
  
  // Start a transaction for consistency
  await db.run("BEGIN TRANSACTION");
  
  try {
    // List all tables that need sequence IDs
    const tables = ["your_table", "another_table"]; // Add your table names here
    
    // Process each table
    for (const table of tables) {
      // Check if we need to populate sequence IDs for this table
      const unpopulatedCount = await db.get(
        `SELECT COUNT(*) as count FROM ${table} WHERE sequence_id IS NULL`
      );
      
      if (unpopulatedCount.count > 0) {
        console.log(
          `Found ${unpopulatedCount.count} records in ${table} without sequence IDs. Populating...`
        );
        
        // Get the maximum existing sequence_id to avoid conflicts
        const maxSequenceResult = await db.get(
          `SELECT MAX(sequence_id) as max_seq FROM ${table} WHERE sequence_id IS NOT NULL`
        );
        const startSequenceId = (maxSequenceResult?.max_seq || 0) + 1;
        
        // Get records ordered by created_at timestamp (or another appropriate column)
        // Adapt the ORDER BY column if your table uses a different timestamp column
        let orderByColumn = "created_at"; // Change if your table uses different column name
        const records = await db.all(
          `SELECT id FROM ${table} WHERE sequence_id IS NULL ORDER BY ${orderByColumn} ASC`
        );
        
        // Assign sequence IDs sequentially starting from the next available ID
        for (let i = 0; i < records.length; i++) {
          await db.run(`UPDATE ${table} SET sequence_id = ? WHERE id = ?`, [
            startSequenceId + i,
            records[i].id,
          ]);
        }
        
        console.log(
          `Successfully populated sequence IDs for ${records.length} records in ${table} (starting from ${startSequenceId})`
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
  populateSequenceIds, // Export the function
};
```

**Key Points:**
- Uses transactions for data consistency
- Only processes records with NULL sequence_id
- Starts from max existing ID + 1 to avoid conflicts
- Orders by `created_at` to maintain chronological sequence
- Handles multiple tables in a loop

### Step 3: Modify Create Functions

Update your create/insert functions to automatically assign sequence IDs to new records.

#### Example: Create Function

```javascript
// controllers/yourController.js or similar
exports.createRecord = async (req, res) => {
  try {
    const { field1, field2, field3 } = req.body;
    const db = req.db;
    const now = Date.now();
    const id = uuidv4(); // or your ID generation method
    
    // Get the next sequence_id by finding the maximum existing sequence_id
    const maxSequenceResult = await db.get(
      "SELECT MAX(sequence_id) as max_seq FROM your_table WHERE sequence_id IS NOT NULL"
    );
    const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;
    
    // Insert with sequence_id included
    await db.run(
      "INSERT INTO your_table (id, field1, field2, field3, sequence_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, field1, field2, field3, nextSequenceId, now, now]
    );
    
    const record = await db.get("SELECT * FROM your_table WHERE id = ?", id);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Key Points:**
- Query max sequence_id before inserting
- Calculate next sequence ID as `max + 1`
- Include `sequence_id` in INSERT statement
- Handle case where no records exist yet (defaults to 1)

### Step 4: Server Initialization

Call `populateSequenceIds()` during server startup to ensure existing records get sequence IDs.

```javascript
// server.js or main.js
const { initializeDatabase, populateSequenceIds } = require("./database");

// Initialize database
let db;
initializeDatabase()
  .then((database) => {
    db = database;
    console.log("Database initialized successfully");
    return populateSequenceIds();
  })
  .then((result) => {
    console.log("Sequence IDs populated:", result);
  })
  .catch((err) => {
    console.error("Error during initialization:", err);
  });
```

**Key Points:**
- Call after database initialization
- Runs automatically on server startup
- Only processes records with NULL sequence_id
- Safe to run multiple times (idempotent)

## Customization Options

### Different Order Column

If your table doesn't have `created_at`, use a different column for ordering:

```javascript
// In populateSequenceIds()
let orderByColumn = "id"; // or "updated_at", "name", etc.
```

### Multiple Tables

To handle multiple tables, add them to the `tables` array:

```javascript
const tables = ["nodes", "users", "posts", "comments"];
```

### Custom Sequence ID Logic

If you need different sequence ID ranges per category:

```javascript
// Example: Different sequences per category
const maxSequenceResult = await db.get(
  `SELECT MAX(sequence_id) as max_seq 
   FROM your_table 
   WHERE sequence_id IS NOT NULL AND category = ?`,
  category
);
```

## Best Practices

1. **Always Use Transactions**: Wrap sequence ID operations in transactions for data consistency
2. **Index the Column**: Create an index on `sequence_id` for better query performance
3. **Handle NULL Gracefully**: Use `IS NOT NULL` checks when querying max values
4. **Idempotent Operations**: Make sure population function can run multiple times safely
5. **Error Handling**: Always wrap in try-catch and rollback transactions on error
6. **Logging**: Log operations for debugging and monitoring

## Querying by Sequence ID

Once implemented, you can query records by sequence ID:

```javascript
// Get record by sequence ID
const record = await db.get(
  "SELECT * FROM your_table WHERE sequence_id = ?",
  sequenceId
);

// Get records in sequence order
const records = await db.all(
  "SELECT * FROM your_table ORDER BY sequence_id ASC"
);
```

## Troubleshooting

### All Sequence IDs are NULL

**Problem**: Existing records still have NULL sequence_ids after server restart.

**Solution**: 
- Check that `populateSequenceIds()` is being called during initialization
- Verify the function is exported and imported correctly
- Check server logs for errors during population
- Ensure the table name matches exactly (case-sensitive)

### Sequence ID Conflicts

**Problem**: New records get sequence IDs that conflict with existing ones.

**Solution**:
- Ensure `populateSequenceIds()` runs before creating new records
- Verify the max query includes `WHERE sequence_id IS NOT NULL`
- Check for race conditions in concurrent create operations

### Performance Issues

**Problem**: Population is slow on large tables.

**Solution**:
- Ensure index exists on `sequence_id` column
- Consider batching updates for very large datasets
- Run population during off-peak hours for production

## Example: Complete Implementation

Here's a complete example for a `posts` table:

```javascript
// database.js
async function initializeDatabase() {
  const db = await getDb();
  
  // Create table with sequence_id
  await db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      sequence_id INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
  
  // Add sequence_id if table already exists
  try {
    await db.exec(`ALTER TABLE posts ADD COLUMN sequence_id INTEGER;`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_sequence_id ON posts(sequence_id);`);
  } catch (error) {
    console.log("sequence_id column already exists:", error.message);
  }
  
  return db;
}

async function populateSequenceIds() {
  const db = await getDb();
  await db.run("BEGIN TRANSACTION");
  
  try {
    const tables = ["posts"];
    
    for (const table of tables) {
      const unpopulatedCount = await db.get(
        `SELECT COUNT(*) as count FROM ${table} WHERE sequence_id IS NULL`
      );
      
      if (unpopulatedCount.count > 0) {
        const maxSequenceResult = await db.get(
          `SELECT MAX(sequence_id) as max_seq FROM ${table} WHERE sequence_id IS NOT NULL`
        );
        const startSequenceId = (maxSequenceResult?.max_seq || 0) + 1;
        
        const records = await db.all(
          `SELECT id FROM ${table} WHERE sequence_id IS NULL ORDER BY created_at ASC`
        );
        
        for (let i = 0; i < records.length; i++) {
          await db.run(`UPDATE ${table} SET sequence_id = ? WHERE id = ?`, [
            startSequenceId + i,
            records[i].id,
          ]);
        }
        
        console.log(`Populated ${records.length} sequence IDs for ${table}`);
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

// controllers/postController.js
exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    const db = req.db;
    const now = Date.now();
    const id = uuidv4();
    
    // Get next sequence ID
    const maxSequenceResult = await db.get(
      "SELECT MAX(sequence_id) as max_seq FROM posts WHERE sequence_id IS NOT NULL"
    );
    const nextSequenceId = (maxSequenceResult?.max_seq || 0) + 1;
    
    await db.run(
      "INSERT INTO posts (id, title, content, sequence_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, title, content, nextSequenceId, now, now]
    );
    
    const post = await db.get("SELECT * FROM posts WHERE id = ?", id);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// server.js
initializeDatabase()
  .then((db) => {
    console.log("Database initialized");
    return populateSequenceIds();
  })
  .then((result) => {
    console.log("Sequence IDs ready:", result);
  });
```

## Summary

The Sequence ID system provides:
- ✅ Automatic assignment for new records
- ✅ Population for existing records
- ✅ Conflict-free ID generation
- ✅ Stable, sequential identifiers
- ✅ Easy integration into existing codebases

Follow the steps above to implement this system in your project!

