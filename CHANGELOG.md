# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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