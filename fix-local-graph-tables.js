const { initializeDatabase, getDb } = require('./database');

async function fixLocalGraphTables() {
    console.log('Starting local graph tables verification and creation...');
    
    try {
        // Initialize database to ensure all tables exist
        console.log('Initializing database...');
        await initializeDatabase();
        
        // Get database connection
        const db = await getDb();
        
        // Check if local graph pool tables exist
        console.log('Checking for local_graph_pool table...');
        const poolTableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='local_graph_pool'
        `);
        
        console.log('Checking for local_graph_pool_links table...');
        const poolLinksTableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='local_graph_pool_links'
        `);
        
        if (poolTableExists) {
            console.log('✓ local_graph_pool table exists');
        } else {
            console.log('✗ local_graph_pool table missing - creating...');
            await db.exec(`
                CREATE TABLE IF NOT EXISTS local_graph_pool (
                    id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    added_at INTEGER DEFAULT (strftime('%s', 'now')),
                    added_by TEXT,
                    notes TEXT,
                    sequence_id INTEGER,
                    FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE,
                    UNIQUE(node_id)
                )
            `);
            console.log('✓ local_graph_pool table created');
        }
        
        if (poolLinksTableExists) {
            console.log('✓ local_graph_pool_links table exists');
        } else {
            console.log('✗ local_graph_pool_links table missing - creating...');
            await db.exec(`
                CREATE TABLE IF NOT EXISTS local_graph_pool_links (
                    id TEXT PRIMARY KEY,
                    link_id TEXT NOT NULL,
                    added_at INTEGER DEFAULT (strftime('%s', 'now')),
                    added_by TEXT,
                    weight_override REAL,
                    sequence_id INTEGER,
                    FOREIGN KEY (link_id) REFERENCES links (id) ON DELETE CASCADE,
                    UNIQUE(link_id)
                )
            `);
            console.log('✓ local_graph_pool_links table created');
        }
        
        // Create indices
        console.log('Creating indices...');
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_local_graph_pool_node ON local_graph_pool(node_id);
            CREATE INDEX IF NOT EXISTS idx_local_graph_pool_added_at ON local_graph_pool(added_at);
            CREATE INDEX IF NOT EXISTS idx_local_graph_pool_links_link ON local_graph_pool_links(link_id);
        `);
        console.log('✓ Indices created');
        
        // List all tables to confirm
        console.log('\nAll tables in database:');
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `);
        
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
        // Verify table schemas
        console.log('\nLocal graph pool table schema:');
        if (poolTableExists || !poolTableExists) { // Always check after creation
            const poolSchema = await db.all('PRAGMA table_info(local_graph_pool)');
            poolSchema.forEach(col => {
                console.log(`  ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
            });
        }
        
        console.log('\nLocal graph pool links table schema:');
        if (poolLinksTableExists || !poolLinksTableExists) { // Always check after creation
            const poolLinksSchema = await db.all('PRAGMA table_info(local_graph_pool_links)');
            poolLinksSchema.forEach(col => {
                console.log(`  ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
            });
        }
        
        console.log('\n✅ Local graph tables verification and creation completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing local graph tables:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the fix
fixLocalGraphTables().then(() => {
    console.log('Script completed');
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});