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
- **Task Management**: Track and manage daily tasks with time tracking
- **Timestamp Tracking**: View creation and update timestamps for nodes
- **Position Management**: Precisely adjust node positions and relocate nodes
- **Enhanced Markdown Support**: Rich content editing with image resizing capabilities
- **Node Attributes**: Add, edit, and query custom attributes for nodes
- **Breadcrumb Navigation**: Navigate the node hierarchy with breadcrumb trails 
- **Code Analysis**: Visualize and analyze the codebase structure
- **Keyboard Shortcuts**: Comprehensive hotkey system for efficient workflows
- **Internationalization**: Full multilingual support with language switching

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
- **Image Handling**: Support for resizing images and viewing in lightbox mode
- **Preview Mode**: Real-time preview of markdown content
- **Content Manipulation**: Add, edit, and delete markdown content

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

#### Task Manager (taskManager.js)
- **Daily Task Tracking**: Interface for managing tasks by date
- **Time Tracking**: Start, pause, and track time spent on tasks
- **Task Statistics**: View completion rates and time spent
- **Date Navigation**: Move between days to view different task sets
- **Task Sorting**: Order tasks by creation time or duration
- **Task Completion**: Mark tasks as completed and track progress

#### Timestamp Manager (timestampManager.js)
- **Creation Timestamps**: Display when nodes were created
- **Update Timestamps**: Track the last modification time
- **Timestamp Modal**: Interface for viewing node timestamps
- **Language Support**: Multilingual timestamp display

#### Position Manager (positionManager.js)
- **Position Adjustment**: Fine-tune node positioning within siblings
- **Node Relocation**: Move nodes to different parents or to root level
- **Position Fixing**: Resolve duplicate positions in node hierarchies
- **Parent Selection**: Search interface for selecting new parent nodes
- **Visual Feedback**: Display current position and available positions

#### Attribute Manager (attributeManager.js)
- **Attribute Modal**: Interface for managing custom node attributes
- **Attribute CRUD**: Adding, editing, and deleting node attributes
- **Attribute Queries**: Advanced querying of nodes by attributes
- **Search Interface**: Finding nodes with specific attribute values
- **Recent Queries**: Saving and reusing recent attribute queries

#### Breadcrumb Manager (breadcrumbManager.js)
- **Path Display**: Shows the hierarchical path to the current focused node
- **Focus Mode**: Filter view to show only a node and its descendants
- **Navigation**: Click breadcrumbs to navigate up the hierarchy
- **Root Return**: Quick return to the full hierarchy view
- **Multilingual Support**: Display breadcrumbs in the selected language

#### Code Analyzer Manager (codeAnalyzerManager.js)
- **Code Statistics**: Analyze and display code structure metrics
- **Module Visualization**: View modules and their relationships
- **Complexity Analysis**: Identify complex or problematic modules
- **Function Listing**: Browse all functions across the codebase
- **Dependency Tracking**: View module dependencies and relationships

#### Hotkey Manager (hotkeyManager.js)
- **Keyboard Navigation**: Move between nodes using keyboard shortcuts
- **Action Shortcuts**: Perform common actions with keystroke combinations
- **Visual Hints**: Display available shortcuts when in hotkey mode
- **Custom Bindings**: Register and manage custom hotkeys for operations
- **Help Modal**: Display comprehensive list of available keyboard shortcuts

#### I18n Manager (i18n.js)
- **Language Switching**: Toggle between English and Chinese interfaces
- **Translation Management**: Centralized dictionary of UI strings
- **Module Notifications**: Update all modules when language changes
- **Persistent Settings**: Remember language preference between sessions
- **Smart UI Updates**: Update the UI efficiently after language changes

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

### Attributes Model
- `id`: TEXT (Primary Key) - Unique identifier
- `node_id`: TEXT - Associated node reference
- `name`: TEXT - Attribute name
- `value`: TEXT - Attribute value
- `created_at`: INTEGER - Creation timestamp
- `updated_at`: INTEGER - Last update timestamp

## Main Workflow

### Node Management
1. Create nodes (root or child)
2. Edit node content (in either language)
3. Organize hierarchy (indent, outdent, reorder)
4. Add rich content via markdown
5. Create links between related nodes
6. Add custom attributes for advanced organization

### User Interaction Flow
1. Navigate the hierarchy by expanding/collapsing nodes
2. Edit nodes by clicking on their text
3. Use node actions for structural operations
4. Access markdown editor for rich content
5. Manage links through the link modal
6. Adjust node positions as needed
7. Search for nodes using the search functionality
8. Apply filters to display specific nodes
9. Use keyboard shortcuts for efficient operations
10. Add and query attributes for advanced organization
11. Navigate with breadcrumbs when focusing on specific branches

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
- **Internationalization**: Custom i18n system for multilingual support
- **Visualizations**: Chart.js for code structure visualization

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

### Attributes
- `GET /api/nodes/:id/attributes`: Get all attributes for a node
- `POST /api/attributes`: Create a new attribute
- `PUT /api/attributes/:id`: Update an attribute
- `DELETE /api/attributes/:id`: Delete an attribute
- `GET /api/attributes/query`: Query nodes by attributes

