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
    // Use locally stored font instead
    loadLocalFont();
  }
});

// Function to load local font
function loadLocalFont() {
  // Create and add a style element with @font-face rule for the local font
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Noto Serif SC';
      src: url('/fonts/NotoSerifSC-Regular.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Noto Serif SC';
      src: url('/fonts/NotoSerifSC-Bold.woff2') format('woff2');
      font-weight: bold;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
  
  // Add class to body after local font is applied
  setTimeout(() => {
    document.body.classList.add('chinese-font-loaded');
    console.log('🔄 Local font loaded');
  }, 100);
}