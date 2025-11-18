# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.33.7] - 2025-11-18

### Changed
- **Node Actions Refactoring**: Extracted all node action button creation logic into dedicated `NodeActionsManager` module
- **Code Organization**: Moved ~90 lines of node action creation code from `app.js` to `nodeActionsManager.js`
- **Separation of Concerns**: Node actions logic now isolated in its own module following manager pattern

### Technical Details
- **NodeActionsManager Module**: New `public/js/nodeActionsManager.js` with `createNodeActions(nodeId)` function
- **Button Creation**: All node action buttons (position, move, add sibling, add child, delete, bookmark, focus, default focus) created by manager
- **Global Function Exposure**: Node operation functions (`addSiblingNode`, `addChildNode`, `deleteNode`, `setDefaultFocusNode`) made globally available for manager access
- **Module Initialization**: NodeActionsManager initialized in `app.js` initialization sequence
- **Script Loading**: Added `nodeActionsManager.js` script import to `index.html` before `app.js`

### Benefits
- **Maintainability**: Node actions logic centralized in single module for easier modification
- **Consistency**: Follows same manager pattern as other feature modules (NodeOperationsManager, NodeExpansionManager, etc.)
- **Code Clarity**: `app.js` simplified by removing inline button creation code
- **Extensibility**: Easy to add new node action buttons by modifying single module

### Affected Components
- `public/js/nodeActionsManager.js` - New module for node action button creation
- `public/js/app.js` - Replaced inline node actions creation with NodeActionsManager call
- `public/index.html` - Added nodeActionsManager.js script import

Node actions now managed through dedicated module - cleaner architecture and easier maintenance!

## [0.33.6] - 2025-11-18

### Added
- **Plugin Management System**: Central plugin registry for managing all plugins
- **Plugin Settings Section**: New "Plugins" section in Settings dialog for plugin management
- **Plugin Registry API**: Complete plugin registration and management API (`PluginRegistry`)
- **Plugin Enable/Disable**: Toggle plugins on/off with persistent state storage
- **Plugin Launch from Settings**: Launch plugins directly from Settings > Plugins
- **Plugin Cards UI**: Beautiful plugin cards showing icon, name, description, version, and controls
- **Plugin Categories**: Plugins organized by category (visualization, tools, etc.)
- **Graph Plugin Integration**: Graph plugin now registered in plugin system

### Changed
- **Graph Plugin Registration**: Graph plugin now registers itself in PluginRegistry on initialization
- **Sidebar Button Behavior**: Graph plugin sidebar button respects enabled/disabled state
- **Settings Structure**: Added plugins section to settings sidebar navigation
- **Graph Plugin Architecture**: Refactored to use shared server instead of separate server
  - Graph plugin API routes moved to main server at `/api/plugins/graph/*`
  - Static files served from `/plugins/graph/*` on main server
  - Removed separate server process (port 3001) - now uses main server only
  - Maintains separate database (`graph.db`) for complete data isolation
  - Simpler architecture: one server process, separate databases

### Technical Details
- **PluginRegistry Module**: New `pluginRegistry.js` with complete plugin lifecycle management
- **Plugin State Persistence**: Plugin enabled/disabled states saved to localStorage
- **Plugin Launch System**: Unified launch mechanism through PluginRegistry
- **Settings Integration**: Plugin management fully integrated into existing Settings dialog
- **Plugin Card Rendering**: Dynamic plugin card creation with enable/disable toggles and launch buttons
- **Server Integration**: Graph plugin routes integrated into `server.js` at `/api/plugins/graph/*`
- **Database Isolation**: Separate `graph.db` database maintained for plugin data
- **Static File Serving**: Plugin UI files served from `/plugins/graph/*` on main server
- **Simplified Architecture**: Single server process instead of separate server (port 3001 removed)

### Benefits
- **Centralized Management**: All plugins managed in one place (Settings > Plugins)
- **Easy Plugin Discovery**: See all installed plugins with descriptions and metadata
- **Flexible Control**: Enable/disable plugins without code changes
- **Extensible Architecture**: Easy to add new plugins - just register them
- **User-Friendly**: Clear UI for managing plugins with visual feedback

### Affected Components
- `public/js/pluginRegistry.js` - New plugin registry system
- `public/js/settingsManager.js` - Added plugins section rendering
- `plugins/graph/graphPluginLauncher.js` - Integrated with PluginRegistry
- `public/index.html` - Added pluginRegistry.js script import

### Plugin Registration Example
```javascript
window.PluginRegistry.register('plugin-id', {
  name: 'Plugin Name',
  description: 'Description',
  version: '1.0.0',
  icon: '🔌',
  category: 'visualization',
  launch: () => { /* launch function */ },
  onEnable: () => { /* enable callback */ },
  onDisable: () => { /* disable callback */ }
});
```

