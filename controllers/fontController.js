// fontController.js - Logic for font operations
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Download a font from URL and save it locally
 * POST /api/fonts/download
 */
exports.downloadFont = async (req, res) => {
  try {
    const { fontName, fontUrl, fontType } = req.body;
    
    if (!fontName || !fontUrl) {
      return res.status(400).json({ success: false, error: 'Missing font information' });
    }
    
    console.log(`Downloading font: ${fontName} (${fontType}) from ${fontUrl}`);
    
    // Create fonts directory if it doesn't exist
    const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    // Create a type-specific directory
    const typeFontsDir = path.join(fontsDir, fontType);
    if (!fs.existsSync(typeFontsDir)) {
      fs.mkdirSync(typeFontsDir, { recursive: true });
    }
    
    // First fetch the CSS to extract the actual font files
    const cssResponse = await axios.get(fontUrl);
    const cssText = cssResponse.data;
    
    // Extract font URLs
    const urlRegex = /url\(([^)]+)\)/g;
    const fontUrls = [];
    let match;
    
    while ((match = urlRegex.exec(cssText)) !== null) {
      let extractedUrl = match[1].trim();
      
      // Remove quotes if present
      if ((extractedUrl.startsWith('"') && extractedUrl.endsWith('"')) || 
          (extractedUrl.startsWith("'") && extractedUrl.endsWith("'"))) {
        extractedUrl = extractedUrl.slice(1, -1);
      }
      
      // Make sure we have absolute URLs
      if (extractedUrl.startsWith('//')) {
        extractedUrl = 'https:' + extractedUrl;
      } else if (!extractedUrl.startsWith('http')) {
        // Handle relative URLs
        const fontUrlObj = new URL(fontUrl);
        if (extractedUrl.startsWith('/')) {
          extractedUrl = `${fontUrlObj.origin}${extractedUrl}`;
        } else {
          const pathDir = fontUrlObj.pathname.substring(0, fontUrlObj.pathname.lastIndexOf('/'));
          extractedUrl = `${fontUrlObj.origin}${pathDir}/${extractedUrl}`;
        }
      }
      
      fontUrls.push(extractedUrl);
    }
    
    if (fontUrls.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No font URLs found in CSS' 
      });
    }
    
    console.log(`Found ${fontUrls.length} font URLs to download`);
    
    // Download each font file
    const downloadedFiles = [];
    
    for (const url of fontUrls) {
      // Extract filename from URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      
      // Skip if already downloaded
      const outputPath = path.join(typeFontsDir, filename);
      if (fs.existsSync(outputPath)) {
        console.log(`Font file already exists: ${filename}`);
        downloadedFiles.push({ filename, path: outputPath });
        continue;
      }
      
      console.log(`Downloading font file: ${filename}`);
      
      // Download the file using axios
      const fontResponse = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      });
      
      // Save to file
      fs.writeFileSync(outputPath, Buffer.from(fontResponse.data));
      console.log(`Saved font file to: ${outputPath}`);
      downloadedFiles.push({ filename, path: outputPath });
    }
    
    // Generate a CSS file for the downloaded font
    const cssOutputPath = path.join(typeFontsDir, `${sanitizeFilename(fontName)}.css`);
    
    // Modify the CSS to use local paths
    let localCss = cssText;
    
    // Replace URLs in the CSS
    for (const { filename } of downloadedFiles) {
      // Match both with and without quotes
      const urlPatterns = [
        new RegExp(`url\\(["']?[^)]*${escapeRegExp(filename)}["']?\\)`, 'g'),
        new RegExp(`url\\([^)]*${escapeRegExp(filename)}\\)`, 'g')
      ];
      
      for (const pattern of urlPatterns) {
        localCss = localCss.replace(pattern, `url(/fonts/${fontType}/${filename})`);
      }
    }
    
    // Save the modified CSS
    fs.writeFileSync(cssOutputPath, localCss);
    console.log(`Generated CSS file: ${cssOutputPath}`);
    
    res.json({
      success: true,
      fontName,
      fontType,
      files: downloadedFiles,
      cssPath: `/fonts/${fontType}/${sanitizeFilename(fontName)}.css`
    });
    
  } catch (error) {
    console.error('Error downloading font:', error);
    res.status(500).json({
      success: false,
      error: `Failed to download font: ${error.message}`
    });
  }
};

/**
 * List all available fonts
 * GET /api/fonts
 */
exports.listFonts = async (req, res) => {
  try {
    const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
    
    if (!fs.existsSync(fontsDir)) {
      return res.json({ fonts: [] });
    }
    
    // Get all font type directories
    const typeDirs = fs.readdirSync(fontsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const fonts = {};
    
    // Process each type directory
    for (const type of typeDirs) {
      const typeDir = path.join(fontsDir, type);
      const cssFiles = fs.readdirSync(typeDir)
        .filter(file => file.endsWith('.css'))
        .map(file => {
          const name = file.replace('.css', '');
          return {
            name: formatFontName(name),
            cssPath: `/fonts/${type}/${file}`,
            type
          };
        });
      
      fonts[type] = cssFiles;
    }
    
    res.json({ fonts });
  } catch (error) {
    console.error('Error listing fonts:', error);
    res.status(500).json({
      success: false,
      error: `Failed to list fonts: ${error.message}`
    });
  }
};

/**
 * Format a font name from filename
 */
function formatFontName(name) {
  // Convert snake_case or kebab-case to Title Case
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Sanitize a filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

/**
 * Escape special characters in a string for use in a regular expression
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}