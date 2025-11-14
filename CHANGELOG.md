# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.31.0] - 2025-11-15

### Added
- Created new `minimal-version` branch for streamlined functionality
- Clean separation between full-featured version and minimal version

### Removed (for Minimal Version)
✅ **Major Features Removed from Minimal Version:**
- 📚 Blog system and blog templates management
- 🚇 Metro map visualization (stations, lines, cities)
- 📷 DCIM image management and subsidiary images
- 🎮 Chess games functionality
- ⚔️ Combat games and unit management
- 🏗️ Code analysis, graphs, and dependency tracking (simple/enhanced/new code graph)
- 📊 Task management and time tracking systems
- 📊 Graph analysis, community detection, and visualization
- 🔗 Word groups and frequency analysis
- 📊 Attribute management and querying
- 📁 Vault management and folder operations
- 📝 Markdown notes and file management
- 🔖 Bookmark system and management
- 🎨 Global graph and node visualizers
- 📊 Advanced filtering systems
- 🔧 Development tools and test panels
- 🔄 Database export/import and backup managers
- 🗂️ Font management and style settings
- 🎯 Plugin system and manager
- 🔧 Command palette and advanced shortcuts
- ⏱️ Timestamps and position managers

### Retained (Minimal Version Core Features)
✅ **Core Outliner Functionality Maintained:**
- Add/edit/delete nodes with hierarchical structure
- Node expansion/collapse functionality
- Parent-child relationships with positioning
- English/Chinese language support
- Advanced search with logical operators (AND, OR, NOT, wildcards)
- Link management between nodes (create, edit, delete links)
- Node operations (indent, outdent, move up/down, add siblings)
- Drag and drop support (when enabled)
- Sequence ID support for all nodes

### Technical Changes
- **Database Simplification:** Reduced to only `nodes` and `links` tables, removed `has_markdown` and `node_size` fields
- **Module Cleanup:** Kept only 3 essential JavaScript modules (NodeOperationsManager, SearchManager, LinkManager)
- **Controller Reduction:** Only `nodeController.js` and `linkController.js` retained
- **API Streamlining:** Removed routes referencing non-essential controllers
- **Application Logic:** Refactored app.js for minimal core functionality

### Branch Information
- **New Branch:** `minimal-version` - clean, focused implementation
- **Maintains Compatibility:** Core functionality works without removed dependencies

## [0.13.0] - 2023-04-10

### Added
- Database backup functionality with timestamp-named files
- Version history viewer
- Structured version management

### Fixed
- Improved sidebar resizing performance
- Fixed issue with node position conflicts

## [0.12.7] - 2023-04-02

### Fixed
- Scrolling to the bottom of the node hierarchy

## [0.12.6] - 2023-04-02

### Changed
- Disabled drag and drop functionality by default to improve performance

## [0.12.5] - 2023-04-02

### Fixed
- Font update for better readability

...