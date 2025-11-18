# Graph Visualization Plugin

## Overview

The Graph Visualization Plugin (`portable-local-graph`) is an optional feature that provides a visual representation of your note hierarchy in Luhmann Roam. It displays your notes as nodes and their parent-child relationships as edges in an interactive canvas.

## Features

### Core Visualization
- **Interactive Canvas**: HTML5 Canvas-based rendering for smooth performance
- **Node Representation**: Each note is displayed as a circular node with a truncated label
- **Edge Display**: Parent-child relationships shown as connecting lines
- **Tooltips**: Hover over nodes to see the full note content

### Interaction Modes

1. **Select Mode** (Default)
   - Click and drag nodes to reposition them
   - Click on nodes or edges to select them
   - Right-click for context menu options

2. **Add Node Mode**
   - Click anywhere on the canvas to create new nodes
   - Manually build custom graphs

3. **Add Edge Mode**
   - Click two nodes in sequence to create a connection
   - Build custom relationships between nodes

### Data Management

- **Load from App**: Automatically fetches your note hierarchy from the database
- **Save/Load JSON**: Export and import graph layouts as JSON files
- **Clear**: Reset the canvas to start fresh

## Usage

### Opening the Plugin

1. Start Luhmann Roam normally
2. Look for the **"📊 Graph View"** button in the sidebar
3. Click the button to open the graph in a new window
4. The plugin will automatically load your notes on launch

### Basic Operations

**Viewing Your Notes:**
- The graph loads automatically with all your notes
- Hover over any node to see the full note content
- Parent-child relationships are shown as connecting lines

**Rearranging the Layout:**
1. Ensure you're in Select mode (default)
2. Click and drag nodes to reposition them
3. The layout is saved when you export to JSON

**Editing Elements:**
1. Right-click on a node or edge
2. Select "Edit" from the context menu
3. Modify properties:
   - Nodes: Change label and color
   - Edges: Adjust weight (affects line thickness)

**Saving Your Layout:**
1. Click the "Save" button in the toolbar
2. A JSON file will be downloaded with your current layout
3. Use "Load" to restore a saved layout later

## Technical Details

### Architecture

The plugin consists of three main files:

1. **index.html**: UI structure and layout
2. **graph.js**: Core graph rendering and canvas operations
3. **app.js**: Event handling and application logic

### Integration Components

1. **API Endpoint**: `/api/nodes/graph/data`
   - Defined in `controllers/nodeController.js`
   - Exports all nodes with parent-child relationships
   - Returns data in graph-compatible format

2. **Launcher Script**: `public/js/graphPluginLauncher.js`
   - Adds the launch button to the sidebar
   - Opens the graph in a popup window
   - Manages window lifecycle

3. **Route Registration**: `routes/nodeRoutes.js`
   - Registers the graph data endpoint
   - Must be placed before `/:id` route to avoid conflicts

### Data Flow

```
User clicks "Graph View" button
    ↓
Launcher opens popup window
    ↓
Graph plugin initializes
    ↓
Fetches data from /api/nodes/graph/data
    ↓
Controller queries database for all nodes
    ↓
Transforms node hierarchy to graph format
    ↓
Returns nodes with positions + edges
    ↓
Graph renders on canvas
```

### Node Positioning Algorithm

The plugin uses a deterministic hash-based algorithm to position nodes:

```javascript
const hash = node.id.split('').reduce((acc, char) => 
  acc + char.charCodeAt(0), 0);
const angle = (hash % 360) * (Math.PI / 180);
const radius = 150 + ((hash % 200));

x = 400 + radius * Math.cos(angle);
y = 300 + radius * Math.sin(angle);
```

This ensures:
- Consistent positioning for the same node ID
- Even distribution around the canvas center
- Repeatable layouts across sessions

### Edge Weight Visualization

Edge thickness is inversely proportional to weight:

```javascript
lineWidth = Math.max(0.5, 8 - (weight * 0.7));
```

- Higher weight = thinner line (represents "closer" relationships)
- Lower weight = thicker line
- Minimum thickness: 0.5px

## Data Format

### Graph Data Response

```json
{
  "nodes": [
    {
      "id": "uuid-string",
      "x": 450,
      "y": 320,
      "label": "Truncated note content...",
      "color": "#3b82f6",
      "radius": 20,
      "fullContent": "Complete note content here"
    }
  ],
  "edges": [
    {
      "id": "parent-id-child-id",
      "from": "parent-uuid",
      "to": "child-uuid",
      "weight": 1.0
    }
  ],
  "metadata": {
    "totalNodes": 42,
    "totalEdges": 35,
    "exportedAt": "2025-11-18T12:34:56.789Z"
  }
}
```

### Saved Graph Format

When you save a graph layout, it uses the same format minus metadata:

```json
{
  "nodes": [...],
  "edges": [...]
}
```

This allows you to:
- Save custom layouts
- Create manual graph structures
- Mix imported and custom data

## Standalone Mode

The plugin can also run standalone for testing or custom use:

1. Open `portable-local-graph/index.html` directly in a browser
2. Use "Load from App" button to fetch data from localhost:3000
3. Or create graphs manually using Add Node/Edge modes

This is useful for:
- Testing the plugin independently
- Creating custom visualizations
- Demonstrating the graph functionality

## Future Enhancements

Potential improvements for future versions:

- **Force-Directed Layout**: Automatic graph layout using physics simulation
- **Zoom and Pan**: Navigate large graphs more easily
- **Search and Filter**: Find specific nodes quickly
- **Node Clustering**: Group related notes visually
- **Export to Image**: Save graph as PNG/SVG
- **Custom Node Shapes**: Different shapes for different note types
- **Minimap**: Overview of large graphs
- **Animation**: Smooth transitions when data updates

## Troubleshooting

### Plugin Window Won't Open
- Check browser popup blocker settings
- Ensure Luhmann Roam is running properly

### "Load from App" Fails
- Verify the server is running on http://localhost:3000
- Check browser console for CORS or network errors
- Ensure the API endpoint is properly registered

### Nodes Not Displaying
- Check if you have any notes in the database
- Verify the API returns valid data (check browser Network tab)
- Look for JavaScript errors in the console

### Performance Issues
- Large graphs (1000+ nodes) may be slow
- Try saving subsets of your graph
- Consider filtering nodes in the API endpoint

## Contributing

When contributing to the graph plugin:

1. Test both integrated and standalone modes
2. Ensure backward compatibility with saved graph files
3. Maintain the simple, dependency-free architecture
4. Update this documentation for any new features

## Related Files

- `portable-local-graph/` - Plugin source files
- `public/js/graphPluginLauncher.js` - Integration launcher
- `controllers/nodeController.js` - Graph data API
- `routes/nodeRoutes.js` - API route registration

