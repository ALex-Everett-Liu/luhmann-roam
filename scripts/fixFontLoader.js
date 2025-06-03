// Create a script to download and save the font locally
const fs = require('fs');
const https = require('https');
const path = require('path');

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, '..', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Font URL
const fontUrl = 'https://cdn.staticfile.org/lxgw-wenkai-screen-webfont/1.6.0/lxgwwenkaiscreen.woff2';
const fontPath = path.join(fontsDir, 'lxgwwenkaiscreen.woff2');

// Download the font
https.get(fontUrl, (response) => {
  if (response.statusCode === 200) {
    const file = fs.createWriteStream(fontPath);
    response.pipe(file);
    file.on('finish', () => {
      console.log(`Font downloaded to ${fontPath}`);
      file.close();
    });
  } else {
    console.error(`Failed to download font: ${response.statusCode}`);
  }
}).on('error', (err) => {
  console.error(`Error downloading font: ${err.message}`);
});