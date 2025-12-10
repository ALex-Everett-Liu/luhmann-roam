// imageViewerController.js - HTTP logic for Image Viewer Plugin operations
const path = require("path");
const fs = require("fs");
const imageViewerService = require("../services/imageViewerService");

/**
 * Health check endpoint
 * GET /api/plugins/image-viewer/health
 */
exports.health = (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

/**
 * Upload image
 * POST /api/plugins/image-viewer/upload
 */
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const result = await imageViewerService.saveImage(req.file);
    const imageUrl = imageViewerService.generateImageUrl(result.id);

    res.json({
      success: true,
      image: {
        id: result.id,
        filename: result.filename,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        fileSizeFormatted: result.fileSizeFormatted,
        url: imageUrl,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
};

/**
 * Get all images with optional filters
 * GET /api/plugins/image-viewer/images
 */
exports.getImages = async (req, res) => {
  try {
    const filters = {
      tags: req.query.tags ? req.query.tags.split(",").map(t => t.trim()) : undefined,
      rating: req.query.rating ? parseInt(req.query.rating) : undefined,
      sortBy: req.query.sortBy || "created_at",
      sortOrder: req.query.sortOrder || "DESC",
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const images = await imageViewerService.getImages(filters);
    
    // Convert to response format with URLs
    const imagesWithUrls = images.map(image => ({
      id: image.id,
      filename: image.original_filename,
      width: image.width,
      height: image.height,
      fileSize: image.file_size,
      fileSizeFormatted: imageViewerService.formatFileSize(image.file_size),
      rating: image.rating,
      viewCount: image.view_count,
      tags: image.tags,
      createdAt: image.created_at,
      lastViewedAt: image.last_viewed_at,
      url: imageViewerService.generateImageUrl(image.id),
    }));

    res.json({
      success: true,
      images: imagesWithUrls,
      count: imagesWithUrls.length,
    });
  } catch (error) {
    console.error("Get images error:", error);
    res.status(500).json({
      error: "Failed to get images",
      details: error.message,
    });
  }
};

/**
 * Get single image by ID
 * GET /api/plugins/image-viewer/images/:id
 */
exports.getImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await imageViewerService.getImageById(id);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json({
      success: true,
      image: {
        id: image.id,
        filename: image.original_filename,
        width: image.width,
        height: image.height,
        fileSize: image.file_size,
        fileSizeFormatted: imageViewerService.formatFileSize(image.file_size),
        rating: image.rating,
        viewCount: image.view_count,
        tags: image.tags,
        createdAt: image.created_at,
        lastViewedAt: image.last_viewed_at,
        url: imageViewerService.generateImageUrl(image.id),
      },
    });
  } catch (error) {
    console.error("Get image error:", error);
    res.status(500).json({
      error: "Failed to get image",
      details: error.message,
    });
  }
};

/**
 * Serve image file
 * GET /api/plugins/image-viewer/images/:id/file
 */
exports.serveImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await imageViewerService.getImageById(id);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Increment view count
    await imageViewerService.incrementViewCount(id);

    // Serve the file
    if (!fs.existsSync(image.file_path)) {
      return res.status(404).json({ error: "Image file not found" });
    }

    res.sendFile(path.resolve(image.file_path));
  } catch (error) {
    console.error("Serve image error:", error);
    res.status(500).json({
      error: "Failed to serve image",
      details: error.message,
    });
  }
};

/**
 * Update image tags
 * POST /api/plugins/image-viewer/images/:id/tags
 */
exports.updateTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    // Remove existing tags
    const existingTags = await imageViewerService.getImageTags(id);
    for (const tag of existingTags) {
      await imageViewerService.removeTagFromImage(id, tag);
    }

    // Add new tags
    if (tags.length > 0) {
      await imageViewerService.addTagsToImage(id, tags);
    }

    const updatedTags = await imageViewerService.getImageTags(id);
    res.json({
      success: true,
      tags: updatedTags,
    });
  } catch (error) {
    console.error("Update tags error:", error);
    res.status(500).json({
      error: "Failed to update tags",
      details: error.message,
    });
  }
};

/**
 * Update image rating
 * POST /api/plugins/image-viewer/images/:id/rating
 */
exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: "Rating is required" });
    }

    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
      return res.status(400).json({ error: "Rating must be between 0 and 5" });
    }

    await imageViewerService.updateImageRating(id, ratingValue);

    res.json({
      success: true,
      rating: ratingValue,
    });
  } catch (error) {
    console.error("Update rating error:", error);
    res.status(500).json({
      error: "Failed to update rating",
      details: error.message,
    });
  }
};

/**
 * Delete image
 * DELETE /api/plugins/image-viewer/images/:id
 */
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    await imageViewerService.deleteImage(id);

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({
      error: "Failed to delete image",
      details: error.message,
    });
  }
};

/**
 * Get all tags
 * GET /api/plugins/image-viewer/tags
 */
exports.getTags = async (req, res) => {
  try {
    const tags = await imageViewerService.getAllTags();
    res.json({
      success: true,
      tags: tags,
    });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({
      error: "Failed to get tags",
      details: error.message,
    });
  }
};

/**
 * Get system info
 * GET /api/plugins/image-viewer/info
 */
exports.getInfo = (req, res) => {
  res.json({
    version: "1.0.0",
    supportedFormats: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg"],
    maxFileSize: "500MB",
    imageDir: imageViewerService.IMAGE_DIR,
  });
};