Plugin management system ready for future plugin development!

## [0.33.5] - 2025-11-18

### Added
- **Independent Graph Plugin**: Standalone graph visualization tool with its own database and server
- **Graph Plugin Modal**: Modal dialog integration within main app with fullscreen toggle capability
- **Auto-Start Integration**: Graph plugin server automatically starts with main app (no separate command needed)
- **Graph Database**: Separate SQLite database (`graph.db`) for plugin data, completely independent from main app
- **Graph Plugin Launcher**: Sidebar button to open graph plugin in modal dialog
- **Persistent Graph Storage**: All nodes and edges automatically saved to database on creation, update, or deletion
- **Graph Plugin API**: Complete RESTful API for graph operations (CRUD for nodes and edges)
- **File Import/Export**: Save and load graph layouts as JSON files
- **Tooltips**: Hover over nodes to see full content in tooltips
- **Interactive Canvas**: Drag nodes, create connections, edit properties with right-click context menu

### Technical Details
- **Separate Server**: Graph plugin runs on port 3001 (independent from main app on port 3003)
- **Child Process**: Graph server spawned automatically when main server starts
- **Modal Integration**: Plugin loads in iframe within modal dialog, can expand to fullscreen
- **Database Schema**: `graph_nodes` and `graph_edges` tables with foreign key constraints
- **Auto-Persistence**: Callback system ensures all operations save to database automatically
- **CORS Configuration**: Proper CORS setup for iframe loading from main app

### Benefits
- **Complete Independence**: Plugin data completely separate from main notes database
- **Seamless Integration**: One-click access from sidebar, no manual server startup needed
- **Flexible Use Cases**: Create mind maps, concept diagrams, network structures, or any graph visualization
- **Data Safety**: No risk of affecting main app data - completely isolated
- **Professional UI**: Modal with fullscreen capability, smooth animations, proper loading states

### Affected Components
- `server.js` - Added automatic graph plugin server startup as child process
- `plugins/graph/graphPluginLauncher.js` - New launcher with modal integration
- `public/css/graph-plugin-modal.css` - New modal styling with fullscreen support
- `public/index.html` - Added modal structure and launcher script
- `plugins/graph/graph-database.js` - New database layer for plugin
- `plugins/graph/app.js` - Enhanced with database persistence callbacks
- `plugins/graph/graph.js` - Added callback system for auto-save
- `plugins/graph/index.html` - Updated with "Load from App" button (now informational)

### Documentation
- `plugins/graph/README.md` - Complete plugin documentation
- `plugins/graph/QUICK_START.md` - Quick start guide
- `plugins/graph/ARCHITECTURE.md` - Technical architecture details
- `plugins/graph/SETUP_COMPLETE.md` - Setup summary
- `README.md` - Updated main app documentation with plugin info

Independent graph visualization plugin - create graphs completely separate from your notes!

## [0.33.3] - 2025-11-18

### Fixed
- **Sequence ID Assignment**: Fixed sequence_id not being assigned to new nodes - all new nodes now automatically receive sequence IDs
- **Sequence ID Population**: Fixed `populateSequenceIds()` function to properly assign sequence IDs to existing nodes with NULL values
- **Sequence ID Conflicts**: Fixed potential conflicts by ensuring new sequence IDs start from max existing ID + 1

### Technical Details
- **createNode Enhancement**: Modified `createNode` in `nodeController.js` to query max sequence_id and assign next available ID
- **populateSequenceIds Fix**: Updated function to filter NULL records and start assignment from max existing sequence_id + 1
- **Database Consistency**: Sequence IDs now properly maintained for both existing and new nodes

### Benefits
- **Complete Sequence ID Coverage**: All nodes in database now have valid sequence IDs
- **Automatic Assignment**: New nodes automatically receive sequence IDs without manual intervention
- **Data Integrity**: Proper sequence ID management ensures consistent node identification

### Affected Components
- `controllers/nodeController.js` - Enhanced `createNode` to assign sequence_id on node creation
- `database.js` - Fixed `populateSequenceIds` to properly handle existing NULL values and avoid conflicts

Sequence ID feature now fully functional - existing nodes populated on server restart, new nodes auto-assigned!

## [0.33.2] - 2025-11-18

### Added
- **Resizable Sidebar**: Drag-to-resize functionality for the left sidebar with persistent width
- **Resize Handle**: Visual resize handle on the right edge of the sidebar with hover feedback
- **Persistent Width**: Sidebar width saved to localStorage and restored on page load
- **Window Resize Handling**: Sidebar automatically adjusts when window is resized to maintain constraints

### Changed
- **Sidebar Layout**: Added `position: relative` to sidebar for resize handle positioning
- **Resize Handle Styling**: Added CSS for resize handle with hover states and cursor feedback

