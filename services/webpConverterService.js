// webpConverterService.js - Business logic for WebP Converter operations
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Convert a single image
 * @param {string} inputPath - Path to input image file
 * @param {string} outputPath - Path to save converted image
 * @param {string} format - Output format (webp, jpeg, png, tiff, avif)
 * @param {number} quality - Quality setting (1-100)
 * @returns {Promise<Object>} Conversion result with file stats
 */
async function convertImage(inputPath, outputPath, format, quality) {
  // Get original file stats
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;

  // Create Sharp instance with memory optimization
  let sharpInstance = sharp(inputPath, {
    limitInputPixels: false,
    sequentialRead: true,
    unlimited: true,
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
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // Perform conversion
  await sharpInstance.toFile(outputPath);

  // Get converted file stats
  const convertedStats = fs.statSync(outputPath);
  const convertedSize = convertedStats.size;
  const savingsPercent = (
    ((originalSize - convertedSize) / originalSize) *
    100
  ).toFixed(1);

  return {
    originalSize,
    convertedSize,
    originalSizeFormatted: formatFileSize(originalSize),
    convertedSizeFormatted: formatFileSize(convertedSize),
    savingsPercent,
  };
}

/**
 * Clean up old files from a directory
 * @param {string} dirPath - Directory path to clean
 * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
 * @returns {number} Number of files cleaned
 */
function cleanupOldFiles(dirPath, maxAge = 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(dirPath)) return 0;

  const files = fs.readdirSync(dirPath);
  let cleaned = 0;
  const now = Date.now();

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      cleaned++;
    }
  });

  return cleaned;
}

/**
 * Generate download path for converted file
 * @param {string} outputPath - Full path to output file
 * @param {string} outputDirectory - Output directory used
 * @param {string} defaultOutputDir - Default output directory
 * @returns {string} Download path (API route or full path)
 */
function generateDownloadPath(outputPath, outputDirectory, defaultOutputDir) {
  if (outputDirectory === defaultOutputDir) {
    const filename = path.basename(outputPath);
    return `/api/plugins/webp-converter/output/${filename}`;
  } else {
    // For custom directories, return full path
    return outputPath;
  }
}

module.exports = {
  convertImage,
  formatFileSize,
  cleanupOldFiles,
  generateDownloadPath,
};

