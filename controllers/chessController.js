// chessController.js - Logic for chess game operations
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Define chess games directory path
const chessGamesDir = path.join(__dirname, '..', 'chess_games');

// Ensure chess games directory exists
if (!fs.existsSync(chessGamesDir)) {
  fs.mkdirSync(chessGamesDir, { recursive: true });
}

/**
 * Initialize a new chess board
 */
function initializeBoard() {
  return {
    'a8': 'r', 'b8': 'n', 'c8': 'b', 'd8': 'q', 'e8': 'k', 'f8': 'b', 'g8': 'n', 'h8': 'r',
    'a7': 'p', 'b7': 'p', 'c7': 'p', 'd7': 'p', 'e7': 'p', 'f7': 'p', 'g7': 'p', 'h7': 'p',
    'a6': '', 'b6': '', 'c6': '', 'd6': '', 'e6': '', 'f6': '', 'g6': '', 'h6': '',
    'a5': '', 'b5': '', 'c5': '', 'd5': '', 'e5': '', 'f5': '', 'g5': '', 'h5': '',
    'a4': '', 'b4': '', 'c4': '', 'd4': '', 'e4': '', 'f4': '', 'g4': '', 'h4': '',
    'a3': '', 'b3': '', 'c3': '', 'd3': '', 'e3': '', 'f3': '', 'g3': '', 'h3': '',
    'a2': 'P', 'b2': 'P', 'c2': 'P', 'd2': 'P', 'e2': 'P', 'f2': 'P', 'g2': 'P', 'h2': 'P',
    'a1': 'R', 'b1': 'N', 'c1': 'B', 'd1': 'Q', 'e1': 'K', 'f1': 'B', 'g1': 'N', 'h1': 'R'
  };
}

/**
 * Get all chess games
 * GET /api/chess
 */
exports.getAllGames = async (req, res) => {
  try {
    const db = req.db;
    
    const games = await db.all(`
      SELECT id, title, game_status, current_player, move_count, winner, game_result,
             started_at, ended_at, last_move_at, created_at, updated_at
      FROM chess_games 
      ORDER BY last_move_at DESC
    `);
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific chess game
 * GET /api/chess/:id
 */
exports.getGame = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const game = await db.get(`
      SELECT * FROM chess_games WHERE id = ?
    `, [id]);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Parse JSON fields
    if (game.board_state) {
      game.board_state = JSON.parse(game.board_state);
    }
    if (game.moves_history) {
      game.moves_history = JSON.parse(game.moves_history);
    }
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new chess game
 * POST /api/chess
 */
exports.createGame = async (req, res) => {
  try {
    const { title } = req.body;
    const db = req.db;
    
    const gameId = uuidv4();
    const initialBoard = initializeBoard();
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      INSERT INTO chess_games (
        id, title, game_status, current_player, move_count, 
        board_state, moves_history, started_at, last_move_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gameId,
      title || 'New Chess Game',
      'active',
      'white',
      0,
      JSON.stringify(initialBoard),
      JSON.stringify([]),
      currentTime,
      currentTime,
      currentTime,
      currentTime
    ]);
    
    // Return the created game
    const game = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [gameId]);
    game.board_state = JSON.parse(game.board_state);
    game.moves_history = JSON.parse(game.moves_history);
    
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Make a move in a chess game
 * PUT /api/chess/:id/move
 */
exports.makeMove = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, piece, capturedPiece, moveNotation } = req.body;
    const db = req.db;
    
    // Get current game state
    const game = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [id]);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.game_status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Parse current state
    const boardState = JSON.parse(game.board_state);
    const movesHistory = JSON.parse(game.moves_history);
    
    // Update board state
    boardState[to] = piece;
    boardState[from] = '';
    
    // Add move to history
    const moveRecord = {
      moveNumber: game.move_count + 1,
      player: game.current_player,
      from,
      to,
      piece,
      capturedPiece,
      moveNotation,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    movesHistory.push(moveRecord);
    
    // Switch player
    const nextPlayer = game.current_player === 'white' ? 'black' : 'white';
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Update database
    await db.run(`
      UPDATE chess_games 
      SET board_state = ?, moves_history = ?, current_player = ?, 
          move_count = ?, last_move_at = ?, updated_at = ?
      WHERE id = ?
    `, [
      JSON.stringify(boardState),
      JSON.stringify(movesHistory),
      nextPlayer,
      game.move_count + 1,
      currentTime,
      currentTime,
      id
    ]);
    
    // Return updated game
    const updatedGame = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [id]);
    updatedGame.board_state = JSON.parse(updatedGame.board_state);
    updatedGame.moves_history = JSON.parse(updatedGame.moves_history);
    
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update game status
 * PUT /api/chess/:id/status
 */
