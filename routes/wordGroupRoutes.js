const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Get all word groups with their items
router.get('/', async (req, res) => {
  try {
    const groups = await req.db.all(`
      SELECT wg.*, 
             GROUP_CONCAT(wgi.word) as words
      FROM word_groups wg
      LEFT JOIN word_group_items wgi ON wg.id = wgi.group_id
      GROUP BY wg.id
      ORDER BY wg.sequence_id ASC, wg.display_name
    `);
    
    // Parse the words into arrays
    const groupsWithWords = groups.map(group => ({
      ...group,
      words: group.words ? group.words.split(',') : []
    }));
    
    res.json(groupsWithWords);
  } catch (error) {
    console.error('Error fetching word groups:', error);
    res.status(500).json({ error: 'Failed to fetch word groups' });
  }
});

// Create a new word group
router.post('/', async (req, res) => {
  try {
    const { name, display_name, description, words } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display_name are required' });
    }
    
    const groupId = crypto.randomUUID();
    const now = Date.now();
    
    await req.db.run('BEGIN TRANSACTION');
    
    // Create the group
    await req.db.run(`
      INSERT INTO word_groups (id, name, display_name, description, created_at, updated_at, sequence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [groupId, name, display_name, description, now, now, null]);
    
    // Add words if provided
    if (words && Array.isArray(words)) {
      for (const word of words) {
        if (word.trim()) {
          const itemId = crypto.randomUUID();
          await req.db.run(`
            INSERT INTO word_group_items (id, group_id, word, created_at, updated_at, sequence_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [itemId, groupId, word.trim().toLowerCase(), now, now, null]);
        }
      }
    }
    
    await req.db.run('COMMIT');
    
    const newGroup = await req.db.get('SELECT * FROM word_groups WHERE id = ?', groupId);
    res.status(201).json(newGroup);
  } catch (error) {
    await req.db.run('ROLLBACK');
    console.error('Error creating word group:', error);
    res.status(500).json({ error: 'Failed to create word group' });
  }
});

// Update a word group
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, description, words } = req.body;
    const now = Date.now();
    
    await req.db.run('BEGIN TRANSACTION');
    
    // Update the group
    await req.db.run(`
      UPDATE word_groups 
      SET name = ?, display_name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `, [name, display_name, description, now, id]);
    
    // Remove existing words
    await req.db.run('DELETE FROM word_group_items WHERE group_id = ?', id);
    
    // Add new words
    if (words && Array.isArray(words)) {
      for (const word of words) {
        if (word.trim()) {
          const itemId = crypto.randomUUID();
          await req.db.run(`
            INSERT INTO word_group_items (id, group_id, word, created_at, updated_at, sequence_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [itemId, id, word.trim().toLowerCase(), now, now, null]);
        }
      }
    }
    
    await req.db.run('COMMIT');
    
    const updatedGroup = await req.db.get('SELECT * FROM word_groups WHERE id = ?', id);
    res.json(updatedGroup);
  } catch (error) {
    await req.db.run('ROLLBACK');
    console.error('Error updating word group:', error);
    res.status(500).json({ error: 'Failed to update word group' });
  }
});

// Delete a word group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.run('DELETE FROM word_groups WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting word group:', error);
    res.status(500).json({ error: 'Failed to delete word group' });
  }
});

// Get words that could be grouped with a specific word
router.get('/suggestions/:word', async (req, res) => {
  try {
    const { word } = req.params;
    
    // This would return words that are similar or could be grouped
    // For now, just return words that start with the same letters
    const suggestions = await req.db.all(`
      SELECT DISTINCT word, count
      FROM (
        SELECT word, COUNT(*) as count
        FROM word_group_items wgi
        WHERE word LIKE ? || '%'
        GROUP BY word
      )
      ORDER BY count DESC
      LIMIT 20
    `, [word.substring(0, 3)]);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;