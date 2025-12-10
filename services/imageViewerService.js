// imageViewerService.js - Business logic for Image Viewer operations
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

// Directory paths
const IMAGE_DIR = path.join(__dirname, "..", "plugins", "image-viewer", "images");
const DB_PATH = path.join(__dirname, "..", "plugins", "image-viewer", "image-viewer.db");

// Ensure directories exist
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// Database connection cache
let dbInstance = null;

// Get database connection
async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  
  // Initialize database schema
  await initializeDatabase();
  
  return dbInstance;
}

// Initialize database
async function initializeDatabase() {
  const db = await getDb();
  
  // Create images table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      width INTEGER,
      height INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      rating REAL DEFAULT 0,
      ranking REAL DEFAULT NULL,
      view_count INTEGER DEFAULT 0,
      last_viewed_at INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS image_tags (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      UNIQUE(image_id, tag)
    );
    
    CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag ON image_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_images_rating ON images(rating);
    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
  `);
  
  // Migrate existing database: add ranking column if it doesn't exist
  // This handles old image-viewer.db files that don't have the ranking column
  // Note: SQLite uses type affinity, so INTEGER rating values will work with REAL operations
  try {
    await db.run("ALTER TABLE images ADD COLUMN ranking REAL DEFAULT NULL");
    console.log("Migration: Added ranking column to images table");
  } catch (error) {
    // Column already exists - this is expected for new databases or already-migrated databases
    if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
      console.log("Migration: ranking column already exists in images table");
    } else {
      // Unexpected error - log it but don't fail
      console.log("Migration: Error checking ranking column:", error.message);
    }
  }
  
  // Create ranking index after ensuring the column exists
  // This is safe to run multiple times (IF NOT EXISTS)
  try {
    await db.run("CREATE INDEX IF NOT EXISTS idx_images_ranking ON images(ranking)");
  } catch (error) {
    // Index creation failed - log but don't fail (might already exist)
    console.log("Migration: Index creation note:", error.message);
  }
  
  // Note: For rating column, SQLite's type affinity means INTEGER values stored
  // in an INTEGER column will automatically work with REAL operations.
  // When we update rating values, they will be stored as REAL.
  // No explicit migration needed for rating column type change.
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get image metadata using sharp
 */
async function getImageMetadata(filePath) {
  try {
    const sharp = require("sharp");
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    return {
      width: null,
      height: null,
      format: null,
    };
  }
}

/**
 * Save uploaded image and create database entry
 */
async function saveImage(file, customPath = null) {
  const db = await getDb();
  const imageId = uuidv4();
  const filename = `${imageId}_${file.originalname}`;
  const filePath = customPath || path.join(IMAGE_DIR, filename);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Move uploaded file
  fs.renameSync(file.path, filePath);
  
  // Get image metadata
  const metadata = await getImageMetadata(filePath);
  const stats = fs.statSync(filePath);
  
  // Insert into database
  const now = Date.now();
  await db.run(`
    INSERT INTO images (
      id, filename, original_filename, file_path, file_size, mime_type,
      width, height, created_at, updated_at, rating, ranking, view_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    imageId,
    filename,
    file.originalname,
    filePath,
    stats.size,
    file.mimetype,
    metadata.width,
    metadata.height,
    now,
    now,
    0,
    null,
    0
  ]);
  
  return {
    id: imageId,
    filename: file.originalname,
    filePath: filePath,
    ...metadata,
    fileSize: stats.size,
    fileSizeFormatted: formatFileSize(stats.size),
  };
}

/**
 * Get all images with optional filters
 */