### Code Analysis
- `GET /api/code-structure`: Get code structure statistics

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
- **Attributes**: Manage custom attributes
- **Breadcrumbs**: Navigate hierarchical paths

### Modals
- **Markdown Editor**: Rich text editing for nodes
- **Link Manager**: Create and manage bidirectional links
- **Move Node**: Reposition nodes in the hierarchy
- **Position Adjust**: Fine-tune node ordering
- **Search Modal**: Interface for searching nodes
- **Attribute Manager**: Add and edit node attributes
- **Attribute Query**: Search nodes by attribute values
- **Code Analyzer**: Visualize and analyze code structure
- **Hotkey Help**: Display available keyboard shortcuts

### Visual Elements
- **Indentation Lines**: Visual guides showing hierarchy
- **Connector Lines**: Horizontal lines connecting nodes to indentation lines
- **Focus Highlighting**: Visual feedback when a node is focused
- **Link Count Indicators**: Small badges showing number of links
- **Breadcrumb Trail**: Path display for focused nodes
- **Hotkey Hints**: Visual indicators for available keyboard shortcuts

## Module Architecture

### App.js (Main Application)
- **Initialization**: Sets up the application and event listeners
- **Node Management**: Creates, updates, and deletes nodes
- **Hierarchy Management**: Handles indentation, outdenting, and reordering
- **UI Rendering**: Manages the outliner display and updates
- **Event Handling**: Processes user interactions with nodes

### I18n.js
- **Public API**:
  - `initialize()`: Sets up the internationalization system
  - `toggleLanguage()`: Switches between available languages
  - `t(key, params)`: Gets translated text with optional parameter substitution
  - `getCurrentLanguage()`: Returns the current language code
- **Private Functions**:
  - Dictionary management for translations
  - Notification of language changes to other modules
  - UI text updating across the application

### AttributeManager.js
- **Public API**:
  - `initialize()`: Sets up the attribute management system
  - `updateLanguage(language)`: Updates the language for display
  - `openModal(nodeId)`: Opens the attribute editor for a specific node
  - `closeModal()`: Closes the attribute editor
  - `addAttributeButtonToNode(nodeElement, nodeId)`: Adds attribute button to node UI
- **Private Functions**:
  - Attribute CRUD operations with the backend
  - Attribute querying and search functionality
  - Modal creation and management for the UI

### BreadcrumbManager.js
- **Public API**:
  - `initialize()`: Sets up the breadcrumb navigation system
  - `focusOnNode(nodeId)`: Focuses on a specific node and shows breadcrumb trail
  - `clearFocus()`: Clears focus and returns to full view
  - `updateLanguage(language)`: Updates breadcrumb display language
  - `addNodeFocusHandler(nodeElement, nodeId)`: Adds focus handling to node
  - `restoreFocusState()`: Restores focus after data refresh
  - `getCurrentFocusedNodeId()`: Returns the currently focused node
  - `isInFocusMode()`: Returns whether focus mode is active
- **Private Functions**:
  - Breadcrumb trail generation and display
  - Node ancestry path handling
  - Focus filtering to show only relevant nodes

### CodeAnalyzerManager.js
- **Public API**:
  - `initialize()`: Sets up the code analyzer system
  - `analyzeCodebase()`: Analyzes the code structure and updates the UI
  - `openAnalyzerModal()`: Opens the code analysis visualization modal
- **Private Functions**:
  - Code structure data retrieval from the backend
  - Statistics calculation and visualization
  - Chart generation for code metrics
  - Module and function listing display

### HotkeyManager.js
- **Public API**:
  - `initialize()`: Sets up the hotkey system and registers default shortcuts
  - `updateLanguage(language)`: Updates language for hotkey display
  - `registerHotkey(key, element, action, description)`: Register a new hotkey
  - `showHints()`: Shows visual hints for available hotkeys
  - `showHelpModal()`: Displays comprehensive hotkey documentation
- **Private Functions**:
  - Keyboard event handling and processing
  - Visual hint display and management
  - Custom hotkey registration and storage
  - Focused node navigation with keyboard

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

6. **AI Integration**:
   - Automatic content categorization
   - Suggested links between related content

## Installation and Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Initialize the database
4. Start the server with `npm start`
5. Access the application at http://localhost:3003

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

### Managing Attributes
- Click the attribute button on a node
- Add, edit, or delete custom attributes
- Use the query interface to find nodes with specific attributes
- Browse recent queries or save complex queries for future use

### Using Breadcrumbs
- Double-click on a node to focus on it and its descendants
- Use the breadcrumb trail to navigate up the hierarchy
- Click the home icon to return to the full view
- Focus mode helps concentrate on specific branches of your hierarchy

### Using Keyboard Shortcuts
- Press ? to view all available shortcuts
- Use arrow keys to navigate between nodes
- Press specific letter keys to trigger actions when in hotkey mode
- Combine keys for advanced operations