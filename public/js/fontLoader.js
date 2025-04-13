// Font loader for Noto Serif SC from external CDN
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up Noto Serif SC font loading...');
  
  // First ensure the CSS file is in the document
  const cssLink = Array.from(document.querySelectorAll('link')).find(
    link => link.href && (link.href.includes('NotoSerifSC.css') || link.href.includes('notoserifsc'))
  );
  
  if (!cssLink) {
    console.log('Font CSS link not found in document, adding it now');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/fonts/NotoSerifSC.css';
    document.head.appendChild(link);
    
    link.onload = () => {
      console.log('✅ Font CSS loaded from local path');
      checkFontAvailability();
    };
    
    link.onerror = () => {
      console.error('❌ Failed to load local font CSS, trying fallback');
      // Try loading directly from CDN as fallback
      const cdnLink = document.createElement('link');
      cdnLink.rel = 'stylesheet';
      cdnLink.href = 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@500;700&display=swap';
      document.head.appendChild(cdnLink);
      
      cdnLink.onload = () => {
        console.log('✅ Font CSS loaded from CDN fallback');
        checkFontAvailability();
      };
      
      cdnLink.onerror = () => {
        console.error('❌ Failed to load font from CDN as well');
      };
    };
  } else {
    console.log('✅ Font CSS link already in document, checking availability');
    checkFontAvailability();
  }
  
  function checkFontAvailability() {
    // Give enough time for the external font to load
    setTimeout(() => {
      if ('fonts' in document) {
        document.fonts.ready.then(() => {
          console.log('Fonts ready event triggered, checking Noto Serif SC...');
          
          // Just for debugging: Log all available fonts
          try {
            const fontFamilies = new Set();
            document.fonts.forEach(font => fontFamilies.add(font.family));
            console.log('Available font families:', Array.from(fontFamilies).join(', '));
          } catch (e) {
            console.log('Could not enumerate available fonts:', e);
          }
          
          // Check if our font loaded
          const isLoaded = document.fonts.check('1em "Noto Serif SC"');
          
          if (isLoaded) {
            console.log('✅ Noto Serif SC font available and ready');
            document.body.classList.add('chinese-font-loaded');
          } else {
            console.error('❌ Noto Serif SC font check failed');
            testActualRendering();
          }
        });
      } else {
        // Fallback for browsers that don't support the Font Loading API
        console.log('Font Loading API not supported, assuming font is loaded');
        document.body.classList.add('chinese-font-loaded');
        testActualRendering();
      }
    }, 1000); // Increased timeout to ensure external font has time to load
  }
  
  // Function to test if the font actually renders Chinese characters
  function testActualRendering() {
    console.log('Testing actual rendering with Noto Serif SC...');
    
    // Create a test element with Chinese text
    const testEl = document.createElement('div');
    testEl.style.fontFamily = '"Noto Serif SC", serif';
    testEl.style.position = 'absolute';
    testEl.style.left = '-9999px';
    testEl.style.fontSize = '24px';
    testEl.textContent = '你好'; // "Hello" in Chinese
    
    document.body.appendChild(testEl);
    
    // Check computed style and dimensions
    setTimeout(() => {
      const style = window.getComputedStyle(testEl);
      console.log('Test element font-family:', style.fontFamily);
      console.log('Test element dimensions:', testEl.offsetWidth, 'x', testEl.offsetHeight);
      
      // If font is loaded properly, Chinese characters should have reasonable width
      if (testEl.offsetWidth > 20) {
        console.log('✅ Font appears to be rendering Chinese text properly');
        document.body.classList.add('chinese-font-loaded');
      } else {
        console.log('❌ Font may not be rendering Chinese text properly');
      }
      
      // Clean up
      document.body.removeChild(testEl);
    }, 100);
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