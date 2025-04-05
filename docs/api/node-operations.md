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