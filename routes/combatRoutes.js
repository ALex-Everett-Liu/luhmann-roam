// combatRoutes.js - Routes for combat game operations
const express = require('express');
const combatController = require('../controllers/combatController');

const router = express.Router();

// Template management routes (must come before parameterized routes)
router.get('/templates', combatController.getUnitTemplates);
router.post('/templates', combatController.createUnitTemplate);
router.put('/templates/:id', combatController.updateTemplate);
router.delete('/templates/:id', combatController.deleteUnitTemplate);

// Game management routes
router.get('/', combatController.getAllGames);
router.get('/:id', combatController.getGame);
router.post('/', combatController.createGame);
router.delete('/:id', combatController.deleteGame);

// Game action routes
router.put('/:id/move', combatController.moveUnit);
router.put('/:id/attack', combatController.attackUnit);
router.put('/:id/start', combatController.startGame);
router.put('/:id/end', combatController.endGame);
router.put('/:id/end-turn', combatController.endTurn);

// Unit management routes
router.post('/:id/place-unit', combatController.placeUnit);
router.delete('/:id/units/:unitId', combatController.removeUnit);

// Game history and saving
router.get('/:id/history', combatController.getGameHistory);
router.post('/:id/save', combatController.saveGame);

module.exports = router;