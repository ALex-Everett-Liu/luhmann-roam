// imageViewerRoutes.js - Routes for Image Viewer Plugin API operations
//
// This file defines all API routes for the Image Viewer plugin.
// Routes are registered in server.js: app.use("/api/plugins/image-viewer", imageViewerRoutes)
// Request handlers are in controllers/imageViewerController.js
// Business logic is in services/imageViewerService.js
//
// For plugin development reference, see: docs/development/PLUGIN_TEMPLATE.md
//
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uuidv7 } = require("uuidv7");
const imageViewerController = require("../controllers/imageViewerController");
const imageViewerService = require("../services/imageViewerService");

const router = express.Router();

// Directory paths
const UPLOAD_DIR = path.join(__dirname, "..", "plugins", "image-viewer", "uploads");

// Ensure directories exist
[UPLOAD_DIR, imageViewerService.IMAGE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv7()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/tiff",
      "image/webp",
      "image/svg+xml",
      "video/webm",
      "video/mp4",
      "video/quicktime", // mov
      "video/x-msvideo", // avi
      "video/x-matroska", // mkv
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

// Routes
router.get("/health", imageViewerController.health);
router.post("/upload", upload.single("image"), imageViewerController.upload);
router.get("/images", imageViewerController.getImages);
router.get("/images/:id", imageViewerController.getImage);
router.get("/images/:id/file", imageViewerController.serveImage);
router.post("/images/:id/tags", imageViewerController.updateTags);
router.post("/images/:id/rating", imageViewerController.updateRating);
router.post("/images/:id/ranking", imageViewerController.updateRanking);
router.post("/images/:id/description", imageViewerController.updateDescription);
router.post("/images/:id/review", imageViewerController.updateReview);
router.delete("/images/:id", imageViewerController.deleteImage);
router.get("/subfolders", imageViewerController.getSubfolders);
router.post("/scan", imageViewerController.scanImages);
router.get("/tags", imageViewerController.getTags);
router.get("/info", imageViewerController.getInfo);

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Max size is 500MB." });
    }
    return res.status(400).json({ error: error.message });
  }

  console.error("Image Viewer error:", error);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;

