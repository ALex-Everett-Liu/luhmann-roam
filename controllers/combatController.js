// combatController.js - Logic for D&D-style combat game operations
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Define combat games directory path
const combatGamesDir = path.join(__dirname, '..', 'combat_games');

// Ensure combat games directory exists
if (!fs.existsSync(combatGamesDir)) {
  fs.mkdirSync(combatGamesDir, { recursive: true });
}

/**
 * Initialize default unit templates
 */
async function initializeDefaultUnitTemplates(db) {
  const defaultTemplates = [
    {
      id: 'template_warrior',
      name: 'Warrior',
      description: 'A strong melee fighter with high HP and defense',
      unit_type: 'infantry',
      max_hp: 120,
      attack_power: 15,
      defense: 8,
      movement_range: 2,
      attack_range: 1,
      skills: JSON.stringify([
        { name: 'Slash', damage: 15, range: 1, cooldown: 0 },
        { name: 'Shield Bash', damage: 10, range: 1, cooldown: 2, effects: ['stun'] }
      ]),
      sprite_url: '⚔️',
      is_custom: 0
    },
    {
      id: 'template_archer',
      name: 'Archer',
      description: 'A ranged fighter with good mobility',
      unit_type: 'ranged',
      max_hp: 80,
      attack_power: 12,
      defense: 4,
      movement_range: 3,
      attack_range: 3,
      skills: JSON.stringify([
        { name: 'Arrow Shot', damage: 12, range: 3, cooldown: 0 },
        { name: 'Multi-Shot', damage: 8, range: 3, cooldown: 3, area_of_effect: 1 }
      ]),
      sprite_url: '🏹',
      is_custom: 0
    },
    {
      id: 'template_mage',
      name: 'Mage',
      description: 'A magical unit with powerful spells',
      unit_type: 'magical',
      max_hp: 60,
      attack_power: 20,
      defense: 3,
      movement_range: 2,
      attack_range: 2,
      skills: JSON.stringify([
        { name: 'Fireball', damage: 20, range: 2, cooldown: 0 },
        { name: 'Heal', healing: 25, range: 2, cooldown: 3 },
        { name: 'Lightning Bolt', damage: 30, range: 3, cooldown: 4 }
      ]),
      sprite_url: '🧙',
      is_custom: 0
    },
    {
      id: 'template_rogue',
      name: 'Rogue',
      description: 'A fast, sneaky unit with high mobility',
      unit_type: 'stealth',
      max_hp: 70,
      attack_power: 18,
      defense: 5,
      movement_range: 4,
      attack_range: 1,
      skills: JSON.stringify([
        { name: 'Backstab', damage: 25, range: 1, cooldown: 0 },
        { name: 'Vanish', range: 0, cooldown: 5, effects: ['invisible'] }
      ]),
      sprite_url: '🗡️',
      is_custom: 0
    }
  ];

  for (const template of defaultTemplates) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO combat_unit_templates (
          id, name, description, unit_type, max_hp, attack_power, defense,
          movement_range, attack_range, skills, sprite_url, is_custom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        template.id, template.name, template.description, template.unit_type,
        template.max_hp, template.attack_power, template.defense,
        template.movement_range, template.attack_range, template.skills,
        template.sprite_url, template.is_custom
      ]);
    } catch (error) {
      console.log(`Template ${template.name} may already exist:`, error.message);
    }
  }
}

/**
 * Initialize empty board state
 */
function initializeBoard(boardSize = 8) {
  const board = {};
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      board[`${x}-${y}`] = null;
    }
  }
  return board;
}

/**
 * Get all combat games
 * GET /api/combat
 */