exports.updateGameStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, winner, result } = req.body;
    const db = req.db;
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      UPDATE chess_games 
      SET game_status = ?, winner = ?, game_result = ?, ended_at = ?, updated_at = ?
      WHERE id = ?
    `, [status, winner, result, currentTime, currentTime, id]);
    
    const updatedGame = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [id]);
    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a chess game
 * DELETE /api/chess/:id
 */
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const result = await db.run(`DELETE FROM chess_games WHERE id = ?`, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get game history/moves
 * GET /api/chess/:id/history
 */
exports.getGameHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    const game = await db.get(`SELECT moves_history FROM chess_games WHERE id = ?`, [id]);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const movesHistory = JSON.parse(game.moves_history || '[]');
    res.json(movesHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save game as text file
 * POST /api/chess/:id/save
 */
exports.saveGameAsText = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;
    const db = req.db;
    
    const game = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [id]);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const movesHistory = JSON.parse(game.moves_history || '[]');
    
    // Create PGN format
    let pgnContent = `[Event "${game.title || 'Chess Game'}"]\n`;
    pgnContent += `[Date "${new Date(game.started_at * 1000).toISOString().split('T')[0]}"]\n`;
    pgnContent += `[White "Player 1"]\n`;
    pgnContent += `[Black "Player 2"]\n`;
    pgnContent += `[Result "${game.game_result || '*'}"]\n\n`;
    
    // Add moves
    let moveString = '';
    for (let i = 0; i < movesHistory.length; i++) {
      const move = movesHistory[i];
      if (move.player === 'white') {
        moveString += `${Math.ceil((i + 1) / 2)}. ${move.moveNotation || `${move.from}-${move.to}`} `;
      } else {
        moveString += `${move.moveNotation || `${move.from}-${move.to}`} `;
      }
    }
    
    pgnContent += moveString;
    if (game.game_result) {
      pgnContent += ` ${game.game_result}`;
    }
    
    // Save to file
    const safeFilename = (filename || `chess_game_${id}`).replace(/[^a-z0-9]/gi, '_');
    const filePath = path.join(chessGamesDir, `${safeFilename}.pgn`);
    
    fs.writeFileSync(filePath, pgnContent);
    
    res.json({ 
      message: 'Game saved successfully',
      filename: `${safeFilename}.pgn`,
      path: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Load game from text file
 * POST /api/chess/load
 */
exports.loadGameFromText = async (req, res) => {
  try {
    const { filename, content } = req.body;
    const db = req.db;
    
    // Parse PGN content (basic parser)
    const lines = content.split('\n');
    let title = 'Imported Chess Game';
    let gameResult = '*';
    let movesSection = '';
    
    // Parse headers
    for (const line of lines) {
      if (line.startsWith('[Event ')) {
        title = line.match(/\[Event "(.+)"\]/)?.[1] || title;
      } else if (line.startsWith('[Result ')) {
        gameResult = line.match(/\[Result "(.+)"\]/)?.[1] || gameResult;
      } else if (!line.startsWith('[') && line.trim()) {
        movesSection += line + ' ';
      }
    }
    
    // Create new game
    const gameId = uuidv4();
    const initialBoard = initializeBoard();
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.run(`
      INSERT INTO chess_games (
        id, title, game_status, current_player, move_count, 
        board_state, moves_history, game_result, started_at, last_move_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gameId,
      title,
      'completed',
      'white',
      0,
      JSON.stringify(initialBoard),
      JSON.stringify([]),
      gameResult,
      currentTime,
      currentTime,
      currentTime,
      currentTime
    ]);
    
    const game = await db.get(`SELECT * FROM chess_games WHERE id = ?`, [gameId]);
    game.board_state = JSON.parse(game.board_state);
    game.moves_history = JSON.parse(game.moves_history);
    
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};