// luhmann-roam/services/wordFrequencyService.js
const { getDb } = require('../database');

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
 * Analyzes word frequency in the 'content' field of all nodes, grouping by word stems.
 * @returns {Promise<Array<{stem: string, count: number, forms: Record<string, number>}>>} 
 *          A promise that resolves to an array of stem-frequency pairs with original forms.
 */
async function analyzeWordFrequency() {
  try {
    const db = await getDb();
    const nodes = await db.all('SELECT content FROM nodes WHERE content IS NOT NULL');

    // This map will store stem -> { count: total_count, forms: Map<original_word, count> }
    const stemData = new Map();

    nodes.forEach(node => {
      if (node.content && typeof node.content === 'string') {
        // Process English content:
        // 1. Remove HTML tags (if any, though unlikely for 'content')
        // 2. Split into words: handle punctuation, convert to lowercase
        // 3. Filter out non-alphabetic words and very short words (optional)
        const text = node.content.toLowerCase();
        const words = text.match(/\b[a-z']+\b/g); // Matches words, allows apostrophes within words

        if (words) {
          words.forEach(originalWord => {
            // Optional: Filter out very short words or stop words here
            if (originalWord.length > 2) { // Example: ignore words with 2 or fewer letters
              const stem = simpleStem(originalWord);

              if (!stemData.has(stem)) {
                stemData.set(stem, { count: 0, forms: new Map() });
              }

              const stemInfo = stemData.get(stem);
              stemInfo.count += 1;
              stemInfo.forms.set(originalWord, (stemInfo.forms.get(originalWord) || 0) + 1);
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
        forms: Object.fromEntries(data.forms) // Convert Map to plain object for JSON
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