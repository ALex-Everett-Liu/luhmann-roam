# Graph Plugin Architecture

## Overview

The portable-local-graph plugin is a **completely independent** application that runs alongside (but separate from) the main Luhmann Roam application. It has its own server, database, and data model.

## Independence Model

```
┌─────────────────────────────┐    ┌──────────────────────────────┐
│   Main Luhmann Roam App     │    │   Graph Plugin               │
├─────────────────────────────┤    ├──────────────────────────────┤
│ Port: 3000                  │    │ Port: 3001                   │
│ Database: outliner.db       │    │ Database: graph.db           │
│ Purpose: Note management    │    │ Purpose: Graph visualization │
│                             │    │                              │
│ ❌ NO DATA SHARING ─────────┼────┼──────────────────────────── │
│                             │    │                              │
│ Has: Launcher Button ───────┼───→│ Opens plugin in new window   │
└─────────────────────────────┘    └──────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: Express.js
- **Database**: SQLite3 (via sqlite + sqlite3 packages)
- **API Style**: RESTful
- **Port**: 3001
- **CORS**: Enabled for local development

### Frontend
- **Rendering**: HTML5 Canvas API
- **JavaScript**: Vanilla ES6+
- **No Framework**: Pure JavaScript for simplicity
- **UI**: Custom HTML/CSS

### Data Layer
- **ORM**: None (direct SQL queries)
- **Connection**: sqlite package with async/await
- **Migrations**: Auto-create tables on first run
- **Foreign Keys**: Enabled for referential integrity

## File Structure

```
portable-local-graph/
│
├── Backend Layer
│   ├── graph-server.js          # Express app & API endpoints
│   ├── graph-database.js        # Database connection & initialization
│   └── graph.db                 # SQLite database (created at runtime)
│
├── Frontend Layer
│   ├── index.html               # UI structure & toolbar
│   ├── app.js                   # Application logic & event handling
│   └── graph.js                 # Canvas rendering & graph operations
│
└── Documentation
    ├── README.md                # Complete documentation
    ├── QUICK_START.md           # Getting started guide
    └── ARCHITECTURE.md          # This file
```

## Data Flow

### Creating a Node

```
User clicks "Add Node" → Clicks on canvas
          ↓
    graph.js: addNode()
    - Creates node object
    - Renders on canvas
    - Calls callback
          ↓
    app.js: saveNodeToDb()
    - POST /api/graph/nodes
          ↓
    graph-server.js
    - INSERT INTO graph_nodes
          ↓
    graph.db
    - Node persisted
```

### Loading Graph on Startup

```
Page loads → init()
          ↓
    loadGraphFromDb()
    - GET /api/graph
          ↓
    graph-server.js
    - SELECT * FROM graph_nodes
    - SELECT * FROM graph_edges
          ↓
    Returns JSON
          ↓
    graph.importData()
    - Renders nodes
    - Renders edges
    - Graph displayed
```

### Updating Node Position

```
User drags node → MouseMove
          ↓
    graph.js: handleMouseMove()
    - Updates node.x, node.y
    - Re-renders
          ↓
    User releases → MouseUp
          ↓
    graph.js: handleMouseUp()
    - Calls callback
          ↓
    app.js: updateNodeInDb()
    - PUT /api/graph/nodes/:id
          ↓
    graph-server.js
    - UPDATE graph_nodes SET x=?, y=?
          ↓
    graph.db
    - Position saved
```

## API Architecture

### RESTful Design

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/graph` | Fetch all nodes & edges |
| POST | `/api/graph/nodes` | Create new node |
| PUT | `/api/graph/nodes/:id` | Update node properties |
| DELETE | `/api/graph/nodes/:id` | Delete node |
| POST | `/api/graph/edges` | Create new edge |
| PUT | `/api/graph/edges/:id` | Update edge weight |
| DELETE | `/api/graph/edges/:id` | Delete edge |
| DELETE | `/api/graph/clear` | Clear all data |
| POST | `/api/graph/import` | Bulk import |

### Request/Response Format

All requests/responses use JSON:

**Create Node Request:**
```json
POST /api/graph/nodes
{
  "id": "1234567890.123",
  "x": 450,
  "y": 320,
  "label": "My Node",
  "color": "#3b82f6",
  "radius": 20,
  "full_content": "My Node with full text"
}
```

**Get All Data Response:**
```json
GET /api/graph
{
  "nodes": [ {...}, {...} ],
  "edges": [ {...}, {...} ],
  "metadata": {
    "totalNodes": 5,
    "totalEdges": 4,
    "exportedAt": "2025-11-18T..."
  }
}
```

## Database Schema

### Normalized Design

```sql
graph_nodes                          graph_edges
┌─────────────────┐                 ┌──────────────────┐
│ id (PK)         │◄────────────────┤ from_node_id(FK) │
│ x               │                 │ to_node_id  (FK) │
│ y               │                 │ weight           │
│ label           │                 │ id (PK)          │
│ color           │                 │ created_at       │
│ radius          │                 │ updated_at       │
│ full_content    │                 └──────────────────┘
│ created_at      │
│ updated_at      │
└─────────────────┘
```

### Foreign Key Constraints

- `graph_edges.from_node_id` → `graph_nodes.id` (CASCADE DELETE)
- `graph_edges.to_node_id` → `graph_nodes.id` (CASCADE DELETE)

This ensures:
- Deleting a node automatically deletes its edges
- No orphaned edges
- Referential integrity maintained

### Indexes

```sql
CREATE INDEX idx_graph_edges_from ON graph_edges(from_node_id);
CREATE INDEX idx_graph_edges_to ON graph_edges(to_node_id);
```

