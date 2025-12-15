// imageViewerService.js - Business logic for Image Viewer operations
//
// This service handles all business logic and database operations for the Image Viewer plugin.
// Called by controllers/imageViewerController.js
// Database: plugins/image-viewer/image-viewer.db (SQLite)
// Image storage: plugins/image-viewer/images/ directory
//
// For plugin development reference, see: docs/development/PLUGIN_TEMPLATE.md
//
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

// Directory paths
const PROJECT_ROOT = path.join(__dirname, "..");
const IMAGE_DIR = path.join(__dirname, "..", "plugins", "image-viewer", "images");
const DB_PATH = path.join(__dirname, "..", "plugins", "image-viewer", "image-viewer.db");

// Ensure directories exist
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

/**
 * Convert absolute path to relative path (relative to project root)
 * @param {string} absolutePath - Absolute file path
 * @returns {string} Relative path from project root
 */
function toRelativePath(absolutePath) {
  if (!absolutePath) return absolutePath;
  
  // If already relative, return as-is
  if (!path.isAbsolute(absolutePath)) {
    return absolutePath;
  }
  
  const resolvedAbsolute = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(PROJECT_ROOT);
  
  // Try normal path.relative first (works when paths are on same drive)
  if (resolvedAbsolute.startsWith(resolvedRoot)) {
    return path.relative(resolvedRoot, resolvedAbsolute);
  }
  
  // Handle cross-drive paths (Windows: different drive letters)
  // Extract the relative portion by finding the common pattern
  // Paths should be: {any_drive}:\{any_path}\plugins\image-viewer\images\...
  // We want: plugins\image-viewer\images\...
  
  // Normalize path separators
  const normalizedPath = resolvedAbsolute.replace(/\\/g, '/');
  
  // Find the plugins/image-viewer/images pattern
  const pluginsPattern = 'plugins/image-viewer/images';
  const pluginsIndex = normalizedPath.toLowerCase().indexOf(pluginsPattern.toLowerCase());
  
  if (pluginsIndex !== -1) {
    // Extract everything from plugins/image-viewer/images onwards
    const relativePart = normalizedPath.substring(pluginsIndex);
    // Convert back to platform-specific separators
    return relativePart.replace(/\//g, path.sep);
  }
  
  // Fallback: if we can't find the pattern, try to extract relative to a common base
  // Look for "plugins" directory
  const pluginsDirIndex = normalizedPath.toLowerCase().indexOf('/plugins/');
  if (pluginsDirIndex !== -1) {
    const relativePart = normalizedPath.substring(pluginsDirIndex + 1); // +1 to skip leading /
    return relativePart.replace(/\//g, path.sep);
  }
  
  // Last resort: return the path as-is (shouldn't happen with valid paths)
  console.warn(`Warning: Could not convert path to relative: ${absolutePath}`);
  return absolutePath;
}

/**
 * Convert relative path to absolute path (relative to project root)
 * @param {string} relativePath - Relative file path from project root
 * @returns {string} Absolute file path
 */
function toAbsolutePath(relativePath) {
  if (!relativePath) return relativePath;
  
  // If already absolute, return as-is
  if (path.isAbsolute(relativePath)) {
    return path.resolve(relativePath);
  }
  
  // Convert relative path to absolute
  return path.resolve(PROJECT_ROOT, relativePath);
}

// Database connection cache
let dbInstance = null;

// Get database connection (without initialization)
async function getDbRaw() {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  
  return dbInstance;
}

// Get database connection
async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  
  await getDbRaw();
  
  // Initialize database schema
  await initializeDatabase();
  
  return dbInstance;
}

/**
 * Migrate tags from old denormalized schema to normalized schema
 */
async function migrateTagsToNormalizedSchema(db) {
  // Check if image_tags table exists
  const tableExists = await db.get(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='image_tags'
  `);
  
  if (!tableExists) {
    // Table doesn't exist yet, will be created by initializeDatabase
    return;
  }
  
  // Check if old schema exists (has 'tag' column in image_tags)
  const tableInfo = await db.all("PRAGMA table_info(image_tags)");
  const hasOldSchema = tableInfo.some(col => col.name === 'tag');
  
  if (!hasOldSchema) {
    // Already migrated or new database with normalized schema
    return;
  }
  
  console.log("Migration: Converting tags to normalized schema...");
  console.log("Migration: Found old schema with 'tag' column, starting migration...");
  
  await db.run("BEGIN TRANSACTION");
  try {
    // Step 1: Create tags table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    
    // Step 2: Extract unique tags from old image_tags table and insert into tags table
    const oldTagRows = await db.all("SELECT DISTINCT tag, MIN(created_at) as created_at FROM image_tags GROUP BY tag");
    const tagMap = new Map(); // Maps tag name to tag_id
    
    for (const row of oldTagRows) {
      const tagId = uuidv4();
      await db.run(`
        INSERT OR IGNORE INTO tags (id, name, created_at)
        VALUES (?, ?, ?)
      `, [tagId, row.tag, row.created_at]);
      tagMap.set(row.tag, tagId);
    }
    
    // Step 3: Create new image_tags table with tag_id references
    await db.exec(`
      CREATE TABLE IF NOT EXISTS image_tags_new (
        image_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);
    
    // Step 4: Migrate data from old image_tags to new image_tags_new
    const oldImageTags = await db.all("SELECT image_id, tag, created_at FROM image_tags");
    for (const row of oldImageTags) {
      const tagId = tagMap.get(row.tag);
      if (tagId) {
        await db.run(`
          INSERT OR IGNORE INTO image_tags_new (image_id, tag_id, created_at)
          VALUES (?, ?, ?)
        `, [row.image_id, tagId, row.created_at]);
      }
    }
    
    // Step 5: Drop old image_tags table
    await db.run("DROP TABLE IF EXISTS image_tags");
    
    // Step 6: Rename new table to image_tags
    await db.run("ALTER TABLE image_tags_new RENAME TO image_tags");
    
    // Step 7: Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
      CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    `);
    
    await db.run("COMMIT");
    console.log(`Migration: Successfully migrated ${oldTagRows.length} unique tags and ${oldImageTags.length} tag assignments`);
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Migration: Error migrating tags:", error);
    throw error;
  }
}

// Initialize database
async function initializeDatabase() {
  const db = await getDbRaw();
  
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
  
  // Migrate existing database: add description column if it doesn't exist
  try {
    await db.run("ALTER TABLE images ADD COLUMN description TEXT DEFAULT NULL");
    console.log("Migration: Added description column to images table");
  } catch (error) {
    // Column already exists - this is expected for new databases or already-migrated databases
    if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
      console.log("Migration: description column already exists in images table");
    } else {
      // Unexpected error - log it but don't fail
      console.log("Migration: Error checking description column:", error.message);
    }
  }
  
  // IMPORTANT: Migrate tags to normalized schema BEFORE creating new tables
  // This ensures we detect and migrate old schema if it exists
  try {
    await migrateTagsToNormalizedSchema(db);
  } catch (error) {
    console.error("Migration: Failed to migrate tags schema:", error);
    // Don't throw - allow the app to continue, but log the error
    // The migration will be retried on next initialization
  }
  
  // Create normalized tags tables (will be created if migration hasn't run yet, or after migration)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS image_tags (
      image_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (image_id, tag_id),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
  
  // Create indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_images_rating ON images(rating);
    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
  `);
  
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
  
  // Insert into database (store relative path)
  const now = Date.now();
  const relativeFilePath = toRelativePath(filePath);
  await db.run(`
    INSERT INTO images (
      id, filename, original_filename, file_path, file_size, mime_type,
      width, height, created_at, updated_at, rating, ranking, view_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    imageId,
    filename,
    file.originalname,
    relativeFilePath,
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
    filePath: toRelativePath(filePath),
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
  const hasTagFilter = filters.tags && filters.tags.length > 0;
  const prefix = hasTagFilter ? "i." : "";
  
  if (hasTagFilter) {
    query = `
      SELECT DISTINCT i.* FROM images i
      INNER JOIN image_tags it ON i.id = it.image_id
      INNER JOIN tags t ON it.tag_id = t.id
      WHERE t.name IN (${filters.tags.map(() => "?").join(",")})
    `;
    params.push(...filters.tags);
  }
  
  // Rating filters (minimum rating - legacy filter)
  if (filters.rating !== undefined) {
    conditions.push(`${prefix}rating >= ?`);
    params.push(filters.rating);
  }
  
  // Rating range filters
  if (filters.ratingMin !== undefined) {
    conditions.push(`${prefix}rating >= ?`);
    params.push(filters.ratingMin);
  }
  if (filters.ratingMax !== undefined) {
    conditions.push(`${prefix}rating <= ?`);
    params.push(filters.ratingMax);
  }
  
  // Ranking range filters (exclude NULLs when range is specified)
  const hasRankingFilter = filters.rankingMin !== undefined || filters.rankingMax !== undefined;
  if (hasRankingFilter) {
    conditions.push(`${prefix}ranking IS NOT NULL`);
    if (filters.rankingMin !== undefined) {
      conditions.push(`${prefix}ranking >= ?`);
      params.push(filters.rankingMin);
    }
    if (filters.rankingMax !== undefined) {
      conditions.push(`${prefix}ranking <= ?`);
      params.push(filters.rankingMax);
    }
  }
  
  // Apply conditions
  if (conditions.length > 0 && !hasTagFilter) {
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
  
  // Get tags for each image and convert relative paths to absolute
  const imagesWithTags = await Promise.all(
    images.map(async (image) => ({
      ...image,
      file_path: toAbsolutePath(image.file_path),
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
  // Convert relative file_path to absolute for use in controllers
  return {
    ...image,
    file_path: toAbsolutePath(image.file_path),
    tags: tags,
  };
}

/**
 * Get or create a tag by name, returns tag_id
 */
async function getOrCreateTag(tagName) {
  const db = await getDb();
  const trimmedName = tagName.trim();
  
  // Try to get existing tag
  const existingTag = await db.get("SELECT id FROM tags WHERE name = ?", trimmedName);
  if (existingTag) {
    return existingTag.id;
  }
  
  // Create new tag
  const tagId = uuidv4();
  const now = Date.now();
  await db.run(`
    INSERT INTO tags (id, name, created_at)
    VALUES (?, ?, ?)
  `, [tagId, trimmedName, now]);
  
  return tagId;
}

/**
 * Get tags for an image
 */
async function getImageTags(imageId) {
  const db = await getDb();
  const rows = await db.all(`
    SELECT t.name 
    FROM image_tags it
    INNER JOIN tags t ON it.tag_id = t.id
    WHERE it.image_id = ?
    ORDER BY t.name
  `, imageId);
  return rows.map(row => row.name);
}

/**
 * Add tags to an image
 */
async function addTagsToImage(imageId, tags) {
  const db = await getDb();
  const now = Date.now();
  
  await db.run("BEGIN TRANSACTION");
  try {
    for (const tagName of tags) {
      // Get or create tag
      const tagId = await getOrCreateTag(tagName);
      
      // Link tag to image
      await db.run(`
        INSERT OR IGNORE INTO image_tags (image_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `, [imageId, tagId, now]);
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
async function removeTagFromImage(imageId, tagName) {
  const db = await getDb();
  // Find tag_id by tag name
  const tag = await db.get("SELECT id FROM tags WHERE name = ?", tagName.trim());
  if (!tag) {
    // Tag doesn't exist, nothing to remove
    return;
  }
  
  // Remove the link between image and tag
  await db.run("DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?", imageId, tag.id);
  
  // Note: We don't delete the tag itself from tags table, as it might be used by other images
  // Tags will be cleaned up automatically if needed (orphaned tags can be removed separately if desired)
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
 * Update image description
 */
async function updateImageDescription(imageId, description) {
  const db = await getDb();
  const now = Date.now();
  const descriptionValue = description === null || description === undefined ? null : String(description).trim();
  // Allow empty string to clear description
  const finalDescription = descriptionValue === '' ? null : descriptionValue;
  await db.run(`
    UPDATE images 
    SET description = ?, updated_at = ?
    WHERE id = ?
  `, [finalDescription, now, imageId]);
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
  
  // Convert relative path to absolute for file operations
  const absolutePath = toAbsolutePath(image.file_path);
  
  // Delete file
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
  
  // Delete from database (tags will be deleted via CASCADE)
  await db.run("DELETE FROM images WHERE id = ?", imageId);
}

/**
 * Get all unique tags
 */
async function getAllTags() {
  const db = await getDb();
  const rows = await db.all("SELECT name FROM tags ORDER BY name");
  return rows.map(row => row.name);
}

/**
 * Get list of subfolders in the images directory
 * @param {string} basePath - Base path to scan (relative to IMAGE_DIR or absolute)
 * @returns {Array<{name: string, path: string, relativePath: string}>} Array of folder info
 */
function getSubfolders(basePath = '') {
  const baseDir = basePath ? toAbsolutePath(path.join('plugins', 'image-viewer', 'images', basePath)) : IMAGE_DIR;
  
  if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
    return [];
  }
  
  const folders = [];
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(baseDir, entry.name);
        const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
        folders.push({
          name: entry.name,
          path: fullPath,
          relativePath: relativePath
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${baseDir}:`, error);
  }
  
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan images directory and import new files
 * @param {string} subfolder - Optional subfolder path (relative to IMAGE_DIR) to scan. If not provided, scans entire IMAGE_DIR
 */
async function scanAndImportImages(subfolder = null) {
  const db = await getDb();
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'];
  const importedFiles = [];
  const skippedFiles = [];
  const errorFiles = [];
  
  // Determine scan directory
  const scanDir = subfolder 
    ? toAbsolutePath(path.join('plugins', 'image-viewer', 'images', subfolder))
    : IMAGE_DIR;
  
  // Validate scan directory exists and is within IMAGE_DIR
  if (!fs.existsSync(scanDir)) {
    throw new Error(`Scan directory does not exist: ${subfolder || 'images'}`);
  }
  
  const scanDirResolved = path.resolve(scanDir);
  const imageDirResolved = path.resolve(IMAGE_DIR);
  
  if (!scanDirResolved.startsWith(imageDirResolved)) {
    throw new Error('Scan directory must be within images directory');
  }
  
  // Get all existing file paths from database
  const existingImages = await db.all("SELECT file_path FROM images");
  // Convert relative paths to absolute for comparison
  const existingPaths = new Set(existingImages.map(img => {
    const absPath = toAbsolutePath(img.file_path);
    return path.resolve(absPath);
  }));
  
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
  
  const allFiles = scanDirectory(scanDir);
  
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
      
      // Insert into database (store relative path)
      const relativeFilePath = toRelativePath(resolvedPath);
      await db.run(`
        INSERT INTO images (
          id, filename, original_filename, file_path, file_size, mime_type,
          width, height, created_at, updated_at, rating, ranking, view_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        imageId,
        originalFilename, // Keep original filename
        originalFilename, // original_filename same as filename
        relativeFilePath, // Store relative path
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
        filePath: relativeFilePath,
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
  updateImageDescription,
  updateImageRatingAndRanking,
  incrementViewCount,
  deleteImage,
  getAllTags,
  scanAndImportImages,
  getSubfolders,
  generateImageUrl,
  formatFileSize,
  IMAGE_DIR,
  DB_PATH,
};
