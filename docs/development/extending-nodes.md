
# Developer Guide for Node Operations

Development Guide

## Overview
This guide helps developers understand how to work with node operations in Luhmann-Roam, covering code structure, conventions, and extension patterns.

## Code Organization

### Frontend Node Operations
- **Location**: `public/js/nodeOperationsManager.js`
- **Pattern**: Module pattern with IIFE
- **Public API**:
  - `initialize()`: Set up the manager
  - `addRootNode()`: Add top-level node
  - `addChildNode(parentId)`: Add child to node
  - [other operations]
- **DOM Updates**: Direct DOM manipulation with fallback to full refresh

### Backend Node Operations
- **Location**: 
  - `routes/nodeRoutes.js`: API routes
  - `controllers/nodeController.js`: Business logic
- **Pattern**: Express routing with controller separation
- **Database Access**: Through request middleware

## Adding a New Node Operation

### Frontend Steps
1. Add public method to NodeOperationsManager
2. Implement optimized DOM updates
3. Add fallback to full refresh
4. Add error handling and logging
5. Update UI components if needed

### Backend Steps
1. Add route to nodeRoutes.js
2. Implement controller method in nodeController.js
3. Add database operations
4. Implement error handling
5. Return appropriate response

### Example: Adding "Duplicate Node" Functionality

#### Frontend (nodeOperationsManager.js)
```javascript
// Add to public API
duplicateNode: async function(nodeId) {
  try {
    // Implementation details...
  } catch (error) {
    console.error(`Error duplicating node ${nodeId}:`, error);
    return false;
  }
}
```

#### Backend (nodeRoutes.js)
```javascript
// Add new route
router.post('/:id/duplicate', nodeController.duplicateNode);
```

#### Backend (nodeController.js)
```javascript
exports.duplicateNode = async (req, res) => {
  try {
    const { id } = req.params;
    // Implementation details...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```
