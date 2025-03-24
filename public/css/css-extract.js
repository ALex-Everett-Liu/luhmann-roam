// Extract CSS sections into separate files
const fs = require('fs');
const path = require('path');

// Read the main CSS file
const mainCss = fs.readFileSync('public/css/styles.css', 'utf8');

// Define sections and their corresponding file paths
const sections = [
  {
    name: 'Base Styles',
    file: 'public/css/core/base.css',
    patterns: [
      { start: '* {', end: 'body {' },
      { start: 'body {', end: '.app-container {' }
    ]
  },
  {
    name: 'Layout Styles',
    file: 'public/css/core/layout.css',
    patterns: [
      { start: '.app-container {', end: '.sidebar {' },
      { start: '.sidebar {', end: '.content {' },
      { start: '.content {', end: '.resize-handle {' },
      { start: '.resize-handle {', end: '#outliner-container {' }
    ]
  },
  // Component Styles
  {
    name: 'Outliner Styles',
    file: 'public/css/components/outliner.css',
    patterns: [
      { start: '#outliner-container {', end: '.modal-overlay {' },
      { start: '.node {', end: '.node-content {' },
      { start: '.node-content {', end: '.bullet {' },
      // Add more node-related CSS patterns
    ]
  },
  {
    name: 'Modal Styles',
    file: 'public/css/components/modals.css',
    patterns: [
      { start: '.modal-overlay {', end: '.markdown-editor {' },
      // Add more modal-related CSS patterns
    ]
  },
  {
    name: 'Button Styles',
    file: 'public/css/components/buttons.css',
    patterns: [
      { start: 'button {', end: '.collapse-icon {' },
      { start: '.btn {', end: '.link-button {' },
      // Add more button-related CSS patterns
    ]
  },
  
  // Feature-specific styles
  {
    name: 'Task Manager Styles',
    file: 'public/css/features/task-manager.css',
    patterns: [
      { start: '.task-manager {', end: '.task-statistics {' },
      { start: '.task-statistics {', end: '.resize-handle {' },
      // Add more task manager patterns
    ]
  },
  
  // Continue with all other sections...
  
  // Utilities
  {
    name: 'Animation Styles',
    file: 'public/css/utilities/animations.css',
    patterns: [
      { start: '@keyframes highlight-pulse {', end: '@keyframes fade-in {' },
      { start: '@keyframes fade-in {', end: 'kbd {' },
      { start: '@keyframes resize-flash {', end: '.resizable-image {' },
      // Other animation keyframes
    ]
  }
];

// Extract and write each section
sections.forEach(section => {
  let content = `/* ${section.name} */\n\n`;
  
  section.patterns.forEach(pattern => {
    const startIndex = mainCss.indexOf(pattern.start);
    const endIndex = mainCss.indexOf(pattern.end);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const sectionContent = mainCss.substring(startIndex, endIndex);
      content += sectionContent + '\n\n';
    }
  });
  
  fs.writeFileSync(section.file, content);
  console.log(`Created file: ${section.file}`);
});