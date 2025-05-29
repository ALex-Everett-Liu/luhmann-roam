/**
 * Server-side graph analysis engine
 * Provides Neo4j-like graph algorithms
 */

class GraphAnalyzer {
  
    /**
     * Calculate graph density
     */
    static calculateDensity(vertexCount, edgeCount) {
      if (vertexCount < 2) return 0;
      const maxEdges = vertexCount * (vertexCount - 1);
      return (2 * edgeCount) / maxEdges;
    }
    
    /**
     * PageRank algorithm implementation
     */
    static async calculatePageRank(vertices, edges, damping = 0.85, iterations = 100) {
      const vertexIds = vertices.map(v => v.id);
      const n = vertexIds.length;
      
      // Initialize PageRank values
      const pagerank = {};
      vertexIds.forEach(id => {
        pagerank[id] = 1.0 / n;
      });
      
      // Build adjacency lists
      const outLinks = {};
      const inLinks = {};
      vertexIds.forEach(id => {
        outLinks[id] = [];
        inLinks[id] = [];
      });
      
      edges.forEach(edge => {
        outLinks[edge.source_vertex_id].push(edge.target_vertex_id);
        inLinks[edge.target_vertex_id].push(edge.source_vertex_id);
      });
      
      // Iterative calculation
      for (let i = 0; i < iterations; i++) {
        const newPagerank = {};
        
        vertexIds.forEach(id => {
          let sum = 0;
          inLinks[id].forEach(sourceId => {
            const outDegree = outLinks[sourceId].length;
            if (outDegree > 0) {
              sum += pagerank[sourceId] / outDegree;
            }
          });
          newPagerank[id] = (1 - damping) / n + damping * sum;
        });
        
        // Check convergence
        let converged = true;
        vertexIds.forEach(id => {
          if (Math.abs(newPagerank[id] - pagerank[id]) > 0.0001) {
            converged = false;
          }
          pagerank[id] = newPagerank[id];
        });
        
        if (converged) break;
      }
      
      return pagerank;
    }
    
    /**
     * Betweenness centrality
     */
    static async calculateBetweennessCentrality(vertices, edges) {
      const vertexIds = vertices.map(v => v.id);
      const betweenness = {};
      vertexIds.forEach(id => { betweenness[id] = 0; });
      
      // Build adjacency list
      const graph = {};
      vertexIds.forEach(id => { graph[id] = []; });
      edges.forEach(edge => {
        graph[edge.source_vertex_id].push(edge.target_vertex_id);
        // For undirected graphs, add reverse edge
        if (edge.direction === 'undirected') {
          graph[edge.target_vertex_id].push(edge.source_vertex_id);
        }
      });
      
      // Brandes algorithm for betweenness centrality
      for (const s of vertexIds) {
        const stack = [];
        const paths = {};
        const dist = {};
        const delta = {};
        
        vertexIds.forEach(id => {
          paths[id] = [];
          dist[id] = -1;
          delta[id] = 0;
        });
        
        dist[s] = 0;
        const queue = [s];
        
        while (queue.length > 0) {
          const v = queue.shift();
          stack.push(v);
          
          for (const w of graph[v] || []) {
            if (dist[w] < 0) {
              queue.push(w);
              dist[w] = dist[v] + 1;
            }
            if (dist[w] === dist[v] + 1) {
              paths[w].push(v);
            }
          }
        }
        
        while (stack.length > 0) {
          const w = stack.pop();
          for (const v of paths[w]) {
            delta[v] += (1 + delta[w]);
          }
          if (w !== s) {
            betweenness[w] += delta[w];
          }
        }
      }
      
      // Normalize
      const n = vertexIds.length;
      const normFactor = 2.0 / ((n - 1) * (n - 2));
      vertexIds.forEach(id => {
        betweenness[id] *= normFactor;
      });
      
      return betweenness;
    }
    
    /**
     * Louvain community detection
     */
    static async detectCommunities(vertices, edges, algorithm = 'louvain') {
      if (algorithm === 'louvain') {
        return this.louvainCommunityDetection(vertices, edges);
      }
      throw new Error(`Algorithm ${algorithm} not implemented`);
    }
    
