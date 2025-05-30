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

/**
 * Search for words and their variants in the frequency data
 * @param {string} searchTerm - The term to search for
 * @returns {Promise<Object>} Search results with matching stems and statistics
 */
async function searchWordFrequency(searchTerm) {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('Search term is required and must be a string');
    }

    const frequencyData = await analyzeWordFrequency();
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    
    if (!lowerSearchTerm) {
      throw new Error('Search term cannot be empty');
    }

    const matchingStems = [];
    const allMatchingForms = new Set();
    let totalMatchingCount = 0;

    // Search through all stems and their forms
    frequencyData.forEach(item => {
      let isMatch = false;
      const matchingForms = [];

      // Check if stem matches
      if (item.stem.toLowerCase().includes(lowerSearchTerm)) {
        isMatch = true;
      }

      // Check if any word form matches
      Object.keys(item.forms).forEach(form => {
        if (form.toLowerCase().includes(lowerSearchTerm)) {
          isMatch = true;
          matchingForms.push(form);
          allMatchingForms.add(form);
        }
      });

      if (isMatch) {
        matchingStems.push({
          ...item,
          matchingForms: matchingForms,
          searchRelevance: calculateSearchRelevance(item, lowerSearchTerm)
        });
        totalMatchingCount += item.count;
      }
    });

    // Sort by relevance (exact matches first, then by frequency)
    matchingStems.sort((a, b) => {
      if (a.searchRelevance !== b.searchRelevance) {
        return b.searchRelevance - a.searchRelevance;
      }
      return b.count - a.count;
    });

    // Calculate statistics
    const totalWordsInCorpus = frequencyData.reduce((sum, item) => sum + item.count, 0);
    const matchPercentage = totalWordsInCorpus > 0 ? (totalMatchingCount / totalWordsInCorpus) * 100 : 0;
    
    // Calculate combined ranking if all variants were grouped
    const combinedRanking = frequencyData.findIndex(item => item.count <= totalMatchingCount) + 1;

    return {
      searchTerm: searchTerm,
      results: {
        matchingStems: matchingStems,
        totalMatchingStems: matchingStems.length,
        allMatchingForms: Array.from(allMatchingForms),
        totalMatchingForms: allMatchingForms.size,
        totalMatchingCount: totalMatchingCount,
        matchPercentage: parseFloat(matchPercentage.toFixed(2)),
        combinedRanking: combinedRanking <= frequencyData.length ? combinedRanking : null,
        totalStemsInCorpus: frequencyData.length,
        totalWordsInCorpus: totalWordsInCorpus
      }
    };
  } catch (error) {
    console.error('Error searching word frequency:', error);
    throw error;
  }
}

/**
 * Calculate search relevance score for ranking results
 * @param {Object} item - The frequency data item
 * @param {string} searchTerm - The search term
 * @returns {number} Relevance score (higher is more relevant)
 */
function calculateSearchRelevance(item, searchTerm) {
  let score = 0;
  
  // Exact stem match gets highest score
  if (item.stem.toLowerCase() === searchTerm) {
    score += 1000;
  } else if (item.stem.toLowerCase().startsWith(searchTerm)) {
    score += 500;
  } else if (item.stem.toLowerCase().includes(searchTerm)) {
    score += 100;
  }
  
  // Check word forms
  Object.keys(item.forms).forEach(form => {
    const lowerForm = form.toLowerCase();
    if (lowerForm === searchTerm) {
      score += 800;
    } else if (lowerForm.startsWith(searchTerm)) {
      score += 400;
    } else if (lowerForm.includes(searchTerm)) {
      score += 80;
    }
  });
  
  // Add frequency bonus (logarithmic to prevent overwhelming exact matches)
  score += Math.log(item.count + 1) * 10;
  
  return score;
}

/**
 * Get word suggestions based on partial input
 * @param {string} partialWord - Partial word to get suggestions for
 * @param {number} limit - Maximum number of suggestions to return
 * @returns {Promise<Array>} Array of suggested words with their frequencies
 */
async function getWordSuggestions(partialWord, limit = 10) {
  try {
    if (!partialWord || typeof partialWord !== 'string') {
      return [];
    }

    const frequencyData = await analyzeWordFrequency();
    const lowerPartial = partialWord.toLowerCase().trim();
    
    if (lowerPartial.length < 2) {
      return [];
    }

    const suggestions = [];

    // Collect suggestions from stems and word forms
    frequencyData.forEach(item => {
      // Check stem
      if (item.stem.toLowerCase().startsWith(lowerPartial)) {
        suggestions.push({
          word: item.stem,
          type: 'stem',
          count: item.count,
          isCustomGroup: item.isCustomGroup
        });
      }

      // Check word forms
      Object.entries(item.forms).forEach(([form, count]) => {
        if (form.toLowerCase().startsWith(lowerPartial)) {
          suggestions.push({
            word: form,
            type: 'form',
            count: count,
            stem: item.stem,
            isCustomGroup: item.isCustomGroup
          });
        }
      });
    });

    // Sort by frequency and remove duplicates
    const uniqueSuggestions = suggestions
      .sort((a, b) => b.count - a.count)
      .filter((item, index, arr) => 
        arr.findIndex(other => other.word === item.word) === index
      )
      .slice(0, limit);

    return uniqueSuggestions;
  } catch (error) {
    console.error('Error getting word suggestions:', error);
    return [];
  }
}

module.exports = {
  analyzeWordFrequency,
  searchWordFrequency,
  getWordSuggestions
};