### Fixed
- **Drag Direction**: Fixed counter-intuitive resize behavior - dragging right now increases width, dragging left decreases width

### Technical Details
- **Simple Implementation**: Lightweight `resizableSidebar.js` (~75 lines) following simple function pattern
- **Width Constraints**: Minimum width 200px, maximum 60% of window width
- **Visual Feedback**: Resize handle shows blue highlight on hover, cursor changes to col-resize during drag
- **Smooth Transitions**: CSS transitions provide smooth width changes when not actively resizing

### Benefits
- **Customizable Workspace**: Users can adjust sidebar width to their preference
- **Persistent Preferences**: Width setting persists across browser sessions
- **Intuitive Interaction**: Natural drag-to-resize behavior matching standard desktop application patterns
- **Performance**: Lightweight implementation with minimal overhead

### Affected Components
- `public/js/resizableSidebar.js` - New simple resize functionality module
- `public/css/core/layout.css` - Added resize handle styles and resizing state classes
- `public/index.html` - Added resize handle element and script import
- `public/js/app.js` - Added resizable sidebar initialization

Simple, intuitive sidebar resizing with persistent state!

## [0.33.1] - 2025-11-18

### Added
- **Manual Save Mode**: Toggle between auto-save and manual save modes via Settings
- **Save Changes Button**: Manual save button appears in sidebar when auto-save is disabled
- **Discard Changes Button**: Manual discard button appears in sidebar when auto-save is disabled, allowing users to discard temporary draft text
- **Unsaved Changes Tracking**: Visual indicators (red border + pink background) for nodes with unsaved edits
- **Batch Save Functionality**: Save all pending changes with a single click
- **Batch Discard Functionality**: Discard all pending changes and restore original content with a single click
- **Unsaved Count Display**: Save and discard buttons show count of unsaved changes (e.g., "Save Changes (3)", "Discard Changes (3)")
- **Auto-save Toggle**: Settings panel includes toggle to switch between save modes

### Changed
- **Blur Handler Behavior**: Node content blur handler now respects auto-save setting
- **Save/Discard Button Visibility**: Save Changes and Discard Changes buttons automatically show/hide based on save mode
- **Settings Integration**: Auto-save setting persists across sessions and updates UI immediately

### Technical Details
- **Unsaved Changes Map**: Tracks modified nodes with their content in manual mode
- **Visual Feedback**: CSS classes `.unsaved` and `.has-unsaved` provide clear visual indicators
- **Mode Switching**: Switching to auto-save mode automatically saves any pending changes
- **Node Operations**: Structural changes (add/delete/indent) always save immediately regardless of mode

### Benefits
- **User Control**: Choose between seamless auto-save or deliberate manual save workflow
- **Methodical Editing**: Manual mode allows organizing thoughts without pressure of immediate persistence
- **Visual Clarity**: Clear indicators show which nodes have unsaved changes
- **Backward Compatible**: Auto-save enabled by default maintains existing user experience

### Affected Components
- `public/js/app.js` - Added unsaved changes tracking, manual save/discard functions, and mode-aware blur handler
- `public/js/settingsManager.js` - Added auto-save toggle event listeners and save mode switching logic
- `public/index.html` - Added Save Changes and Discard Changes buttons to sidebar
- `public/css/components/buttons.css` - Added styling for save and discard buttons with unsaved indicators
- `public/css/components/outliner.css` - Added `.unsaved` class styling for visual feedback

Hybrid save system: auto-save by default for seamless capture, manual mode for deliberate editing!

## [0.32.10] - 2025-11-18

### Removed
- Unused position management endpoints: `/api/nodes/reorder/shift`, `/api/nodes/fix-positions`, `/api/nodes/fix-position-conflict`
- Position conflict resolution modal UI
- `shiftNodePositions` controller function

### Changed
- Simplified `addSiblingNode` to create nodes directly without position shifting
- `fixNodePositions` now only detects and logs conflicts instead of showing resolution UI

## [0.32.6] - 2025-11-17

### Removed
- **Complete I18n System Replaced with English-Only Architecture**:
- **Dual Language Content Handling**: Eliminated `content_zh` fields and Chinese language processing across all modules
- **Translation System**: Deleted `I18n.t()` calls and language toggle functionality system-wide
- **Language Detection**: Removed `I18n.getCurrentLanguage()` and language switching mechanics
- **Chinese UI Elements**: Eliminated Chinese content containers, toggle buttons, and bilingual display logic
- **Translation Dependencies**: Removed all internationalization translation keys and English/Chinese comparison logic

### Technical Details