async function getImages(filters = {}) {
  const db = await getDb();
  let query = "SELECT * FROM images";
  const conditions = [];
  const params = [];
  
  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    query = `
      SELECT DISTINCT i.* FROM images i
      INNER JOIN image_tags it ON i.id = it.image_id
      WHERE it.tag IN (${filters.tags.map(() => "?").join(",")})
    `;
    params.push(...filters.tags);
    
    if (filters.rating !== undefined) {
      conditions.push("i.rating >= ?");
      params.push(filters.rating);
    }
  } else if (filters.rating !== undefined) {
    conditions.push("rating >= ?");
    params.push(filters.rating);
  }
  
  if (conditions.length > 0 && !filters.tags) {
    query += " WHERE " + conditions.join(" AND ");
  } else if (conditions.length > 0) {
    query += " AND " + conditions.join(" AND ");
  }
  
  // Sorting - default to ranking ASC, rating DESC
  const sortBy = filters.sortBy || null;
  const sortOrder = filters.sortOrder || null;
  
  if (sortBy && sortBy !== "default") {
    const validSortFields = ["created_at", "rating", "ranking", "view_count", "filename", "file_size"];
    const validSortOrder = ["ASC", "DESC"];
    const order = sortOrder && validSortOrder.includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : "ASC";
    
    if (validSortFields.includes(sortBy)) {
      query += ` ORDER BY ${sortBy} ${order}`;
    } else {
      // Invalid sortBy, use default sorting
      query += ` ORDER BY 
        CASE WHEN ranking IS NULL THEN 1 ELSE 0 END ASC,
        ranking ASC,
        rating DESC`;
    }
  } else {
    // Default sorting: ranking ASC (NULLS LAST), then rating DESC
    query += ` ORDER BY 
      CASE WHEN ranking IS NULL THEN 1 ELSE 0 END ASC,
      ranking ASC,
      rating DESC`;
  }
  
  // Limit
  if (filters.limit) {
    query += ` LIMIT ${parseInt(filters.limit)}`;
  }
  
  const images = await db.all(query, params);
  
  // Get tags for each image
  const imagesWithTags = await Promise.all(
    images.map(async (image) => ({
      ...image,
      tags: await getImageTags(image.id),
    }))
  );
  
  return imagesWithTags;
}

/**
 * Get single image by ID
 */
async function getImageById(imageId) {
  const db = await getDb();
  const image = await db.get("SELECT * FROM images WHERE id = ?", imageId);
  if (!image) return null;
  
  const tags = await getImageTags(imageId);
  return {
    ...image,
    tags: tags,
  };
}

/**
 * Get tags for an image
 */
async function getImageTags(imageId) {
  const db = await getDb();
  const rows = await db.all("SELECT tag FROM image_tags WHERE image_id = ?", imageId);
  return rows.map(row => row.tag);
}

/**
 * Add tags to an image
 */
