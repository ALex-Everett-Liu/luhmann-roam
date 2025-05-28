/**
 * Font Manager Module
 * Manages font selection, downloading, and application across the application
 */
const FontManager = (function() {
    // Available font options
    const availableFonts = {
      latin: [
        { name: 'System UI', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif', isSystem: true },
        { name: 'Georgia', value: 'Georgia, serif', isSystem: true },
        { name: 'Times New Roman', value: '"Times New Roman", Times, serif', isSystem: true },
        { name: 'Arial', value: 'Arial, "Helvetica Neue", Helvetica, sans-serif', isSystem: true },
        { name: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&display=swap' },
        { name: 'IBM Plex Serif', value: '"IBM Plex Serif", serif', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;700&display=swap' }
      ],
      chinese: [
        { name: 'Noto Serif SC', value: '"Noto Serif SC", "SimSun", "STSong", serif', url: 'https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@500;700&display=swap' },
        { name: 'LXGW WenKai', value: '"LXGW WenKai", "STKaiti", "KaiTi", serif', url: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css' },
        { name: 'Noto Sans SC', value: '"Noto Sans SC", "SimHei", "STHeiti", sans-serif', url: 'https://fonts.loli.net/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap' },
        { name: 'Source Han Serif', value: '"Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "SimSun", serif', url: 'https://fonts.loli.net/css2?family=Source+Han+Serif+SC:wght@400;500;700&display=swap' }
      ]
    };
    
    // Current font selections
    let currentFonts = {
      latin: loadFontPreference('latin') || 'System UI',
      chinese: loadFontPreference('chinese') || 'Noto Serif SC'
    };
    
    // Loaded font tracker
    const loadedFonts = new Set();
    
    /**
     * Initialize the font manager
     */
    function initialize() {
      console.log('Initializing Font Manager...');
      
      // Load saved font preferences
      applyCurrentFonts();
      
      console.log('Font Manager initialized');
    }
    
    /**
     * Render font settings content for SettingsManager integration
     */
    function renderFontSettings(container) {
      // Create the font settings content
      const fontContent = document.createElement('div');
      fontContent.className = 'font-settings-content';
      fontContent.innerHTML = `
        <div class="font-section">
          <h3>English/Latin Font</h3>
          <select id="latin-font-selector">
            ${availableFonts.latin.map(font => 
              `<option value="${font.name}" ${currentFonts.latin === font.name ? 'selected' : ''}>${font.name}</option>`
            ).join('')}
          </select>
          <div id="latin-font-preview" class="font-preview">
            The quick brown fox jumps over the lazy dog.
          </div>
        </div>
        
        <div class="font-section">
          <h3>Chinese Font</h3>
          <select id="chinese-font-selector">
            ${availableFonts.chinese.map(font => 
              `<option value="${font.name}" ${currentFonts.chinese === font.name ? 'selected' : ''}>${font.name}</option>`
            ).join('')}
          </select>
          <div id="chinese-font-preview" class="font-preview" lang="zh">
            天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。
          </div>
        </div>
        
        <div class="font-actions">
          <button id="download-selected-fonts" class="download-fonts-button">Download Selected Fonts</button>
          <div id="download-status" class="download-status"></div>
        </div>
      `;
      
      container.appendChild(fontContent);
      
      // Set up event handlers for the rendered content
      setupFontEventHandlers();
      
      // Update font previews
      updateFontPreviews();
    }
    
    /**
     * Set up event handlers for font settings
     */
    function setupFontEventHandlers() {
      // Font selector change events for previews
      const latinSelector = document.getElementById('latin-font-selector');
      const chineseSelector = document.getElementById('chinese-font-selector');
      
      if (latinSelector) {
        latinSelector.addEventListener('change', updateFontPreviews);
      }
      
      if (chineseSelector) {
        chineseSelector.addEventListener('change', updateFontPreviews);
      }
      
      // Download fonts button
      const downloadButton = document.getElementById('download-selected-fonts');
      if (downloadButton) {
        downloadButton.addEventListener('click', downloadSelectedFonts);
      }
    }
    
    /**
     * Update font previews based on current selections
     */
    function updateFontPreviews() {
      const latinSelector = document.getElementById('latin-font-selector');
      const chineseSelector = document.getElementById('chinese-font-selector');
      const latinPreview = document.getElementById('latin-font-preview');
      const chinesePreview = document.getElementById('chinese-font-preview');
      
      if (latinSelector && latinPreview) {
        const selectedFont = getSelectedFont('latin', latinSelector.value);
        if (selectedFont) {
          latinPreview.style.fontFamily = selectedFont.value;
          
          // Load the font if needed for accurate preview
          if (!selectedFont.isSystem && selectedFont.url && !loadedFonts.has(selectedFont.name)) {
            loadFont(selectedFont);
          }
        }
      }
      
      if (chineseSelector && chinesePreview) {
        const selectedFont = getSelectedFont('chinese', chineseSelector.value);
        if (selectedFont) {
          chinesePreview.style.fontFamily = selectedFont.value;
          
          // Load the font if needed for accurate preview
          if (!selectedFont.isSystem && selectedFont.url && !loadedFonts.has(selectedFont.name)) {
            loadFont(selectedFont);
          }
        }
      }
    }
    
    /**
     * Save font settings from the form
     */
    function saveFontSettings() {
      saveFontSelections();
      applyCurrentFonts();
    }
    
    /**
     * Save the current font selections to preferences
     */
    function saveFontSelections() {
      const latinSelector = document.getElementById('latin-font-selector');
      const chineseSelector = document.getElementById('chinese-font-selector');
      
      if (latinSelector) {
        currentFonts.latin = latinSelector.value;
        saveFontPreference('latin', latinSelector.value);
      }
      
      if (chineseSelector) {
        currentFonts.chinese = chineseSelector.value;
        saveFontPreference('chinese', chineseSelector.value);
      }
      
      console.log('Font preferences saved:', currentFonts);
    }
    
    /**
     * Apply the current font selections to the document
     */
    function applyCurrentFonts() {
      // Get the font objects
      const latinFont = getSelectedFont('latin', currentFonts.latin);
      const chineseFont = getSelectedFont('chinese', currentFonts.chinese);
      
      if (!latinFont || !chineseFont) {
        console.error('Could not find selected fonts');
        return;
      }
      
      // Load the fonts if not system fonts
      if (!latinFont.isSystem && latinFont.url && !loadedFonts.has(latinFont.name)) {
        loadFont(latinFont);
      }
      
      if (!chineseFont.isSystem && chineseFont.url && !loadedFonts.has(chineseFont.name)) {
        loadFont(chineseFont);
      }
      
      // Apply to CSS variables
      document.documentElement.style.setProperty('--font-family-base', latinFont.value);
      document.documentElement.style.setProperty('--font-family-chinese', chineseFont.value);
      
      // Add !important styles to enforce our font choices 
      // Create or update a dedicated style element for font settings
      let fontStyleEl = document.getElementById('custom-font-styles');
      if (!fontStyleEl) {
        fontStyleEl = document.createElement('style');
        fontStyleEl.id = 'custom-font-styles';
        document.head.appendChild(fontStyleEl);
      }
      
      // Apply higher-specificity styles that override any other rules
      fontStyleEl.textContent = `
        body, .node-text:not([lang="zh"]) {
          font-family: ${latinFont.value} !important;
        }
        
        [lang="zh"], .chinese-text, .node-text[lang="zh"] {
          font-family: ${chineseFont.value} !important;
        }
      `;
      
      console.log('Applied fonts:', {
        latin: latinFont.name,
        chinese: chineseFont.name
      });
    }
    
    /**
     * Load a font using a <link> element
     */
    function loadFont(font) {
      if (!font.url) return;
      
      console.log(`Loading font: ${font.name}`);
      
      // Check if we already have a link for this font
      const existingLink = document.querySelector(`link[href="${font.url}"]`);
      if (existingLink) {
        console.log(`Font ${font.name} already has a link element`);
        loadedFonts.add(font.name);
        return;
      }
      
      // Create a new link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url;
      
      // Add to document
      document.head.appendChild(link);
      
      // Track loaded state
      link.onload = () => {
        console.log(`Font loaded: ${font.name}`);
        loadedFonts.add(font.name);
      };
      
      link.onerror = () => {
        console.error(`Failed to load font: ${font.name}`);
      };
    }
    
    /**
     * Download selected fonts for offline use
     */
    async function downloadSelectedFonts() {
      const statusElement = document.getElementById('download-status');
      if (statusElement) {
        statusElement.textContent = 'Starting font download...';
      }
      
      // Get the currently selected fonts
      const latinSelector = document.getElementById('latin-font-selector');
      const chineseSelector = document.getElementById('chinese-font-selector');
      
      const latinFont = getSelectedFont('latin', latinSelector.value);
      const chineseFont = getSelectedFont('chinese', chineseSelector.value);
      
      // Server endpoint for downloading fonts
      const downloadEndpoint = '/api/fonts/download';
      
      try {
        let results = [];
        
        // Download latin font if not a system font
        if (latinFont && !latinFont.isSystem && latinFont.url) {
          if (statusElement) {
            statusElement.textContent = `Downloading ${latinFont.name}...`;
          }
          
          const latinResult = await fetch(downloadEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fontName: latinFont.name,
              fontUrl: latinFont.url,
              fontType: 'latin'
            })
          });
          
          const latinData = await latinResult.json();
          results.push(latinData);
        }
        
        // Download chinese font if not a system font
        if (chineseFont && !chineseFont.isSystem && chineseFont.url) {
          if (statusElement) {
            statusElement.textContent = `Downloading ${chineseFont.name}...`;
          }
          
          const chineseResult = await fetch(downloadEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fontName: chineseFont.name,
              fontUrl: chineseFont.url,
              fontType: 'chinese'
            })
          });
          
          const chineseData = await chineseResult.json();
          results.push(chineseData);
        }
        
        // Update status with results
        if (statusElement) {
          const successCount = results.filter(r => r.success).length;
          if (successCount === results.length && results.length > 0) {
            statusElement.textContent = `✅ Successfully downloaded ${successCount} font(s)!`;
          } else if (results.length > 0) {
            statusElement.textContent = `⚠️ Downloaded ${successCount}/${results.length} font(s). Some errors occurred.`;
          } else {
            statusElement.textContent = 'No fonts to download. System fonts are always available.';
          }
        }
        
      } catch (error) {
        console.error('Error downloading fonts:', error);
        if (statusElement) {
          statusElement.textContent = `❌ Error downloading fonts: ${error.message}`;
        }
      }
    }
    
    /**
     * Get a font object by name
     */
    function getSelectedFont(type, fontName) {
      const fonts = availableFonts[type] || [];
      return fonts.find(font => font.name === fontName);
    }
    
    /**
     * Save font preference to localStorage
     */
    function saveFontPreference(type, fontName) {
      localStorage.setItem(`font-${type}`, fontName);
    }
    
    /**
     * Load font preference from localStorage
     */
    function loadFontPreference(type) {
      return localStorage.getItem(`font-${type}`);
    }
    
    /**
     * Update the available fonts list
     * Can be used to add user-downloaded fonts
     */
    function updateAvailableFonts(type, newFonts) {
      if (Array.isArray(newFonts) && availableFonts[type]) {
        availableFonts[type] = [...availableFonts[type], ...newFonts];
      }
    }
    
    // Public API
    return {
      initialize,
      renderFontSettings,
      saveFontSettings,
      applyCurrentFonts,
      updateAvailableFonts
    };
  })();
  
  // Make it available globally
  window.FontManager = FontManager;