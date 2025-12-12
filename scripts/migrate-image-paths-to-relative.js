#!/usr/bin/env node

/**
 * Migration script to convert absolute file_path values to relative paths
 * in the image-viewer database.
 * 
 * This allows the database to be portable across different machines with
 * different absolute paths (e.g., C:\Coding\luhmann-roam vs Q:\Coding-2025\luhmann-roam)
 * 
 * Run this script once after updating imageViewerService.js to use relative paths.
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(__dirname, "..", "plugins", "image-viewer", "image-viewer.db");

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
 * Check if a path is absolute
 */
function isAbsolutePath(filePath) {
  if (!filePath) return false;
  return path.isAbsolute(filePath);
}

async function main() {
  console.log('Starting migration: Converting absolute file_path to relative paths...');
  console.log(`Project root: ${PROJECT_ROOT}`);
  console.log(`Database path: ${DB_PATH}`);
  
  try {
    // Open database
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
    
    // Get all images
    const images = await db.all("SELECT id, file_path FROM images");
    console.log(`Found ${images.length} images in database`);
    
    if (images.length === 0) {
      console.log('No images to migrate. Exiting.');
      await db.close();
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Start transaction
    await db.run("BEGIN TRANSACTION");
    
    try {
      for (const image of images) {
        const currentPath = image.file_path;
        
        // Skip if already relative
        if (!isAbsolutePath(currentPath)) {
          console.log(`  ✓ Skipping ${image.id}: already relative (${currentPath})`);
          skippedCount++;
          continue;
        }
        
        // Convert to relative path
        const relativePath = toRelativePath(currentPath);
        
        // Skip if path didn't change (shouldn't happen, but safety check)
        if (currentPath === relativePath) {
          console.log(`  ⚠ Skipping ${image.id}: path unchanged (${currentPath})`);
          skippedCount++;
          continue;
        }
        
        // Update database
        await db.run(
          "UPDATE images SET file_path = ? WHERE id = ?",
          [relativePath, image.id]
        );
        
        // Verify the update
        const updated = await db.get("SELECT file_path FROM images WHERE id = ?", image.id);
        if (updated.file_path !== relativePath) {
          throw new Error(`Failed to update path for image ${image.id}`);
        }
        
        console.log(`  ✓ Migrated ${image.id}:`);
        console.log(`    From: ${currentPath}`);
        console.log(`    To:   ${relativePath}`);
        migratedCount++;
      }
      
      // Commit transaction
      await db.run("COMMIT");
      console.log('\n✅ Migration completed successfully!');
      console.log(`   Migrated: ${migratedCount} images`);
      console.log(`   Skipped:  ${skippedCount} images (already relative)`);
      console.log(`   Errors:   ${errorCount} images`);
      
      if (errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        errors.forEach(err => console.log(`   - ${err}`));
      }
      
    } catch (error) {
      // Rollback on error
      await db.run("ROLLBACK");
      console.error('\n❌ Error during migration. Rolling back changes...');
      throw error;
    } finally {
      await db.close();
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

