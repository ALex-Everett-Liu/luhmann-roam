# Portable Local Graph - Independent Plugin

A completely independent graph visualization tool with its own database. This plugin uses the main app server but maintains its own separate database for complete data isolation.

## Key Features

- **Independent Database**: Uses `graph.db` - completely separate from main app
- **Shared Server**: Uses main app server (no separate server needed)
- **Persistent Storage**: All nodes and edges are automatically saved to database
- **Interactive Canvas**: Drag, create, and edit nodes and edges
- **File Import/Export**: Save and load graph layouts as JSON
- **Real-time Updates**: All changes instantly persisted to database
- **Tooltips**: Hover over nodes to see full content

## Architecture

```
Main App Server (Port 3003)
├── API Routes: /api/plugins/graph/*  # Graph plugin API endpoints
├── Static Files: /plugins/graph/*    # Graph plugin UI files
└── Database: graph.db (SQLite)       # Plugin's own database
```

**Data Independence:**
```
Main App Database: outliner.db        # Main app data
Graph Plugin Database: graph.db        # Plugin data (separate)
```

## Installation

The plugin requires the same dependencies as the main app (already installed):

```bash
# Dependencies already available:
# - express
# - cors
# - sqlite
# - sqlite3
```

## Usage

### Starting the Plugin

**The graph plugin is integrated into the main app - no separate server needed!**

1. **Start the main app**:
   ```bash
   npm start
   ```

2. You'll see the server starting with graph plugin initialized:
   ```
   Server running on port 3003
   Graph plugin database initialized
   Graph plugin available at /plugins/graph/index.html
   ```

3. **Open the plugin**:
   - Click the "📊 Graph Plugin" button in the main app's sidebar
   - The plugin opens in a modal dialog inside the app
   - Use the ⛶ button to toggle fullscreen

**Note**: The plugin uses the main app server - just one server process!

### Basic Operations

#### Creating Nodes
1. Click the "Add Node" button in toolbar
2. Click anywhere on the canvas
3. Node is automatically saved to database

#### Creating Edges
1. Click the "Add Edge" button in toolbar
2. Click the first node (source)
3. Click the second node (target)
4. Edge is automatically saved to database

#### Moving Nodes
1. Ensure "Select" mode is active (default)
2. Click and drag any node
3. New position is saved when you release the mouse

#### Editing Elements
1. Right-click on a node or edge
2. Select "Edit" from the context menu
3. Modify properties:
   - **Nodes**: Change label and color
   - **Edges**: Adjust weight (affects line thickness)
4. Changes are saved immediately

#### Deleting Elements
1. Right-click on a node or edge
2. Select "Delete" from the context menu
3. Deletion is saved to database immediately

### File Operations

#### Export to JSON
- Click "Save" button to export current graph as JSON file
- Use this to backup your graph or share with others

#### Import from JSON
- Click "Load" button to import a JSON file
- The imported data replaces all current data in the database
- Previous data is overwritten

#### Clear Graph
- Click "Clear" button to delete all nodes and edges
- This permanently removes all data from the database

## Database Schema

### graph_nodes Table
```sql
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  x REAL NOT NULL,                -- X coordinate
  y REAL NOT NULL,                -- Y coordinate
  label TEXT NOT NULL,            -- Display label
  color TEXT DEFAULT '#3b82f6',  -- Node color
  radius REAL DEFAULT 20,         -- Node size
  full_content TEXT,              -- Full text content
  created_at INTEGER,
  updated_at INTEGER
)
```

### graph_edges Table
```sql
CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL,     -- Source node
  to_node_id TEXT NOT NULL,       -- Target node
  weight REAL DEFAULT 1.0,        -- Edge weight
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (from_node_id) REFERENCES graph_nodes(id),
  FOREIGN KEY (to_node_id) REFERENCES graph_nodes(id)
)
```

## API Endpoints

The plugin exposes a RESTful API through the main server at `/api/plugins/graph`:

### Get All Graph Data
```
GET /api/plugins/graph
```
Returns all nodes and edges

### Create Node
```
POST /api/plugins/graph/nodes
Body: { id, x, y, label, color, radius, full_content }
```

### Update Node
```
PUT /api/plugins/graph/nodes/:id
Body: { x, y, label, color, radius, full_content }
```

### Delete Node
```
DELETE /api/plugins/graph/nodes/:id
```

### Create Edge
```
POST /api/plugins/graph/edges
Body: { id, from_node_id, to_node_id, weight }
```

### Update Edge
```
PUT /api/plugins/graph/edges/:id
Body: { weight }
```

### Delete Edge
```
DELETE /api/plugins/graph/edges/:id
```

### Clear All Data
```
DELETE /api/plugins/graph/clear
```

### Import Data (Bulk)
```
POST /api/plugins/graph/import
Body: { nodes: [...], edges: [...] }
```

## Integration with Main App

The main Luhmann Roam app includes a launcher button:

1. Button appears in the sidebar: "📊 Graph Plugin"
2. Clicking it checks if the plugin API is available
3. Opens the plugin in a modal dialog inside the app
4. Modal features:
   - ⛶ Fullscreen button - Expand to fullscreen or restore
   - ✕ Close button - Close the plugin
   - Click outside modal - Close the plugin
   - ESC key - Exit fullscreen or close the plugin

The plugin uses the main app server but has its own database - data remains completely independent.

## Data Independence

**Important**: The graph plugin has NO connection to the main app's data:

- ✅ Plugin uses `graph.db`
- ✅ Main app uses `outliner.db`
- ✅ No shared tables or data
- ✅ No automatic syncing
- ✅ Complete data isolation

This means:
- You can use the graph tool for completely different purposes
- Create mind maps, diagrams, or any other graph structures
- No risk of affecting your main notes database
- Can be used as a standalone tool even without the main app

## Use Cases

### 1. Mind Mapping
Create visual mind maps independent of your notes

### 2. Concept Mapping
Build concept diagrams with relationships

### 3. Network Diagrams
Design network topologies or system architectures

### 4. Flow Charts
Create process flows and decision trees

### 5. Relationship Mapping
Map relationships between entities

## Keyboard Shortcuts

While focused on canvas:
- **ESC**: Return to Select mode
- **Right-click**: Context menu for edit/delete

## Troubleshooting

### Plugin button shows "API not responding"
→ Make sure the main app server is running (`npm start`)

### Changes not saving
→ Check the server console for error messages
→ Ensure `graph.db` file permissions are correct

### Database file location
→ `plugins/graph/graph.db` (created automatically on first run)

## Development

### Running the Plugin
The plugin runs as part of the main app:
```bash
npm start
# Plugin available at http://localhost:3003/plugins/graph/index.html
```

### API Base URL
The plugin uses relative paths, so it works with the main server automatically:
```javascript
const API_BASE = '/api/plugins/graph';
```

## Technical Details

- **Backend**: Express.js with SQLite
- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Database**: SQLite with foreign key constraints
- **Persistence**: Automatic on every operation
- **No Dependencies**: Pure JavaScript, no frameworks

## File Structure

```
plugins/graph/
├── graph-server.js       # Express server
├── graph-database.js     # Database layer
├── index.html            # UI structure
├── graph.js              # Canvas rendering
├── app.js                # Application logic
├── graph.db              # SQLite database (created on first run)
└── README.md             # This file
```

## Browser Compatibility

Works in modern browsers that support:
- HTML5 Canvas
- ES6+ JavaScript
- Fetch API
- Async/await

## License

Part of the Luhmann Roam project (MIT License)