Benefits:
- Fast edge lookup by source node
- Fast edge lookup by target node
- Efficient cascade deletes

## Callback System

The Graph class uses callbacks to trigger database persistence:

```javascript
// graph.js
class Graph {
  constructor(canvas, callbacks = {}) {
    this.callbacks = callbacks;
  }
  
  addNode(x, y, label, color) {
    const node = { /*...*/ };
    this.nodes.push(node);
    this.render();
    
    if (this.callbacks.onNodeCreate) {
      this.callbacks.onNodeCreate(node); // ← Triggers persistence
    }
  }
}

// app.js
const graph = new Graph(canvas, {
  onNodeCreate: saveNodeToDb,      // ← Database operation
  onNodeUpdate: updateNodeInDb,
  onNodeDelete: deleteNodeFromDb,
  onEdgeCreate: saveEdgeToDb,
  onEdgeUpdate: updateEdgeInDb,
  onEdgeDelete: deleteEdgeFromDb
});
```

This design:
- Separates rendering logic from persistence
- Makes Graph class reusable
- Enables different persistence strategies
- Keeps concerns separated

## Integration with Main App

### Launcher Button

```javascript
// public/js/graphPluginLauncher.js

class GraphPluginLauncher {
  async openGraphModal() {
    // 1. Check if plugin server is running
    const response = await fetch('http://localhost:3001/api/graph');
    
    if (!response.ok) {
      // 2. Show instructions if not running
      alert('Start plugin: node graph-server.js');
      return;
    }
    
    // 3. Load plugin in iframe within modal
    this.iframe.src = 'http://localhost:3001/index.html';
    
    // 4. Show modal
    this.modal.classList.add('visible');
  }
  
  toggleFullscreen() {
    this.modal.classList.toggle('fullscreen');
  }
}
```

**Key Points:**
- Launcher is in main app
- Plugin loads in iframe within modal
- Modal features: fullscreen toggle, close button
- Plugin runs independently
- No data synchronization
- Health check before opening
- Clear error messages
- ESC key closes modal or exits fullscreen

## Deployment Considerations

### Development
```bash
# Terminal 1: Main app
npm start

# Terminal 2: Graph plugin
npm run graph-plugin
```

### Production

For production deployment:

1. **Main App**: Deploy normally (ports 3000/3003)
2. **Graph Plugin**: Deploy as separate service on port 3001
3. **Update URLs**: Change `API_BASE` in `app.js` to production URL
4. **CORS**: Configure CORS for production domains
5. **SSL**: Both services should use HTTPS

### Docker

Example docker-compose.yml:

```yaml
version: '3'
services:
  main-app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./outliner.db:/app/outliner.db
  
  graph-plugin:
    build: ./portable-local-graph
    ports:
      - "3001:3001"
    volumes:
      - ./portable-local-graph/graph.db:/app/graph.db
```

## Performance Characteristics

### Scalability
- **Nodes**: Tested up to 1000 nodes
- **Edges**: Tested up to 2000 edges
- **Canvas**: Re-renders on demand only
- **Database**: SQLite performs well for this use case

### Bottlenecks
1. **Canvas rendering**: Large graphs may slow down
2. **Network**: Each operation is a separate API call
3. **Database**: Not optimized for extremely large graphs

### Optimization Opportunities
- Batch API calls
- Canvas viewport culling
- Virtual rendering for large graphs
- WebGL for better performance
- IndexedDB for offline support

## Security Considerations

### Current State (Development)
- No authentication
- No authorization
- CORS fully open
- No input validation
- No rate limiting

### Production Recommendations
1. **Authentication**: Add API key or JWT
2. **Input Validation**: Sanitize all inputs
3. **Rate Limiting**: Prevent abuse
4. **CORS**: Restrict to known domains
5. **SQL Injection**: Use parameterized queries (already done)
6. **XSS**: Sanitize user content before rendering

## Future Enhancements

### Planned Features
- Force-directed layout algorithm
- Zoom and pan controls
- Node search and filtering
- Export to PNG/SVG
- Undo/redo functionality
- Collaborative editing (WebSockets)
- Custom node shapes
- Graph templates
- Animation system

### Technical Improvements
- TypeScript migration
- Unit tests
- Integration tests
- CI/CD pipeline
- Performance monitoring
- Error tracking
- Backup system

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change port
```

**Database locked:**
```
Error: SQLITE_BUSY: database is locked
```
→ Close other connections or restart server

**Canvas not rendering:**
- Check browser console for errors
- Verify graph.js loaded correctly
- Ensure callbacks are defined

**Data not persisting:**
- Check server console for errors
- Verify database file permissions
- Check API responses in Network tab

## Development Workflow

### Making Changes

1. **Backend changes**: Edit `graph-server.js` or `graph-database.js`
   - Restart server: Ctrl+C, then `node graph-server.js`

2. **Frontend changes**: Edit `index.html`, `app.js`, or `graph.js`
   - Just refresh browser (F5)

3. **Database schema**: Edit `graph-database.js`
   - Delete `graph.db` file
   - Restart server (recreates tables)

### Testing

Manual testing checklist:
- [ ] Create node
- [ ] Move node
- [ ] Edit node
- [ ] Delete node
- [ ] Create edge
- [ ] Edit edge
- [ ] Delete edge
- [ ] Save to file
- [ ] Load from file
- [ ] Clear all

## Contributing

When contributing:
1. Maintain data independence
2. Keep no-framework approach
3. Document API changes
4. Test all CRUD operations
5. Update this architecture doc

## License

Part of Luhmann Roam project (MIT License)

