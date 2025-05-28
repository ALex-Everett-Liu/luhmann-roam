/**
 * Style Settings Manager Module
 * Manages theme selection, color customization, and appearance settings
 */
const StyleSettingsManager = (function() {
    // Default style settings
    const defaultSettings = {
      theme: 'light', // 'light' or 'dark'
      primaryColor: '#3490C2',
      secondaryColor: '#6aa84f',
      accentColor: '#e69138', // orange
      fontSize: 'normal', // 'small', 'normal', 'large'
      reducedMotion: false,
      highContrast: false,
      // Add background image settings
      backgroundImage: {
        enabled: false,
        url: 'https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FXELiu-NovaKG%2FoGSdu_nHAz.jpg?alt=media&token=995ea666-6efa-4fa7-a409-2f84b5a646fc',
        opacity: 0.15, // Default overlay opacity to ensure readability
        blur: 0, // Optional blur effect in pixels
        contentColorAdjust: 'auto', // 'auto', 'light', 'dark', or 'custom'
        customTextColor: '#333333', // For custom text color option
        customBgColor: 'rgba(255, 255, 255, 0.7)' // Semi-transparent background for text areas
      }
    };
    
    // Current style settings
    let currentSettings = loadSettings();
    
    // Available theme preset colors
    const presetColors = {
      primary: [
        { name: 'Blue', value: '#4a86e8' },
        { name: 'Green', value: '#34a853' },
        { name: 'Purple', value: '#673ab7' },
        { name: 'Red', value: '#ea4335' },
        { name: 'Teal', value: '#009688' },
        { name: 'Orange', value: '#f4511e' },
        { name: 'Pink', value: '#e91e63' },
        { name: 'Indigo', value: '#3f51b5' }
      ],
      accent: [
        { name: 'Orange', value: '#e69138' },
        { name: 'Yellow', value: '#fbbc04' },
        { name: 'Pink', value: '#ff4081' },
        { name: 'Lime', value: '#cddc39' },
        { name: 'Cyan', value: '#00bcd4' },
        { name: 'Amber', value: '#ffc107' },
        { name: 'Purple', value: '#9c27b0' },
        { name: 'Green', value: '#66bb6a' }
      ]
    };
    
    /**
     * Helper function to convert RGBA to HEX color
     * Safely handles various input formats
     */
    function getHexFromRgba(rgbaStr) {
      // Default color if parsing fails
      const defaultColor = '#ffffff';
      
      // Return default if not a string
      if (typeof rgbaStr !== 'string') {
        return defaultColor;
      }
      
      try {
        // Check if it's already a hex color
        if (rgbaStr.startsWith('#')) {
          return rgbaStr;
        }
        
        // Try to extract RGB values from the rgba string
        const rgbaMatch = rgbaStr.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1]);
          const g = parseInt(rgbaMatch[2]);
          const b = parseInt(rgbaMatch[3]);
          
          // Convert to hex
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        
        return defaultColor;
      } catch (e) {
        console.error('Error parsing RGBA color:', e);
        return defaultColor;
      }
    }
    
    /**
     * Helper function to extract opacity value from RGBA string
     */
    function getOpacityFromRgba(rgbaStr) {
      // Default opacity
      const defaultOpacity = 0.7;
      
      // Return default if not a string
      if (typeof rgbaStr !== 'string') {
        return defaultOpacity;
      }
      
      try {
        // Try to extract opacity value from the rgba string
        const opacityMatch = rgbaStr.match(/rgba?\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
        if (opacityMatch && opacityMatch[1]) {
          return parseFloat(opacityMatch[1]);
        }
        
        return defaultOpacity;
      } catch (e) {
        console.error('Error parsing opacity from RGBA color:', e);
        return defaultOpacity;
      }
    }
    
    /**
     * Initialize the style settings manager
     */
    function initialize() {
      console.log('Initializing Style Settings Manager...');
      
      // Apply current settings
      applySettings();
      
      // Add theme toggler to sidebar (keep this for quick access)
      addThemeToggler();
      
      console.log('Style Settings Manager initialized with settings:', currentSettings);
    }
    
    /**
     * Render appearance settings content for SettingsManager integration
     */
    function renderAppearanceSettings(container) {
      // Create the appearance settings content
      const appearanceContent = document.createElement('div');
      appearanceContent.className = 'appearance-settings-content';
      appearanceContent.innerHTML = `
        <div class="style-settings-section">
          <h3>Theme</h3>
          <div class="style-theme-toggle">
            <span>Light</span>
            <label class="theme-switch">
              <input type="checkbox" id="theme-toggle" ${currentSettings.theme === 'dark' ? 'checked' : ''}>
              <span class="theme-slider">
                <span class="sun-icon">☀️</span>
                <span class="moon-icon">🌙</span>
              </span>
            </label>
            <span>Dark</span>
          </div>
        </div>
        
        <div class="style-settings-section">
          <h3>Primary Color</h3>
          <div class="color-option">
            <label for="primary-color">App Primary Color</label>
            <div class="color-preview" id="primary-color-preview" style="background-color: ${currentSettings.primaryColor}"></div>
            <input type="color" id="primary-color" class="color-picker" value="${currentSettings.primaryColor}">
          </div>
          <div class="preset-colors" id="primary-preset-colors">
            ${presetColors.primary.map(color => 
              `<div class="preset-color" data-color="${color.value}" style="background-color: ${color.value}" title="${color.name}"></div>`
            ).join('')}
          </div>
        </div>
        
        <div class="style-settings-section">
          <h3>Accent Color</h3>
          <div class="color-option">
            <label for="accent-color">App Accent Color</label>
            <div class="color-preview" id="accent-color-preview" style="background-color: ${currentSettings.accentColor}"></div>
            <input type="color" id="accent-color" class="color-picker" value="${currentSettings.accentColor}">
          </div>
          <div class="preset-colors" id="accent-preset-colors">
            ${presetColors.accent.map(color => 
              `<div class="preset-color" data-color="${color.value}" style="background-color: ${color.value}" title="${color.name}"></div>`
            ).join('')}
          </div>
        </div>
        
        <div class="style-settings-section">
          <h3>Text Size</h3>
          <div class="text-size-option">
            <label>Base Font Size</label>
            <select id="font-size-selector">
              <option value="small" ${currentSettings.fontSize === 'small' ? 'selected' : ''}>Small</option>
              <option value="normal" ${currentSettings.fontSize === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="large" ${currentSettings.fontSize === 'large' ? 'selected' : ''}>Large</option>
            </select>
          </div>
        </div>
        
        <div class="style-settings-section">
          <h3>Accessibility</h3>
          <div class="accessibility-option">
            <label for="reduced-motion">
              <input type="checkbox" id="reduced-motion" ${currentSettings.reducedMotion ? 'checked' : ''}>
              Reduced Motion
            </label>
          </div>
          <div class="accessibility-option">
            <label for="high-contrast">
              <input type="checkbox" id="high-contrast" ${currentSettings.highContrast ? 'checked' : ''}>
              High Contrast
            </label>
          </div>
        </div>
        
        <div class="style-settings-section">
          <h3>Background Image</h3>
          <div class="background-image-option">
            <label for="background-image-toggle">
              <input type="checkbox" id="background-image-toggle" ${currentSettings.backgroundImage.enabled ? 'checked' : ''}>
              Enable Background Image
            </label>
          </div>
          
          <div class="background-image-controls" style="${!currentSettings.backgroundImage.enabled ? 'display: none;' : ''}">
            <div class="background-image-preview">
              <div id="bg-image-preview" class="image-preview" 
                   style="${currentSettings.backgroundImage.url ? `background-image: url(${currentSettings.backgroundImage.url});` : ''}">
                ${!currentSettings.backgroundImage.url ? '<span>No image selected</span>' : ''}
              </div>
            </div>
            
            <div class="background-image-upload">
              <label for="background-image-url">Image URL:</label>
              <input type="text" id="background-image-url" value="${currentSettings.backgroundImage.url}" placeholder="https://example.com/image.jpg">
              <button id="apply-bg-url" class="small-button">Apply URL</button>
            </div>
            
            <div class="background-image-upload">
              <label for="background-image-file">Or upload image:</label>
              <input type="file" id="background-image-file" accept="image/*">
            </div>
            
            <div class="background-settings">
              <label for="background-opacity">Overlay Opacity: ${currentSettings.backgroundImage.opacity}</label>
              <input type="range" id="background-opacity" min="0" max="1" step="0.05" value="${currentSettings.backgroundImage.opacity}">
              
              <label for="background-blur">Blur Effect: ${currentSettings.backgroundImage.blur}px</label>
              <input type="range" id="background-blur" min="0" max="20" step="1" value="${currentSettings.backgroundImage.blur}">
              
              <label for="content-color-adjust">Content Colors:</label>
              <select id="content-color-adjust">
                <option value="auto" ${currentSettings.backgroundImage.contentColorAdjust === 'auto' ? 'selected' : ''}>Auto (Based on Theme)</option>
                <option value="light" ${currentSettings.backgroundImage.contentColorAdjust === 'light' ? 'selected' : ''}>Light Mode Colors</option>
                <option value="dark" ${currentSettings.backgroundImage.contentColorAdjust === 'dark' ? 'selected' : ''}>Dark Mode Colors</option>
                <option value="custom" ${currentSettings.backgroundImage.contentColorAdjust === 'custom' ? 'selected' : ''}>Custom Colors</option>
              </select>
              
              <div id="custom-colors-container" style="${currentSettings.backgroundImage.contentColorAdjust !== 'custom' ? 'display: none;' : ''}">
                <div class="color-option">
                  <label for="custom-text-color">Text Color</label>
                  <div class="color-preview" id="custom-text-color-preview" style="background-color: ${currentSettings.backgroundImage.customTextColor}"></div>
                  <input type="color" id="custom-text-color" class="color-picker" value="${currentSettings.backgroundImage.customTextColor}">
                </div>
                
                <div class="color-option">
                  <label for="custom-bg-color">Content Background</label>
                  <div class="color-preview" id="custom-bg-color-preview" style="background-color: ${currentSettings.backgroundImage.customBgColor}"></div>
                  <input type="color" id="custom-bg-color" class="color-picker" value="${getHexFromRgba(currentSettings.backgroundImage.customBgColor)}">
                  <input type="range" id="custom-bg-opacity" min="0" max="1" step="0.1" value="${getOpacityFromRgba(currentSettings.backgroundImage.customBgColor)}">
                  <label for="custom-bg-opacity" id="custom-bg-opacity-label">Opacity: ${getOpacityFromRgba(currentSettings.backgroundImage.customBgColor)}</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(appearanceContent);
      
      // Set up event handlers for the rendered content
      setupAppearanceEventHandlers();
      
      // Mark active preset colors
      markActivePresetColors();
    }
    
    /**
     * Set up event handlers for appearance settings
     */
    function setupAppearanceEventHandlers() {
      // Theme toggle
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
          const themePreview = document.querySelector('body');
          if (e.target.checked) {
            themePreview.classList.add('dark-theme');
          } else {
            themePreview.classList.remove('dark-theme');
          }
        });
      }
      
      // Color pickers
      setupColorPicker('primary-color', 'primary-color-preview');
      setupColorPicker('accent-color', 'accent-color-preview');
      
      // Preset colors
      setupPresetColors('primary-preset-colors', 'primary-color');
      setupPresetColors('accent-preset-colors', 'accent-color');
      
      // Setup background image controls
      setupBackgroundImageControls();
    }
    
    /**
     * Save appearance settings from the form
     */
    function saveAppearanceSettings() {
      updateSettingsFromForm();
      applySettings();
      saveSettings();
      
      // Update the theme toggler text if it exists
      const themeToggler = document.getElementById('theme-toggler');
      if (themeToggler) {
        themeToggler.textContent = currentSettings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        themeToggler.title = currentSettings.theme === 'dark' 
          ? 'Switch to light theme' 
          : 'Switch to dark theme';
      }
    }
    
    /**
     * Add a simple theme toggle button to the sidebar
     * for quick access to dark/light mode
     */
    function addThemeToggler() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      
      const themeToggler = document.createElement('button');
      themeToggler.id = 'theme-toggler';
      themeToggler.className = 'feature-toggle';
      themeToggler.textContent = currentSettings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      themeToggler.title = currentSettings.theme === 'dark' 
        ? 'Switch to light theme' 
        : 'Switch to dark theme';
      
      themeToggler.addEventListener('click', () => {
        // Toggle theme
        currentSettings.theme = currentSettings.theme === 'dark' ? 'light' : 'dark';
        
        // Update button text
        themeToggler.textContent = currentSettings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        themeToggler.title = currentSettings.theme === 'dark' 
          ? 'Switch to light theme' 
          : 'Switch to dark theme';
        
        // Apply and save settings
        applySettings();
        saveSettings();
      });
      
      // Insert before existing buttons (find a good position)
      const gridViewButton = document.getElementById('toggle-grid-view');
      const backupButton = document.getElementById('backup-database');
      
      if (backupButton) {
        sidebar.insertBefore(themeToggler, backupButton);
      } else if (gridViewButton) {
        sidebar.insertBefore(themeToggler, gridViewButton);
      } else {
        sidebar.appendChild(themeToggler);
      }
    }
    
    /**
     * Set up a color picker and preview
     */
    function setupColorPicker(pickerId, previewId) {
      const picker = document.getElementById(pickerId);
      const preview = document.getElementById(previewId);
      
      if (!picker || !preview) return;
      
      // Update preview when color changes
      picker.addEventListener('input', () => {
        preview.style.backgroundColor = picker.value;
        updatePresetColorSelection(pickerId);
      });
      
      // Open color picker when clicking preview
      preview.addEventListener('click', () => {
        picker.click();
      });
    }
    
    /**
     * Set up preset color buttons
     */
    function setupPresetColors(containerId, targetPickerId) {
      const container = document.getElementById(containerId);
      const picker = document.getElementById(targetPickerId);
      
      if (!container || !picker) return;
      
      // Add click event to all preset colors
      const presetButtons = container.querySelectorAll('.preset-color');
      presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          picker.value = color;
          
          // Update preview
          const previewId = targetPickerId + '-preview';
          const preview = document.getElementById(previewId);
          if (preview) {
            preview.style.backgroundColor = color;
          }
          
          // Mark this preset as active
          presetButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
    
    /**
     * Mark active preset color buttons
     */
    function markActivePresetColors() {
      // Primary color
      markActiveColor('primary-preset-colors', currentSettings.primaryColor);
      
      // Accent color
      markActiveColor('accent-preset-colors', currentSettings.accentColor);
    }
    
    /**
     * Mark an active color in a preset container
     */
    function markActiveColor(containerId, color) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      // Remove active class from all
      container.querySelectorAll('.preset-color').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Find matching color and mark active
      const matchingBtn = Array.from(container.querySelectorAll('.preset-color'))
        .find(btn => btn.dataset.color.toLowerCase() === color.toLowerCase());
      
      if (matchingBtn) {
        matchingBtn.classList.add('active');
      }
    }
    
    /**
     * Update preset color selection based on picker value
     */
    function updatePresetColorSelection(pickerId) {
      const picker = document.getElementById(pickerId);
      if (!picker) return;
      
      const color = picker.value;
      const containerId = pickerId === 'primary-color' ? 'primary-preset-colors' : 'accent-preset-colors';
      
      markActiveColor(containerId, color);
    }
    
    /**
     * Update settings from form values
     */
    function updateSettingsFromForm() {
      // Theme
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        currentSettings.theme = themeToggle.checked ? 'dark' : 'light';
      }
      
      // Colors
      const primaryColor = document.getElementById('primary-color');
      if (primaryColor) {
        currentSettings.primaryColor = primaryColor.value;
      }
      
      const accentColor = document.getElementById('accent-color');
      if (accentColor) {
        currentSettings.accentColor = accentColor.value;
      }
      
      // Font size
      const fontSizeSelector = document.getElementById('font-size-selector');
      if (fontSizeSelector) {
        currentSettings.fontSize = fontSizeSelector.value;
      }
      
      // Accessibility options
      const reducedMotion = document.getElementById('reduced-motion');
      if (reducedMotion) {
        currentSettings.reducedMotion = reducedMotion.checked;
      }
      
      const highContrast = document.getElementById('high-contrast');
      if (highContrast) {
        currentSettings.highContrast = highContrast.checked;
      }
      
      // Background image
      const bgToggle = document.getElementById('background-image-toggle');
      const bgUrlInput = document.getElementById('background-image-url');
      const bgOpacitySlider = document.getElementById('background-opacity');
      const bgBlurSlider = document.getElementById('background-blur');
      
      if (bgToggle) {
        currentSettings.backgroundImage.enabled = bgToggle.checked;
      }
      
      if (bgUrlInput) {
        currentSettings.backgroundImage.url = bgUrlInput.value.trim();
      }
      
      if (bgOpacitySlider) {
        currentSettings.backgroundImage.opacity = parseFloat(bgOpacitySlider.value);
      }
      
      if (bgBlurSlider) {
        currentSettings.backgroundImage.blur = parseInt(bgBlurSlider.value);
      }
      
      // Content color adjustment settings
      const contentColorAdjust = document.getElementById('content-color-adjust');
      const customTextColor = document.getElementById('custom-text-color');
      const customBgColor = document.getElementById('custom-bg-color');
      const customBgOpacity = document.getElementById('custom-bg-opacity');
      
      if (contentColorAdjust) {
        currentSettings.backgroundImage.contentColorAdjust = contentColorAdjust.value;
      }
      
      if (customTextColor) {
        currentSettings.backgroundImage.customTextColor = customTextColor.value;
      }
      
      if (customBgColor && customBgOpacity) {
        // Convert hex to rgba
        const baseColor = customBgColor.value;
        const opacity = customBgOpacity.value;
        
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        currentSettings.backgroundImage.customBgColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
    
    /**
     * Apply current settings to the application
     */
    function applySettings() {
      // Apply theme
      if (currentSettings.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      
      // Apply colors
      document.documentElement.style.setProperty('--primary-color', currentSettings.primaryColor);
      document.documentElement.style.setProperty('--accent-color', currentSettings.accentColor);
      
      // Apply secondary color (derived from primary for consistency)
      // This can be expanded to have its own setting if needed
      document.documentElement.style.setProperty('--secondary-color', currentSettings.secondaryColor);
      
      // Apply font size
      let baseFontSize = '16px';
      if (currentSettings.fontSize === 'small') baseFontSize = '14px';
      if (currentSettings.fontSize === 'large') baseFontSize = '18px';
      document.documentElement.style.setProperty('--font-size-base', baseFontSize);
      
      // Apply accessibility settings
      if (currentSettings.reducedMotion) {
        document.documentElement.style.setProperty('--transition-fast', '0ms');
        document.documentElement.style.setProperty('--transition-normal', '0ms');
        document.documentElement.style.setProperty('--transition-slow', '0ms');
        document.body.classList.add('reduced-motion');
      } else {
        document.documentElement.style.setProperty('--transition-fast', '150ms ease');
        document.documentElement.style.setProperty('--transition-normal', '300ms ease');
        document.documentElement.style.setProperty('--transition-slow', '500ms ease');
        document.body.classList.remove('reduced-motion');
      }
      
      if (currentSettings.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
      
      // Apply background image settings
      if (currentSettings.backgroundImage.enabled && currentSettings.backgroundImage.url) {
        document.documentElement.style.setProperty('--background-image-url', `url(${currentSettings.backgroundImage.url})`);
        document.documentElement.style.setProperty('--background-image-overlay', currentSettings.backgroundImage.opacity);
        document.documentElement.style.setProperty('--background-image-blur', `${currentSettings.backgroundImage.blur}px`);
        document.body.classList.add('has-background-image');
        
        // Apply content color adjustments
        const colorAdjust = currentSettings.backgroundImage.contentColorAdjust;
        
        // Remove all special content color classes first
        document.body.classList.remove('bg-content-dark');
        document.body.classList.remove('bg-content-light');
        document.body.classList.remove('bg-content-custom');
        
        if (colorAdjust === 'auto') {
          // Use the current theme setting (no additional classes needed)
        } else if (colorAdjust === 'dark') {
          document.body.classList.add('bg-content-dark');
        } else if (colorAdjust === 'light') {
          document.body.classList.add('bg-content-light');
        } else if (colorAdjust === 'custom') {
          document.body.classList.add('bg-content-custom');
          document.documentElement.style.setProperty('--custom-text-color', currentSettings.backgroundImage.customTextColor);
          document.documentElement.style.setProperty('--custom-bg-color', currentSettings.backgroundImage.customBgColor);
        }
      } else {
        document.documentElement.style.removeProperty('--background-image-url');
        document.documentElement.style.removeProperty('--background-image-overlay');
        document.documentElement.style.removeProperty('--background-image-blur');
        document.body.classList.remove('has-background-image');
        document.body.classList.remove('bg-content-dark');
        document.body.classList.remove('bg-content-light');
        document.body.classList.remove('bg-content-custom');
      }
      
      console.log('Applied style settings:', currentSettings);
    }
    
    /**
     * Save settings to localStorage
     */
    function saveSettings() {
      localStorage.setItem('style-settings', JSON.stringify(currentSettings));
      console.log('Saved style settings to localStorage');
    }
    
    /**
     * Load settings from localStorage
     */
    function loadSettings() {
      const savedSettings = localStorage.getItem('style-settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          console.log('Loaded style settings from localStorage:', parsedSettings);
          // Merge with default settings to ensure we have all properties
          return { ...defaultSettings, ...parsedSettings };
        } catch (e) {
          console.error('Error parsing saved style settings:', e);
          return { ...defaultSettings };
        }
      }
      return { ...defaultSettings };
    }
    
    /**
     * Reset settings to defaults
     */
    function resetSettings() {
      currentSettings = { ...defaultSettings };
      applySettings();
      saveSettings();
      
      // Update theme toggle button
      const themeToggler = document.getElementById('theme-toggler');
      if (themeToggler) {
        themeToggler.textContent = currentSettings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      }
      
      console.log('Reset style settings to defaults');
    }
    
    // Setup background image UI controls
    function setupBackgroundImageControls() {
      const bgToggle = document.getElementById('background-image-toggle');
      const bgControls = document.querySelector('.background-image-controls');
      const bgUrlInput = document.getElementById('background-image-url');
      const bgApplyUrlBtn = document.getElementById('apply-bg-url');
      const bgFileInput = document.getElementById('background-image-file');
      const bgOpacitySlider = document.getElementById('background-opacity');
      const bgBlurSlider = document.getElementById('background-blur');
      const bgPreview = document.getElementById('bg-image-preview');
      
      if (!bgToggle || !bgControls) return;
      
      // Toggle background image controls visibility
      bgToggle.addEventListener('change', () => {
        bgControls.style.display = bgToggle.checked ? 'block' : 'none';
        updateBackgroundPreview();
        updateContentPreview();
      });
      
      // Apply URL button
      if (bgApplyUrlBtn && bgUrlInput) {
        bgApplyUrlBtn.addEventListener('click', () => {
          const url = bgUrlInput.value.trim();
          if (url) {
            // Update preview with new URL
            bgPreview.style.backgroundImage = `url(${url})`;
            bgPreview.innerHTML = '';
          } else {
            bgPreview.style.backgroundImage = '';
            bgPreview.innerHTML = '<span>No image selected</span>';
          }
          updateContentPreview();
        });
      }
      
      // File upload
      if (bgFileInput) {
        bgFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
              const dataUrl = event.target.result;
              // Update preview and URL input with data URL
              bgPreview.style.backgroundImage = `url(${dataUrl})`;
              bgPreview.innerHTML = '';
              bgUrlInput.value = dataUrl;
              updateContentPreview();
            };
            
            reader.readAsDataURL(file);
          }
        });
      }
      
      // Opacity slider
      if (bgOpacitySlider) {
        const opacityLabel = bgOpacitySlider.previousElementSibling;
        
        bgOpacitySlider.addEventListener('input', () => {
          const value = bgOpacitySlider.value;
          opacityLabel.textContent = `Overlay Opacity: ${value}`;
          updateBackgroundPreview();
          updateContentPreview();
        });
      }
      
      // Blur slider
      if (bgBlurSlider) {
        const blurLabel = bgBlurSlider.previousElementSibling;
        
        bgBlurSlider.addEventListener('input', () => {
          const value = bgBlurSlider.value;
          blurLabel.textContent = `Blur Effect: ${value}px`;
          updateBackgroundPreview();
          updateContentPreview();
        });
      }
      
      // Add content color adjustment handlers
      const contentColorAdjust = document.getElementById('content-color-adjust');
      const customColorsContainer = document.getElementById('custom-colors-container');
      const customTextColor = document.getElementById('custom-text-color');
      const customTextColorPreview = document.getElementById('custom-text-color-preview');
      const customBgColor = document.getElementById('custom-bg-color');
      const customBgColorPreview = document.getElementById('custom-bg-color-preview');
      const customBgOpacity = document.getElementById('custom-bg-opacity');
      const customBgOpacityLabel = document.getElementById('custom-bg-opacity-label');
      
      if (contentColorAdjust) {
        contentColorAdjust.addEventListener('change', () => {
          if (customColorsContainer) {
            customColorsContainer.style.display = 
              contentColorAdjust.value === 'custom' ? 'block' : 'none';
          }
          updateBackgroundPreview();
          updateContentPreview();
        });
      }
      
      // Setup color pickers for custom colors
      if (customTextColor && customTextColorPreview) {
        customTextColor.addEventListener('input', () => {
          customTextColorPreview.style.backgroundColor = customTextColor.value;
          updateBackgroundPreview();
          updateContentPreview();
        });
        
        customTextColorPreview.addEventListener('click', () => {
          customTextColor.click();
        });
      }
      
      if (customBgColor && customBgColorPreview) {
        customBgColor.addEventListener('input', () => {
          updateCustomBgColor();
          updateContentPreview();
        });
        
        customBgColorPreview.addEventListener('click', () => {
          customBgColor.click();
        });
      }
      
      if (customBgOpacity) {
        customBgOpacity.addEventListener('input', () => {
          if (customBgOpacityLabel) {
            customBgOpacityLabel.textContent = `Opacity: ${customBgOpacity.value}`;
          }
          updateCustomBgColor();
          updateContentPreview();
        });
      }
      
      function updateCustomBgColor() {
        const baseColor = customBgColor.value;
        const opacity = customBgOpacity ? customBgOpacity.value : 0.7;
        
        // Convert hex to rgba
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        
        if (customBgColorPreview) {
          customBgColorPreview.style.backgroundColor = rgbaColor;
        }
        
        updateBackgroundPreview();
        
        return rgbaColor;
      }
    }
    
    // Update background preview with current settings
    function updateBackgroundPreview() {
      const bgPreview = document.getElementById('bg-image-preview');
      const bgToggle = document.getElementById('background-image-toggle');
      const bgOpacitySlider = document.getElementById('background-opacity');
      const bgBlurSlider = document.getElementById('background-blur');
      
      if (!bgPreview) return;
      
      if (bgToggle && !bgToggle.checked) {
        document.documentElement.style.removeProperty('--background-image-overlay');
        document.documentElement.style.removeProperty('--background-image-blur');
        return;
      }
      
      const opacity = bgOpacitySlider ? bgOpacitySlider.value : currentSettings.backgroundImage.opacity;
      const blur = bgBlurSlider ? bgBlurSlider.value : currentSettings.backgroundImage.blur;
      
      // Apply to preview
      bgPreview.style.setProperty('--preview-opacity', opacity);
      bgPreview.style.setProperty('--preview-blur', `${blur}px`);
    }
    
    // Add this function to create and update the content preview
    function updateContentPreview() {
      const bgPreview = document.getElementById('bg-image-preview');
      const bgColorAdjust = document.getElementById('content-color-adjust');
      const contentPreview = document.getElementById('content-preview');
      
      if (!bgPreview || !bgColorAdjust) return;
      
      // Create content preview if it doesn't exist
      if (!contentPreview) {
        const previewContainer = document.createElement('div');
        previewContainer.id = 'content-preview';
        previewContainer.className = 'content-preview';
        
        // Add some sample text items
        previewContainer.innerHTML = `
          <div class="content-preview-item">Sample text with background</div>
          <div class="content-preview-item">Another line of content</div>
        `;
        
        // Insert after the background preview
        bgPreview.parentNode.insertBefore(previewContainer, bgPreview.nextSibling);
      }
      
      // Get the content preview (now we're sure it exists)
      const preview = document.getElementById('content-preview');
      
      // Update background image to match the main preview
      preview.style.backgroundImage = bgPreview.style.backgroundImage;
      
      // Update preview based on selected color adjustment
      preview.className = 'content-preview';
      const colorAdjust = bgColorAdjust.value;
      
      if (colorAdjust === 'auto') {
        // Use the current theme setting
        if (document.body.classList.contains('dark-theme')) {
          preview.classList.add('dark');
        }
      } else if (colorAdjust === 'dark') {
        preview.classList.add('dark');
      } else if (colorAdjust === 'custom') {
        preview.classList.add('custom');
        
        // Get custom colors
        const customTextColor = document.getElementById('custom-text-color');
        const customBgColor = document.getElementById('custom-bg-color');
        const customBgOpacity = document.getElementById('custom-bg-opacity');
        
        if (customTextColor && customBgColor && customBgOpacity) {
          // Convert hex to rgba for background
          const baseColor = customBgColor.value;
          const opacity = customBgOpacity.value;
          
          const r = parseInt(baseColor.slice(1, 3), 16);
          const g = parseInt(baseColor.slice(3, 5), 16);
          const b = parseInt(baseColor.slice(5, 7), 16);
          
          const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          
          // Apply to preview
          preview.style.setProperty('--preview-custom-text', customTextColor.value);
          preview.style.setProperty('--preview-custom-bg', rgbaColor);
        }
      }
      
      // Apply blur and opacity from the main controls
      const bgOpacitySlider = document.getElementById('background-opacity');
      const bgBlurSlider = document.getElementById('background-blur');
      
      if (bgOpacitySlider) {
        preview.style.setProperty('--preview-content-opacity', bgOpacitySlider.value);
      }
      
      if (bgBlurSlider) {
        preview.style.setProperty('--preview-blur', `${bgBlurSlider.value}px`);
      }
    }
    
    // Public API
    return {
      initialize,
      renderAppearanceSettings,
      saveAppearanceSettings,
      applySettings,
      resetSettings,
      getCurrentTheme: () => currentSettings.theme
    };
  })();
  
  // Make it available globally
  window.StyleSettingsManager = StyleSettingsManager;