**Complete Internationalization Elimination**:
- **Frontend/Browser Layer**:
  - `public/js/app.js` - Removed dual-language content logic, Chinese content containers, and language toggle buttons
  - `public/js/searchManager.js` - Eliminated 25+ `I18n.t()` translation calls and Chinese language handling
  - `public/js/breadcrumbManager.js` - Simplified to hardcoded English display without language detection
  - `public/js/positionManager.js` - Removed `content_zh` references and translation strings
  - `public/index.html` - Removed "Switch to Chinese" button from sidebar

**Systematic I18n Reference Removal**:
- **Content Logic**: Replaced `currentLanguage === "en"` with hardcoded English content paths
- **Translation Calls**: Eliminated all `I18n.t('key_name')` with direct English text strings
- **Dual Display**: Removed parallel English/Chinese content rendering with toggle buttons
- **Language UI**: Erased Chinese content containers, headers, and visibility toggle functionality

**Orphaned Code Cleanup**:
- **Lines 345-390 in app.js**: Completely removed orphaned dual-language UI creation (`otherLangCode`, `globalOtherLanguageVisible`, toggle button logic)
- **Unreferenced Variables**: Eliminated `languageToggle` DOM references and language system initialization
- **Complex Conditional Logic**: Removed bilingual content comparison patterns across all modules

### Rationale
- **Architectural Simplicity**: Pure English-only system eliminates complex dual-language management overhead
- **Code Reduction**: Removed ~800 lines of internationalization complexity across the codebase
- **Performance Enhancement**: Eliminated language detection logic and conditional content processing
- **Maintenance Streamlining**: Single language approach removes translation file dependencies

### Technical Benefits
- **Bundle Size Reduction**: Smaller JavaScript footprint without translation functions
- **Runtime Performance**: No language detection or content serving overhead
- **Developer Simplicity**: Single language content model without branching logic
- **UI Cleanliness**: No language toggle buttons or dual-language display modes

### Affected Components
- `public/js/app.js` - Major rewrite: removed dual language containers, Chinese button protocols, and translation logic
- `public/js/searchManager.js` - Translation calls replaced, search logic streamlined to English-only
- `public/js/breadcrumbManager.js` - Language detection simplified to hardcoded English
- `public/js/positionManager.js` - Removed Chinese content references in modal dialogs
- `public/index.html` - Removed language switch button from sidebar UI

### Retained Architecture
- **Core Node Operations**: All hierarchical node manipulation preserved in English
- **Search Functionality**: English-only search with simplified result processing
- **Modal Systems**: Settings, backup, and position modals with English text only
- **Settings Integration**: Theme and font settings maintained with English labels

### Code Statistics
- **Lines Removed**: ~800 lines of complex I18n management across frontend modules
- **Functions Eliminated**: Dual language content creation, translation systems, language toggles
- **Variables Cleaned**: `currentLanguage`, `otherLangCode`, `content_zh` references systematically removed
- **Conditional Simplification**: `currentLanguage === "en"` branches replaced with direct English paths

Streamlined to pure English outliner operations - zero translation and dual-language complexity!

## [v0.32.3+] - 2025-11-17

### Fixed
**Link System Completeness**:
- **Resolved startup error**: Removed unresolved `linkController` import in `routes/nodeRoutes.js`
- **Database schema finalization**: Cleaned up remaining link references and table creation
- **Controller cleanup**: Removed `link_count` subqueries from node fetch operations

### Technical Details

**Server Operational Fix**:
```
Error: Cannot find module '../controllers/linkController'
Error resolved by removing lingering import references
```

**Completed Link System Elimination**:
- **Database layer**: Removed `links` table schema creation, eliminated from `populateSequenceIds()`
- **API layer**: Cleaned all link-related queries in `nodeController.js`
- **Route layer**: Removed final `linkController` references in `nodeRoutes.js`

### Comprehensive Changes from v0.32.1 ➜ v0.32.2
Following v0.32.1 vault system simplification:

**Complete Feature Consolidation**:
- **Database Export/Import System**: Deleted entirely, replaced by backup manager
- **Link Management System**: Completely removed - pure node operations sufficient
- **Database Schema**: Simplified to core tables (nodes, attributes, bookmarks)

**Architecture Benefits**:
- **Pure Node Operations**: No connections, links, or complex relationships
- **Performance Enhancement**: Simplified SQL queries without JOIN complexity
- **Interface Clarity**: Clean UI with only essential node actions
- **Codebase Streamlined**: ~1,800+ lines removed across the system

System now operates with ultimate simplicity: pure hierarchical node-based outliner!

### Removed
- **Complete Link System Database Schema**: Removed links table creation from `database.js`
- **Links Table Reference**: Eliminated links from `populateSequenceIds()` function
- **Node Controller Link Counts**: Removed `link_count` subqueries from node queries
- **Node Deletion Cascade**: Removed automatic link deletion when nodes are deleted

### Technical Details

