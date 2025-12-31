// webpConverterRoutes.js - Routes for WebP Converter Plugin API operations
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const webpConverterController = require("../controllers/webpConverterController");

const router = express.Router();

// Directory paths
const UPLOAD_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "uploads");
const OUTPUT_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "output");

// Ensure directories exist
[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static files from output directory
router.use("/output", express.static(OUTPUT_DIR));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
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
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
});

// Routes
router.get("/health", webpConverterController.health);
router.post("/convert", upload.single("image"), webpConverterController.convert);
router.post("/batch", upload.array("images", 10), webpConverterController.batch);
router.get("/formats", webpConverterController.getFormats);
router.get("/info", webpConverterController.getInfo);
router.post("/cleanup", webpConverterController.cleanup);

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

  console.error("WebP Converter error:", error);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
