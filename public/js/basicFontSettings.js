/**
 * Basic Font Settings
 * Simplified version with basic font options for Latin and Chinese text
 */
const BasicFontSettings = (function() {

  const FONT_OPTIONS = {
    latin: [
      { name: 'System UI', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif', preview: 'The quick brown fox jumps over the lazy dog.' },
      { name: 'Georgia', value: 'Georgia, serif', preview: 'The quick brown fox jumps over the lazy dog.' },
      { name: 'Times', value: '"Times New Roman", Times, serif', preview: 'The quick brown fox jumps over the lazy dog.' },
      { name: 'Arial', value: 'Arial, "Helvetica Neue", Helvetica, sans-serif', preview: 'The quick brown fox jumps over the lazy dog.' }
    ],
    chinese: [
      { name: 'System Sans', value: '"Microsoft YaHei", "SimSun", sans-serif', preview: '天地玄黄，宇宙洪荒。' },
      { name: 'System Serif', value: '"SimSun", "STSong", serif', preview: '天地玄黄，宇宙洪荒。' }
    ]
  };

  function initialize() {
    console.log('Basic Font Settings initialized');
  }

  function renderFontSettings(container) {
    container.innerHTML = `
      <div class="font-settings-content">
        <div class="font-section">
          <h3>Basic Font Settings</h3>
          <p style="margin-bottom: 20px; color: #666;">Select fonts for English/Latin and Chinese text</p>

          <div class="font-option-group">
            <label>English/Latin Font:</label>
            <select id="latin-font-selector">
              ${FONT_OPTIONS.latin.map(font => `<option value="${font.name}">${font.name}</option>`).join('')}
            </select>
            <div class="font-preview" id="latin-preview">
              ${FONT_OPTIONS.latin[0].preview}
            </div>
          </div>

          <div class="font-option-group">
            <label>Chinese Font:</label>
            <select id="chinese-font-selector">
              ${FONT_OPTIONS.chinese.map(font => `<option value="${font.name}">${font.name}</option>`).join('')}
            </select>
            <div class="font-preview" lang="zh" id="chinese-preview">
              ${FONT_OPTIONS.chinese[0].preview}
            </div>
          </div>

          <div class="font-actions">
            <button id="apply-font-settings" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Apply Settings</button>
            <button id="reset-font-settings" style="background: #f0f0f0; border: 1px solid #ddd; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Reset to Default</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    setupEventListeners();
    updatePreview();
  }

  function setupEventListeners() {
    document.getElementById('latin-font-selector').addEventListener('change', updatePreview);
    document.getElementById('chinese-font-selector').addEventListener('change', updatePreview);
    document.getElementById('apply-font-settings').addEventListener('click', applyAndSaveSettings);
    document.getElementById('reset-font-settings').addEventListener('click', resetSettings);
  }

  function updatePreview() {
    const latinSelector = document.getElementById('latin-font-selector');
    const chineseSelector = document.getElementById('chinese-font-selector');
    const latinPreview = document.getElementById('latin-preview');
    const chinesePreview = document.getElementById('chinese-preview');

    if (latinSelector && latinPreview) {
      const selectedFont = FONT_OPTIONS.latin.find(f => f.name === latinSelector.value);
      if (selectedFont) {
        latinPreview.style.fontFamily = selectedFont.value;
        latinPreview.textContent = selectedFont.preview;
      }
    }

    if (chineseSelector && chinesePreview) {
      const selectedFont = FONT_OPTIONS.chinese.find(f => f.name === chineseSelector.value);
      if (selectedFont) {
        chinesePreview.style.fontFamily = selectedFont.value;
        chinesePreview.textContent = selectedFont.preview;
      }
    }
  }

  function applyAndSaveSettings() {
    const latinSelector = document.getElementById('latin-font-selector');
    const chineseSelector = document.getElementById('chinese-font-selector');

    if (latinSelector && chineseSelector) {
      const latinFont = FONT_OPTIONS.latin.find(f => f.name === latinSelector.value);
      const chineseFont = FONT_OPTIONS.chinese.find(f => f.name === chineseSelector.value);

      // Apply fonts to the document
      document.documentElement.style.setProperty('--font-family-base', latinFont.value);
      document.documentElement.style.setProperty('--font-family-chinese', chineseFont.value);

      // Add !important styles to enforce our font choices
      let fontStyleEl = document.getElementById('custom-font-styles');
      if (!fontStyleEl) {
        fontStyleEl = document.createElement('style');
        fontStyleEl.id = 'custom-font-styles';
        document.head.appendChild(fontStyleEl);
      }

      fontStyleEl.textContent = `
        body, .node-text:not([lang="zh"]) {
          font-family: ${latinFont.value} !important;
        }

        [lang="zh"], .chinese-text, .node-text[lang="zh"] {
          font-family: ${chineseFont.value} !important;
        }
      `;

      // Save to localStorage
      localStorage.setItem('latin-font', latinSelector.value);
      localStorage.setItem('chinese-font', chineseSelector.value);

      alert('Font settings applied successfully!');
    }
  }

  function resetSettings() {
    // Reset to defaults
    const latinSelector = document.getElementById('latin-font-selector');
    const chineseSelector = document.getElementById('chinese-font-selector');

    if (latinSelector) latinSelector.value = FONT_OPTIONS.latin[0].name;
    if (chineseSelector) chineseSelector.value = FONT_OPTIONS.chinese[0].name;

    updatePreview();
    applyAndSaveSettings();
  }

  function loadSavedSettings() {
    const savedLatin = localStorage.getItem('latin-font');
    const savedChinese = localStorage.getItem('chinese-font');

    if (savedLatin) {
      const selector = document.getElementById('latin-font-selector');
      if (selector) selector.value = savedLatin;
    }

    if (savedChinese) {
      const selector = document.getElementById('chinese-font-selector');
      if (selector) selector.value = savedChinese;
    }

    // Apply the saved fonts on page load
    const latinFont = FONT_OPTIONS.latin.find(f => f.name === (savedLatin || FONT_OPTIONS.latin[0].name));
    const chineseFont = FONT_OPTIONS.chinese.find(f => f.name === (savedChinese || FONT_OPTIONS.chinese[0].name));

    if (latinFont && chineseFont) {
      document.documentElement.style.setProperty('--font-family-base', latinFont.value);
      document.documentElement.style.setProperty('--font-family-chinese', chineseFont.value);

      let fontStyleEl = document.getElementById('custom-font-styles');
      if (!fontStyleEl) {
        fontStyleEl = document.createElement('style');
        fontStyleEl.id = 'custom-font-styles';
        document.head.appendChild(fontStyleEl);
      }

      fontStyleEl.textContent = `
        body, .node-text:not([lang="zh"]) {
          font-family: ${latinFont.value} !important;
        }

        [lang="zh"], .chinese-text, .node-text[lang="zh"] {
          font-family: ${chineseFont.value} !important;
        }
      `;
    }
  }

  // Apply saved settings on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSavedSettings);
  } else {
    loadSavedSettings();
  }

  return {
    initialize,
    renderFontSettings
  };
})();

// Make it globally available
window.BasicFontSettings = BasicFontSettings;