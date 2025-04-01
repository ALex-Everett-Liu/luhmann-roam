// Script to download and save fonts locally
const fs = require('fs');
const https = require('https');
const path = require('path');

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, '..', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Font URLs
const fonts = [
  {
    url: 'https://fonts.gstatic.com/s/notoserifsc/v22/H4c8BXePl9DZ0Xe7gG9cyOj7mm63ezdLEw.woff2',
    path: path.join(fontsDir, 'NotoSerifSC-Regular.woff2')
  },
  {
    url: 'https://fonts.gstatic.com/s/notoserifsc/v22/H4cgBXePl9DZ0Xe7gG9cyOj7mbK3FNWBgA.woff2',
    path: path.join(fontsDir, 'NotoSerifSC-Bold.woff2')
  }
];

// Download each font
fonts.forEach(font => {
  console.log(`Downloading font from ${font.url}...`);
  
  https.get(font.url, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(font.path);
      response.pipe(file);
      file.on('finish', () => {
        console.log(`✅ Font downloaded to ${font.path}`);
        file.close();
      });
    } else {
      console.error(`❌ Failed to download font: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`❌ Error downloading font: ${err.message}`);
  });
});