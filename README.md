# Luhmann-Roam Knowledge Management System

[English](README.md) | [简体中文](README.zh.md)

Luhmann-Roam is a powerful knowledge management system inspired by Roam Research and Niklas Luhmann's Zettelkasten method. It provides a hierarchical outliner interface with bidirectional linking capabilities, allowing users to create, organize, and connect notes in a networked structure.

## Features

- **Hierarchical Outliner**: Create and organize notes in a tree structure
- **Bidirectional Linking**: Connect notes with weighted, described relationships
- **Markdown Support**: Add rich content to notes with markdown formatting
- **Multilingual Interface**: Toggle between English and Chinese
- **Node Operations**: Indent, outdent, reorder, and reposition nodes
- **Visual Feedback**: Highlighting for focus and active branches
- **Search & Filter**: Quickly find and focus on specific content
- **Task Management**: Track daily tasks with time tracking functionality
- **Timestamp Tracking**: View creation and modification times for nodes
- **Position Management**: Precisely adjust node positions and hierarchy
- **Node Attributes**: Add, edit, and query custom attributes for nodes
- **Breadcrumb Navigation**: Navigate the node hierarchy with breadcrumb trails
- **Bookmark Management**: Save and organize important nodes for quick access
- **Command Palette**: Access commands and features with a searchable interface
- **Keyboard Shortcuts**: Comprehensive hotkey system for efficient workflows
- **2D Cosmic Visualization**: Visualize node relationships in an interactive cosmic view
- **Image Management**: Organize and optimize images with the DCIM Manager
- **Blog Publishing**: Convert and publish notes as blog posts
- **Code Analysis**: Visualize and analyze the codebase structure
- **Optimized Performance**: Smart DOM updates for improved responsiveness

## Screenshots

### Main Interface

![luhmann_roam_01](https://github.com/user-attachments/assets/b31e2dac-95e5-426d-a1f7-65b0611a373d)

*The main outliner interface showing the hierarchical structure of notes*

### Markdown Editing

![markdown_preview_01](https://github.com/user-attachments/assets/b584c459-d23d-44b5-9a41-b5f1ca045016)

*Rich content editing with markdown support and image handling*

### Bidirectional Linking

![manage_links_01](https://github.com/user-attachments/assets/55a9a94a-ef47-460e-a6d7-65229c080285)

*Creating and managing connections between notes*

### Task Management

![task_01](https://github.com/user-attachments/assets/2ca40ad4-2904-4dcd-bb47-708677a4c1cf)

*Daily task tracking with time management*

### Node Operations

![move_node_01](https://github.com/user-attachments/assets/f0fd4a70-ce3a-4dd6-b8c4-1d04caed159d)

*Reorganizing the knowledge structure through various operations*

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ALex-Everett-Liu/luhmann-roam.git
   cd luhmann-roam
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   node init-db.js
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3003
   ```

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
- Click the position button for precise positioning

### Creating Links
- Click the link button on a node
- Search for target nodes
- Add weight and description to the link
- View both incoming and outgoing links

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

### Using Bookmarks
- Press Alt+B to bookmark the focused node
- Click on bookmarked nodes in the sidebar for quick access
- Bookmarks display usage statistics and can be sorted by frequency
- Remove bookmarks with a single click

### Using Command Palette
- Press Ctrl+P (or Cmd+P on Mac) to open the command palette
- Search for commands by name, category, or keywords
- Execute commands with the Enter key
- View keyboard shortcuts for frequently used commands

### Using Keyboard Shortcuts
- Press ? to view all available shortcuts
- Use arrow keys to navigate between nodes
- Press specific letter keys to trigger actions when in hotkey mode
- Combine keys for advanced operations

### Using Cosmic Visualization
- Click Alt+C to open the 2D cosmic visualization of a node
- Explore node hierarchies in a solar system-like view
- Navigate between linked nodes through visual portals
- Pan, zoom, and interact with the visualization

### Managing Images
- Access the DCIM Manager to organize your images
- Upload, tag, and categorize images
- Convert images to WebP format for optimization
- Create custom ranking filters for image sorting

### Publishing Blog Posts
- Convert nodes to blog posts with formatting preserved
- Manage and organize published content
- Preview content before publishing
- Access blog posts through dedicated routes

### Task Management
- Create daily tasks in the sidebar
- Track time spent on tasks
- View task statistics and completion rates
- Navigate between different days

## System Architecture

Luhmann-Roam follows a modular architecture with specialized managers handling different aspects of functionality:

### Backend
- Node.js with Express
- SQLite database for data storage
- RESTful API for client-server communication
- File-based storage for markdown content

### Frontend
- Vanilla JavaScript with modular design
- Specialized managers for different functionality
- Optimized DOM manipulations for performance
- Responsive UI with custom CSS

For a detailed explanation of the system's architecture, components, and data models, please see the [Project Structure Documentation](PROJECT_STRUCTURE.md).

## Project Structure Overview

```text
luhmann-roam/
├── database.js        # Database configuration and initialization
├── server.js          # Express server and API endpoints
├── markdown/          # Markdown content storage
├── public/            # Static assets and client-side code
│   ├── index.html     # Main HTML file
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript modules
│   │   ├── app.js                 # Main application logic
│   │   ├── markdownManager.js     # Markdown editing functionality
│   │   ├── linkManager.js         # Link management functionality
│   │   ├── searchManager.js       # Search functionality
│   │   ├── filterManager.js       # Filter functionality
│   │   ├── bookmarkManager.js     # Bookmark management functionality
│   │   ├── commandPaletteManager.js # Command palette functionality
│   │   ├── cosmicNodeVisualizer2D.js # 2D visualization of nodes
│   │   ├── dcimManager.js         # Digital content image management
│   │   ├── blogManager.js         # Blog publishing functionality
│   │   ├── taskManager.js         # Task management functionality
│   │   ├── timestampManager.js    # Timestamp display functionality
│   │   ├── positionManager.js     # Node positioning functionality
│   │   ├── attributeManager.js    # Node attributes functionality
│   │   ├── breadcrumbManager.js   # Node navigation functionality
│   │   ├── codeAnalyzerManager.js # Code structure analysis
│   │   ├── hotkeyManager.js       # Keyboard shortcuts functionality
│   │   ├── i18n.js                # Internationalization support
│   │   ├── nodeExpansionManager.js # Node expansion functionality
│   │   ├── nodeOperationsManager.js # Core node operations
│   │   └── dragDropManager.js     # Drag and drop functionality
│   └── attachment/    # Uploaded images and attachments
├── routes/            # Express route handlers
│   ├── nodeRoutes.js  # Node-related API endpoints
│   ├── linkRoutes.js  # Link-related API endpoints
│   ├── blogRoutes.js  # Blog publishing endpoints
│   └── imageRoutes.js # Image management endpoints
└── README.md          # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Inspired by Niklas Luhmann's Zettelkasten method and Roam Research
- Built with vanilla JavaScript to minimize dependencies
- Designed for personal knowledge management and organization
