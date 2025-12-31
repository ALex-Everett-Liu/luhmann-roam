# Plugin Design System Guide - Neumorphism (Soft UI)

This guide provides comprehensive instructions for implementing the Neumorphism design system in plugins to maintain visual consistency across the Luhmann Roam application.

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Design Tokens](#design-tokens)
4. [Typography](#typography)
5. [Shadows & Depth](#shadows--depth)
6. [Component Patterns](#component-patterns)
7. [Implementation Guide](#implementation-guide)
8. [Code Examples](#code-examples)
9. [Accessibility](#accessibility)
10. [Common Patterns](#common-patterns)
11. [Anti-Patterns](#anti-patterns)

---

## Overview

The Neumorphism (Soft UI) design system creates the illusion of physical depth through carefully balanced dual shadows on a monochromatic cool grey background. All plugins should follow this system to ensure a cohesive, modern, and accessible user experience.

**Key Principles:**
- **Monochromatic Cool Grey Palette** - All visual interest comes from shadow play, not color variety
- **Dual Opposing RGB Shadows** - Top-left light, bottom-right dark for realistic depth
- **No Borders** - Shadows define all edges
- **Soft, Hyper-Rounded Corners** - 32px for containers, 16px for buttons
- **Smooth Micro-interactions** - 300ms transitions with translateY transforms

---

## Design Philosophy

### Core Principles

Neumorphism creates the illusion of physical depth through carefully balanced dual shadows—one light source from the top-left, one dark shadow falling bottom-right—on monochromatic backgrounds. Elements appear to either extrude from the surface (convex/raised) or be pressed into it (concave/inset).

**Visual Signatures:**
- Dual opposing RGB shadows using alpha transparency for smooth blending
- Monochromatic "Cool Grey" discipline (`#E0E5EC`) where shadows do all the visual work
- Same-surface illusion: Elements appear molded from the same material
- Deep inset states for inputs and icon wells
- Soft, hyper-rounded corners (32px containers, 16px buttons)
- Smooth 300ms transitions with translateY transforms

---

## Design Tokens

### Color Palette

All plugins must use these exact color values:

```css
:root {
    /* Colors - Cool Monochromatic Palette */
    --background: #E0E5EC;           /* Base "cool clay" surface */
    --foreground: #3D4852;           /* Primary text (7.5:1 contrast) */
    --muted: #6B7280;                /* Secondary text (4.6:1 contrast) */
    --accent: #7FC9FF;               /* Light blue for interactive elements */
    --accent-light: #9DD5FF;         /* Lighter blue for hover states */
    --accent-secondary: #38B2AC;     /* Teal for success states */
    
    /* Shadow Colors - RGBA for Smoothness */
    --shadow-light: rgba(255, 255, 255, 0.5);
    --shadow-light-hover: rgba(255, 255, 255, 0.6);
    --shadow-dark: rgb(163, 177, 198, 0.6);
    --shadow-dark-hover: rgb(163, 177, 198, 0.7);
    
    /* Typography */
    --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
    
    /* Radius */
    --radius-container: 32px;        /* Cards, sections */
    --radius-button: 16px;           /* Buttons, inputs */
    --radius-inner: 12px;            /* Inner elements, tags */
    
    /* Transitions */
    --transition-fast: 300ms ease-out;
    --transition-slow: 500ms ease-out;
}
```

### Important Notes

- **Never use borders** - Shadows define all edges
- **Never use `bg-white`** - Always use `var(--background)` (`#E0E5EC`)
- **Always use RGBA shadows** - Never use solid hex colors for shadows
- **Accent color is light blue** - `#7FC9FF` (not purple/violet)

---

## Typography

### Font Setup

Include Google Fonts in your HTML `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
```

### Font Usage

```css
/* Display font for headings */
h1, h2, h3, .section-header {
    font-family: var(--font-display);
    font-weight: 700;  /* or 800 for hero headings */
    letter-spacing: -0.01em;  /* or -0.02em for large headings */
    color: var(--foreground);
}

/* Body font for all UI elements */
body, p, button, input, select, label {
    font-family: var(--font-body);
    color: var(--foreground);
}

/* Muted text */
.subtitle, .hint, .secondary-text {
    color: var(--muted);
    font-weight: 400;
}
```

### Font Weights

- **Display Headings**: `font-weight: 800` (extrabold) with `letter-spacing: -0.02em`
- **Section Headings**: `font-weight: 700` (bold) with `letter-spacing: -0.01em`
- **Body Text**: `font-weight: 400` (normal) to `500` (medium)
- **Labels**: `font-weight: 600` (semibold)

---

## Shadows & Depth

### Shadow System

Neumorphism uses dual opposing shadows to create depth. **Always use RGBA values**, never solid hex colors.

#### Extruded (Raised) - Default State

```css
/* Standard extruded shadow */
box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);

/* Small elements (buttons, small cards) */
box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
```

#### Extruded Hover (Lifted)

```css
/* Hover state - enhanced shadow + translateY */
.element:hover {
    transform: translateY(-2px);  /* or -1px for buttons */
    box-shadow: 12px 12px 20px var(--shadow-dark-hover), -12px -12px 20px var(--shadow-light-hover);
}
```

#### Inset (Pressed) - For Inputs

```css
/* Standard inset shadow */
box-shadow: inset 6px 6px 10px var(--shadow-dark), inset -6px -6px 10px var(--shadow-light);

/* Deep inset - for focused inputs */
box-shadow: inset 10px 10px 20px var(--shadow-dark-hover), inset -10px -10px 20px var(--shadow-light-hover);
```

#### Active/Pressed State

```css
.element:active {
    transform: translateY(0.5px);
    box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
}
```

---

## Component Patterns

### Cards / Containers

```css
.card, .section, .panel {
    background-color: var(--background);
    border-radius: var(--radius-container);  /* 32px */
    padding: 2rem;
    box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 12px 12px 20px var(--shadow-dark-hover), -12px -12px 20px var(--shadow-light-hover);
}
```

### Buttons

```css
.btn-primary {
    background-color: var(--accent);
    color: white;
    border: none;
    padding: 0.875rem 2rem;
    border-radius: var(--radius-button);  /* 16px */
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
    min-height: 48px;  /* Touch-friendly */
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 8px 8px 15px var(--shadow-dark-hover), -8px -8px 15px var(--shadow-light-hover);
    background-color: var(--accent-light);
}

.btn-primary:active:not(:disabled) {
    transform: translateY(0.5px);
    box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
}

.btn-primary:focus:not(:disabled) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: inset 6px 6px 10px var(--shadow-dark), inset -6px -6px 10px var(--shadow-light);
}
```

### Secondary Buttons

```css
.btn-secondary {
    background-color: var(--background);
    color: var(--foreground);
    border: none;
    padding: 0.875rem 2rem;
    border-radius: var(--radius-button);
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
    min-height: 48px;
}

.btn-secondary:hover {
    transform: translateY(-1px);
    box-shadow: 8px 8px 15px var(--shadow-dark-hover), -8px -8px 15px var(--shadow-light-hover);
}

.btn-secondary:active {
    transform: translateY(0.5px);
    box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
}

.btn-secondary:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
```

### Inputs

```css
input[type="text"],
input[type="number"],
input[type="email"],
select,
textarea {
    padding: 0.875rem 1rem;
    border: none;
    border-radius: var(--radius-button);  /* 16px */
    font-size: 1rem;
    font-family: var(--font-body);
    background-color: var(--background);
    color: var(--foreground);
    transition: all var(--transition-fast);
    box-shadow: inset 6px 6px 10px var(--shadow-dark), inset -6px -6px 10px var(--shadow-light);
}

input:focus,
select:focus,
textarea:focus {
    outline: none;
    box-shadow: inset 10px 10px 20px var(--shadow-dark-hover), inset -10px -10px 20px var(--shadow-light-hover), 0 0 0 2px var(--accent);
}
```

### Icon Wells (Deep Inset)

```css
.icon-well {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--background);
    box-shadow: inset 10px 10px 20px var(--shadow-dark-hover), inset -10px -10px 20px var(--shadow-light-hover);
}

.icon-well i {
    font-size: 2rem;
    color: var(--muted);
}
```

---

## Implementation Guide

### Step 1: HTML Setup

Add Google Fonts to your plugin's `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Plugin Name</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Your plugin content -->
</body>
</html>
```

### Step 2: CSS Variables

Create a `variables.css` file (or add to your main stylesheet):

```css
/* Neumorphism Design System - Your Plugin Name */

:root {
    /* Colors - Cool Monochromatic Palette */
    --background: #E0E5EC;
    --foreground: #3D4852;
    --muted: #6B7280;
    --accent: #7FC9FF;
    --accent-light: #9DD5FF;
    --accent-secondary: #38B2AC;
    --success-color: #10b981;
    --error-color: #ef4444;
    --warning-color: #f59e0b;
    
    /* Shadow Colors - RGBA for Smoothness */
    --shadow-light: rgba(255, 255, 255, 0.5);
    --shadow-light-hover: rgba(255, 255, 255, 0.6);
    --shadow-dark: rgb(163, 177, 198, 0.6);
    --shadow-dark-hover: rgb(163, 177, 198, 0.7);
    
    /* Typography */
    --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
    
    /* Radius */
    --radius-container: 32px;
    --radius-button: 16px;
    --radius-inner: 12px;
    
    /* Transitions */
    --transition-fast: 300ms ease-out;
    --transition-slow: 500ms ease-out;
}
```

### Step 3: Base Styles

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-body);
    background-color: var(--background);
    color: var(--foreground);
    line-height: 1.6;
    overflow-x: hidden;
    scroll-behavior: smooth;
}

.app-container {
    max-width: 1280px;  /* or 1400px for wider layouts */
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
}
```

### Step 4: Component Styles

Apply the component patterns from the [Component Patterns](#component-patterns) section above.

---

## Code Examples

### Complete Card Example

```html
<div class="card">
    <h3 class="card-title">Card Title</h3>
    <p class="card-content">Card content goes here.</p>
    <button class="btn-primary">Action</button>
</div>
```

```css
.card {
    background-color: var(--background);
    border-radius: var(--radius-container);
    padding: 2rem;
    box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 12px 12px 20px var(--shadow-dark-hover), -12px -12px 20px var(--shadow-light-hover);
}

.card-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--foreground);
    margin-bottom: 1rem;
}

.card-content {
    color: var(--muted);
    margin-bottom: 1.5rem;
    font-family: var(--font-body);
}
```

### Form Example

```html
<form class="form">
    <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="Enter your email">
    </div>
    <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" rows="4" placeholder="Enter your message"></textarea>
    </div>
    <button type="submit" class="btn-primary">Submit</button>
</form>
```

```css
.form {
    background-color: var(--background);
    border-radius: var(--radius-container);
    padding: 2rem;
    box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.form-group label {
    font-weight: 600;
    color: var(--foreground);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-body);
}

.form-group input,
.form-group textarea {
    padding: 0.875rem 1rem;
    border: none;
    border-radius: var(--radius-button);
    font-size: 1rem;
    font-family: var(--font-body);
    background-color: var(--background);
    color: var(--foreground);
    transition: all var(--transition-fast);
    box-shadow: inset 6px 6px 10px var(--shadow-dark), inset -6px -6px 10px var(--shadow-light);
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    box-shadow: inset 10px 10px 20px var(--shadow-dark-hover), inset -10px -10px 20px var(--shadow-light-hover), 0 0 0 2px var(--accent);
}
```

### Modal/Dialog Example

```html
<div class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Modal Title</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <p>Modal content goes here.</p>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary">Cancel</button>
            <button class="btn-primary">Confirm</button>
        </div>
    </div>
</div>
```

```css
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(224, 229, 236, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.modal-content {
    background-color: var(--background);
    border-radius: var(--radius-container);
    box-shadow: 12px 12px 24px var(--shadow-dark-hover), -12px -12px 24px var(--shadow-light-hover);
    width: 90%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
}

.modal-header h3 {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--foreground);
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
    min-width: 44px;
    min-height: 44px;
}

.modal-close:hover {
    color: var(--foreground);
    box-shadow: 5px 5px 10px var(--shadow-dark-hover), -5px -5px 10px var(--shadow-light-hover);
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    background-color: var(--background);
}
```

---

## Accessibility

### Focus States

All interactive elements must have visible focus indicators:

```css
button:focus,
input:focus,
select:focus,
a:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
```

### Touch Targets

Minimum touch target size: **44px × 44px** (48px recommended for buttons)

```css
button, .clickable {
    min-width: 44px;
    min-height: 44px;
}
```

### Contrast Ratios

- **Primary text** (`#3D4852` on `#E0E5EC`): 7.5:1 (WCAG AAA)
- **Muted text** (`#6B7280` on `#E0E5EC`): 4.6:1 (WCAG AA)

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```css
/* Skip focus for mouse-only interactions */
@media (hover: hover) {
    .hover-only:hover {
        /* Hover styles */
    }
}

/* Always show focus for keyboard users */
.element:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
```

---

## Common Patterns

### Section Header

```css
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
}

.section-header h3 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--foreground);
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
```

### Empty State

```css
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--muted);
}

.empty-state i {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.4;
    display: inline-block;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 10px 10px 20px var(--shadow-dark-hover), inset -10px -10px 20px var(--shadow-light-hover);
    background-color: var(--background);
}

.empty-state p {
    font-size: 1.125rem;
    font-weight: 500;
    font-family: var(--font-body);
}
```

### Toast Notification

```css
.toast {
    background-color: var(--background);
    border-radius: var(--radius-button);
    padding: 1.25rem;
    box-shadow: 12px 12px 24px var(--shadow-dark-hover), -12px -12px 24px var(--shadow-light-hover);
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 320px;
    position: relative;
}

.toast-success::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--accent-secondary);
    border-radius: var(--radius-button) 0 0 var(--radius-button);
}
```

### Loading Spinner

```css
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(224, 229, 236, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
}

.loading-spinner {
    background-color: var(--background);
    padding: 3rem;
    border-radius: var(--radius-container);
    text-align: center;
    box-shadow: 12px 12px 24px var(--shadow-dark-hover), -12px -12px 24px var(--shadow-light-hover);
    min-width: 280px;
}

.loading-spinner i {
    font-size: 2.5rem;
    color: var(--accent);
    margin-bottom: 1rem;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

---

## Anti-Patterns

### ❌ DO NOT:

1. **Use borders** - Shadows define all edges
   ```css
   /* ❌ Wrong */
   .card { border: 1px solid #e2e8f0; }
   
   /* ✅ Correct */
   .card { box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light); }
   ```

2. **Use white backgrounds** - Always use `var(--background)` (`#E0E5EC`)
   ```css
   /* ❌ Wrong */
   .card { background-color: white; }
   
   /* ✅ Correct */
   .card { background-color: var(--background); }
   ```

3. **Use solid hex shadows** - Always use RGBA
   ```css
   /* ❌ Wrong */
   box-shadow: 0 4px 6px #A3B1C6;
   
   /* ✅ Correct */
   box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
   ```

4. **Use sharp corners** - Minimum `16px` radius
   ```css
   /* ❌ Wrong */
   .button { border-radius: 4px; }
   
   /* ✅ Correct */
   .button { border-radius: var(--radius-button); }  /* 16px */
   ```

5. **Use purple/violet accent** - Use light blue `#7FC9FF`
   ```css
   /* ❌ Wrong */
   --accent: #6C63FF;
   
   /* ✅ Correct */
   --accent: #7FC9FF;
   ```

6. **Skip focus states** - All interactive elements need focus indicators
   ```css
   /* ❌ Wrong */
   button:focus { outline: none; }
   
   /* ✅ Correct */
   button:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
   ```

7. **Use flat buttons** - All buttons need shadows
   ```css
   /* ❌ Wrong */
   .button { background-color: var(--accent); box-shadow: none; }
   
   /* ✅ Correct */
   .button { background-color: var(--accent); box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light); }
   ```

---

## Reference Examples

For complete implementation examples, refer to:

- **WebP Converter Plugin**: `plugins/webp-converter/styles.css`
- **Image Viewer Plugin**: `plugins/image-viewer/css/` (modular CSS files)

These plugins serve as reference implementations of the Neumorphism design system.

---

## Quick Checklist

When implementing a new plugin, ensure:

- [ ] Google Fonts (Plus Jakarta Sans, DM Sans) included in HTML
- [ ] CSS variables defined with exact color values
- [ ] All cards/containers use extruded shadows (no borders)
- [ ] All buttons have shadows and hover/active states
- [ ] All inputs use inset shadows
- [ ] Border radius: 32px containers, 16px buttons
- [ ] Transitions: 300ms ease-out
- [ ] Focus states: 2px accent outline with offset
- [ ] Touch targets: Minimum 44px × 44px
- [ ] Typography: Display font for headings, body font for UI
- [ ] Accent color: Light blue `#7FC9FF` (not purple)

---

## Questions?

If you have questions about implementing the design system, refer to:

1. **Design System Specification**: `prompt.xml` (design-system section)
2. **Reference Plugins**: WebP Converter and Image Viewer plugins
3. **This Guide**: Complete patterns and examples above

---

**Last Updated**: 2025-12-31  
**Version**: 1.0.0

