// chessRoutes.js - Routes for chess game operations
const express = require('express');
const chessController = require('../controllers/chessController');

const router = express.Router();

// Get all chess games
router.get('/', chessController.getAllGames);

// Get a specific chess game
router.get('/:id', chessController.getGame);

// Create a new chess game
router.post('/', chessController.createGame);

// Update a chess game (make a move)
router.put('/:id/move', chessController.makeMove);

// Update game status
router.put('/:id/status', chessController.updateGameStatus);

// Delete a chess game
router.delete('/:id', chessController.deleteGame);

// Get game history/moves
router.get('/:id/history', chessController.getGameHistory);

// Save game as text file
router.post('/:id/save', chessController.saveGameAsText);

// Load game from text file
router.post('/load', chessController.loadGameFromText);

module.exports = router;