// Add this to a new file or to an existing file that runs after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Improved font detection
  const checkLXGWFont = () => {
    console.log('Checking LXGW WenKai Screen font availability...');
    
    // Create test elements for comparison
    const testContainer = document.createElement('div');
    testContainer.style.position = 'absolute';
    testContainer.style.visibility = 'hidden';
    testContainer.style.pointerEvents = 'none';
    
    // Test element with target font
    const testElement = document.createElement('span');
    testElement.style.fontFamily = '"LXGW WenKai Screen", sans-serif';
    testElement.style.fontSize = '40px'; // Larger size for better comparison
    testElement.textContent = '汉字测试';
    
    // Control element with fallback font
    const controlElement = document.createElement('span');
    controlElement.style.fontFamily = 'sans-serif';
    controlElement.style.fontSize = '40px';
    controlElement.textContent = '汉字测试';
    
    // Add elements to container
    testContainer.appendChild(testElement);
    testContainer.appendChild(controlElement);
    document.body.appendChild(testContainer);
    
    // Get dimensions for comparison
    const testRect = testElement.getBoundingClientRect();
    const controlRect = controlElement.getBoundingClientRect();
    
    // Clean up
    document.body.removeChild(testContainer);
    
    // Compare dimensions - they should differ if fonts are different
    const widthDifference = Math.abs(testRect.width - controlRect.width);
    const heightDifference = Math.abs(testRect.height - controlRect.height);
    
    if (widthDifference > 1 || heightDifference > 1) {
      console.log('✅ LXGW WenKai Screen font is loaded!', {
        widthDifference,
        heightDifference
      });
      document.body.classList.add('chinese-font-loaded');
      return true;
    } else {
      console.warn('❌ LXGW WenKai Screen font not loaded, using fallback...', {
        widthDifference,
        heightDifference
      });
      return false;
    }
  };

  // Add visual indicator with retry button
  const fontStatus = document.createElement('div');
  fontStatus.style.position = 'fixed';
  fontStatus.style.bottom = '10px';
  fontStatus.style.right = '10px';
  fontStatus.style.background = 'rgba(0,0,0,0.7)';
  fontStatus.style.color = 'white';
  fontStatus.style.padding = '10px';
  fontStatus.style.borderRadius = '5px';
  fontStatus.style.fontSize = '12px';
  fontStatus.style.zIndex = '9999';
  fontStatus.style.display = 'flex';
  fontStatus.style.flexDirection = 'column';
  fontStatus.style.gap = '5px';
  
  const statusText = document.createElement('div');
  statusText.textContent = 'Loading Chinese font...';
  
  const retryButton = document.createElement('button');
  retryButton.textContent = 'Retry Font Load';
  retryButton.style.fontSize = '12px';
  retryButton.style.padding = '3px 6px';
  retryButton.style.display = 'none';
  
  fontStatus.appendChild(statusText);
  fontStatus.appendChild(retryButton);
  document.body.appendChild(fontStatus);
  
  // Function to load font with web font loader
  const loadFont = () => {
    // Create a stylesheet link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/utilities/language.css';
    document.head.appendChild(link);

    // Set timeout to check if font loaded
    setTimeout(() => {
      const fontLoaded = checkLXGWFont();
      
      if (fontLoaded) {
        statusText.textContent = 'Chinese font loaded successfully!';
        retryButton.style.display = 'none';
        
        // Hide after delay
        setTimeout(() => {
          fontStatus.style.display = 'none';
        }, 3000);
      } else {
        statusText.textContent = 'Failed to load Chinese font';
        retryButton.style.display = 'block';
      }
    }, 2000);
  };
  
  // Add retry functionality
  retryButton.addEventListener('click', () => {
    statusText.textContent = 'Retrying font load...';
    retryButton.style.display = 'none';
    loadFont();
  });
  
  // Initial font load
  loadFont();
});