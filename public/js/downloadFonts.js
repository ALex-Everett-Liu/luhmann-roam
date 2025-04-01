// Script to download Noto Serif SC font files from fonts.loli.net
const fs = require('fs');
const path = require('path');
const https = require('https');

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, '..', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

async function downloadFonts() {
  try {
    // First fetch the CSS file to find the actual font URLs
    console.log('Fetching font CSS from fonts.loli.net...');
    
    // Use native https instead of node-fetch to avoid ESM issues
    const cssText = await new Promise((resolve, reject) => {
      https.get('https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@500;700&display=swap', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch CSS: ${res.statusCode} ${res.statusMessage}`));
          return;
        }
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', reject);
    });
    
    console.log('CSS fetched, extracting font URLs...');
    
    // Extract font URLs using regex
    const urlRegex = /url\((.+?\.woff2)\)/g;
    const fontUrls = [];
    let match;
    
    while ((match = urlRegex.exec(cssText)) !== null) {
      fontUrls.push(match[1]);
    }
    
    if (fontUrls.length === 0) {
      throw new Error('No font URLs found in CSS');
    }
    
    console.log(`Found ${fontUrls.length} font URLs:`);
    fontUrls.forEach(url => console.log(`- ${url}`));
    
    // Download each font file
    for (let i = 0; i < fontUrls.length; i++) {
      const url = fontUrls[i];
      const filename = url.split('/').pop().split('?')[0]; // Extract filename from URL
      const outputPath = path.join(fontsDir, filename);
      
      console.log(`Downloading font ${i+1}/${fontUrls.length}: ${filename}`);
      
      // Download the font file using native https
      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download font: ${res.statusCode} ${res.statusMessage}`));
            return;
          }
          
          const fileStream = fs.createWriteStream(outputPath);
          res.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ Saved font to: ${outputPath}`);
            resolve();
          });
          
          fileStream.on('error', (err) => {
            fs.unlink(outputPath, () => {}); // Delete the file if there was an error
            reject(err);
          });
        }).on('error', reject);
      });
    }
    
    console.log('✅ All fonts downloaded successfully!');
    
    // Generate local font-face CSS
    const fontFaceCss = generateFontFaceCss(fontUrls);
    const cssFilePath = path.join(fontsDir, 'noto-serif-sc.css');
    fs.writeFileSync(cssFilePath, fontFaceCss);
    
    console.log(`✅ Generated CSS file: ${cssFilePath}`);
    
  } catch (error) {
    console.error('❌ Error downloading fonts:', error);
  }
}

// Generate CSS for local font-face definitions
function generateFontFaceCss(fontUrls) {
  let css = '/* Local Noto Serif SC font-face definitions */\n\n';
  
  fontUrls.forEach(url => {
    const filename = url.split('/').pop().split('?')[0];
    // Try to determine font weight from URL or filename
    let weight = '500'; // Default weight
    if (url.includes('700') || filename.includes('700')) {
      weight = '700';
    }
    
    css += `@font-face {
  font-family: 'Noto Serif SC';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${filename}') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+4E00-9FFF;
}\n\n`;
  });
  
  return css;
}

// Run the download function
downloadFonts();