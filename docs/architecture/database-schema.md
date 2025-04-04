# Database Schema Documentation

## Overview
This document details the database schema for Luhmann-Roam, focusing on the tables, relationships, and key fields that support node operations.

## Tables

### nodes
- **Purpose**: Stores all node data
- **Fields**:
  - `id` (TEXT): Primary key, UUID
  - `content` (TEXT): Node text content in English
  - `content_zh` (TEXT): Node text content in Chinese
  - `parent_id` (TEXT): Foreign key to parent node, NULL for root nodes
  - `position` (INTEGER): Order within siblings
  - `is_expanded` (BOOLEAN): Whether node is expanded in UI
  - `has_markdown` (BOOLEAN): Flag indicating presence of markdown content
  - `created_at` (INTEGER): Unix timestamp of creation
  - `updated_at` (INTEGER): Unix timestamp of last update
- **Indexes**:
  - `parent_id_idx`: Index on parent_id for faster child retrieval
  - `position_idx`: Index on position for faster ordering

### links
- **Purpose**: Stores bidirectional links between nodes
- **Fields**:
  - `id` (TEXT): Primary key, UUID
  - `from_node_id` (TEXT): Foreign key to source node
  - `to_node_id` (TEXT): Foreign key to target node
  - `weight` (REAL): Link strength/importance
  - `description` (TEXT): Link description text
  - `created_at` (INTEGER): Unix timestamp of creation
  - `updated_at` (INTEGER): Unix timestamp of last update
- **Indexes**:
  - `from_node_idx`: Index on from_node_id
  - `to_node_idx`: Index on to_node_id

## Relationships
- **Node Hierarchy**: Self-referential relationship through parent_id
- **Node Links**: Many-to-many relationship between nodes through links table

## SQL Schema Creation
```sql
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  content TEXT,
  content_zh TEXT,
  parent_id TEXT,
  position INTEGER,
  is_expanded BOOLEAN DEFAULT 1,
  has_markdown BOOLEAN DEFAULT 0,
  node_size TEXT DEFAULT 'normal',
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (parent_id) REFERENCES nodes (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS parent_id_idx ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS position_idx ON nodes(position);
```