exports.getAllGames = async (req, res) => {
  try {
    const db = req.db;
    
    const games = await db.all(`
      SELECT id, title, game_status, current_player, current_turn, board_size,
             winner, game_result, started_at, ended_at, last_move_at, created_at, updated_at
      FROM combat_games 
      ORDER BY last_move_at DESC
    `);
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific combat game
 * GET /api/combat/:id
 */
exports.getGame = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const game = await db.get(`
      SELECT * FROM combat_games WHERE id = ?
    `, [id]);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Parse JSON fields
    if (game.board_state) {
      game.board_state = JSON.parse(game.board_state);
    }
    if (game.turn_history) {
      game.turn_history = JSON.parse(game.turn_history);
    }
    
    // Get game units
    const units = await db.all(`
      SELECT u.*, t.name as template_name, t.sprite_url, t.max_hp, t.attack_power, 
             t.defense, t.movement_range, t.attack_range, t.skills
      FROM combat_game_units u
      JOIN combat_unit_templates t ON u.template_id = t.id
      WHERE u.game_id = ?
      ORDER BY u.player, u.created_at
    `, [id]);
    
    game.units = units.map(unit => ({
      ...unit,
      skills: JSON.parse(unit.skills || '[]'),
      status_effects: JSON.parse(unit.status_effects || '[]')
    }));
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new combat game
 * POST /api/combat
 */
exports.createGame = async (req, res) => {
  try {
    const { title, boardSize = 8, player1Units = [], player2Units = [] } = req.body;
    const db = req.db;
    
    // Initialize default templates if they don't exist
    await initializeDefaultUnitTemplates(db);
    
    const gameId = uuidv4();
    const initialBoard = initializeBoard(boardSize);
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      INSERT INTO combat_games (
        id, title, game_status, current_player, current_turn, board_size,
        board_state, turn_history, started_at, last_move_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gameId,
      title || 'New Combat Game',
      'setup', // Start in setup phase
      'player1',
      0,
      boardSize,
      JSON.stringify(initialBoard),
      JSON.stringify([]),
      currentTime,
      currentTime,
      currentTime,
      currentTime
    ]);
    
    // Create default units if provided
    for (const unitData of player1Units) {
      await this.addUnitToGame(db, gameId, unitData.templateId, 'player1', unitData.x, unitData.y);
    }
    
    for (const unitData of player2Units) {
      await this.addUnitToGame(db, gameId, unitData.templateId, 'player2', unitData.x, unitData.y);
    }
    
    // Return the created game
    const game = await this.getGameById(db, gameId);
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Add unit to game
 */
exports.addUnitToGame = async (db, gameId, templateId, player, x, y) => {
  const template = await db.get(`
    SELECT * FROM combat_unit_templates WHERE id = ?
  `, [templateId]);
  
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }
  
  const unitId = uuidv4();
  await db.run(`
    INSERT INTO combat_game_units (
      id, game_id, template_id, player, position_x, position_y, current_hp, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [unitId, gameId, templateId, player, x, y, template.max_hp, 'active']);
  
  return unitId;
};

/**
 * Helper: Get game by ID with units
 */
exports.getGameById = async (db, gameId) => {
  const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [gameId]);
  if (!game) return null;
  
  game.board_state = JSON.parse(game.board_state || '{}');
  game.turn_history = JSON.parse(game.turn_history || '[]');
  
  const units = await db.all(`
    SELECT u.*, t.name as template_name, t.sprite_url, t.max_hp, t.attack_power, 
           t.defense, t.movement_range, t.attack_range, t.skills
    FROM combat_game_units u
    JOIN combat_unit_templates t ON u.template_id = t.id
    WHERE u.game_id = ?
    ORDER BY u.player, u.created_at
  `, [gameId]);
  
  game.units = units.map(unit => ({
    ...unit,
    skills: JSON.parse(unit.skills || '[]'),
    status_effects: JSON.parse(unit.status_effects || '[]')
  }));
  
  return game;
};

/**
 * Move a unit
 * PUT /api/combat/:id/move
 */
exports.moveUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitId, newX, newY } = req.body;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    const unit = await db.get(`
      SELECT u.*, t.movement_range 
      FROM combat_game_units u
      JOIN combat_unit_templates t ON u.template_id = t.id
      WHERE u.id = ? AND u.game_id = ?
    `, [unitId, id]);
    
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    
    if (unit.player !== game.current_player) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    if (unit.has_moved) {
      return res.status(400).json({ error: 'Unit has already moved this turn' });
    }
    
    // Check if move is within range
    const distance = Math.abs(newX - unit.position_x) + Math.abs(newY - unit.position_y);
    if (distance > unit.movement_range) {
      return res.status(400).json({ error: 'Move exceeds unit range' });
    }
    
    // Check if target position is occupied
    const targetOccupied = await db.get(`
      SELECT id FROM combat_game_units 
      WHERE game_id = ? AND position_x = ? AND position_y = ? AND status = 'active'
    `, [id, newX, newY]);
    
    if (targetOccupied) {
      return res.status(400).json({ error: 'Target position is occupied' });
    }
    
    // Update unit position
    await db.run(`
      UPDATE combat_game_units 
      SET position_x = ?, position_y = ?, has_moved = 1, updated_at = ?
      WHERE id = ?
    `, [newX, newY, Math.floor(Date.now() / 1000), unitId]);
    
    // Add to turn history
    const turnHistory = JSON.parse(game.turn_history || '[]');
    turnHistory.push({
      turn: game.current_turn,
      player: game.current_player,
      action: 'move',
      unitId,
      from: { x: unit.position_x, y: unit.position_y },
      to: { x: newX, y: newY },
      timestamp: Math.floor(Date.now() / 1000)
    });
    
    await db.run(`
      UPDATE combat_games 
      SET turn_history = ?, last_move_at = ?, updated_at = ?
      WHERE id = ?
    `, [JSON.stringify(turnHistory), Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id]);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Attack with a unit
 * PUT /api/combat/:id/attack
 */
exports.attackUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { attackerId, targetId, skillName } = req.body;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    const attacker = await db.get(`
      SELECT u.*, t.attack_power, t.attack_range, t.skills
      FROM combat_game_units u
      JOIN combat_unit_templates t ON u.template_id = t.id
      WHERE u.id = ? AND u.game_id = ?
    `, [attackerId, id]);
    
    const target = await db.get(`
      SELECT u.*, t.defense, t.max_hp
      FROM combat_game_units u
      JOIN combat_unit_templates t ON u.template_id = t.id
      WHERE u.id = ? AND u.game_id = ?
    `, [targetId, id]);
    
    if (!attacker || !target) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    
    if (attacker.player !== game.current_player) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    if (attacker.has_attacked) {
      return res.status(400).json({ error: 'Unit has already attacked this turn' });
    }
    
    if (attacker.player === target.player) {
      return res.status(400).json({ error: 'Cannot attack your own units' });
    }
    
    // Get skill details
    const skills = JSON.parse(attacker.skills || '[]');
    const skill = skills.find(s => s.name === skillName);
    if (!skill) {
      return res.status(400).json({ error: 'Skill not found' });
    }
    
    // Check range
    const distance = Math.abs(target.position_x - attacker.position_x) + Math.abs(target.position_y - attacker.position_y);
    if (distance > skill.range) {
      return res.status(400).json({ error: 'Target out of range' });
    }
    
    // Calculate damage
    const baseDamage = skill.damage || attacker.attack_power;
    const actualDamage = Math.max(1, baseDamage - target.defense);
    const newHp = Math.max(0, target.current_hp - actualDamage);
    
    // Update target HP
    await db.run(`
      UPDATE combat_game_units 
      SET current_hp = ?, status = ?, updated_at = ?
      WHERE id = ?
    `, [newHp, newHp <= 0 ? 'defeated' : 'active', Math.floor(Date.now() / 1000), targetId]);
    
    // Mark attacker as having attacked
    await db.run(`
      UPDATE combat_game_units 
      SET has_attacked = 1, updated_at = ?
      WHERE id = ?
    `, [Math.floor(Date.now() / 1000), attackerId]);
    
    // Add to turn history
    const turnHistory = JSON.parse(game.turn_history || '[]');
    turnHistory.push({
      turn: game.current_turn,
      player: game.current_player,
      action: 'attack',
      attackerId,
      targetId,
      skill: skillName,
      damage: actualDamage,
      targetNewHp: newHp,
      timestamp: Math.floor(Date.now() / 1000)
    });
    
    await db.run(`
      UPDATE combat_games 
      SET turn_history = ?, last_move_at = ?, updated_at = ?
      WHERE id = ?
    `, [JSON.stringify(turnHistory), Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id]);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * End turn
 * PUT /api/combat/:id/end-turn
 */
exports.endTurn = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Reset unit actions for the current player
    await db.run(`
      UPDATE combat_game_units 
      SET has_moved = 0, has_attacked = 0, updated_at = ?
      WHERE game_id = ? AND player = ?
    `, [Math.floor(Date.now() / 1000), id, game.current_player]);
    
    // Switch to next player
    const nextPlayer = game.current_player === 'player1' ? 'player2' : 'player1';
    const nextTurn = nextPlayer === 'player1' ? game.current_turn + 1 : game.current_turn;
    
    await db.run(`
      UPDATE combat_games 
      SET current_player = ?, current_turn = ?, last_move_at = ?, updated_at = ?
      WHERE id = ?
    `, [nextPlayer, nextTurn, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id]);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get unit templates
 * GET /api/combat/templates
 */
exports.getUnitTemplates = async (req, res) => {
  try {
    const db = req.db;
    
    await initializeDefaultUnitTemplates(db);
    
    const templates = await db.all(`
      SELECT * FROM combat_unit_templates 
      ORDER BY is_custom ASC, name ASC
    `);
    
    const processedTemplates = templates.map(template => ({
      ...template,
      skills: JSON.parse(template.skills || '[]')
    }));
    
    res.json(processedTemplates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create custom unit template
 * POST /api/combat/templates
 */
exports.createUnitTemplate = async (req, res) => {
  try {
    const { name, description, unitType, maxHp, attackPower, defense, movementRange, attackRange, skills, spriteUrl } = req.body;
    const db = req.db;
    
    const templateId = uuidv4();
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      INSERT INTO combat_unit_templates (
        id, name, description, unit_type, max_hp, attack_power, defense,
        movement_range, attack_range, skills, sprite_url, is_custom, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      templateId, name, description, unitType, maxHp, attackPower, defense,
      movementRange, attackRange, JSON.stringify(skills || []), spriteUrl, 1, currentTime, currentTime
    ]);
    
    const template = await db.get(`SELECT * FROM combat_unit_templates WHERE id = ?`, [templateId]);
    template.skills = JSON.parse(template.skills || '[]');
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Start game (move from setup to active)
 * PUT /api/combat/:id/start
 */
exports.startGame = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'setup') {
      return res.status(400).json({ error: 'Game is not in setup phase' });
    }
    
    // Check if both players have units
    const player1Units = await db.get(`
      SELECT COUNT(*) as count FROM combat_game_units 
      WHERE game_id = ? AND player = 'player1' AND status = 'active'
    `, [id]);
    
    const player2Units = await db.get(`
      SELECT COUNT(*) as count FROM combat_game_units 
      WHERE game_id = ? AND player = 'player2' AND status = 'active'
    `, [id]);
    
    if (player1Units.count === 0 || player2Units.count === 0) {
      return res.status(400).json({ error: 'Both players must have at least one unit' });
    }
    
    await db.run(`
      UPDATE combat_games 
      SET game_status = 'active', current_turn = 1, updated_at = ?
      WHERE id = ?
    `, [Math.floor(Date.now() / 1000), id]);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save game as JSON file
 * POST /api/combat/:id/save
 */
exports.saveGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;
    const db = req.db;
    
    const game = await this.getGameById(db, id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const saveData = {
      game,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const safeFilename = (filename || `combat_game_${id}`).replace(/[^a-z0-9]/gi, '_');
    const filePath = path.join(combatGamesDir, `${safeFilename}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));
    
    res.json({ 
      message: 'Game saved successfully',
      filename: `${safeFilename}.json`,
      path: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a combat game
 * DELETE /api/combat/:id
 */
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run(`DELETE FROM combat_games WHERE id = ?`, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Place unit during setup phase
 * POST /api/combat/:id/place-unit
 */
exports.placeUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { templateId, player, x, y } = req.body;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM combat_games WHERE id = ?`, [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'setup') {
      return res.status(400).json({ error: 'Game is not in setup phase' });
    }
    
    // Check if position is occupied
    const existingUnit = await db.get(`
      SELECT id FROM combat_game_units 
      WHERE game_id = ? AND position_x = ? AND position_y = ? AND status = 'active'
    `, [id, x, y]);
    
    if (existingUnit) {
      return res.status(400).json({ error: 'Position is already occupied' });
    }
    
    // Check if position is within board bounds
    if (x < 0 || x >= game.board_size || y < 0 || y >= game.board_size) {
      return res.status(400).json({ error: 'Position is out of bounds' });
    }
    
    await this.addUnitToGame(db, id, templateId, player, x, y);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * End game
 * PUT /api/combat/:id/end
 */
exports.endGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { winner } = req.body;
    const db = req.db;
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      UPDATE combat_games 
      SET game_status = 'completed', winner = ?, ended_at = ?, updated_at = ?
      WHERE id = ?
    `, [winner, currentTime, currentTime, id]);
    
    const updatedGame = await this.getGameById(db, id);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete unit template
 * DELETE /api/combat/templates/:id
 */
exports.deleteUnitTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Check if template is custom (can't delete built-in templates)
    const template = await db.get(`
      SELECT is_custom FROM combat_unit_templates WHERE id = ?
    `, [id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (!template.is_custom) {
      return res.status(400).json({ error: 'Cannot delete built-in templates' });
    }
    
    const result = await db.run(`DELETE FROM combat_unit_templates WHERE id = ?`, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};