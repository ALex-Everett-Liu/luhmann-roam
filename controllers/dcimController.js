const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const crypto = require('crypto');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Constants
const THUMBNAIL_SIZE = 180;
const DEFAULT_ASSET_DIR = path.join(__dirname, '../public/attachment/dcim');
const DEFAULT_THUMB_DIR = path.join(__dirname, '../public/attachment/thumbnails');

// Ensure directories exist
[DEFAULT_ASSET_DIR, DEFAULT_THUMB_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Utility functions
async function getAssetDirectory() {
  try {
    const db = await getDb();
    const assetDir = await db.get('SELECT path FROM dcim_directories WHERE type = "asset"');
    
    if (assetDir && assetDir.path) {
      // Ensure directory exists
      if (!fs.existsSync(assetDir.path)) {
        fs.mkdirSync(assetDir.path, { recursive: true });
      }
      console.log('Using custom asset directory:', assetDir.path);
      return assetDir.path;
    }
  } catch (error) {
    console.error('Error getting asset directory:', error);
  }
  
  // Fallback to default
  console.log('Using default asset directory:', DEFAULT_ASSET_DIR);
  return DEFAULT_ASSET_DIR;
}

async function getThumbnailDirectory() {
  try {
    const db = await getDb();
    const thumbDir = await db.get('SELECT path FROM dcim_directories WHERE type = "thumbnail"');
    
    if (thumbDir && thumbDir.path) {
      // Ensure directory exists
      if (!fs.existsSync(thumbDir.path)) {
        fs.mkdirSync(thumbDir.path, { recursive: true });
      }
      console.log('Using custom thumbnail directory:', thumbDir.path);
      return thumbDir.path;
    }
  } catch (error) {
    console.error('Error getting thumbnail directory:', error);
  }
  
  // Fallback to default
  console.log('Using default thumbnail directory:', DEFAULT_THUMB_DIR);
  return DEFAULT_THUMB_DIR;
}

// Generate a thumbnail for an image
async function generateThumbnail(imagePath, thumbPath, maxSize = 180, quality = 60) {
  try {
    // Get image metadata to determine aspect ratio
    const metadata = await sharp(imagePath).metadata();
    const aspectRatio = metadata.width / metadata.height;
    let resizeOptions;
    
    if (aspectRatio > 1) {
      // Image is wider than it is tall - set the height to maxSize
      // This ensures the shorter dimension (height) is at least maxSize
      resizeOptions = { height: maxSize };
    } else {
      // Image is taller than it is wide or square - set the width to maxSize
      // This ensures the shorter dimension (width) is at least maxSize
      resizeOptions = { width: maxSize };
    }
    
    // Create the thumbnail using WebP format
    await sharp(imagePath)
      .resize(resizeOptions)
      .webp({ quality })
      .toFile(thumbPath);
      
  } catch (err) {
    console.error('Error generating thumbnail:', err);
    throw err;
  }
}

// Convert image to WebP
async function convertToWebP(imagePath, outputPath, quality = 80) {
  await sharp(imagePath)
    .webp({ quality })
    .toFile(outputPath);
}

// Format file size
function formatFileSize(size) {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  return (size / (1024 * 1024)).toFixed(2) + ' MB';
}

// Controller methods
exports.getImages = async (req, res) => {
  try {
    const db = await getDb();
    const images = await db.all('SELECT * FROM dcim_images ORDER BY ranking DESC NULLS LAST, created_at DESC');
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getImage = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.addImage = async (req, res) => {
  try {
    const {
      filename, 
      url, 
      file_path,
      file_size, 
      rating, 
      ranking, 
      tags, 
      creation_time, 
      person, 
      location, 
      type
    } = req.body;
    
    // Handle file upload if file is included
    let finalFilename = filename;
    let finalUrl = url;
    let finalFilePath = file_path;
    let thumbnailPath = null;
    let fileSize = file_size;
    
    // Validate that at least one address is provided
    if (!req.file && !url && !file_path) {
      return res.status(400).json({ error: 'Please provide a file, URL, or file path' });
    }
    
    if (req.file) {
      const file = req.file;
      finalFilename = file.filename || crypto.randomUUID() + path.extname(file.originalname);
      
      // Get the custom asset directory
      const assetDir = await getAssetDirectory();
      const assetPath = path.join(assetDir, finalFilename);
      
      // Write the buffer to the file system
      fs.writeFileSync(assetPath, file.buffer);
      
      // Always store the actual file path
      finalFilePath = assetPath;
      
      // Only set URL if it's in the public directory
      const publicDirPrefix = path.join(__dirname, '../public');
      if (assetDir.startsWith(publicDirPrefix)) {
        const relativePath = assetDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
        finalUrl = `${relativePath}/${finalFilename}`;
      } else {
        finalUrl = null;
      }
      
      fileSize = file.size;
      
      // Generate thumbnail
      const thumbFilename = `thumb_${finalFilename}`;
      const thumbDir = await getThumbnailDirectory();
      const thumbPath = path.join(thumbDir, thumbFilename);
      
      try {
        await generateThumbnail(assetPath, thumbPath);
        
        // Set thumbnail path based on directory location
        if (thumbDir.startsWith(publicDirPrefix)) {
          const relativePath = thumbDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
          thumbnailPath = `${relativePath}/${thumbFilename}`;
        } else {
          thumbnailPath = thumbPath;
        }
      } catch (thumbError) {
        console.error('Error generating thumbnail:', thumbError);
        // Continue without thumbnail
      }
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    const db = await getDb();
    await db.run(
      `INSERT INTO dcim_images (
        id, filename, url, file_path, file_size, rating, ranking, tags, 
        creation_time, person, location, type, thumbnail_path,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, finalFilename, finalUrl, finalFilePath, fileSize, rating, ranking, tags,
        creation_time, person, location, type, thumbnailPath,
        now, now
      ]
    );
    
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    res.status(201).json(image);
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      filename, url, file_path, file_size, rating, ranking, tags,
      creation_time, person, location, type
    } = req.body;

    // Debug logging to see what's coming in
    console.log('Received creation_time:', creation_time);
    
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Validate that at least one address is provided
    if (url === '' && file_path === '') {
      return res.status(400).json({ error: 'Please provide either a URL or a file path' });
    }
    
    await db.run(
      `UPDATE dcim_images SET 
        filename = ?, url = ?, file_path = ?, file_size = ?, rating = ?, ranking = ?,
        tags = ?, creation_time = ?, person = ?, location = ?, type = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        filename || image.filename,
        url !== undefined ? url : image.url,
        file_path !== undefined ? file_path : image.file_path,
        file_size || image.file_size,
        rating !== undefined ? rating : image.rating,
        ranking !== undefined ? ranking : image.ranking,
        tags || image.tags,
        creation_time || image.creation_time,
        person || image.person,
        location || image.location,
        type || image.type,
        Date.now(),
        id
      ]
    );
    
    const updatedImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    console.log('Updated image creation_time:', updatedImage.creation_time);
    res.json(updatedImage);
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete physical files if they exist
    if (image.url && image.url.startsWith('/attachment/')) {
      const assetPath = path.join(__dirname, '../public', image.url);
      if (fs.existsSync(assetPath)) {
        fs.unlinkSync(assetPath);
      }
    }
    
    if (image.thumbnail_path) {
      const thumbPath = path.join(__dirname, '../public', image.thumbnail_path);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
    
    await db.run('DELETE FROM dcim_images WHERE id = ?', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getImageSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const settings = await db.get('SELECT * FROM dcim_image_settings WHERE image_id = ?', id);
    
    if (!settings) {
      return res.json({ settings: {} });
    }
    
    res.json({ settings: JSON.parse(settings.settings_json) });
  } catch (error) {
    console.error('Error fetching image settings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.saveImageSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;
    
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const now = Date.now();
    const settingsJson = JSON.stringify(settings);
    
    // Check if settings already exist
    const existingSettings = await db.get('SELECT * FROM dcim_image_settings WHERE image_id = ?', id);
    
    if (existingSettings) {
      await db.run(
        'UPDATE dcim_image_settings SET settings_json = ?, updated_at = ? WHERE image_id = ?',
        [settingsJson, now, id]
      );
    } else {
      const settingId = uuidv4();
      await db.run(
        'INSERT INTO dcim_image_settings (id, image_id, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [settingId, id, settingsJson, now, now]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving image settings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.convertImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality } = req.body;
    
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Determine source path - prefer file_path over url
    let sourcePath;
    if (image.file_path) {
      sourcePath = image.file_path;
    } else if (image.url && image.url.startsWith('/')) {
      sourcePath = path.join(__dirname, '../public', image.url);
    } else {
      return res.status(400).json({ error: 'Cannot convert image without local file path' });
    }
    
    if (!fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'Source file does not exist' });
    }
    
    const filename = path.basename(image.filename, path.extname(image.filename)) + '.webp';
    const assetDir = await getAssetDirectory();
    const outputPath = path.join(assetDir, filename);
    
    await convertToWebP(sourcePath, outputPath, quality || 80);
    
    // Update the database with new image info
    const stats = fs.statSync(outputPath);
    
    // Store file_path by default
    const newFilePath = outputPath;
    
    // Only set URL if in public directory
    let newUrl = null;
    const publicDirPrefix = path.join(__dirname, '../public');
    if (assetDir.startsWith(publicDirPrefix)) {
      const relativePath = assetDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
      newUrl = `${relativePath}/${filename}`;
    }
    
    await db.run(
      `UPDATE dcim_images SET 
        filename = ?, url = ?, file_path = ?, file_size = ?, updated_at = ?
      WHERE id = ?`,
      [
        filename,
        newUrl,
        newFilePath,
        stats.size,
        Date.now(),
        id
      ]
    );
    
    // Generate a new thumbnail
    const thumbFilename = `thumb_${filename}`;
    const thumbDir = await getThumbnailDirectory();
    const thumbPath = path.join(thumbDir, thumbFilename);
    await generateThumbnail(outputPath, thumbPath);
    
    // Set thumbnail path or URL based on directory
    let thumbnailPath;
    if (thumbDir.startsWith(publicDirPrefix)) {
      const relativePath = thumbDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
      thumbnailPath = `${relativePath}/${thumbFilename}`;
    } else {
      thumbnailPath = thumbPath;
    }
    
    await db.run(
      'UPDATE dcim_images SET thumbnail_path = ? WHERE id = ?',
      [thumbnailPath, id]
    );
    
    const updatedImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    res.json(updatedImage);
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDirectories = async (req, res) => {
  try {
    const db = await getDb();
    const directories = await db.all('SELECT * FROM dcim_directories ORDER BY name');
    res.json(directories);
  } catch (error) {
    console.error('Error fetching directories:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateDirectories = async (req, res) => {
  try {
    const { assetDir, thumbnailDir } = req.body;
    
    // Validate that directories exist
    if (assetDir && !fs.existsSync(assetDir)) {
      return res.status(400).json({ error: 'Asset directory does not exist' });
    }
    
    if (thumbnailDir && !fs.existsSync(thumbnailDir)) {
      return res.status(400).json({ error: 'Thumbnail directory does not exist' });
    }
    
    const db = await getDb();
    const now = Date.now();
    
    // Update asset directory
    if (assetDir) {
      const assetDirExists = await db.get('SELECT * FROM dcim_directories WHERE type = "asset"');
      
      if (assetDirExists) {
        await db.run(
          'UPDATE dcim_directories SET path = ?, updated_at = ? WHERE type = "asset"',
          [assetDir, now]
        );
      } else {
        const id = uuidv4();
        await db.run(
          'INSERT INTO dcim_directories (id, name, path, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [id, 'Asset Directory', assetDir, 'asset', now, now]
        );
      }
    }
    
    // Update thumbnail directory
    if (thumbnailDir) {
      const thumbDirExists = await db.get('SELECT * FROM dcim_directories WHERE type = "thumbnail"');
      
      if (thumbDirExists) {
        await db.run(
          'UPDATE dcim_directories SET path = ?, updated_at = ? WHERE type = "thumbnail"',
          [thumbnailDir, now]
        );
      } else {
        const id = uuidv4();
        await db.run(
          'INSERT INTO dcim_directories (id, name, path, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [id, 'Thumbnail Directory', thumbnailDir, 'thumbnail', now, now]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating directories:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.convertUploadedImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const quality = parseInt(req.body.quality) || 60;
    const originalPath = req.file.path;
    const filename = path.basename(req.file.originalname, path.extname(req.file.originalname)) + '.webp';
    const assetDir = await getAssetDirectory();
    const outputPath = path.join(assetDir, filename);

    // Get original file size
    const originalSize = fs.statSync(originalPath).size;

    // Convert image to WebP
    await sharp(originalPath)
      .webp({ quality: quality })
      .toFile(outputPath);

    // Get converted file size
    const convertedSize = fs.statSync(outputPath).size;

    // Delete the temporary uploaded file
    fs.unlinkSync(originalPath);

    // Get relative path or full path based on directory location
    let outputUrl = null;
    const publicDirPrefix = path.join(__dirname, '../public');
    if (assetDir.startsWith(publicDirPrefix)) {
      const relativePath = assetDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
      outputUrl = `${relativePath}/${filename}`;
    }

    res.json({
      success: true,
      originalFile: req.file.originalname,
      convertedFile: filename,
      originalSize: formatFileSize(originalSize),
      convertedSize: formatFileSize(convertedSize),
      originalSizeBytes: originalSize,
      convertedSizeBytes: convertedSize,
      savingsPercent: ((originalSize - convertedSize) / originalSize * 100).toFixed(2),
      outputPath: outputUrl || outputPath, // Return URL if available, otherwise path
      file_path: outputPath // Always include the file path
    });
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).json({ error: 'Error converting image: ' + error.message });
  }
};

/**
 * Get all subsidiary images for a parent image
 */
exports.getSubsidiaryImages = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    // Check if the parent image exists
    const parentImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    if (!parentImage) {
      return res.status(404).json({ error: 'Parent image not found' });
    }
    
    // Get all subsidiary images
    const subsidiaries = await db.all(
      'SELECT * FROM dcim_images WHERE parent_id = ? ORDER BY created_at DESC', 
      id
    );
    
    res.json(subsidiaries);
  } catch (error) {
    console.error('Error fetching subsidiary images:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add a new subsidiary image
 */
exports.addSubsidiaryImage = async (req, res) => {
  try {
    const { parent_id, filename, url, file_path, inherit_metadata } = req.body;
    
    // Debug incoming data
    console.log('Subsidiary image upload request:', {
      parentId: parent_id,
      hasFile: !!req.file,
      url,
      filePath: file_path,
      filename,
      inheritMetadata: inherit_metadata
    });
    
    // Validate parent image exists
    const db = await getDb();
    const parentImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', parent_id);
    
    if (!parentImage) {
      return res.status(404).json({ error: 'Parent image not found' });
    }
    
    // Handle file upload if file is included
    let finalFilename = filename;
    let finalUrl = url;
    let finalFilePath = file_path;
    let thumbnailPath = null;
    let fileSize = null;
    
    // Validate that at least one address is provided
    if (!req.file && !url && !file_path) {
      return res.status(400).json({ error: 'Please provide a file, URL, or file path' });
    }
    
    if (req.file) {
      const file = req.file;
      // Use provided filename or generate one from original filename
      finalFilename = filename || file.originalname || `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      
      // Get the custom asset directory
      const assetDir = await getAssetDirectory();
      const assetPath = path.join(assetDir, finalFilename);
      
      // Write the buffer to the file system
      try {
        fs.writeFileSync(assetPath, file.buffer);
        
        // Store the actual file path instead of URL
        finalFilePath = assetPath;
        
        // Only set URL if it's in the public directory and can be accessed via web
        const publicDirPrefix = path.join(__dirname, '../public');
        if (assetDir.startsWith(publicDirPrefix)) {
          // This is accessible via web, so set the URL as a convenience
          const relativePath = assetDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
          finalUrl = `${relativePath}/${finalFilename}`;
        } else {
          // Not in public directory, no URL available
          finalUrl = null;
        }
        
        fileSize = file.size;
        
        // Generate thumbnail
        try {
          const thumbFilename = `thumb_${finalFilename}`;
          const thumbDir = await getThumbnailDirectory();
          const thumbPath = path.join(thumbDir, thumbFilename);
          await generateThumbnail(assetPath, thumbPath);
          
          // Format the thumbnail path or URL based on directory structure
          if (thumbDir.startsWith(publicDirPrefix)) {
            // Web accessible - store URL
            const relativePath = thumbDir.substring(publicDirPrefix.length).replace(/\\/g, '/');
            thumbnailPath = `${relativePath}/${thumbFilename}`;
          } else {
            // Not web accessible - store file path
            thumbnailPath = thumbPath;
          }
        } catch (thumbError) {
          console.error('Error generating thumbnail:', thumbError);
          // Continue without thumbnail
        }
      } catch (writeError) {
        console.error('Error writing file:', writeError);
        return res.status(500).json({ error: `Failed to save uploaded file: ${writeError.message}` });
      }
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    // Prepare data for the new image
    const newImageData = {
      id,
      filename: finalFilename,
      url: finalUrl,
      file_path: finalFilePath,
      file_size: fileSize,
      parent_id,
      thumbnail_path: thumbnailPath,
      created_at: now,
      updated_at: now
    };
    
    // If inheriting metadata, copy from parent
    if (inherit_metadata === 'true') {
      newImageData.rating = parentImage.rating;
      newImageData.ranking = parentImage.ranking;
      newImageData.tags = parentImage.tags;
      newImageData.creation_time = parentImage.creation_time;
      newImageData.person = parentImage.person;
      newImageData.location = parentImage.location;
      newImageData.type = parentImage.type;
    }
    
    console.log('Creating new subsidiary image:', newImageData);
    
    // Insert the new subsidiary image
    const columns = Object.keys(newImageData).join(', ');
    const placeholders = Object.keys(newImageData).map(() => '?').join(', ');
    const values = Object.values(newImageData);
    
    try {
      await db.run(
        `INSERT INTO dcim_images (${columns}) VALUES (${placeholders})`,
        values
      );
      
      const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
      console.log('Successfully created subsidiary image:', image);
      res.status(201).json(image);
    } catch (dbError) {
      console.error('Database error creating subsidiary:', dbError);
      res.status(500).json({ error: `Database error: ${dbError.message}` });
    }
  } catch (error) {
    console.error('Error adding subsidiary image:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Promote a subsidiary image to be the main image
 * This swaps the parent-child relationship
 */
exports.promoteSubsidiaryImage = async (req, res) => {
  try {
    const { id } = req.params; // subsidiary ID
    const { parent_id } = req.body; // current parent ID
    
    const db = await getDb();
    
    // Validate both images exist
    const subsidiaryImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    const parentImage = await db.get('SELECT * FROM dcim_images WHERE id = ?', parent_id);
    
    if (!subsidiaryImage || !parentImage) {
      return res.status(404).json({ error: 'One or both images not found' });
    }
    
    // Start a transaction for the swap
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Make the subsidiary image have no parent
      await db.run('UPDATE dcim_images SET parent_id = NULL WHERE id = ?', id);
      
      // Make the former parent a subsidiary of the promoted image
      await db.run('UPDATE dcim_images SET parent_id = ? WHERE id = ?', id, parent_id);
      
      // Make any other subsidiaries of the original parent now point to the new parent
      await db.run(
        'UPDATE dcim_images SET parent_id = ? WHERE parent_id = ? AND id != ?',
        id, parent_id, id
      );
      
      // Commit the transaction
      await db.run('COMMIT');
      
      res.json({ success: true });
    } catch (error) {
      // If any error occurs, roll back the transaction
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error promoting subsidiary image:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove the subsidiary relationship (detach from parent)
 */
exports.detachSubsidiaryImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = await getDb();
    
    // Validate the image exists
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Remove the parent relationship
    await db.run('UPDATE dcim_images SET parent_id = NULL WHERE id = ?', id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error detaching subsidiary image:', error);
    res.status(500).json({ error: error.message });
  }
};