// Create CSS subdirectories
const fs = require('fs');
const path = require('path');

// Directories to create
const dirs = [
  'public/css/core',
  'public/css/components', 
  'public/css/features',
  'public/css/utilities'
];

// Create directories if they don't exist
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});