const express = require('express');
const router = express.Router();
const multer = require('multer');
const dcimController = require('../controllers/dcimController');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Add this at the beginning of your routes, before any other routes
router.get('/', dcimController.getImages);

// Move the directories routes above the /:id routes
router.get('/directories', dcimController.getDirectories);
router.post('/directories', dcimController.updateDirectories);

// Then your ID-specific routes
router.get('/:id', dcimController.getImage);
router.post('/', upload.single('image'), dcimController.addImage);
router.put('/:id', dcimController.updateImage);
router.delete('/:id', dcimController.deleteImage);

// Image settings routes
router.get('/:id/settings', dcimController.getImageSettings);
router.post('/:id/settings', dcimController.saveImageSettings);

// Image conversion route
router.post('/:id/convert', dcimController.convertImage);

// New route for converting uploaded image
router.post('/convert', upload.single('image'), dcimController.convertUploadedImage);

module.exports = router;