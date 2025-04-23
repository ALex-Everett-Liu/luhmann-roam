# HotkeyManager Documentation
## Overview
The HotkeyManager (hotkeyManager.js) is a client-side module responsible for providing keyboard shortcut functionality with visual hints throughout the Luhmann-Roam system. It creates a Vimium-like experience where pressing the Alt key reveals shortcut hints, allowing for efficient keyboard-driven navigation and operation without needing to memorize all available shortcuts.
## Module Design
The HotkeyManager uses the Immediately Invoked Function Expression (IIFE) pattern that returns a public API. This approach encapsulates private state while exposing only necessary methods for interacting with the manager.

## Implementation Pattern

The HotkeyManager follows a design approach that:
1. Makes application functionality accessible through keyboard shortcuts
2. Provides visual indicators showing available shortcuts when triggered
3. Creates a consistent keyboard navigation system similar to Vimium and other keyboard-focused applications
4. Integrates with other application modules to expose their functionality via hotkeys

This provides:
- Efficiency: Users can perform actions without reaching for the mouse
- Discoverability: Visual hints make shortcuts easy to discover and learn
- Extensibility: New hotkeys can be registered for any UI element
- Consistency: Uniform keyboard navigation system throughout the application