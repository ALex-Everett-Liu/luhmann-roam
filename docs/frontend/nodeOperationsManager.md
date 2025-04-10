# Node Operations Manager Documentation

## Overview
The Node Operations Manager (nodeOperationsManager.js) is a client-side module that provides a unified interface for performing operations on nodes in the Luhmann-Roam system. It handles basic operations like creating, deleting, indenting, outdenting, and moving nodes, with optimized DOM updates to minimize full page refreshes.

## Module Design
The manager is implemented as an Immediately Invoked Function Expression (IIFE) that returns a public API. This pattern allows the manager to maintain private state while exposing only the necessary methods.

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