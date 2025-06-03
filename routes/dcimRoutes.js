const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dcimController = require('../controllers/dcimController');

// Configure multer for disk storage to handle large files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../temp');
    // Ensure temp directory exists
    const fs = require('fs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // Increase to 100MB
    fieldSize: 100 * 1024 * 1024  // Also increase field size limit
  },
  fileFilter: function(req, file, cb) {
    // Optional: Add file type validation
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
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

// Add these new routes to handle subsidiary images

// Get subsidiary images for a parent image
router.get('/:id/subsidiaries', dcimController.getSubsidiaryImages);

// Add a new subsidiary image
router.post('/subsidiary', upload.single('image'), dcimController.addSubsidiaryImage);

// Promote a subsidiary to be the main image
router.post('/:id/promote', dcimController.promoteSubsidiaryImage);

// Remove subsidiary relationship
router.post('/:id/detach', dcimController.detachSubsidiaryImage);

router.get('/sequence/:sequence_id', dcimController.getImageBySequenceId);

router.get('/:id/metadata', dcimController.getVideoMetadata);

module.exports = router;