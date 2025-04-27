# Legacy System Analysis & New Application Requirements Mapping: luhmann-roam -> roam-sepulture

## Introduction & Goals

This document captures the essential functionality, architecture, and data structures of the legacy luhmann-roam application to guide the development of the new roam-sepulture system. Rather than directly migrating code, we aim to understand the core functionalities and business logic to build a more robust and maintainable application.


## High-Level Overview

### Core Purpose & Value Proposition:

What fundamental problem does the old application solve?

Luhmann-roam is an outliner/note-taking application with hierarchical node organization, supporting bidirectional links between nodes and dual-language (English/Chinese) content. It provides a flexible system for knowledge management based on Niklas Luhmann's Zettelkasten method, enhanced with modern digital capabilities.

### High-Level Architecture Diagram

A simple diagram showing major components (e.g., Browser -> Express Server -> Database -> External APIs).

```plain text
Browser UI (HTML/JS/CSS)
      ↕
Express.js Server
      ↕
SQLite Database
      ↕
File System (attachments, markdown, backups)
```

## Key Components Analysis

### 1. Core Data Model

Primary Entities:

- Nodes: Hierarchical content elements with parent-child relationships
    - Properties: id, content (EN/ZH), parent_id, position, expanded state, markdown support
- Links: Bidirectional connections between nodes
- Bookmarks: Saved references to important nodes (There is no need for this feature to be done in the first version. Not need to be implemented at the beginning MVP.)
- Node Attributes: Key-value metadata for nodes (not need to be implemented at the beginning MVP)
- Blog Pages: Public-facing content generated from nodes (not need to be implemented at the beginning MVP)

Database Schema Highlights:

```sql
nodes (
  id TEXT PRIMARY KEY,
  content TEXT,
  content_zh TEXT,
  parent_id TEXT,
  position INTEGER,
  is_expanded BOOLEAN DEFAULT 1,
  has_markdown BOOLEAN DEFAULT 0,
  node_size INTEGER DEFAULT 20,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (parent_id) REFERENCES nodes (id)
)

links (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  description TEXT,
  created_at INTEGER,
  updated_at INTEGER
)
```

### 2. UI/Frontend Functionality

Outliner Interface:
- Hierarchical tree view of nodes with expand/collapse capability
- Rich text editing with markdown support (not need to be implemented at the beginning MVP)
- Drag and drop reordering (not need to be implemented at the beginning MVP)
- Node operations (add, delete, indent, outdent, move up/down)
- Keyboard shortcuts for efficiency

Node Management:
- Language toggle (EN/ZH bilingual support)
- Node hierarchy manipulation
- Linking between nodes
- Bookmarking nodes
- Position management and conflict resolution

Specialized Views:
- Grid view with customizable node sizes (not need to be implemented at the beginning MVP)
- Filter manager for content filtering (not need to be implemented at the beginning MVP)
- Breadcrumb navigation

### 3. Backend API

Node Operations:
- CRUD operations for nodes
- Hierarchical operations:
    - Indent: Move node to become child of node above it
    - Outdent: Move node up one level in hierarchy
    - Move up/down: Reorder nodes at same level
    - Add sibling: Insert new node at same level
- Hierarchical querying (get children, ancestors)
- Content updates with language support
