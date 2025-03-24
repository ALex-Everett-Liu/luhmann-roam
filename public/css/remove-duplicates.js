const fs = require('fs');
const path = require('path');

// Path to the task-manager.css file
const cssFilePath = 'public/css/features/task-manager.css';

try {
  // Read the CSS file
  console.log('Reading task-manager.css...');
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');

  // Regular expression to match CSS selectors
  const selectorRegex = /([.#\w-]+(?:\s*>\s*[.#\w-]+)*)\s*\{/g;

  // Store unique selectors and their corresponding content
  const uniqueSelectors = new Map();
  const cleanedCssLines = [];

  // Split the CSS content into lines for processing
  const cssLines = cssContent.split('\n');

  cssLines.forEach(line => {
    const match = line.match(selectorRegex);
    if (match) {
      match.forEach(selector => {
        if (!uniqueSelectors.has(selector.trim())) {
          uniqueSelectors.set(selector.trim(), line); // Store the first occurrence
          cleanedCssLines.push(line); // Add the line to cleaned CSS
        }
      });
    } else {
      cleanedCssLines.push(line); // Add non-selector lines directly
    }
  });

  // Join cleaned lines back into a single CSS string
  const cleanedCss = cleanedCssLines.join('\n');

  // Write the cleaned CSS back to the file
  fs.writeFileSync(cssFilePath, cleanedCss);
  console.log('Duplicate selectors removed and cleaned CSS saved to task-manager.css');

} catch (error) {
  console.error('Error processing task-manager.css:', error);
} 