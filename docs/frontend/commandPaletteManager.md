# CommandPaletteManager Documentation
## Overview
The CommandPaletteManager (commandPaletteManager.js) is a client-side module responsible for providing a searchable command interface similar to VS Code or Obsidian. It allows users to quickly access and execute commands through a unified interface triggered by Ctrl+P (or Cmd+P on Mac).
## Module Design
The CommandPaletteManager uses the Immediately Invoked Function Expression (IIFE) pattern that returns a public API. This approach encapsulates private state while exposing only necessary methods for interacting with the manager.

## Implementation Pattern

The system follows a similar architecture to other managers in the application:
1. Creates an interface for discovering and executing commands from any part of the application
2. Collects commands from various modules and makes them searchable in one place
3. Provides keyboard navigation and shortcuts for efficient workflow

This provides:
- Discoverability: Users can find commands without knowing their keyboard shortcuts
- Efficiency: Quick command execution through keyboard-driven interface
- Extensibility: New commands can be registered by any module in the application
- Consistency: Unified interface similar to popular modern editors

## Core Functions

### initialize()

Purpose: Sets up the CommandPaletteManager for use
Parameters: None
Returns: None

### registerCommand(command)

Purpose: Registers a new command with the command palette

Parameters:
    - command: Object containing command properties (name, action, category, shortcut, keywords)

Returns: None

Example:

```javascript
CommandPaletteManager.registerCommand({
  name: 'Toggle Dark Mode',
  action: () => StyleSettingsManager.toggleTheme(),
  category: 'Appearance',
  shortcut: 'Alt+D',
  keywords: ['theme', 'dark', 'light']
});
```

## Usage Examples

### Registering Custom Commands

Modules can register their commands for use in the command palette:

```javascript
// Register a single command
CommandPaletteManager.registerCommand({
  name: 'Open Style Settings',
  action: () => StyleSettingsManager.openStyleSettings(),
  category: 'Appearance',
  keywords: ['theme', 'style', 'color', 'customize']
});

// Register multiple commands at once
CommandPaletteManager.registerCommands([
  {
    name: 'Export as PDF',
    action: exportPDF,
    category: 'Export',
    keywords: ['pdf', 'save', 'document']
  },
  {
    name: 'Export as Markdown',
    action: exportMarkdown,
    category: 'Export',
    keywords: ['markdown', 'md', 'save']
  }
]);
```