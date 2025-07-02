# Global Graph Explorer

A comprehensive graph visualization module that provides complete overview of the entire knowledge graph with multiple layout algorithms and centrality analysis.

## Features

### Multiple Layout Algorithms
- **Force-Directed Layout**: Physics-based simulation for natural node positioning
- **Circular Layout**: Nodes arranged in a circle for equal visibility
- **Hierarchical Layout**: Tree-like structure based on node relationships

### Centrality Analysis
- **Degree Centrality**: Number of direct connections
- **Betweenness Centrality**: Nodes that act as bridges between other nodes
- **Closeness Centrality**: How close a node is to all other nodes
- **PageRank Centrality**: Google's PageRank algorithm adapted for knowledge graphs
- **Eigenvector Centrality**: Influence based on connections to other influential nodes

### Interactive Features
- **Real-time Search**: Find nodes quickly with highlighted results
- **Node Selection**: Click nodes to see detailed metrics
- **Zoom and Pan**: Navigate large graphs smoothly
- **Community Detection**: Automatically identify node clusters
- **Rankings**: Top nodes by centrality measures

### Integration
- **Outliner Focus**: Jump from graph nodes to outliner
- **Local Graph Bridge**: Explore neighborhoods with Local Graph Manager
- **Plugin System**: Enabled/disabled via Plugin Manager

## API Endpoints

### GET `/api/global-graph`
Load complete graph with analysis
- `layout`: Layout algorithm (force-directed, circular, hierarchical)
- `includeCentrality`: Calculate centrality measures
- `includeLayout`: Pre-calculate layout positions
- `maxNodes`: Limit number of nodes (default: 1000)

### GET `/api/global-graph/stats`
Get graph statistics and degree distribution

### GET `/api/global-graph/centrality/:measure`
Calculate specific centrality measure
- Measures: degree, betweenness, closeness, pagerank, eigenvector

### GET `/api/global-graph/search`
Search nodes by content
- `q`: Search query
- `limit`: Maximum results (default: 20)

### GET `/api/global-graph/nodes/:nodeId/neighbors`
Get node neighbors up to specified depth
- `depth`: Maximum depth (default: 1)

## Usage

1. **Enable Plugin**: Ensure "Global Graph Explorer" is enabled in Plugin Manager
2. **Open Interface**: Click the 🌐 button in the sidebar
3. **Load Graph**: Click "Load Graph" to fetch and visualize data
4. **Choose Layout**: Select layout algorithm from dropdown
5. **Analyze Centrality**: Choose centrality measure and click "Analyze"
6. **Explore**: Search, select nodes, and view rankings

## Technical Implementation

### Backend (`globalGraphController.js`)
- Implements graph algorithms in JavaScript
- Calculates centrality measures using standard algorithms
- Provides multiple layout calculations
- Handles large graphs efficiently with caching

### Frontend (`globalGraphManager.js`)
- D3.js-based visualization
- Interactive zoom and pan
- Real-time search and filtering
- Responsive design with sidebar

### Styling (`global-graph-manager.css`)
- Modern, clean interface
- Dark mode support
- Mobile responsive
- Accessibility features

## Performance Notes

- Centrality calculations are computationally intensive for large graphs
- Results are cached for 10 minutes to improve performance
- Force-directed layout uses iterative simulation (300 iterations)
- Maximum node limit prevents browser performance issues

## Future Enhancements

- [ ] Graph clustering algorithms (Louvain, Leiden)
- [ ] Export visualizations as images
- [ ] Time-based graph evolution
- [ ] Custom layout algorithms
- [ ] Graph comparison tools
- [ ] Advanced filtering options