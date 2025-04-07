# Node Operations API

## Overview
This document details the RESTful API endpoints for managing nodes within the Luhmann-Roam system. Nodes are the fundamental data structure in the system, representing individual notes in the hierarchical outliner.

## Base URL
`/api/nodes`

## Authentication
All endpoints require [authentication details if applicable]

## Common Response Codes
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## Endpoints

### Get All Root Nodes
- **URL**: `/`
- **Method**: `GET`
- **URL Parameters**: None
- **Query Parameters**:
  - `lang` (optional): Language preference ('en' or 'zh')
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of node objects
  ```json
  [
    {
      "id": "uuid",
      "content": "Node content",
      "content_zh": "中文内容",
      "parent_id": null,
      "position": 0,
      "is_expanded": true,
      "link_count": 2
    },
    ...
  ]
  ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
- **Notes**: Returns only top-level nodes (those without parents)

### Get Children of a Node
- **URL**: `/:id/children`
- **Method**: `GET`
- **URL Parameters**:
  - `id`: ID of the parent node
- **Query Parameters**:
  - `lang` (optional): Language preference ('en' or 'zh')
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of child node objects
  ```json
  [
    {
      "id": "uuid",
      "content": "Child node content",
      "content_zh": "子节点中文内容",
      "parent_id": "parent-uuid",
      "position": 0,
      "is_expanded": true,
      "link_count": 1
    },
    ...
  ]
  ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
  - **Code**: 404
  - **Content**: `{ "error": "Node not found" }`

### Get a Single Node
- **URL**: `/:id`
- **Method**: `GET`
- **URL Parameters**:
  - `id`: ID of the node to retrieve
- **Query Parameters**:
  - `lang` (optional): Language preference ('en' or 'zh')
- **Success Response**:
  - **Code**: 200
  - **Content**: Node object
  ```json
  {
    "id": "uuid",
    "content": "Node content",
    "content_zh": "节点内容",
    "parent_id": "parent-uuid",
    "position": 2,
    "is_expanded": true,
    "has_markdown": false
  }
  ```
- **Error Response**:
  - **Code**: 404
  - **Content**: `{ "error": "Node not found" }`
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`

### Create a New Node
- **URL**: `/`
- **Method**: `POST`
- **URL Parameters**: None
- **Request Body**:
  ```json
  {
    "content": "New node content",
    "content_zh": "新节点内容",
    "parent_id": "parent-uuid", // Optional, null for root nodes
    "position": 0 // Position in the list of siblings
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: The created node object
  ```json
  {
    "id": "new-uuid",
    "content": "New node content",
    "content_zh": "新节点内容",
    "parent_id": "parent-uuid",
    "position": 0,
    "created_at": 1636547692000,
    "updated_at": 1636547692000
  }
  ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`

### Update a Node
- **URL**: `/:id`
- **Method**: `PUT`
- **URL Parameters**:
  - `id`: ID of the node to update
- **Request Body**:
  ```json
  {
    "content": "Updated content", // Optional
    "content_zh": "更新的内容", // Optional
    "parent_id": "new-parent-uuid", // Optional
    "position": 2, // Optional
    "is_expanded": false, // Optional
    "node_size": 24 // Optional
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: The updated node object
  ```json
  {
    "id": "uuid",
    "content": "Updated content",
    "content_zh": "更新的内容",
    "parent_id": "new-parent-uuid",
    "position": 2,
    "is_expanded": false,
    "node_size": 24,
    "updated_at": 1636547892000
  }
  ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
- **Notes**: The request only needs to include fields that should be updated. Omitted fields will retain their current values.

### Delete a Node
- **URL**: `/:id`
- **Method**: `DELETE`
- **URL Parameters**:
  - `id`: ID of the node to delete
- **Success Response**:
  - **Code**: 204
  - **Content**: No content
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
- **Notes**: Deleting a node will also delete all its children recursively, as well as any associated markdown content and links.

### Reorder Nodes
- **URL**: `/reorder`
- **Method**: `POST`
- **URL Parameters**: None
- **Request Body**:
  ```json
  {
    "nodeId": "node-uuid", // ID of the node to be moved
    "newParentId": "new-parent-uuid", // Optional, ID of the new parent node
    "newPosition": 1 // New position in the list of siblings
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Success message
  ```json
  {
    "success": true
  }
  ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Missing required parameter: nodeId" }`
  - **Code**: 404
  - **Content**: `{ "error": "Node with ID {nodeId} not found" }`
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
- **Notes**: This endpoint allows for the reordering of nodes within the same parent or moving them to a new parent. It updates the positions of the affected nodes accordingly.

### Toggle Node Expansion
- **URL**: `/:id/toggle`
- **Method**: `POST`
- **URL Parameters**:
  - `id`: ID of the node to toggle
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated expansion state of the node
  ```json
  {
    "id": "uuid",
    "is_expanded": true // or false, depending on the previous state
  }
  ```
- **Error Response**:
  - **Code**: 404
  - **Content**: `{ "error": "Node not found" }`
  - **Code**: 500
  - **Content**: `{ "error": "Error message" }`
- **Notes**: This endpoint toggles the `is_expanded` state of a node, which determines whether the node's children are visible in the UI.

### Shift Node Positions
- **URL**: `/reorder/shift`
- **Method**: `POST`
- **URL Parameters**: None
- **Request Body**:
  ```json
  {
    "parentId": "parent-uuid", // Optional, ID of the parent node
    "position": 1, // Current position of the node
    "shift": 1 // Amount to shift the position (positive or negative)
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Success message with the number of nodes updated
  ```json
  {
    "success": true,
    "nodesUpdated": 3 // Number of nodes whose positions were updated
  }
  ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Missing required parameters" }`
  - **Code**: 500
  - **Content**: `{ "error": "Failed to update node positions" }`
- **Notes**: This endpoint allows for shifting the positions of nodes at the same level, ensuring that the order is maintained after a shift operation.

### Search for Nodes
- **URL**: `/search`
- **Method**: `GET`
- **URL Parameters**: None
- **Query Parameters**:
  - `q`: Search query string (required)
  - `lang` (optional): Language preference ('en' or 'zh')
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of matching node objects
  ```json
  [
    {
      "id": "uuid",
      "content": "Node content",
      "content_zh": "节点内容",
      "parent_id": "parent-uuid",
      "is_expanded": true,
      "position": 1,
      "link_count": 2
    },
    ...
  ]
  ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Query is required" }`
  - **Code**: 500
  - **Content**: `{ "error": "Error searching nodes" }`
- **Notes**: This endpoint allows users to search for nodes based on their content. It supports searching in both English and Chinese, depending on the `lang` parameter.