    static louvainCommunityDetection(vertices, edges) {
      // Simplified Louvain implementation
      const vertexIds = vertices.map(v => v.id);
      const communities = {};
      
      // Initialize each vertex in its own community
      vertexIds.forEach((id, index) => {
        communities[id] = index;
      });
      
      // Build weighted adjacency matrix
      const weights = {};
      edges.forEach(edge => {
        const key = `${edge.source_vertex_id}_${edge.target_vertex_id}`;
        weights[key] = edge.weight || 1.0;
        
        if (edge.direction === 'undirected') {
          const reverseKey = `${edge.target_vertex_id}_${edge.source_vertex_id}`;
          weights[reverseKey] = edge.weight || 1.0;
        }
      });
      
      // Calculate modularity
      const totalEdges = edges.reduce((sum, edge) => sum + (edge.weight || 1.0), 0);
      
      // This is a simplified version - full Louvain is more complex
      const modularity = this.calculateModularity(vertices, edges, communities, totalEdges);
      
      // Group communities
      const communityGroups = {};
      Object.entries(communities).forEach(([vertexId, communityId]) => {
        if (!communityGroups[communityId]) {
          communityGroups[communityId] = [];
        }
        communityGroups[communityId].push(vertexId);
      });
      
      return {
        assignments: communities,
        modularity,
        summary: communityGroups
      };
    }
    
    static calculateModularity(vertices, edges, communities, totalEdges) {
      // Simplified modularity calculation
      let modularity = 0;
      const m = totalEdges;
      
      vertices.forEach(v1 => {
        vertices.forEach(v2 => {
          if (v1.id !== v2.id && communities[v1.id] === communities[v2.id]) {
            // Same community
            const edge = edges.find(e => 
              (e.source_vertex_id === v1.id && e.target_vertex_id === v2.id) ||
              (e.target_vertex_id === v1.id && e.source_vertex_id === v2.id && e.direction === 'undirected')
            );
            
            const aij = edge ? (edge.weight || 1.0) : 0;
            const ki = this.getDegree(v1.id, edges);
            const kj = this.getDegree(v2.id, edges);
            
            modularity += (aij - (ki * kj) / (2 * m));
          }
        });
      });
      
      return modularity / (2 * m);
    }
    
    static getDegree(vertexId, edges) {
      return edges.filter(e => 
        e.source_vertex_id === vertexId || 
        (e.target_vertex_id === vertexId && e.direction === 'undirected')
      ).reduce((sum, edge) => sum + (edge.weight || 1.0), 0);
    }
    
    /**
     * Centrality calculation dispatcher
     */
    static async calculateCentrality(vertices, edges, algorithm) {
      switch (algorithm) {
        case 'pagerank':
          return this.calculatePageRank(vertices, edges);
        case 'betweenness':
          return this.calculateBetweennessCentrality(vertices, edges);
        case 'closeness':
          return this.calculateClosenessCentrality(vertices, edges);
        default:
          throw new Error(`Centrality algorithm ${algorithm} not implemented`);
      }
    }
    
    static async calculateClosenessCentrality(vertices, edges) {
      // Implementation for closeness centrality
      const vertexIds = vertices.map(v => v.id);
      const closeness = {};
      
      // Build adjacency list for shortest paths
      const graph = {};
      vertexIds.forEach(id => { graph[id] = []; });
      edges.forEach(edge => {
        graph[edge.source_vertex_id].push(edge.target_vertex_id);
        if (edge.direction === 'undirected') {
          graph[edge.target_vertex_id].push(edge.source_vertex_id);
        }
      });
      
      // Calculate shortest paths from each vertex
      vertexIds.forEach(sourceId => {
        const distances = this.bfsShortestPaths(graph, sourceId, vertexIds);
        const totalDistance = Object.values(distances).reduce((sum, dist) => sum + dist, 0);
        closeness[sourceId] = totalDistance > 0 ? (vertexIds.length - 1) / totalDistance : 0;
      });
      
      return closeness;
    }
    
    static bfsShortestPaths(graph, source, allVertices) {
      const distances = {};
      const visited = new Set();
      const queue = [{ vertex: source, distance: 0 }];
      
      allVertices.forEach(id => { distances[id] = Infinity; });
      distances[source] = 0;
      
      while (queue.length > 0) {
        const { vertex, distance } = queue.shift();
        
        if (visited.has(vertex)) continue;
        visited.add(vertex);
        
        (graph[vertex] || []).forEach(neighbor => {
          if (!visited.has(neighbor)) {
            const newDistance = distance + 1;
            if (newDistance < distances[neighbor]) {
              distances[neighbor] = newDistance;
              queue.push({ vertex: neighbor, distance: newDistance });
            }
          }
        });
      }
      
      return distances;
    }
  }
  
  module.exports = GraphAnalyzer;