async function addTagsToImage(imageId, tags) {
  const db = await getDb();
  const now = Date.now();
  
  await db.run("BEGIN TRANSACTION");
  try {
    for (const tag of tags) {
      const tagId = uuidv4();
      await db.run(`
        INSERT OR IGNORE INTO image_tags (id, image_id, tag, created_at)
        VALUES (?, ?, ?, ?)
      `, [tagId, imageId, tag.trim(), now]);
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Remove tag from an image
 */
async function removeTagFromImage(imageId, tag) {
  const db = await getDb();
  await db.run("DELETE FROM image_tags WHERE image_id = ? AND tag = ?", imageId, tag);
}

/**
 * Update image rating (supports decimals)
 */
async function updateImageRating(imageId, rating) {
  const db = await getDb();
  const now = Date.now();
  const ratingValue = parseFloat(rating);
  if (isNaN(ratingValue) || ratingValue < 0) {
    throw new Error("Rating must be a non-negative number");
  }
  await db.run(`
    UPDATE images 
    SET rating = ?, updated_at = ?
    WHERE id = ?
  `, [ratingValue, now, imageId]);
}

/**
 * Update image ranking (supports decimals)
 */
async function updateImageRanking(imageId, ranking) {
  const db = await getDb();
  const now = Date.now();
  const rankingValue = ranking === null || ranking === undefined ? null : parseFloat(ranking);
  if (rankingValue !== null && (isNaN(rankingValue) || rankingValue < 0)) {
    throw new Error("Ranking must be a non-negative number or null");
  }
  await db.run(`
    UPDATE images 
    SET ranking = ?, updated_at = ?
    WHERE id = ?
  `, [rankingValue, now, imageId]);
}

/**
 * Update both image rating and ranking
 */
async function updateImageRatingAndRanking(imageId, rating, ranking) {
  const db = await getDb();
  const now = Date.now();
  const ratingValue = parseFloat(rating);
  const rankingValue = ranking === null || ranking === undefined ? null : parseFloat(ranking);
  
  if (isNaN(ratingValue) || ratingValue < 0) {
    throw new Error("Rating must be a non-negative number");
  }
  if (rankingValue !== null && (isNaN(rankingValue) || rankingValue < 0)) {
    throw new Error("Ranking must be a non-negative number or null");
  }
  
  await db.run(`
    UPDATE images 
    SET rating = ?, ranking = ?, updated_at = ?
    WHERE id = ?
  `, [ratingValue, rankingValue, now, imageId]);
}

/**
 * Increment view count
 */
async function incrementViewCount(imageId) {
  const db = await getDb();
  const now = Date.now();
  await db.run(`
    UPDATE images 
    SET view_count = view_count + 1, last_viewed_at = ?, updated_at = ?
    WHERE id = ?
  `, [now, now, imageId]);
}

/**
 * Delete image
 */
async function deleteImage(imageId) {
  const db = await getDb();
  const image = await db.get("SELECT file_path FROM images WHERE id = ?", imageId);
  if (!image) {
    throw new Error("Image not found");
  }
  
  // Delete file
  if (fs.existsSync(image.file_path)) {
    fs.unlinkSync(image.file_path);
  }
  
  // Delete from database (tags will be deleted via CASCADE)
  await db.run("DELETE FROM images WHERE id = ?", imageId);
}

/**
 * Get all unique tags
 */
async function getAllTags() {
  const db = await getDb();
  const rows = await db.all("SELECT DISTINCT tag FROM image_tags ORDER BY tag");
  return rows.map(row => row.tag);
}

/**
 * Scan images directory and import new files
 */
async function scanAndImportImages() {
  const db = await getDb();
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'];
  const importedFiles = [];
  const skippedFiles = [];
  const errorFiles = [];
  
  // Get all existing file paths from database
  const existingImages = await db.all("SELECT file_path FROM images");
  const existingPaths = new Set(existingImages.map(img => path.resolve(img.file_path)));
  
  // Recursively scan directory
  function scanDirectory(dir) {
    const files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...scanDirectory(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
    return files;
  }
  
  const allFiles = scanDirectory(IMAGE_DIR);
  
  // Process each file
  for (const filePath of allFiles) {
    const resolvedPath = path.resolve(filePath);
    
    // Skip if already in database
    if (existingPaths.has(resolvedPath)) {
      skippedFiles.push(filePath);
      continue;
    }
    
    try {
      // Check if file exists and is readable
      if (!fs.existsSync(filePath)) {
        errorFiles.push({ path: filePath, error: 'File not found' });
        continue;
      }
      
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        continue;
      }
      
      // Get original filename (keep as-is)
      const originalFilename = path.basename(filePath);
      
      // Generate UUID for database entry
      const imageId = uuidv4();
      
      // Get image metadata
      const metadata = await getImageMetadata(filePath);
      
      // Determine MIME type from extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';
      
      // Use file modification time as created_at if available, otherwise use now
      const createdAt = stats.mtime ? stats.mtime.getTime() : Date.now();
      const now = Date.now();
      
      // Insert into database
      await db.run(`
        INSERT INTO images (
          id, filename, original_filename, file_path, file_size, mime_type,
          width, height, created_at, updated_at, rating, ranking, view_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        imageId,
        originalFilename, // Keep original filename
        originalFilename, // original_filename same as filename
        resolvedPath, // Use resolved absolute path
        stats.size,
        mimeType,
        metadata.width,
        metadata.height,
        createdAt,
        now,
        0,
        null,
        0
      ]);
      
      importedFiles.push({
        id: imageId,
        filename: originalFilename,
        filePath: resolvedPath,
        ...metadata,
        fileSize: stats.size,
      });
    } catch (error) {
      console.error(`Error importing file ${filePath}:`, error);
      errorFiles.push({ path: filePath, error: error.message });
    }
  }
  
  return {
    imported: importedFiles.length,
    skipped: skippedFiles.length,
    errors: errorFiles.length,
    importedFiles,
    skippedFiles,
    errorFiles,
  };
}

/**
 * Generate public URL for image
 */
function generateImageUrl(imageId) {
  return `/api/plugins/image-viewer/images/${imageId}/file`;
}

module.exports = {
  saveImage,
  getImages,
  getImageById,
  getImageTags,
  addTagsToImage,
  removeTagFromImage,
  updateImageRating,
  updateImageRanking,
  updateImageRatingAndRanking,
  incrementViewCount,
  deleteImage,
  getAllTags,
  scanAndImportImages,
  generateImageUrl,
  formatFileSize,
  IMAGE_DIR,
  DB_PATH,
};
