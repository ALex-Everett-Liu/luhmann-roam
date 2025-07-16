// combatRoutes.js - Routes for combat game operations
const express = require('express');
const combatController = require('../controllers/combatController');

const router = express.Router();

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
// router.delete('/:id/units/:unitId', combatController.removeUnit); // REMOVED - function doesn't exist

// Template management routes
router.get('/templates', combatController.getUnitTemplates); // FIXED: was getAllTemplates
router.post('/templates', combatController.createUnitTemplate); // FIXED: was createTemplate
// router.put('/templates/:id', combatController.updateTemplate); // REMOVED - function doesn't exist
router.delete('/templates/:id', combatController.deleteUnitTemplate); // FIXED: was deleteTemplate

// Game history and saving
// router.get('/:id/history', combatController.getGameHistory); // REMOVED - function doesn't exist
router.post('/:id/save', combatController.saveGame); // FIXED: was saveGameAsText

module.exports = router;