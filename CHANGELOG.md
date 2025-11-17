# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
