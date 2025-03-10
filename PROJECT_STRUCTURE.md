# Luhmann-Roam Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core Components](#core-components)
3. [Data Models](#data-models)
4. [Main Workflow](#main-workflow)
5. [Technical Stack](#technical-stack)
6. [API Endpoints](#api-endpoints)
7. [User Interface Components](#user-interface-components)
8. [Future Extensions](#future-extensions)
9. [Installation and Setup](#installation-and-setup)
10. [Usage Guide](#usage-guide)

## Project Overview

Luhmann-Roam is a knowledge management system inspired by Niklas Luhmann's Zettelkasten method. It provides a hierarchical outliner interface with bidirectional linking capabilities, allowing users to create, organize, and connect notes in a networked structure.

### Key Features

- **Hierarchical Outliner**: Create and organize notes in a tree structure
- **Bidirectional Linking**: Connect notes with weighted, described relationships
- **Markdown Support**: Add rich content to notes with markdown formatting
- **Multilingual Interface**: Toggle between English and Chinese
- **Node Operations**: Indent, outdent, reorder, and reposition nodes
- **Visual Feedback**: Highlighting for focus and active branches
- **Search Functionality**: Search for nodes quickly and navigate to them
- **Filtering Options**: Filter nodes based on user-defined criteria

## Core Components

### 1. Server Infrastructure (server.js)

The Express-based backend provides a RESTful API for managing notes and their relationships:

- **Database Management**: SQLite database for storing nodes and links
- **API Endpoints**: CRUD operations for nodes and links
- **Markdown Storage**: File-based storage for markdown content
- **Node Operations**: Support for hierarchical operations (indent, outdent, reorder)

### 2. Client-Side Application (app.js)

The frontend is organized into modular components:

#### Main Application (app.js)
- **Outliner Rendering**: Dynamic creation and management of the node hierarchy
- **Node Manipulation**: UI for creating, editing, and organizing nodes
- **Drag and Drop**: Intuitive reorganization of the hierarchy
- **Language Toggle**: Support for switching between English and Chinese

#### Markdown Manager (markdownManager.js)
- **Markdown Modal**: Interface for editing rich content
- **Content Storage**: Saving and retrieving markdown content
- **Visual Indicators**: Showing which nodes have markdown content

#### Link Manager (linkManager.js)
- **Link Creation**: Interface for connecting nodes
- **Link Management**: Editing and deleting existing links
- **Bidirectional View**: Showing both incoming and outgoing links
- **Link Metadata**: Managing weights and descriptions for links

#### Search Manager (searchManager.js)
- **Search Modal**: Interface for searching nodes
- **Search Functionality**: Fetching and displaying search results
- **Node Navigation**: Navigating to nodes based on search results

#### Filter Manager (filterManager.js)
- **Filter UI**: Interface for managing filters in the sidebar
- **Active Filters**: Adding and removing filters based on user selection
- **Bookmarking Filters**: Saving and loading filter configurations

### 3. Database (database.js)

- **Connection Management**: Setup and maintenance of SQLite connection
- **Schema Initialization**: Creation of required tables
- **Query Interface**: Methods for database operations

## Data Models

### Nodes Model
- `id`: TEXT (Primary Key) - Unique identifier
- `content`: TEXT - Node text content (English)
- `content_zh`: TEXT - Node text content (Chinese)
- `parent_id`: TEXT - Parent node reference
- `position`: INTEGER - Order within siblings
- `is_expanded`: BOOLEAN - Expansion state
- `has_markdown`: BOOLEAN - Markdown content flag
- `created_at`: INTEGER - Creation timestamp
- `updated_at`: INTEGER - Last update timestamp

### Links Model
- `id`: TEXT (Primary Key) - Unique identifier
- `from_node_id`: TEXT - Source node reference
- `to_node_id`: TEXT - Target node reference
- `weight`: REAL - Link strength/importance
- `description`: TEXT - Link description
- `created_at`: INTEGER - Creation timestamp
- `updated_at`: INTEGER - Last update timestamp

## Main Workflow

### Node Management
1. Create nodes (root or child)
2. Edit node content (in either language)
3. Organize hierarchy (indent, outdent, reorder)
4. Add rich content via markdown
5. Create links between related nodes

### User Interaction Flow
1. Navigate the hierarchy by expanding/collapsing nodes
2. Edit nodes by clicking on their text
3. Use node actions for structural operations
4. Access markdown editor for rich content
5. Manage links through the link modal
6. Adjust node positions as needed
7. Search for nodes using the search functionality
8. Apply filters to display specific nodes

## Technical Stack

### Backend
- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database**: SQLite3
- **File System**: Node.js fs module for markdown storage
- **UUID Generation**: uuid package for unique identifiers
- **Middleware**: CORS, body-parser

### Frontend
- **UI**: Custom HTML/CSS/JavaScript
- **DOM Manipulation**: Vanilla JavaScript
- **Styling**: CSS with flexbox layout
- **Visual Feedback**: CSS animations for highlighting

## API Endpoints

### Nodes
- `GET /api/nodes`: Get all root nodes
- `GET /api/nodes/:id/children`: Get children of a node
- `POST /api/nodes`: Create a new node
- `PUT /api/nodes/:id`: Update a node
- `DELETE /api/nodes/:id`: Delete a node and its children
- `POST /api/nodes/reorder`: Reorder nodes (drag and drop)
- `POST /api/nodes/:id/toggle`: Toggle node expansion
- `POST /api/nodes/:id/indent`: Indent a node
- `POST /api/nodes/:id/outdent`: Outdent a node
- `POST /api/nodes/:id/move-up`: Move a node up
- `POST /api/nodes/:id/move-down`: Move a node down

### Markdown
- `GET /api/nodes/:id/markdown`: Get markdown content
- `POST /api/nodes/:id/markdown`: Save markdown content
- `DELETE /api/nodes/:id/markdown`: Delete markdown content

### Links
- `GET /api/nodes/:id/links`: Get all links for a node
- `POST /api/links`: Create a new link
- `PUT /api/links/:id`: Update a link
- `DELETE /api/links/:id`: Delete a link

### Search
- `GET /api/nodes/search`: Search for nodes

## User Interface Components

### Outliner
- **Node Structure**: Hierarchical display with indentation
- **Bullet Points**: Visual indicators for nodes
- **Expansion Controls**: Toggle visibility of child nodes
- **Visual Connectors**: Lines showing hierarchical relationships

### Node Actions
- **Add Child**: Create a new child node
- **Add Sibling**: Create a new sibling node
- **Delete**: Remove a node and its children
- **Indent/Outdent**: Change hierarchical level
- **Move Up/Down**: Reorder within siblings
- **Link**: Manage connections to other nodes
- **Markdown**: Edit rich content
- **Filter**: Manage filters for node visibility
- **Search**: Find nodes quickly

### Modals
- **Markdown Editor**: Rich text editing for nodes
- **Link Manager**: Create and manage bidirectional links
- **Move Node**: Reposition nodes in the hierarchy
- **Position Adjust**: Fine-tune node ordering
- **Search Modal**: Interface for searching nodes

### Visual Elements
- **Indentation Lines**: Visual guides showing hierarchy
- **Connector Lines**: Horizontal lines connecting nodes to indentation lines
- **Focus Highlighting**: Visual feedback when a node is focused
- **Link Count Indicators**: Small badges showing number of links

## Module Architecture

### App.js (Main Application)
- **Initialization**: Sets up the application and event listeners
- **Node Management**: Creates, updates, and deletes nodes
- **Hierarchy Management**: Handles indentation, outdenting, and reordering
- **UI Rendering**: Manages the outliner display and updates
- **Event Handling**: Processes user interactions with nodes

### MarkdownManager.js
- **Public API**:
  - `openModal(nodeId)`: Opens the markdown editor for a specific node
  - `closeModal()`: Closes the markdown editor
  - `updateIndicator(nodeId, hasMarkdown)`: Updates visual indicators for markdown content
- **Private Functions**:
  - Modal creation and management
  - Content saving and retrieval
  - Error handling and verification

### LinkManager.js
- **Public API**:
  - `openModal(nodeId)`: Opens the link manager for a specific node
  - `closeModal()`: Closes the link manager
  - `updateLanguage(language)`: Updates the language for link display
- **Private Functions**:
  - Link creation and management
  - Link listing and display
  - Search functionality for finding nodes to link

### SearchManager.js
- **Public API**:
  - `openSearchModal()`: Opens the search modal for finding nodes
  - `closeSearchModal()`: Closes the search modal
  - `updateLanguage(language)`: Updates the language for search display
- **Private Functions**:
  - Search functionality for nodes
  - Navigation to nodes based on search results
  - Expanding parent nodes for visibility

### FilterManager.js
- **Public API**:
  - `initialize()`: Creates the filter UI in the sidebar
  - `addFilter(nodeId)`: Adds a filter for a specific node
  - `removeFilter(nodeId)`: Removes a filter for a specific node
  - `applyFilters()`: Applies active filters to the outliner
  - `clearFilters()`: Clears all active filters
  - `addFilterBookmark()`: Saves the current filter configuration as a bookmark
  - `saveBookmarks()`: Saves bookmarks to localStorage
  - `addFilterButtonToNode(nodeElement, nodeId)`: Adds a filter button to a node's action area
- **Private Functions**:
  - UI updates for active filters
  - Handling search functionality for filtering nodes

## Future Extensions

1. **Visualization**:
   - Graph view of connected nodes
   - Mind map visualization

2. **Advanced Search**:
   - Full-text search across nodes and markdown
   - Filter by link type or weight

3. **Export/Import**:
   - Support for various formats (JSON, Markdown, etc.)
   - Integration with other knowledge management systems

4. **Collaboration**:
   - Multi-user support
   - Real-time editing

5. **Mobile Support**:
   - Responsive design for mobile devices
   - Touch-friendly interactions

## Installation and Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Initialize the database
4. Start the server with `npm start`
5. Access the application at http://localhost:3000

## Usage Guide

### Creating Nodes
- Click "Add Root Node" to create a top-level node
- Use the "+" button on a node to add a child
- Use the "Add Sibling" button to add a node at the same level

### Editing Nodes
- Click on node text to edit
- Toggle language with the language button
- Use markdown button to add rich content

### Organizing Nodes
- Drag and drop nodes to reposition
- Use indent/outdent buttons to change hierarchy
- Use move up/down buttons to reorder siblings

### Creating Links
- Click the link button on a node
- Search for target nodes
- Add weight and description to the link
- View incoming and outgoing links

### Using Markdown
- Click the markdown button on a node
- Edit content in the markdown editor
- Save to update the node's rich content
- Nodes with markdown content are indicated with a special icon

### Searching Nodes
- Click the "Search Nodes" button to open the search modal
- Type to search for nodes and click on results to navigate
- Use keyboard shortcuts (Ctrl+F) to quickly access the search modal

### Filtering Nodes
- Use the filter input to search for nodes to filter
- Click on filter results to add them to active filters
- Clear filters or save them as bookmarks for later use