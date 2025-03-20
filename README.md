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
   git clone https://github.com/yourusername/luhmann-roam.git
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

### Task Management
- Create daily tasks in the sidebar
- Track time spent on tasks
- View task statistics and completion rates
- Navigate between different days

## System Architecture

### Backend
- Node.js with Express
- SQLite database for data storage
- RESTful API for client-server communication
- File-based storage for markdown content

### Frontend
- Vanilla JavaScript for core functionality
- Modular design with specialized managers
- Responsive UI with custom CSS
- No external UI frameworks or dependencies

## Development

### Project Structure

```text
luhmann-roam/
├── database.js        # Database configuration and initialization
├── server.js          # Express server and API endpoints
├── markdown/          # Markdown content storage
├── public/            # Static assets and client-side code
│   ├── index.html     # Main HTML file
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript modules
│   │   ├── app.js             # Main application logic
│   │   ├── markdownManager.js # Markdown editing functionality
│   │   ├── linkManager.js     # Link management functionality
│   │   ├── searchManager.js   # Search functionality
│   │   ├── filterManager.js   # Filter functionality
│   │   ├── taskManager.js     # Task management functionality
│   │   ├── timestampManager.js # Timestamp display functionality
│   │   └── positionManager.js  # Node positioning functionality
│   └── attachment/    # Uploaded images and attachments
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

- Inspired by Niklas Luhmann's Zettelkasten method
- Built with vanilla JavaScript to minimize dependencies
- Designed for personal knowledge management and organization
