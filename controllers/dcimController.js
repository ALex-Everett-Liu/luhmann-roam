const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const crypto = require('crypto');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Constants
const THUMBNAIL_SIZE = 150;
const DEFAULT_ASSET_DIR = path.join(__dirname, '../public/attachment/dcim');
const DEFAULT_THUMB_DIR = path.join(__dirname, '../public/attachment/dcim/thumbnails');

// Ensure directories exist
[DEFAULT_ASSET_DIR, DEFAULT_THUMB_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Utility functions
function getAssetDirectory() {
  return DEFAULT_ASSET_DIR;
}

function getThumbnailDirectory() {
  return DEFAULT_THUMB_DIR;
}

// Generate a thumbnail for an image
async function generateThumbnail(imagePath, thumbPath, maxSize = 150, quality = 60) {
  try {
    // Get image metadata to determine aspect ratio
    const metadata = await sharp(imagePath).metadata();
    const aspectRatio = metadata.width / metadata.height;
    let resizeOptions;
    
    if (aspectRatio > 1) {
      // Image is wider than it is tall
      resizeOptions = { width: maxSize };
    } else {
      // Image is taller than it is wide or square
      resizeOptions = { height: maxSize };
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
    let thumbnailPath = null;
    let fileSize = file_size;
    
    if (req.file) {
      const file = req.file;
      finalFilename = file.filename || crypto.randomUUID() + path.extname(file.originalname);
      const assetPath = path.join(getAssetDirectory(), finalFilename);
      
      // If uploading a file rather than a URL
      fs.writeFileSync(assetPath, file.buffer);
      finalUrl = `/attachment/dcim/${finalFilename}`;
      fileSize = file.size;
      
      // Generate thumbnail
      const thumbFilename = `thumb_${finalFilename}`;
      const thumbPath = path.join(getThumbnailDirectory(), thumbFilename);
      await generateThumbnail(assetPath, thumbPath);
      thumbnailPath = `/attachment/dcim/thumbnails/${thumbFilename}`;
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    const db = await getDb();
    await db.run(
      `INSERT INTO dcim_images (
        id, filename, url, file_size, rating, ranking, tags, 
        creation_time, person, location, type, thumbnail_path,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, finalFilename, finalUrl, fileSize, rating, ranking, tags,
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
      filename, url, file_size, rating, ranking, tags,
      creation_time, person, location, type
    } = req.body;
    
    const db = await getDb();
    const image = await db.get('SELECT * FROM dcim_images WHERE id = ?', id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    await db.run(
      `UPDATE dcim_images SET 
        filename = ?, url = ?, file_size = ?, rating = ?, ranking = ?,
        tags = ?, creation_time = ?, person = ?, location = ?, type = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        filename || image.filename,
        url || image.url,
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
    
    if (!image.url || !image.url.startsWith('/attachment/')) {
      return res.status(400).json({ error: 'Cannot convert remote images' });
    }
    
    const sourcePath = path.join(__dirname, '../public', image.url);
    const filename = path.basename(image.filename, path.extname(image.filename));
    const outputFilename = `${filename}.webp`;
    const outputPath = path.join(getAssetDirectory(), outputFilename);
    
    await convertToWebP(sourcePath, outputPath, quality || 80);
    
    // Update the database with new image info
    const stats = fs.statSync(outputPath);
    const webpUrl = `/attachment/dcim/${outputFilename}`;
    
    await db.run(
      `UPDATE dcim_images SET 
        filename = ?, url = ?, file_size = ?, updated_at = ?
      WHERE id = ?`,
      [
        outputFilename,
        webpUrl,
        stats.size,
        Date.now(),
        id
      ]
    );
    
    // Generate a new thumbnail
    const thumbFilename = `thumb_${outputFilename}`;
    const thumbPath = path.join(getThumbnailDirectory(), thumbFilename);
    await generateThumbnail(outputPath, thumbPath);
    const thumbnailPath = `/attachment/dcim/thumbnails/${thumbFilename}`;
    
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
    const outputPath = path.join(getAssetDirectory(), filename);

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

    res.json({
      success: true,
      originalFile: req.file.originalname,
      convertedFile: filename,
      originalSize: formatFileSize(originalSize),
      convertedSize: formatFileSize(convertedSize),
      originalSizeBytes: originalSize,
      convertedSizeBytes: convertedSize,
      savingsPercent: ((originalSize - convertedSize) / originalSize * 100).toFixed(2),
      outputPath: `/attachment/dcim/${filename}`
    });
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).json({ error: 'Error converting image: ' + error.message });
  }
};