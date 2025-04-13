# Node Operations Manager Documentation

## Overview
The Node Operations Manager (nodeOperationsManager.js) is a client-side module that provides a unified interface for performing operations on nodes in the Luhmann-Roam system. It handles basic operations like creating, deleting, indenting, outdenting, and moving nodes, with optimized DOM updates to minimize full page refreshes.

## Module Design
The manager is implemented as an Immediately Invoked Function Expression (IIFE) that returns a public API. This pattern allows the manager to maintain private state while exposing only the necessary methods.

## Implementation Pattern
The system follows a Facade Pattern architecture where:

1. **app.js** contains simplified wrapper functions that call the NodeOperationsManager
2. **nodeOperationsManager.js** contains the actual implementation details

For example, with `addRootNode`:
- In **app.js**: A simple function that captures the application context (like the global `nodes` array) and delegates to the manager
- In **nodeOperationsManager.js**: The detailed implementation that handles API calls, DOM updates, and error cases

This separation of concerns provides several benefits:
- **Modularity**: Each file has a clear, focused responsibility
- **Reusability**: Operations can be called from anywhere in the application
- **Consistency**: All node operations are handled through a single manager
- **Maintainability**: Changes to implementation details don't require changes to UI code

## Initialization

### initialize()

Purpose: Sets up the Node Operations Manager for use
Parameters: None
Returns: None

Behavior:
    - Initializes the module with language settings
    - Checks for existing initialization to prevent duplicate setup
    - Gets language preference from I18n if available, otherwise from localStorage

Example:
`NodeOperationsManager.initialize();`

### updateLanguage(language)

Purpose: Updates the language setting for the manager

Parameters:
language (String): Language code (e.g., 'en', 'zh')

Returns: None

Behavior: Updates the internal language state for node operations

Example:
`NodeOperationsManager.updateLanguage('zh');`