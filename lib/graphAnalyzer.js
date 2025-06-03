/**
 * Server-side graph analysis engine
 * Provides Neo4j-like graph algorithms
 * Adapted for resistance-based edge weights where:
 * - weight = 1: normal connection
 * - weight < 1: closer connection (weight < 0.2 = nearly identical)
 * - weight > 1: weaker connection (weight > 10 = nearly disconnected)
 */

class GraphAnalyzer {
  
    /**
     * Transform resistance-based weights to connection strength
     * Used for algorithms that need connection strength (PageRank, Community Detection)
     */
    static resistanceToStrength(weight) {
      if (weight <= 0) return 0; // Invalid weight
      // Use inverse with smoothing to avoid extreme values
      return Math.max(0.01, Math.min(10, 1 / weight));
    }
    
    /**
     * Get edge weight as distance (for shortest path algorithms)
     * Your weights are already distances, so use them directly
     */
    static getDistance(weight) {
      return Math.max(0.01, weight || 1.0); // Ensure positive distance
    }
    
    /**
     * Calculate graph density
     */
    static calculateDensity(vertexCount, edgeCount) {
      if (vertexCount < 2) return 0;
      const maxEdges = vertexCount * (vertexCount - 1);
      return (2 * edgeCount) / maxEdges;
    }
    