**Database Layer Changes**:
- Removed `links` table schema creation from `initializeDatabase()` function
- Eliminated links table from `populateSequenceIds()` to only process nodes and attributes
- Links table previously enabled bidirectional node connections with weight/metadata

**API Layer Cleanup**:
- Removed `link_count` subqueries from `nodeController.js` node fetch operations
  - Previously returned link count for each node in `/api/nodes` and `/api/nodes/:id/children`
  - Search functionality no longer includes link count information
- Eliminated automatic link deletion during node removal operations
  - Previously: `DELETE FROM links WHERE from_node_id = ? OR to_node_id = ?`
  - Now: Pure node hierarchy operations only

**Foundation Simplification**:
- Database maintains only: `nodes`, `node_attributes`, `bookmarks` tables
- Sequence ID functionality operates only on relevant tables
- Foreign key relationships simplified to core outliner components

### Rationale
- **Architectural Completeness**: Link system elimination finalized at database level
- **Data Integrity**: Maintains existing databases without breaking changes
- **Performance Enhancement**: Simplified SQL queries without JOIN complexity
- **Foundation Clarity**: Pure hierarchical node-only operations at database core

### Affected Components
- `database.js` - Removed table creation, simplified sequence ID population
- `controllers/nodeController.js` - Cleaned all link-related SQL queries and operations
- **Database Schema**: Simplified to nodes + attributes + bookmarks only

### Preserved Architecture
- **Backward Compatibility**: Existing databases continue functioning
- **Core Tables**: Nodes, attributes, bookmarks maintain full functionality
- **API Stability**: All `/api/nodes/*` endpoints fully operational
- **Data Migration**: No breaking changes to existing data

Streamlined to core database foundation with pure node hierarchy - zero link complexity!

## [0.32.3] - 2025-11-17

### Removed
- **Complete Link Management System**: Deleted `linkManager.js`, `linkController.js`, `linkRoutes.js`, and `link-manager.css`
- **Link APIs**: Removed `/api/links` GET, POST, PUT, DELETE endpoints
- **Link Web UI**: Eliminated link `🔗` button from node actions
- **Link Modal Features**: Removed link creation, editing, search functionality with modals
- **Link Count Display**: Removed link count indicators from node content display
- **Bidirectional Links**: Eliminated connection between nodes with weights and descriptions

### Rationale
- **Core Functionality Sufficiency**: Pure node operations comprehensively satisfy user needs
- **Complexity Elimination**: Link management introduced unnecessary UX complexity
- **Workflow Focus**: Outliner experience refined to core node hierarchy operations
- **Interface Cleanup**: Removed visual clutter with 🔗 buttons and link count indicators

### Affected Components
- `server.js` - Removed link routes and API endpoint registration
- `public/js/app.js` - Eliminated link button creation and node action
- `public/index.html` - Removed linkManager.js script references
- `public/css/index.css` - Removed link-manager CSS styling imports

### Technical Changes
- **API Layer**: Cleaned up URL paths `/api/links/*` endpoints
- **Frontend UI**: Streamlined node action button set
- **Code Reduction**: Removed ~675 lines across JavaScript/CSS/Server files
- **Bundle Size**: Reduced client-side dependencies and startup complexity

### Retained Functionality
- **Core Outliner Operations**: Node creation, editing, moving, hierarchical organization preserved
- **Database Integrity**: Underlying nodes and foreign key relationships maintained
- **API Stability**: `/api/nodes/*` endpoints remain fully functional
- **User Workflow**: Pure node-based information architecture intact

### Benefits
- **Code Reduction**: Eliminated ~675 lines of link management complexity
- **Performance Gain**: Faster UI initialization without link components
- **UX Simplification**: Cleaner node interface without 🔗 buttons
- **Architecture Focus**: Streamlined to core outliner functionality

## [0.32.2] - 2025-11-17

### Removed
- **Complete Database Export/Import System**: Deleted `databaseExportImportManager.js`, `databaseExportImportController.js`, `databaseExportImportRoutes.js`
- **Export/Import CSS**: Removed `export-import.css` styling files
- **Export/Import UI Elements**: Removed export/import buttons and modals
- **Export Node Tree Functionality**: Eliminated node tree export from node actions
- **Database Table APIs**: Removed `/api/database/export`, `/api/database/import`, `/api/database/tables` endpoints

### Rationale
- **Core Functionality Redundancy**: Database export/import system overlapped with existing backup functionality
- **Backup Manager Sufficiency**: `@public/jsackupManager.js` provides complete database backup/restore functionality
- **Code Reduction**: Removed ~1300 lines of export/import management code
- **Architecture Streamlining**: Single backup system eliminates feature overlap

### Affected Components
- `server.js` - Removed database API route usage
- `public/index.html` - Removed export/import script references
- `public/css/index.css` - Removed export-import CSS imports
- `public/js/app.js` - Removed DatabaseExportImportManager initialization and export tree button creation

