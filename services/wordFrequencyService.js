// luhmann-roam/services/wordFrequencyService.js
const { getDb } = require('../database');

/**
 * Load custom word groups from database
 */
async function loadCustomWordGroups(db) {
  const groups = await db.all(`
    SELECT wg.display_name, wgi.word
    FROM word_groups wg
    JOIN word_group_items wgi ON wg.id = wgi.group_id
  `);
  
  const wordGroupMap = new Map();
  groups.forEach(({ display_name, word }) => {
    wordGroupMap.set(word.toLowerCase(), display_name);
  });
  
  return wordGroupMap;
}

/**
 * Simple stemmer function to reduce words to their root form
 */
function simpleStem(word) {
  // Convert to lowercase
  word = word.toLowerCase();
  
  // Handle common suffixes
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('ied')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('ing')) {
    return word.slice(0, -3);
  }
  if (word.endsWith('ed')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('er')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('est')) {
    return word.slice(0, -3);
  }
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }
  
  return word;
}

/**
 * Get the stem for a word, checking custom groups first
 */
function getStem(word, customGroupMap) {
  const lowerWord = word.toLowerCase();
  
  // Check if word is in a custom group first
  if (customGroupMap.has(lowerWord)) {
    return customGroupMap.get(lowerWord);
  }
  
  // Fall back to automatic stemming
  return simpleStem(lowerWord);
}

/**
 * Analyzes word frequency in the 'content' field of all nodes, grouping by word stems.
 * @returns {Promise<Array<{stem: string, count: number, forms: Record<string, number>, isCustomGroup: boolean}>>} 
 *          A promise that resolves to an array of stem-frequency pairs with original forms.
 */
async function analyzeWordFrequency() {
  try {
    const db = await getDb();
    
    // Load custom word groups
    const customGroupMap = await loadCustomWordGroups(db);
    
    const nodes = await db.all('SELECT content FROM nodes WHERE content IS NOT NULL');

    // This map will store stem -> { count: total_count, forms: Map<original_word, count>, isCustomGroup: boolean }
    const stemData = new Map();

    nodes.forEach(node => {
      if (node.content && typeof node.content === 'string') {
        const text = node.content.toLowerCase();
        const words = text.match(/\b[a-z']+\b/g);

        if (words) {
          words.forEach(originalWord => {
            if (originalWord.length > 2) {
              const stem = getStem(originalWord, customGroupMap);
              const isCustomGroup = customGroupMap.has(originalWord.toLowerCase());

              if (!stemData.has(stem)) {
                stemData.set(stem, { 
                  count: 0, 
                  forms: new Map(),
                  isCustomGroup: isCustomGroup
                });
              }

              const stemInfo = stemData.get(stem);
              stemInfo.count += 1;
              stemInfo.forms.set(originalWord, (stemInfo.forms.get(originalWord) || 0) + 1);
              
              // Mark as custom group if any word in the group is custom
              if (isCustomGroup) {
                stemInfo.isCustomGroup = true;
              }
            }
          });
        }
      }
    });

    // Convert map to array, convert inner forms Map to object, and sort by count
    const sortedFrequencies = Array.from(stemData.entries())
      .map(([stem, data]) => ({
        stem: stem,
        count: data.count,
        forms: Object.fromEntries(data.forms),
        isCustomGroup: data.isCustomGroup || false
      }))
      .sort((a, b) => b.count - a.count);

    return sortedFrequencies;
  } catch (error) {
    console.error('Error analyzing word frequency:', error);
    throw error;
  }
}

module.exports = {
  analyzeWordFrequency
};