    /**
     * Weighted PageRank algorithm implementation
     * Now properly handles your resistance-based weights
     */
    static async calculatePageRank(vertices, edges, damping = 0.85, iterations = 100) {
      const vertexIds = vertices.map(v => v.id);
      const n = vertexIds.length;
      
      // Initialize PageRank values
      const pagerank = {};
      vertexIds.forEach(id => {
        pagerank[id] = 1.0 / n;
      });
      
      // Build weighted adjacency lists
      const outLinks = {};
      const inLinks = {};
      const outWeights = {}; // Total outgoing weight for normalization
      
      vertexIds.forEach(id => {
        outLinks[id] = [];
        inLinks[id] = [];
        outWeights[id] = 0;
      });
      
      edges.forEach(edge => {
        const strength = this.resistanceToStrength(edge.weight || 1.0);
        
        outLinks[edge.source_vertex_id].push({
          target: edge.target_vertex_id,
          weight: strength
        });
        inLinks[edge.target_vertex_id].push({
          source: edge.source_vertex_id,
          weight: strength
        });
        outWeights[edge.source_vertex_id] += strength;
        
        // Handle undirected edges
        if (edge.direction === 'undirected') {
          outLinks[edge.target_vertex_id].push({
            target: edge.source_vertex_id,
            weight: strength
          });
          inLinks[edge.source_vertex_id].push({
            source: edge.target_vertex_id,
            weight: strength
          });
          outWeights[edge.target_vertex_id] += strength;
        }
      });
      
      // Iterative calculation
      for (let i = 0; i < iterations; i++) {
        const newPagerank = {};
        
        vertexIds.forEach(id => {
          let sum = 0;
          inLinks[id].forEach(link => {
            const sourceWeight = outWeights[link.source];
            if (sourceWeight > 0) {
              sum += pagerank[link.source] * (link.weight / sourceWeight);
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
     * Weighted Betweenness centrality using Dijkstra for shortest paths
     * Uses your weights as actual distances
     */
    static async calculateBetweennessCentrality(vertices, edges) {
      const vertexIds = vertices.map(v => v.id);
      const betweenness = {};
      vertexIds.forEach(id => { betweenness[id] = 0; });
      
      // Build weighted adjacency list
      const graph = {};
      vertexIds.forEach(id => { graph[id] = []; });
      
      edges.forEach(edge => {
        const distance = this.getDistance(edge.weight);
        
        graph[edge.source_vertex_id].push({
          target: edge.target_vertex_id,
          weight: distance
        });
        
        // For undirected graphs, add reverse edge
        if (edge.direction === 'undirected') {
          graph[edge.target_vertex_id].push({
            target: edge.source_vertex_id,
            weight: distance
          });
        }
      });
      
      // Calculate betweenness using weighted shortest paths
      for (const s of vertexIds) {
        const { distances, predecessors } = this.dijkstraAllPairs(graph, s, vertexIds);
        
        // Calculate betweenness contribution for paths through each vertex
        for (const t of vertexIds) {
          if (s !== t && distances[t] !== Infinity) {
            const paths = this.getAllShortestPaths(predecessors, s, t);
            
            // Count betweenness for intermediate vertices
            paths.forEach(path => {
              for (let i = 1; i < path.length - 1; i++) {
                betweenness[path[i]] += 1.0 / paths.length;
              }
            });
          }
        }
      }
      
      // Normalize for undirected graph
      const n = vertexIds.length;
      if (n > 2) {
        const normFactor = 2.0 / ((n - 1) * (n - 2));
        vertexIds.forEach(id => {
          betweenness[id] *= normFactor;
        });
      }
      
      return betweenness;
    }
    
    /**
     * Dijkstra's algorithm for weighted shortest paths
     */
    static dijkstraAllPairs(graph, source, allVertices) {
      const distances = {};
      const predecessors = {};
      const visited = new Set();
      const pq = [];
      
      // Initialize
      allVertices.forEach(id => {
        distances[id] = Infinity;
        predecessors[id] = [];
      });
      distances[source] = 0;
      pq.push({ vertex: source, distance: 0 });
      
      while (pq.length > 0) {
        // Get vertex with minimum distance
        pq.sort((a, b) => a.distance - b.distance);
        const { vertex: u, distance: dist } = pq.shift();
        
        if (visited.has(u)) continue;
        visited.add(u);
        
        // Update neighbors
        (graph[u] || []).forEach(({ target: v, weight }) => {
          const alt = dist + weight;
          
          if (alt < distances[v]) {
            distances[v] = alt;
            predecessors[v] = [u];
            pq.push({ vertex: v, distance: alt });
          } else if (alt === distances[v]) {
            predecessors[v].push(u);
          }
        });
      }
      
      return { distances, predecessors };
    }
    
    /**
     * Get all shortest paths between two vertices
     */
    static getAllShortestPaths(predecessors, source, target) {
      const paths = [];
      
      function buildPaths(current, path) {
        if (current === source) {
          paths.push([source, ...path.reverse()]);
          return;
        }
        
        predecessors[current].forEach(pred => {
          buildPaths(pred, [...path, current]);
        });
      }
      
      buildPaths(target, []);
      return paths;
    }
    
    /**
     * Weighted Closeness centrality
     * Uses your weights as distances
     */
    static async calculateClosenessCentrality(vertices, edges) {
      const vertexIds = vertices.map(v => v.id);
      const closeness = {};
      
      // Build weighted adjacency list
      const graph = {};
      vertexIds.forEach(id => { graph[id] = []; });
      
      edges.forEach(edge => {
        const distance = this.getDistance(edge.weight);
        
        graph[edge.source_vertex_id].push({
          target: edge.target_vertex_id,
          weight: distance
        });
        
        if (edge.direction === 'undirected') {
          graph[edge.target_vertex_id].push({
            target: edge.source_vertex_id,
            weight: distance
          });
        }
      });
      
      // Calculate closeness for each vertex
      vertexIds.forEach(sourceId => {
        const { distances } = this.dijkstraAllPairs(graph, sourceId, vertexIds);
        
        // Sum of shortest distances to all other vertices
        let totalDistance = 0;
        let reachableCount = 0;
        
        vertexIds.forEach(targetId => {
          if (targetId !== sourceId && distances[targetId] !== Infinity) {
            totalDistance += distances[targetId];
            reachableCount++;
          }
        });
        
        // Closeness is the reciprocal of average distance
        closeness[sourceId] = reachableCount > 0 ? reachableCount / totalDistance : 0;
      });
      
      return closeness;
    }
    
    /**
     * Community detection with proper weight handling
     */
    static async detectCommunities(vertices, edges, algorithm = 'louvain') {
      if (algorithm === 'louvain') {
        return this.louvainCommunityDetection(vertices, edges);
      }
      throw new Error(`Algorithm ${algorithm} not implemented`);
    }
    
    static louvainCommunityDetection(vertices, edges) {
      const vertexIds = vertices.map(v => v.id);
      const communities = {};
      
      // Initialize each vertex in its own community
      vertexIds.forEach((id, index) => {
        communities[id] = index;
      });
      
      // Build weighted adjacency matrix using connection strength
      const weights = {};
      let totalWeight = 0;
      
      edges.forEach(edge => {
        const strength = this.resistanceToStrength(edge.weight || 1.0);
        const key = `${edge.source_vertex_id}_${edge.target_vertex_id}`;
        weights[key] = strength;
        totalWeight += strength;
        
        if (edge.direction === 'undirected') {
          const reverseKey = `${edge.target_vertex_id}_${edge.source_vertex_id}`;
          weights[reverseKey] = strength;
          totalWeight += strength;
        }
      });
      
      // Simple community assignment based on connection strength
      // (This is a simplified version - full Louvain would be more complex)
      const communityThreshold = 2.0; // Adjust based on your data
      const processed = new Set();
      let communityId = 0;
      
      vertexIds.forEach(vertexId => {
        if (processed.has(vertexId)) return;
        
        const community = [vertexId];
        processed.add(vertexId);
        
        // Find strongly connected neighbors
        vertexIds.forEach(otherId => {
          if (otherId !== vertexId && !processed.has(otherId)) {
            const key1 = `${vertexId}_${otherId}`;
            const key2 = `${otherId}_${vertexId}`;
            const strength = Math.max(weights[key1] || 0, weights[key2] || 0);
            
            if (strength >= communityThreshold) {
              community.push(otherId);
              processed.add(otherId);
            }
          }
        });
        
        // Assign community
        community.forEach(id => {
          communities[id] = communityId;
        });
        communityId++;
      });
      
      const modularity = this.calculateModularity(vertices, edges, communities, weights, totalWeight);
      
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
    
    static calculateModularity(vertices, edges, communities, weights, totalWeight) {
      let modularity = 0;
      const m = totalWeight / 2; // Total edge weight (divide by 2 for undirected)
      
      vertices.forEach(v1 => {
        vertices.forEach(v2 => {
          if (v1.id !== v2.id && communities[v1.id] === communities[v2.id]) {
            const key1 = `${v1.id}_${v2.id}`;
            const key2 = `${v2.id}_${v1.id}`;
            const aij = Math.max(weights[key1] || 0, weights[key2] || 0);
            
            const ki = this.getVertexStrength(v1.id, edges);
            const kj = this.getVertexStrength(v2.id, edges);
            
            modularity += (aij - (ki * kj) / (2 * m));
          }
        });
      });
      
      return modularity / (2 * m);
    }
    
    static getVertexStrength(vertexId, edges) {
      return edges.filter(e => 
        e.source_vertex_id === vertexId || 
        (e.target_vertex_id === vertexId && e.direction === 'undirected')
      ).reduce((sum, edge) => sum + this.resistanceToStrength(edge.weight || 1.0), 0);
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
  }
  
  module.exports = GraphAnalyzer;