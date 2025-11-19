// webpConverterRoutes.js - Routes for WebP Converter Plugin API operations
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Ensure upload and output directories exist
const UPLOAD_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "uploads");
const OUTPUT_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "output");

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

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Convert image endpoint
router.post("/convert", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const quality = parseInt(req.body.quality) || 80;
    const format = req.body.format || "webp";
    const customOutputDir = req.body.outputDir;

    // Use custom output directory if provided and valid
    const outputDirectory =
      customOutputDir && fs.existsSync(customOutputDir)
        ? customOutputDir
        : OUTPUT_DIR;

    // Validate format
    const allowedFormats = ["webp", "jpeg", "png", "tiff", "avif"];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({ error: "Unsupported format" });
    }

    const inputPath = req.file.path;
    const filename = path.parse(req.file.originalname).name;
    const outputFilename = `${filename}.${format}`;
    const outputPath = path.join(outputDirectory, outputFilename);

    // Get original file stats
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    // Convert image based on format
    let sharpInstance = sharp(inputPath, {
      limitInputPixels: false,
      sequentialRead: true,
      unlimited: true, // Remove memory limits entirely
    });

    // Apply format-specific settings
    switch (format) {
      case "webp":
        sharpInstance = sharpInstance.webp({
          quality: quality,
          effort: 6,
          smartSubsample: true,
        });
        break;
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({
          quality: quality,
          progressive: true,
          optimizeScans: true,
        });
        break;
      case "png":
        sharpInstance = sharpInstance.png({
          quality: quality,
          compressionLevel: 9,
          adaptiveFiltering: false,
        });
        break;
      case "tiff":
        sharpInstance = sharpInstance.tiff({
          quality: quality,
          compression: "lzw",
        });
        break;
      case "avif":
        sharpInstance = sharpInstance.avif({
          quality: quality,
          effort: 6,
        });
        break;
    }

    await sharpInstance.toFile(outputPath);

    // Get converted file stats
    const convertedStats = fs.statSync(outputPath);
    const convertedSize = convertedStats.size;
    const savingsPercent = (
      ((originalSize - convertedSize) / originalSize) *
      100
    ).toFixed(1);

    // Generate relative URL for download
    // If using default output directory, use the API route
    // Otherwise, use the full path
    let downloadPath;
    if (outputDirectory === OUTPUT_DIR) {
      const filename = path.basename(outputPath);
      downloadPath = `/api/plugins/webp-converter/output/${filename}`;
    } else {
      // For custom directories, we can't serve via API, so return the full path
      downloadPath = outputPath;
    }

    // Clean up uploaded file
    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      filename: req.file.originalname,
      convertedFile: outputFilename,
      originalSize: formatFileSize(originalSize),
      convertedSize: formatFileSize(convertedSize),
      originalSizeBytes: originalSize,
      convertedSizeBytes: convertedSize,
      savingsPercent: savingsPercent,
      outputPath: downloadPath,
      fullPath: outputPath,
      format: format,
      quality: quality,
    });
  } catch (error) {
    console.error("Conversion error:", error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Conversion failed",
      details: error.message,
    });
  }
});

// Batch convert endpoint
router.post("/batch", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const quality = parseInt(req.body.quality) || 80;
    const format = req.body.format || "webp";
    const customOutputDir = req.body.outputDir;

    const outputDirectory =
      customOutputDir && fs.existsSync(customOutputDir)
        ? customOutputDir
        : OUTPUT_DIR;

    const results = [];

    for (const file of req.files) {
      try {
        const inputPath = file.path;
        const filename = path.parse(file.originalname).name;
        const outputFilename = `${filename}.${format}`;
        const outputPath = path.join(outputDirectory, outputFilename);

        const originalStats = fs.statSync(inputPath);
        const originalSize = originalStats.size;

        let sharpInstance = sharp(inputPath, {
          limitInputPixels: false,
          sequentialRead: true,
          unlimited: true,
        });

        switch (format) {
          case "webp":
            sharpInstance = sharpInstance.webp({ quality: quality });
            break;
          case "jpeg":
            sharpInstance = sharpInstance.jpeg({ quality: quality });
            break;
          case "png":
            sharpInstance = sharpInstance.png({ quality: quality });
            break;
          case "tiff":
            sharpInstance = sharpInstance.tiff({ quality: quality });
            break;
          case "avif":
            sharpInstance = sharpInstance.avif({ quality: quality });
            break;
          default:
            sharpInstance = sharpInstance.webp({ quality: quality });
        }

        await sharpInstance.toFile(outputPath);

        const convertedStats = fs.statSync(outputPath);
        const convertedSize = convertedStats.size;
        const savingsPercent = (
          ((originalSize - convertedSize) / originalSize) *
          100
        ).toFixed(1);

        let downloadPath;
        if (outputDirectory === OUTPUT_DIR) {
          const filename = path.basename(outputPath);
          downloadPath = `/api/plugins/webp-converter/output/${filename}`;
        } else {
          downloadPath = outputPath;
        }

        fs.unlinkSync(inputPath);

        results.push({
          success: true,
          filename: file.originalname,
          convertedFile: outputFilename,
          originalSize: formatFileSize(originalSize),
          convertedSize: formatFileSize(convertedSize),
          savingsPercent: savingsPercent,
          outputPath: downloadPath,
        });
      } catch (error) {
        results.push({
          success: false,
          filename: file.originalname,
          error: error.message,
        });

        // Clean up failed file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({
      success: true,
      results: results,
      totalProcessed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error("Batch conversion error:", error);
    res.status(500).json({
      error: "Batch conversion failed",
      details: error.message,
    });
  }
});

// Get supported formats
router.get("/formats", (req, res) => {
  res.json({
    input: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg"],
    output: ["webp", "jpeg", "png", "tiff", "avif"],
  });
});

// Get system info
router.get("/info", (req, res) => {
  res.json({
    version: "1.0.0",
    sharpVersion: require("sharp/package.json").version,
    supportedFormats: ["webp", "jpeg", "png", "tiff", "avif"],
    maxFileSize: "500MB",
    uploadDir: UPLOAD_DIR,
    outputDir: OUTPUT_DIR,
  });
});

// Cleanup old files (run periodically)
router.post("/cleanup", (req, res) => {
  try {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    const cleanupDir = (dir) => {
      if (!fs.existsSync(dir)) return 0;

      const files = fs.readdirSync(dir);
      let cleaned = 0;

      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      });

      return cleaned;
    };

    const uploadsCleaned = cleanupDir(UPLOAD_DIR);
    const outputCleaned = cleanupDir(OUTPUT_DIR);

    res.json({
      success: true,
      message: `Cleaned ${uploadsCleaned + outputCleaned} old files`,
      uploadsCleaned,
      outputCleaned,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