### Retained Functionality
- **Backup System**: `@public	sackupManager.js` provides comprehensive database backup/restore
- **Node Operations**: All core node creation, editing, and management preserved
- **Data Integrity**: Backup system maintains database consistency without table-specific complexity

### Technical Details
- **Code Reduction**: Eliminated ~1300 lines across JavaScript, CSS, and server files
- **Performance Improvement**: Removed unnecessary export/import APIs and DOM elements
- **UI Cleanup**: Eliminated export/import buttons, modals, and related UI complexity
- **Single Solution**: Unified backup approach for data management

## [0.32.1] - 2025-11-17

### Removed
- **Complete Vault System**: Deleted `vaultManager.js`, `vaultRoutes.js`, `vault-manager.css`, and related vault files
- **Multi-Database Support**: Removed vault-based database switching functionality
- **Vault Middleware**: Eliminated `req.currentVault` and vault-related request handling
- **Vault UI Elements**: Removed vault switching buttons and vault-based UI components
- **Global Vault State**: Removed `global.currentVault` and vault-based localStorage keys

### Changed
- **Simplified Database Architecture**: Single `outliner.db` database only - no vault switching
- **Streamlined Backup System**: Removed vault parameter from backup API calls
- **Simplified Default Focus**: Vault-aware node focus replaced with simple `main_default_focus_node`
- **Reduced Server Routing**: Removed `/api/vaults` endpoints and related middleware

### Technical Details
- **Database Layer**: Modified `getDb()` to always use main database path
- **Backup System**: `backupManager.js` now calls `/api/backup` without vault parameters
- **Focus Management**: Default focus node storage simplified to single key
- **Server Configuration**: Removed vault directory creation and multi-database middleware

### Affected Components
- `server.js` - Removed vault routes, middleware, and multi-database logic
- `database.js` - Simplified to single database connection
- `public/js/app.js` - Removed vault manager references and vault-aware focus logic
- `public/js/backupManager.js` - Eliminated vault parameter from backup calls

### Benefits
- **Code Reduction**: Removed vault system complexity (~300+ lines)
- **Maintenance Simplification**: Single database model eliminates vault switching issues
- **Performance Improvement**: Removed vault middleware overhead
- **Architecture Streamlining**: Simplified to core outliner functionality without database complexity

## [0.32.0] - 2025-11-17

### Added
- **New Plugin System**: Simple, extensible plugin architecture replacing complex plugin manager
- **Built-in Sample Plugin**: Tutorial Explorer plugin demonstrating the new system
- **Hook System**: Plugin hooks for event-driven architecture
- **Standalone Plugin Management Dialog**: Complete plugin management UI accessible via Alt+P shortcut
- **Plugin CSS Framework**: Comprehensive styling for plugin management UI
- **Plugin Dialog Integration**: Sidebar button and command palette commands for easy access

### Changed
- **Simplified Plugin Architecture**:
  - Replaced complex `pluginManager.js` with lightweight `plugins.js`
  - Removed dependency chains and complex initialization flows
  - Simplified registration to basic object definition
- **Enhanced Developer Experience**:
  - Clear plugin lifecycle (init/cleanup)
  - Hook system for plugins to interact with core features
  - Built-in sample plugin as development template
  - **Plugin Dialog System**: Professional standalone dialog for plugin management
- **Streamlined Integration**:
  - New plugin dialog accessible via sidebar button and Alt+P keyboard shortcut
  - Command palette integration for plugin management
  - Clean, professional dialog following SettingsManager design patterns
  - Settings modal also shows plugins via PluginSystem integration

### Removed
- **Complex Plugin Manager**: Deleted 340+ line `pluginManager.js` with complex state management
- **Plugin Aware Initializer**: Removed 113+ line `pluginAwareInitializer.js` dependency
- **Plugin Manager CSS**: Eliminated complex plugin management styling
- **Plugin Registration Middleware**: Removed plugin-to-plugin interaction complexity
- **Legacy Plugin UI**: Deleted separate plugin management interfaces

### Technical Details
- **New Plugin Architecture**:
  ```javascript
  // Simple plugin definition
  window.PluginSystem.register({
    id: 'tutorial-sample',
    name: 'Tutorial Explorer',
    description: 'Interactive tutorial system',
    init: function() { /* startup logic */ },
    cleanup: function() { /* shutdown logic */ }
  });
  ```
- **Hook System**: `registerHook()` and `triggerHook()` for plugin interactions
- **Plugin Dialog Architecture**:
  - **Standalone Modal**: Self-contained dialog following SettingsManager patterns
  - **Real CSS Variables**: Uses actual `--theme` variables from variables.css
  - **Dark Theme Support**: Complete dark mode implementation with proper variables
  - **Entry Points**: Sidebar button, Alt+P keyboard shortcut, command palette commands
  - **Professional Styling**: Card-based UI with toggle switches, no `!important` abuse
  - **Mobile Responsive**: Proper adaptation for small screens
