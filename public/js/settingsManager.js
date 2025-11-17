/**
 * Settings Manager Module
 * Central hub for managing all application settings including plugins, appearance, fonts, etc.
 */
const SettingsManager = (function () {
  // Private variables
  let isInitialized = false;
  let settingsModal = null;
  let modalOverlay = null;
  let currentSection = "general"; // Change default to general

  // Registered settings sections
  const settingsSections = new Map();

  // Available sections configuration
  const sectionConfig = {
    general: {
      title: "General",
      icon: "⚙️",
      description: "General application settings including language",
    },
    plugins: {
      title: "Plugins",
      icon: "🔌",
      description: "Manage application features and plugins",
    },
    appearance: {
      title: "Appearance",
      icon: "🎨",
      description: "Customize colors, themes, and visual settings",
    },
    fonts: {
      title: "Fonts",
      icon: "🔤",
      description: "Basic font preferences",
    },
    attributes: {
      title: "Attributes",
      icon: "📊",
      description: "Node attributes and metadata settings",
    },
    accessibility: {
      title: "Accessibility",
      icon: "♿",
      description: "Accessibility and usability options",
    },
  };

  /**
   * Initialize the Settings Manager
   */
  function initialize() {
    if (isInitialized) {
      console.log("SettingsManager already initialized, skipping");
      return;
    }

    console.log("Initializing SettingsManager...");

    // Create the main settings button in sidebar
    createSettingsButton();

    // Register built-in sections
    registerBuiltInSections();

    isInitialized = true;
    console.log("SettingsManager initialization complete");
  }

  /**
   * Create the main settings button in the sidebar
   */
  function createSettingsButton() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
      console.error("Sidebar not found, cannot create settings button");
      return;
    }

    const settingsButton = document.createElement("button");
    settingsButton.id = "settings-manager-button";
    settingsButton.className = "feature-toggle settings-button";
    settingsButton.innerHTML = "⚙️ Settings";
    settingsButton.title = "Open application settings";

    settingsButton.addEventListener("click", openSettingsModal);

    const backupButton = document.getElementById("backup-database");

    if (backupButton) {
      sidebar.insertBefore(settingsButton, backupButton);
    } else {
      sidebar.appendChild(settingsButton);
    }

    console.log("Settings button created and added to sidebar");
  }

  /**
   * Register built-in settings sections
   */
  function registerBuiltInSections() {
    // Register general section (includes language)
    registerSection("general", {
      title: sectionConfig.general.title,
      icon: sectionConfig.general.icon,
      description: sectionConfig.general.description,
      render: renderGeneralSection,
      onSave: saveGeneralSettings,
    });

    // Register plugins section
    if (window.PluginManager) {
      registerSection("plugins", {
        title: sectionConfig.plugins.title,
        icon: sectionConfig.plugins.icon,
        description: sectionConfig.plugins.description,
        render: renderPluginsSection,
        onSave: () => {
          // Plugin settings are saved automatically
          console.log("Plugin settings saved");
        },
      });
    }

    // Register appearance section
    if (window.StyleSettingsManager) {
      registerSection("appearance", {
        title: sectionConfig.appearance.title,
        icon: sectionConfig.appearance.icon,
        description: sectionConfig.appearance.description,
        render: renderAppearanceSection,
        onSave: saveAppearanceSettings,
      });
    }

    // Register fonts section
    if (window.BasicFontSettings) {
      registerSection("fonts", {
        title: sectionConfig.fonts.title,
        icon: sectionConfig.fonts.icon,
        description: sectionConfig.fonts.description,
        render: renderFontsSection,
        onSave: saveFontSettings,
      });
    }

    console.log(
      "Built-in sections registered:",
      Array.from(settingsSections.keys()),
    );
  }

  /**
   * Register a settings section
   */
  function registerSection(id, config) {
    const defaultConfig = {
      title: id,
      icon: "⚙️",
      description: "",
      render: null,
      onSave: null,
      onReset: null,
    };

    settingsSections.set(id, { ...defaultConfig, ...config });
    console.log(`Settings section "${id}" registered`);
  }

  /**
   * Open the settings modal
   */
  function openSettingsModal() {
    // Create modal if it doesn't exist
    if (!settingsModal) {
      createSettingsModal();
    }

    // Show the modal
    if (modalOverlay && settingsModal) {
      modalOverlay.style.display = "flex";
      modalOverlay.classList.add("show");

      // Render the current section
      renderCurrentSection();

      console.log("Settings modal opened, current section:", currentSection);
    }
  }

  /**
   * Close the settings modal
   */
  function closeSettingsModal() {
    if (modalOverlay && settingsModal) {
      modalOverlay.style.display = "none";
      modalOverlay.classList.remove("show");
    }
  }

  /**
   * Create the settings modal structure
   */
  function createSettingsModal() {
    // Create modal overlay with unique class name
    modalOverlay = document.createElement("div");
    modalOverlay.className = "settings-modal-overlay";
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeSettingsModal();
      }
    });

    // Create modal with unique class name
    settingsModal = document.createElement("div");
    settingsModal.className = "settings-modal";
    settingsModal.id = "settings-modal";

    // Modal content
    const modalContent = document.createElement("div");
    modalContent.className = "settings-modal-content";

    // Modal header
    const modalHeader = document.createElement("div");
    modalHeader.className = "settings-modal-header";

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = "Settings";
    modalTitle.className = "settings-modal-title";

    const closeButton = document.createElement("button");
    closeButton.className = "settings-modal-close";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", closeSettingsModal);

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Modal body with sidebar and content
    const modalBody = document.createElement("div");
    modalBody.className = "settings-modal-body";

    // Settings sidebar (navigation)
    const settingsSidebar = document.createElement("div");
    settingsSidebar.className = "settings-sidebar";
    settingsSidebar.id = "settings-sidebar";

    // Settings content area
    const settingsContent = document.createElement("div");
    settingsContent.className = "settings-content";
    settingsContent.id = "settings-content";

    modalBody.appendChild(settingsSidebar);
    modalBody.appendChild(settingsContent);

    // Modal footer
    const modalFooter = document.createElement("div");
    modalFooter.className = "settings-modal-footer";

    const saveButton = document.createElement("button");
    saveButton.className = "settings-save-btn";
    saveButton.textContent = "Save Changes";
    saveButton.addEventListener("click", saveCurrentSection);

    const cancelButton = document.createElement("button");
    cancelButton.className = "settings-cancel-btn";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", closeSettingsModal);

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    settingsModal.appendChild(modalContent);
    modalOverlay.appendChild(settingsModal);

    // Add to document
    document.body.appendChild(modalOverlay);

    // Render sidebar navigation
    renderSettingsSidebar();

    console.log("Settings modal created");
  }

  /**
   * Render the settings sidebar navigation
   */
  function renderSettingsSidebar() {
    const sidebar = document.getElementById("settings-sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = "";

    // Create navigation items
    settingsSections.forEach((config, sectionId) => {
      const navItem = document.createElement("div");
      navItem.className = `settings-nav-item ${sectionId === currentSection ? "active" : ""}`;
      navItem.dataset.section = sectionId;

      const icon = document.createElement("span");
      icon.className = "settings-nav-icon";
      icon.textContent = config.icon;

      const label = document.createElement("span");
      label.className = "settings-nav-label";
      label.textContent = config.title;

      const description = document.createElement("span");
      description.className = "settings-nav-description";
      description.textContent = config.description;

      navItem.appendChild(icon);
      navItem.appendChild(label);
      navItem.appendChild(description);

      navItem.addEventListener("click", () => {
        switchToSection(sectionId);
      });

      sidebar.appendChild(navItem);
    });
  }

  /**
   * Switch to a different settings section
   */
  function switchToSection(sectionId) {
    if (!settingsSections.has(sectionId)) {
      console.error(`Settings section "${sectionId}" not found`);
      return;
    }

    currentSection = sectionId;

    // Update sidebar navigation
    const navItems = document.querySelectorAll(".settings-nav-item");
    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.section === sectionId);
    });

    // Render the section content
    renderCurrentSection();
  }

  /**
   * Render the current section content
   */
  function renderCurrentSection() {
    const contentArea = document.getElementById("settings-content");
    if (!contentArea) return;

    const sectionConfig = settingsSections.get(currentSection);
    if (!sectionConfig) {
      contentArea.innerHTML =
        '<div class="settings-error">Section not found</div>';
      return;
    }

    // Clear content area
    contentArea.innerHTML = "";

    // Add section header
    const sectionHeader = document.createElement("div");
    sectionHeader.className = "settings-section-header";

    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "settings-section-title";
    sectionTitle.innerHTML = `${sectionConfig.icon} ${sectionConfig.title}`;

    const sectionDescription = document.createElement("p");
    sectionDescription.className = "settings-section-description";
    sectionDescription.textContent = sectionConfig.description;

    sectionHeader.appendChild(sectionTitle);
    sectionHeader.appendChild(sectionDescription);
    contentArea.appendChild(sectionHeader);

    // Render section content
    if (sectionConfig.render && typeof sectionConfig.render === "function") {
      const sectionContent = document.createElement("div");
      sectionContent.className = "settings-section-content";
      contentArea.appendChild(sectionContent);

      try {
        sectionConfig.render(sectionContent);
      } catch (error) {
        console.error(`Error rendering section "${currentSection}":`, error);
        sectionContent.innerHTML =
          '<div class="settings-error">Error loading section content</div>';
      }
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "settings-placeholder";
      placeholder.textContent = "This section is not yet implemented.";
      contentArea.appendChild(placeholder);
    }
  }

  /**
   * Save the current section settings
   */
  function saveCurrentSection() {
    const sectionConfig = settingsSections.get(currentSection);
    if (
      sectionConfig &&
      sectionConfig.onSave &&
      typeof sectionConfig.onSave === "function"
    ) {
      try {
        sectionConfig.onSave();
        console.log(`Settings saved for section: ${currentSection}`);

        // Show success feedback
        showSaveSuccess();
      } catch (error) {
        console.error(`Error saving section "${currentSection}":`, error);
        showSaveError(error.message);
      }
    }
  }

  /**
   * Show save success feedback
   */
  function showSaveSuccess() {
    const saveButton = document.querySelector(".settings-save-btn");
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = "✓ Saved!";
      saveButton.classList.add("success");

      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.classList.remove("success");
      }, 2000);
    }
  }

  /**
   * Show save error feedback
   */
  function showSaveError(message) {
    const saveButton = document.querySelector(".settings-save-btn");
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = "✗ Error";
      saveButton.classList.add("error");

      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.classList.remove("error");
      }, 3000);
    }

    // Also show error message
    alert(`Error saving settings: ${message}`);
  }

  /**
   * Render general section content (includes language settings)
   */
  function renderGeneralSection(container) {
    const generalContent = document.createElement("div");
    generalContent.className = "general-settings-content";

    // Language Settings
    const languageSection = document.createElement("div");
    languageSection.className = "settings-subsection";
    languageSection.innerHTML = `
            <h4 class="settings-subsection-title">🌐 Language Settings</h4>
            <div class="settings-row">
                <label class="settings-label">Interface Language:</label>
                <div class="settings-control">
                    <select id="language-select" class="settings-select">
                        <option value="en">English</option>
                        <option value="zh">中文 (Chinese)</option>
                    </select>
                </div>
            </div>
            <div class="settings-row">
                <div class="settings-description">
                    Choose the language for the application interface. This will update all menus, buttons, and messages.
                </div>
            </div>
        `;

    // Auto-save Settings
    const autoSaveSection = document.createElement("div");
    autoSaveSection.className = "settings-subsection";
    autoSaveSection.innerHTML = `
            <h4 class="settings-subsection-title">💾 Auto-save Settings</h4>
            <div class="settings-row">
                <label class="settings-label">
                    <input type="checkbox" id="auto-save-enabled" class="settings-checkbox">
                    Enable auto-save
                </label>
            </div>
            <div class="settings-row">
                <label class="settings-label">Auto-save interval (seconds):</label>
                <div class="settings-control">
                    <input type="number" id="auto-save-interval" class="settings-input" min="10" max="300" value="30">
                </div>
            </div>
        `;

    // Performance Settings
    const performanceSection = document.createElement("div");
    performanceSection.className = "settings-subsection";
    performanceSection.innerHTML = `
            <h4 class="settings-subsection-title">⚡ Performance Settings</h4>
            <div class="settings-row">
                <label class="settings-label">
                    <input type="checkbox" id="lazy-loading-enabled" class="settings-checkbox">
                    Enable lazy loading for large node trees
                </label>
            </div>
            <div class="settings-row">
                <label class="settings-label">
                    <input type="checkbox" id="animations-enabled" class="settings-checkbox">
                    Enable animations
                </label>
            </div>
        `;

    generalContent.appendChild(languageSection);
    generalContent.appendChild(autoSaveSection);
    generalContent.appendChild(performanceSection);
    container.appendChild(generalContent);

    // Set current values
    setCurrentGeneralSettings();

    // Add event listeners
    setupGeneralSettingsListeners();
  }

  /**
   * Set current general settings values
   */
  function setCurrentGeneralSettings() {
    // Set current language
    const languageSelect = document.getElementById("language-select");
    if (languageSelect && window.I18n) {
      languageSelect.value = I18n.getCurrentLanguage();
    }

    // Set auto-save settings (from localStorage or defaults)
    const autoSaveEnabled = document.getElementById("auto-save-enabled");
    const autoSaveInterval = document.getElementById("auto-save-interval");

    if (autoSaveEnabled) {
      autoSaveEnabled.checked =
        localStorage.getItem("autoSaveEnabled") !== "false";
    }

    if (autoSaveInterval) {
      autoSaveInterval.value = localStorage.getItem("autoSaveInterval") || "30";
    }

    // Set performance settings
    const lazyLoadingEnabled = document.getElementById("lazy-loading-enabled");
    const animationsEnabled = document.getElementById("animations-enabled");

    if (lazyLoadingEnabled) {
      lazyLoadingEnabled.checked =
        localStorage.getItem("lazyLoadingEnabled") !== "false";
    }

    if (animationsEnabled) {
      animationsEnabled.checked =
        localStorage.getItem("animationsEnabled") !== "false";
    }
  }

  /**
   * Setup event listeners for general settings
   */
  function setupGeneralSettingsListeners() {
    // Language change listener
    const languageSelect = document.getElementById("language-select");
    if (languageSelect) {
      languageSelect.addEventListener("change", function () {
        const newLanguage = this.value;
        const currentLanguage = window.I18n ? I18n.getCurrentLanguage() : "en";

        if (newLanguage !== currentLanguage && window.I18n) {
          // Show confirmation dialog
          if (confirm("Change language? This will refresh the interface.")) {
            I18n.toggleLanguage();

            // Update the select value after language change
            setTimeout(() => {
              this.value = I18n.getCurrentLanguage();
            }, 100);
          } else {
            // Revert the select value
            this.value = currentLanguage;
          }
        }
      });
    }
  }

  /**
   * Save general settings
   */
  function saveGeneralSettings() {
    // Save auto-save settings
    const autoSaveEnabled = document.getElementById("auto-save-enabled");
    const autoSaveInterval = document.getElementById("auto-save-interval");

    if (autoSaveEnabled) {
      localStorage.setItem("autoSaveEnabled", autoSaveEnabled.checked);
    }

    if (autoSaveInterval) {
      localStorage.setItem("autoSaveInterval", autoSaveInterval.value);
    }

    // Save performance settings
    const lazyLoadingEnabled = document.getElementById("lazy-loading-enabled");
    const animationsEnabled = document.getElementById("animations-enabled");

    if (lazyLoadingEnabled) {
      localStorage.setItem("lazyLoadingEnabled", lazyLoadingEnabled.checked);
    }

    if (animationsEnabled) {
      localStorage.setItem("animationsEnabled", animationsEnabled.checked);
    }

    console.log("General settings saved");
  }

  /**
   * Render plugins section content
   */
  function renderPluginsSection(container) {
    if (!window.PluginManager) {
      container.innerHTML =
        '<div class="settings-error">PluginManager not available</div>';
      return;
    }

    // Get the plugin list content from PluginManager
    const pluginListContainer = document.createElement("div");
    pluginListContainer.className = "plugins-section-content";

    // Use PluginManager's populatePluginList method
    if (PluginManager.populatePluginList) {
      PluginManager.populatePluginList(pluginListContainer);
    } else {
      // Fallback: create a basic plugin list
      pluginListContainer.innerHTML =
        '<div class="settings-info">Plugin management will be integrated here</div>';
    }

    container.appendChild(pluginListContainer);
  }

  /**
   * Render appearance section content
   */
  function renderAppearanceSection(container) {
    if (!window.StyleSettingsManager) {
      container.innerHTML =
        '<div class="settings-error">StyleSettingsManager not available</div>';
      return;
    }

    // Use StyleSettingsManager's renderAppearanceSettings method
    if (StyleSettingsManager.renderAppearanceSettings) {
      StyleSettingsManager.renderAppearanceSettings(container);
    } else {
      container.innerHTML =
        '<div class="settings-info">Appearance settings will be integrated here</div>';
    }
  }

  /**
   * Save appearance settings
   */
  function saveAppearanceSettings() {
    if (
      window.StyleSettingsManager &&
      StyleSettingsManager.saveAppearanceSettings
    ) {
      StyleSettingsManager.saveAppearanceSettings();
    }
  }

  /**
   * Render fonts section content
   */
  function renderFontsSection(container) {
    if (!window.BasicFontSettings) {
      container.innerHTML =
        '<div class="settings-error">Font settings not available</div>';
      return;
    }

    // Use BasicFontSettings to render font settings
    BasicFontSettings.renderFontSettings(container);
  }

  /**
   * Save font settings
   */
  function saveFontSettings() {
    if (window.BasicFontSettings) {
      // BasicFontSettings applies immediately when settings are changed
      const applyButton = document.querySelector('#apply-font-settings');
      if (applyButton) {
        applyButton.click();
      }
    }
  }

  // Public API
  return {
    initialize,
    registerSection,
    openSettingsModal,
    closeSettingsModal,
    switchToSection,
  };
})();

// Make it available globally
window.SettingsManager = SettingsManager;

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready, initializing SettingsManager");
  SettingsManager.initialize();
});

// Also initialize immediately if DOM is already loaded
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  console.log("DOM already ready, initializing SettingsManager immediately");
  SettingsManager.initialize();
}
