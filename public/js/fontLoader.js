// Font loader with local font fallback
document.addEventListener('DOMContentLoaded', () => {
  console.log('Checking Noto Serif SC font availability...');
  
  // Create test elements for comparison
  const testContainer = document.createElement('div');
  testContainer.style.position = 'absolute';
  testContainer.style.visibility = 'hidden';
  testContainer.style.pointerEvents = 'none';
  
  // Test element with target font
  const testElement = document.createElement('span');
  testElement.style.fontFamily = '"Noto Serif SC", serif';
  testElement.style.fontSize = '40px';
  testElement.textContent = '汉字测试';
  
  // Control element with fallback font
  const controlElement = document.createElement('span');
  controlElement.style.fontFamily = 'serif';
  controlElement.style.fontSize = '40px';
  controlElement.textContent = '汉字测试';
  
  // Add elements to container
  testContainer.appendChild(testElement);
  testContainer.appendChild(controlElement);
  document.body.appendChild(testContainer);
  
  // Get dimensions for comparison
  const testRect = testElement.getBoundingClientRect();
  const controlRect = controlElement.getBoundingClientRect();
  
  // Calculate differences
  const widthDifference = Math.abs(testRect.width - controlRect.width);
  const heightDifference = Math.abs(testRect.height - controlRect.height);
  
  // Clean up
  document.body.removeChild(testContainer);
  
  // Compare dimensions - they should differ if fonts are different
  if (widthDifference > 1 || heightDifference > 1) {
    console.log(`✅ Noto Serif SC font is loaded! ►{widthDifference: ${widthDifference}, heightDifference: ${heightDifference}}`);
    document.body.classList.add('chinese-font-loaded');
  } else {
    console.log(`⚠️ Using local font fallback ►{widthDifference: ${widthDifference}, heightDifference: ${heightDifference}}`);
    // Use locally stored font CSS file
    loadLocalFontCSS();
  }
});

// Function to load local font CSS
function loadLocalFontCSS() {
  console.log('Loading local font CSS file...');
  
  // Create a link element for the CSS file
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/fonts/NotoSerifSC.css'; // Point to the existing CSS file
  document.head.appendChild(link);
  
  link.onload = () => {
    console.log('✅ Local font CSS loaded');
    document.body.classList.add('chinese-font-loaded');
    
    // Modify the font URLs to use proxy if needed
    modifyFontUrls();
  };
  
  link.onerror = (err) => {
    console.error('❌ Error loading local font CSS:', err);
  };
}

// Function to modify the font URLs in the CSS to use local proxy if needed
function modifyFontUrls() {
  try {
    // Get all the style sheets on the page
    const styleSheets = Array.from(document.styleSheets);
    
    // Find our Noto Serif SC style sheet
    const notoSheet = styleSheets.find(sheet => 
      sheet.href && sheet.href.includes('NotoSerifSC.css')
    );
    
    if (!notoSheet) {
      console.log('Could not find Noto Serif SC stylesheet to modify');
      return;
    }
    
    // Check if we can access rules (CORS restrictions may prevent this)
    let cssRules;
    try {
      cssRules = notoSheet.cssRules || notoSheet.rules;
    } catch (e) {
      console.error('Cannot access CSS rules due to CORS policy:', e);
      return;
    }
    
    if (!cssRules) {
      console.log('No CSS rules found in the Noto Serif SC stylesheet');
      return;
    }
    
    console.log(`Found ${cssRules.length} CSS rules in the font stylesheet`);
    
    // We don't need to modify the URLs if they're already working
    // The browser will cache these resources as needed
    
    console.log('Font CSS loaded and ready to use');
  } catch (error) {
    console.error('Error modifying font URLs:', error);
  }
}