- **Settings Integration**: Automatic plugin discovery and UI generation for both dialog and settings modal
- **Extensible Design**: Plugins can add commands, UI, and functionality

### Built-in Sample Plugin

The new `plugin-tutorialsample.js` demonstrates:
- Plugin registration and initialization
- UI element insertion (sidebar button)
- Command palette integration
- Event-driven hooks
- Interactive tutorials
- Clean startup/shutdown lifecycle

This serves as a template for future plugin development.

### Benefits

1. **Developer-Friendly**: Simplified API for creating plugins
2. **Maintainable**: Clear separation of core vs. plugin functionality
3. **Extensible**: Easy to add new features as plugins
4. **Modular**: Each plugin is self-contained with clear boundaries
5. **Testable**: Plugin lifecycle is predictable and isolated
6. **Future-Ready**: Clear path for plugin-based feature development

## [0.31.9] - 2025-11-17

### Removed
- **Complete Node Size Management System**: Deleted `nodeSizeManager.js` and `nodeSizeManager.js` (~1000 lines)
- **Node Size Highlighting**: Removed `nodeSizeHighlightManager.js` and related CSS styling (~800 lines)
- **Size Adjustment UI**: Eliminated size buttons (⚙️) from node actions
- **Size Highlight Commands**: Removed palette commands for node size adjustment
- **Complex Styling**: Deleted background styling, size indicators, and highlight animations

### Changed
- **Simplified Node Actions**: Removed size adjustment button from node creation
- **Streamlined Command Palette**: Reduced command set by removing size-related commands
- **Cleaner UI**: Eliminated size indicators and highlight effects from node interface
- **Reduced Complexity**: Simplified breadcrumb manager and command palette logic

### Affected Components
- `public/js/app.js` - Removed size button creation and size highlight toggle
- `public/js/breadcrumbManager.js` - Simplified refresh logic by removing size highlight calls
- `public/js/commandPaletteManager.js` - Removed "Adjust Node Size" command
- `public/index.html` - Removed node size script imports
- `public/css/index.css` - Eliminated size manager and highlight CSS imports

### Retained Functionality
- **Basic Node Operations**: All core node manipulation preserved (create, move, edit, delete)
- **Keyboard Navigation**: Tab/Enter/Alt+key shortcuts remain intact
- **Core Features**: Links, bookmarks, attributes, and other essential features kept
- **Theme System**: Basic light/dark theme toggle functionality maintained

### Benefits
- **Code Reduction**: Eliminated ~1800 lines of node size management code
- **Performance Gain**: Removed complex DOM manipulation and highlighting computations
- **Simplified Interaction**: Pure keyboard operation without visual size cues
- **Lower Cognitive Load**: Users focus on content rather than styling options
- **Faster Load**: Smaller bundle size reduces initial loading time

## [0.31.8] - 2025-11-17

### Changed
- **Simplified Styling System**: Replaced complex StyleSettingsManager with basic theme functionality
- **Streamlined UI**: Removed comprehensive aesthetic customization in favor of simple light/dark toggle
- **Reduced Feature Overhead**: Eliminated background images, color pickers, and complex visual settings
- **Improved Performance**: Removed complex DOM manipulation and extensive CSS selectors

### Removed
- **Complete Style Settings System**: Deleted `public/js/styleSettingsManager.js` (~1000 lines)
- **Complex Styling CSS**: Removed `public/css/features/style-settings.css` (~600 lines)
- **Plugin Registration**: Removed styleSettingsManager from plugin system
- **Advanced Visual Features**: Background images, color pickers, opacity controls, accessibility modifiers
- **Complex DOM Elements**: Extensive setting panels, sliders, upload interfaces

### Added
- **Basic Theme Toggle**: Simple dropdown for light/dark theme selection in settings
- **Sidebar Theme Button**: Quick-access theme toggle for immediate theme changes
- **Streamlined Settings**: Clean, focused appearance section with minimal options
- **CSS Variable Preservation**: Maintained existing dark theme infrastructure

### Affected Components
- `public/js/settingsManager.js` - Replaced style settings with basic appearance section
- `public/js/pluginManager.js` - Removed style settings plugin registration
- `public/css/index.css` - Removed style-settings.css import, added removal note
- `public/index.html` - Removed styleSettingsManager.js script import
- `public/css/settings-manager.css` - Added basic appearance settings styling
- `public/js/app.js` - Added basic theme initialization and management

### Retained Functionality
- **BasicFontSettings**: Simple font preferences still available in settings
- **Dark Theme Infrastructure**: Existing CSS variables and dark theme classes preserved
- **Local Storage**: Theme preferences persist between sessions
- **Settings Integration**: Theme options remain accessible through settings modal

