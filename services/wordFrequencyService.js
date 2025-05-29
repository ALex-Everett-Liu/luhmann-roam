// luhmann-roam/services/wordFrequencyService.js
const { getDb } = require('../database');

/**
 * Analyzes word frequency in the 'content' field of all nodes.
 * @returns {Promise<Array<{word: string, count: number}>>} A promise that resolves to an array of word-frequency pairs.
 */
async function analyzeWordFrequency() {
  try {
    const db = await getDb();
    const nodes = await db.all('SELECT content FROM nodes WHERE content IS NOT NULL');

    const wordCounts = new Map();

    nodes.forEach(node => {
      if (node.content && typeof node.content === 'string') {
        // Process English content:
        // 1. Remove HTML tags (if any, though unlikely for 'content')
        // 2. Split into words: handle punctuation, convert to lowercase
        // 3. Filter out non-alphabetic words and very short words (optional)
        const text = node.content.toLowerCase();
        const words = text.match(/\b[a-z']+\b/g); // Matches words, allows apostrophes within words

        if (words) {
          words.forEach(word => {
            // Optional: Filter out very short words or stop words here
            if (word.length > 2) { // Example: ignore words with 2 or fewer letters
              wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
          });
        }
      }
    });

    // Convert map to array and sort by count
    const sortedFrequencies = Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
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