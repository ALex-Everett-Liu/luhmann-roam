// webpConverterController.js - HTTP logic for WebP Converter Plugin operations
const path = require("path");
const fs = require("fs");
const webpConverterService = require("../services/webpConverterService");

// Directory paths
const UPLOAD_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "uploads");
const OUTPUT_DIR = path.join(__dirname, "..", "plugins", "webp-converter", "output");

// Ensure directories exist
[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Health check endpoint
 * GET /api/plugins/webp-converter/health
 */
exports.health = (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

/**
 * Convert single image
 * POST /api/plugins/webp-converter/convert
 */
exports.convert = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const quality = parseInt(req.body.quality) || 80;
    const format = req.body.format || "webp";
    const customOutputDir = req.body.outputDir;

    // Validate format
    const allowedFormats = ["webp", "jpeg", "png", "tiff", "avif"];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({ error: "Unsupported format" });
    }

    // Determine output directory
    const outputDirectory =
      customOutputDir && fs.existsSync(customOutputDir)
        ? customOutputDir
        : OUTPUT_DIR;

    // Prepare file paths
    const inputPath = req.file.path;
    const filename = path.parse(req.file.originalname).name;
    const outputFilename = `${filename}.${format}`;
    const outputPath = path.join(outputDirectory, outputFilename);

    try {
      // Convert image using service
      const conversionResult = await webpConverterService.convertImage(
        inputPath,
        outputPath,
        format,
        quality
      );

      // Generate download path
      const downloadPath = webpConverterService.generateDownloadPath(
        outputPath,
        outputDirectory,
        OUTPUT_DIR
      );

      // Clean up uploaded file
      fs.unlinkSync(inputPath);

      res.json({
        success: true,
        filename: req.file.originalname,
        convertedFile: outputFilename,
        originalSize: conversionResult.originalSizeFormatted,
        convertedSize: conversionResult.convertedSizeFormatted,
        originalSizeBytes: conversionResult.originalSize,
        convertedSizeBytes: conversionResult.convertedSize,
        savingsPercent: conversionResult.savingsPercent,
        outputPath: downloadPath,
        fullPath: outputPath,
        format: format,
        quality: quality,
      });
    } catch (conversionError) {
      // Clean up uploaded file on conversion error
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      throw conversionError;
    }
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({
      error: "Conversion failed",
      details: error.message,
    });
  }
};

/**
 * Batch convert multiple images
 * POST /api/plugins/webp-converter/batch
 */
exports.batch = async (req, res) => {
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

        // Convert image using service
        const conversionResult = await webpConverterService.convertImage(
          inputPath,
          outputPath,
          format,
          quality
        );

        // Generate download path
        const downloadPath = webpConverterService.generateDownloadPath(
          outputPath,
          outputDirectory,
          OUTPUT_DIR
        );

        // Clean up uploaded file
        fs.unlinkSync(inputPath);

        results.push({
          success: true,
          filename: file.originalname,
          convertedFile: outputFilename,
          originalSize: conversionResult.originalSizeFormatted,
          convertedSize: conversionResult.convertedSizeFormatted,
          savingsPercent: conversionResult.savingsPercent,
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
};

/**
 * Get supported formats
 * GET /api/plugins/webp-converter/formats
 */
exports.getFormats = (req, res) => {
  res.json({
    input: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg"],
    output: ["webp", "jpeg", "png", "tiff", "avif"],
  });
};

/**
 * Get system info
 * GET /api/plugins/webp-converter/info
 */
exports.getInfo = (req, res) => {
  res.json({
    version: "1.0.0",
    sharpVersion: require("sharp/package.json").version,
    supportedFormats: ["webp", "jpeg", "png", "tiff", "avif"],
    maxFileSize: "500MB",
    uploadDir: UPLOAD_DIR,
    outputDir: OUTPUT_DIR,
  });
};

/**
 * Cleanup old files
 * POST /api/plugins/webp-converter/cleanup
 */
exports.cleanup = (req, res) => {
  try {
    const uploadsCleaned = webpConverterService.cleanupOldFiles(UPLOAD_DIR);
    const outputCleaned = webpConverterService.cleanupOldFiles(OUTPUT_DIR);

    res.json({
      success: true,
      message: `Cleaned ${uploadsCleaned + outputCleaned} old files`,
      uploadsCleaned,
      outputCleaned,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

