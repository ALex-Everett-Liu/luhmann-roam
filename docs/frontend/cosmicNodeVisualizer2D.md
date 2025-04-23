# CosmicNodeVisualizer2D Documentation

## Overview

The Cosmic Node Visualizer 2D (cosmicNodeVisualizer2D.js) is a client-side module that provides an interactive 2D visualization of nodes and their relationships in the Luhmann-Roam system. It represents nodes as a cosmic solar system, with the current node as the sun, child nodes as planets orbiting around it, and linked nodes accessible through portals. This provides an intuitive and visually engaging way to explore node connections.

## Module Design
CosmicNodeVisualizer2D uses the Immediately Invoked Function Expression (IIFE) pattern that returns a public API. This approach encapsulates private state and functionality while exposing only necessary methods for interacting with the visualizer. The module utilizes HTML5 Canvas for efficient 2D rendering and is optimized for performance.

## Implementation Pattern

The system follows a modular architecture:
1. The module is attached to the global window object to ensure accessibility from other modules
2. It handles its own initialization, rendering, and event handling
3. It provides a clean public API for showing, hiding, and checking the visualizer state

This design provides:
- Encapsulation: Internal implementation details are hidden
- Performance: Canvas-based rendering optimized for 2D visualization
- Interactivity: Users can navigate between nodes through clicks
- Consistency: Visual metaphors align with the node hierarchy concept

## Core Functions

### initialize()

Purpose: Sets up the CosmicNodeVisualizer2D for use
Parameters: None
Returns: None

Behavior:
- Creates the container and canvas elements
- Sets up control buttons and info panel
- Adds event listeners for window resize
- Initially hides the visualizer

Example:
`CosmicNodeVisualizer2D.initialize();`

### isVisible()
Purpose: Checks if the visualizer is currently displayed
Parameters: None
Returns: Boolean - true if visible, false if hidden

Example:

```javascript
if (CosmicNodeVisualizer2D.isVisible()) {
    // The visualizer is currently shown
}
```

## Visualization Components

### Sun
Represents the current node being visualized. Placed at the center of the canvas.
### Planets
Represent child nodes of the current node. They orbit around the sun with different distances and speeds.
### Portals
Represent linked nodes (both incoming and outgoing). Positioned strategically on the canvas with special visual effects.