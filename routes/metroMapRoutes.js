// metroMapRoutes.js - Routes for metro map operations
const express = require('express');
const metroMapController = require('../controllers/metroMapController');

const router = express.Router();

// Station routes
router.get('/stations', metroMapController.getAllStations);
router.post('/stations', metroMapController.createStation);
router.put('/stations/:id', metroMapController.updateStation);
router.delete('/stations/:id', metroMapController.deleteStation);

// Line routes
router.get('/lines', metroMapController.getAllLines);
router.post('/lines', metroMapController.createLine);
router.put('/lines/:id', metroMapController.updateLine);
router.delete('/lines/:id', metroMapController.deleteLine);

module.exports = router;