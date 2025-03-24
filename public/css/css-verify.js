const fs = require('fs');
const path = require('path');

// Function to get all CSS files recursively from a directory
function getAllCssFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively get files from subdirectories
      results = results.concat(getAllCssFiles(filePath));
    } else if (file.endsWith('.css') && file !== 'index.css' && file !== 'styles.css') {
      // Add CSS files, but exclude index.css and styles.css
      results.push(filePath);
    }
  }
  
  return results;
}

try {
  // Read the original styles.css
  console.log('Reading original styles.css...');
  const originalCss = fs.readFileSync('public/css/styles.css', 'utf8');
  
  // Get all CSS files in the new structure
  console.log('Reading all new CSS files...');
  const cssDir = 'public/css';
  const cssFiles = getAllCssFiles(cssDir);
  
  // Read and concatenate all new CSS files
  const newCssContents = [];
  for (const file of cssFiles) {
    console.log(`Reading ${file}...`);
    try {
      const content = fs.readFileSync(file, 'utf8');
      newCssContents.push(content);
    } catch (readError) {
      console.error(`Error reading ${file}:`, readError.message);
    }
  }
  
  // Concatenate all new CSS files (excluding comments and whitespace for comparison)
  const allNewCss = newCssContents.join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ').trim();     // Normalize whitespace
  
  // Clean the original CSS the same way
  const cleanOriginalCss = originalCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ').trim();
  
  // Extract selectors (classes, IDs, and element selectors)
  console.log('Analyzing selectors...');
  
  // Regular expression for different selector types
  // This includes class selectors, ID selectors, element selectors, and combinations
  const selectorRegex = /([a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)(?:\s*[>+~]\s*|\s+)(?:[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)*\s*\{/g;
  
  const simpleClassRegex = /\.[a-zA-Z0-9_-]+\s*\{/g;
  const simpleIdRegex = /#[a-zA-Z0-9_-]+\s*\{/g;
  const simpleElementRegex = /^[a-zA-Z0-9_-]+\s*\{/gm;
  
  // Extract simple selectors
  const originalClassSelectors = cleanOriginalCss.match(simpleClassRegex) || [];
  const originalIdSelectors = cleanOriginalCss.match(simpleIdRegex) || [];
  const originalElementSelectors = cleanOriginalCss.match(simpleElementRegex) || [];
  
  const newClassSelectors = allNewCss.match(simpleClassRegex) || [];
  const newIdSelectors = allNewCss.match(simpleIdRegex) || [];
  const newElementSelectors = allNewCss.match(simpleElementRegex) || [];
  
  // Find missing selectors
  const missingClassSelectors = originalClassSelectors.filter(sel => 
    !newClassSelectors.includes(sel)
  );
  
  const missingIdSelectors = originalIdSelectors.filter(sel => 
    !newIdSelectors.includes(sel)
  );
  
  const missingElementSelectors = originalElementSelectors.filter(sel => 
    !newElementSelectors.includes(sel)
  );
  
  // Check for complex selectors
  // This is more difficult and may require a CSS parser for complete accuracy
  
  // Check for duplicate selectors in the new CSS structure
  const duplicateSelectors = [];
  const allSelectors = [...newClassSelectors, ...newIdSelectors, ...newElementSelectors];
  const selectorCounts = {};
  
  allSelectors.forEach(selector => {
    selectorCounts[selector] = (selectorCounts[selector] || 0) + 1;
    if (selectorCounts[selector] > 1) {
      duplicateSelectors.push(selector);
    }
  });
  
  // Check if properties in selectors are different
  const propertyDifferences = [];
  
  // Output results
  console.log('\n======== VERIFICATION RESULTS ========');
  
  console.log('\nOriginal CSS Stats:');
  console.log(`- Total size: ${originalCss.length} bytes`);
  console.log(`- Classes: ${originalClassSelectors.length}`);
  console.log(`- IDs: ${originalIdSelectors.length}`);
  console.log(`- Elements: ${originalElementSelectors.length}`);
  
  console.log('\nNew CSS Structure Stats:');
  console.log(`- Total number of files: ${cssFiles.length}`);
  console.log(`- Total combined size: ${allNewCss.length} bytes`);
  console.log(`- Classes: ${newClassSelectors.length}`);
  console.log(`- IDs: ${newIdSelectors.length}`);
  console.log(`- Elements: ${newElementSelectors.length}`);
  
  console.log('\nMissing Selectors:');
  if (missingClassSelectors.length > 0) {
    console.log('- Missing Classes:');
    missingClassSelectors.forEach(sel => console.log(`  ${sel.trim()}`));
  } else {
    console.log('- No missing class selectors! ✓');
  }
  
  if (missingIdSelectors.length > 0) {
    console.log('- Missing IDs:');
    missingIdSelectors.forEach(sel => console.log(`  ${sel.trim()}`));
  } else {
    console.log('- No missing ID selectors! ✓');
  }
  
  if (missingElementSelectors.length > 0) {
    console.log('- Missing Elements:');
    missingElementSelectors.forEach(sel => console.log(`  ${sel.trim()}`));
  } else {
    console.log('- No missing element selectors! ✓');
  }
  
  console.log('\nDuplicate Selectors:');
  if (duplicateSelectors.length > 0) {
    // Create a set of unique duplicates (the same selector can be duplicated more than twice)
    const uniqueDuplicates = [...new Set(duplicateSelectors)];
    uniqueDuplicates.forEach(sel => {
      console.log(`  ${sel.trim()} (duplicated ${selectorCounts[sel]} times)`);
    });
    
    // Identify which files contain the duplicates
    console.log('\nFiles containing duplicate selectors:');
    for (const duplicateSelector of uniqueDuplicates) {
      const cleanSelector = duplicateSelector.replace(/\s*\{$/, '').trim();
      console.log(`\n  ${cleanSelector}:`);
      
      cssFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(cleanSelector)) {
          console.log(`    - ${file}`);
        }
      });
    }
  } else {
    console.log('- No duplicate selectors found! ✓');
  }
  
  console.log('\n======== RECOMMENDATIONS ========');
  if (missingClassSelectors.length === 0 && 
      missingIdSelectors.length === 0 && 
      missingElementSelectors.length === 0) {
    console.log('✅ All selectors from the original CSS file appear to be present in the new structure.');
    console.log('You can safely rename styles.css to styles.css.bak as a backup.');
  } else {
    console.log('❌ Some selectors from the original CSS file may be missing in the new structure.');
    console.log('Review the missing selectors and add them to the appropriate files before removing styles.css.');
  }
  
  if (duplicateSelectors.length > 0) {
    console.log('\n⚠️ Found duplicate selectors across files that should be cleaned up.');
    console.log('This can cause maintenance issues and unexpected style behavior.');
  }
  
  // Output a summary file with the results
  const summary = {
    originalStats: {
      totalSize: originalCss.length,
      classes: originalClassSelectors.length,
      ids: originalIdSelectors.length,
      elements: originalElementSelectors.length
    },
    newStats: {
      totalFiles: cssFiles.length,
      totalSize: allNewCss.length,
      classes: newClassSelectors.length,
      ids: newIdSelectors.length,
      elements: newElementSelectors.length
    },
    missing: {
      classes: missingClassSelectors,
      ids: missingIdSelectors,
      elements: missingElementSelectors
    },
    duplicates: duplicateSelectors
  };
  
  fs.writeFileSync('public/css/migration-report.json', JSON.stringify(summary, null, 2));
  console.log('\nDetailed report saved to public/css/migration-report.json');

} catch (error) {
  console.error('Error during CSS verification:', error);
}