### Benefits
- **Code Reduction**: Removed ~1600 lines of complex styling code
- **Performance Gain**: Eliminated complex DOM operations and extensive CSS rules
- **Simplified UX**: Reduced cognitive load with focused, minimal options
- **Maintenance Ease**: Single interaction pattern for all theme-related functionality
- **Faster Load**: Reduced bundle size and CSS complexity

## [0.31.7] - 2025-11-17

### Changed
- **Keyboard-First Operation**: Replaced mouse drag and drop with keyboard-centric node management
- **Simplified Interaction Model**: Removed complex drag gesture requirements
- **Improved Performance**: Eliminated drag event handlers and DOM manipulation overhead
- **Cleaner UI**: Removed drag handles (⋮⋮) from node interface

### Removed
- **Complete Drag & Drop System**: Deleted `dragDropManager.js` and all related functionality
- **Drag Handle UI Elements**: Removed ⋮⋮ handles from node creation in `app.js`
- **Plugin Registration**: Removed dragDropManager from plugin system
- **CSS Styling**: Removed `.drag-handle` CSS styles from component styling
- **Event Listeners**: Eliminated all dragstart, dragover, drop, and related events

### Affected Components
- `public/js/pluginManager.js` - Removed dragDropManager plugin registration
- `public/js/pluginAwareInitializer.js` - Removed drag and drop initialization logic
- `public/js/breadcrumbManager.js` - Cleaned up drag setup calls
- `public/js/nodeExpansionManager.js` - Removed drag initialization
- `public/js/nodeOperationsManager.js` - Eliminated drag setup from all node operations
- `public/index.html` - Removed dragDropManager.js script import

### Retained Functionality
- **Keyboard Shortcuts**: All Alt+key combinations through HotkeyManager remain intact
- **Command Palette**: Ctrl+P provides comprehensive node operations access
- **Tab/Shift+Tab**: Indentation control preserved
- **Enter/Escape**: Node creation and navigation maintained
- **Focus Management**: Breadcrumb and focus navigation systems unaffected

### Benefits
- **Reduced Cognitive Load**: Single interaction model with keyboard shortcuts only
- **Performance Improvement**: Eliminated drag event processing overhead
- **Simplified Codebase**: Removed ~500 lines of drag and drop management code
- **Accessibility**: Pure keyboard operation improves accessibility support
- **Consistency**: Standardized on keyboard/command pattern across all features

## [0.31.4] - 2025-11-17

### Changed
- **Simplified Font System**: Replaced complex FontManager with BasicFontSettings
- **Reduced Complexity**: Removed font downloading and external font dependency management
- **Improved Reliability**: Now uses system fonts and basic CSS font families only

### Removed
- Deleted `fontManager.js` with complex font downloading capabilities
- Deleted `fontLoader.js` external font loading system
- Deleted `fontController.js` server-side font management
- Deleted `fontRoutes.js` Express font endpoints
- Deleted `downloadFonts.js` font downloading utility

### Added
- **BasicFontSettings**: Simple dropdown selectors for Latin and Chinese fonts
- **System Font Options**: 4 font choices for English/Latin text (System UI, Georgia, Times, Arial)
- **Chinese Font Support**: 2 simple options for Chinese text (System Sans, System Serif)
- **Live Preview**: Real-time preview of selected fonts in settings
- **Persistent Storage**: Font preferences saved to localStorage
- **Clean UI**: Integrated with existing settings modal

### Technical
- Enhanced error handling for missing modules
- Simplified server-side dependencies
- Reduced bundle size by removing font management complexity
- Maintained existing CSS font variables and system compatibility

## [0.31.3] - 2025-11-17

### Fixed
- Fixed search API endpoint from `/api/search` to `/api/nodes/search`
- Enhanced error handling for search operations
- Improved JSON response validation

### Removed
- All graph view related modules and word frequency modules
- Cosmic visualizer and node grid visualizer modules
- Simplified application core functionality

## [0.31.2] - 2025-11-17

### Changed
- Restructured linkController dependencies
- Removed graph distance cache invalidation calls after module deletion
- Updated import dependencies to prevent Node.js startup errors

## [0.31.1] - 2025-11-17

### Removed
- Deleted all code graph related modules and dependencies
- Cosmic visualizer modules cleanup
- Node grid visualizer removal

## [0.31.0] - 2025-11-17

### Fixed
- Resolved syntax error "Missing catch or finally after try" in app.js
- Fixed malformed try-catch blocks in fetchNodes function
- Improved error handling throughout code base

### Changed
- Removed complex markdown management system from search functionality
- Simplified search to focus on node content only
- Enhanced searchManager.js to work without markdown dependencies

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
