/**
 * Tutorial Sample Plugin
 * A more comprehensive example plugin demonstrating advanced features
 * This can serve as a template for future plugin development
 */
(function() {

  /**
   * Plugin definition
   */
  const TutorialPlugin = {
    id: 'tutorial-sample'
  };

  function init() {
    console.log('📚 Tutorial plugin initializing...');

    // Check if PluginSystem is available
    if (!window.PluginSystem) {
      console.warn('PluginSystem not available, skipping tutorial plugin');
      return false;
    }

    // Register the plugin
    window.PluginSystem.register({
      id: TutorialPlugin.id,
      name: 'Tutorial Explorer',
      description: 'Interactive tutorial system with guided tours and tips',
      category: 'learning',
      defaultEnabled: false,
      requireReload: false,

      // Plugin initialization logic
      init: function() {
        console.log('🎯 Tutorial plugin initialized');
        setupTutorials();
        registerTutorialCommands();
        return true;
      },

      // Plugin cleanup logic
      cleanup: function() {
        console.log('🧹 Tutorial plugin cleaning up');
        removeTutorials();
        return true;
      },

      // Plugin-specific functions
      hooks: {
        'node:create': function(data) {
          console.log('Node created:', data.nodeId);
          // Could trigger tutorial tips here
        },
        'settings:loaded': function() {
          console.log('Settings loaded, showing tutorial tips');
        }
      }
    });

    console.log('🚀 Tutorial plugin registered successfully');
    return true;
  }

  /**
   * Tutorial system setup
   */
  function setupTutorials() {
    // Create tutorial UI elements
    const tutorialButton = createTutorialButton();

    if (tutorialButton) {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.appendChild(tutorialButton);
      }
    } else {
      console.warn('Failed to create tutorialButton');
    }

    // Hook into system events
    window.PluginSystem.registerHook('node:create', onNodeCreated);
    window.PluginSystem.registerHook('node:select', onNodeSelected);

    console.log('✅ Tutorial system setup complete');
  }

  /**
   * Create tutorial button
   */
  function createTutorialButton() {
    const button = document.createElement('button');
    button.id = 'tutorial-button';
    button.className = 'feature-toggle';
    button.innerHTML = '🎓 Tutorials';
    button.title = 'Access interactive tutorials and tips';

    button.addEventListener('click', () => {
      showTutorialMenu();
    });

    // Add keyboard shortcut (Alt+T)
    button.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        showTutorialMenu();
      }
    });

    return button;
  }

  /**
   * Register tutorial commands with command palette
   */
  function registerTutorialCommands() {
    // Check if command palette exists
    if (!window.CommandPaletteManager) {
      console.log('CommandPaletteManager not available, tutorials using UI only');
      return;
    }

    // Add tutorial commands
    const tutorialCommands = [
      {
        name: 'Tutorial: Getting Started',
        action: () => {
          showGettingStartedTutorial();
        },
        category: 'Help',
        keywords: ['tutorial', 'getting started', 'beginner', 'guide'],
        description: 'Interactive guide for new users'
      },
      {
        name: 'Tutorial: Keyboard Shortcuts',
        action: () => {
          showKeyboardShortcuts();
        },
        category: 'Help',
        keywords: ['keyboard', 'shortcuts', 'hotkeys', 'commands'],
        description: 'List of available keyboard shortcuts'
      },
      {
        name: 'Tutorial: Plugin System',
        action: () => {
          showPluginSystemTutorial();
        },
        category: 'Help',
        keywords: ['plugin', 'system', 'extensibility', 'development'],
        description: 'How to use and develop plugins'
      },
      {
        name: 'Tutorial: Advanced Features',
        action: () => {
          showAdvancedFeatures();
        },
        category: 'Help',
        keywords: ['advanced', 'features', 'power user', 'tips'],
        description: 'Advanced usage tips and features'
      }
    ];

    // Register each command (assuming command palette has a register method)
    tutorialCommands.forEach(cmd => {
      if (window.addCommand) {
        window.addCommand(cmd);
      } else if (window.CommandPaletteManager.register) {
        window.CommandPaletteManager.register(cmd);
      }
    });

    console.log('✍️ Tutorial commands registered');
  }

  /**
   * Tutorial event handlers
   */
  function onNodeCreated(data) {
    console.log('📝 New node created, tutorial hook triggered');
    // Could show a tooltip or hint here
  }

  function onNodeSelected(data) {
    console.log('📖 Node selected, tutorial hook triggered');
    // Based on how many nodes the user has created, show tips
  }

  /**
   * Tutorial display functions
   */
  function showTutorialMenu() {
    // Create a lightweight tutorial overlay
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 25px;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    menu.innerHTML = `
      <h3 style="margin-top: 0;">🎓 Tutorials Available</h3>
      <p>Choose a topic to learn more about using the application:</p>
      <button class="tutorial-btn" onclick="this.closest('.plugin-tutorial').showGettingStartedTutorial()">
        🚀 Getting Started
      </button>
      <button class="tutorial-btn" onclick="this.closest('.plugin-tutorial').showKeyboardShortcuts()">
        ⌨️ Keyboard Shortcuts
      </button>
      <button class="tutorial-btn" onclick="this.closest('.plugin-tutorial').showPluginSystemTutorial()">
        🔌 Plugin System
      </button>
      <button class="tutorial-btn" onclick="this.closest('.plugin-tutorial').showAdvancedFeatures()">
        ✨ Advanced Features
      </button>
      <button class="close-btn" onclick="document.getElementById('tutorial-overlay').remove()">
        Close
      </button>
    `;

    overlay.appendChild(menu);
    document.body.appendChild(overlay);

    // Add CSS for tutorial buttons
    if (!document.getElementById('tutorial-styles')) {
      const styles = document.createElement('style');
      styles.id = 'tutorial-styles';
      styles.textContent = `
        .tutorial-btn {
          display: block;
          width: 100%;
          padding: 12px;
          margin: 8px 0;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .tutorial-btn:hover {
          background: var(--primary-color-dark);
          transform: translateY(-1px);
        }
        .close-btn {
          margin-top: 15px;
          background: var(--medium-gray);
        }
        .close-btn:hover {
          background: var(--dark-gray);
        }
      `;
      document.head.appendChild(styles);
    }
  }

  /**
   * Tutorial implementations
   */
  function showGettingStartedTutorial() {
    alert('🚀 Getting Started Tutorial\n\n' +
          '1. Click "Add Root Node" to create your first node\n' +
          '2. Press Enter to create child nodes\n' +
          '3. Use Tab/Shift+Tab to indent/outdent nodes\n' +
          '4. Press Ctrl+P to open the command palette\n' +
          '5. Toggle themes in Settings (⚙️)');
  }

  function showKeyboardShortcuts() {
    alert('⌨️ Keyboard Shortcuts\n\n' +
          'Tab/Shift+Tab: Indent/Outdent node\n' +
          'Enter: Create child node\n' +
          'Ctrl+P: Open command palette\n' +
          'Alt+F: Focus on current node\n' +
          'Alt+T/W/S/D: Navigate nodes\n' +
          'Alt+L: View node links\n' +
          'Alt+1-9: Go to bookmarked nodes');
  }

  function showPluginSystemTutorial() {
    alert('🔌 Plugin System\n\n' +
          'The plugin system allows extending functionality:\n\n' +
          '• Go to Settings > Plugins to enable/disable plugins\n' +
          '• Plugins run independently and don\'t affect core features\n' +
          '• Each plugin can add UI, commands, and functionality\n' +
          '• Example: This tutorial system is a plugin itself!');
  }

  function showAdvancedFeatures() {
    alert('✨ Advanced Features\n\n' +
          '• Search nodes with Ctrl+F\n' +
          '• Filter nodes by typing in the filter box\n' +
          '• Switch between English/Chinese content\n' +
          '• Export node trees as JSON\n' +
          '• Set default focus nodes for startup');
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    // Remove button for overlap-up when plugin is disabled
    const button = document.getElementById('tutorial-button');
    if (button) {
      button.remove();
    }

    // Remove any open overlays
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.remove();
    }

    // Remove styles
    const styles = document.getElementById('tutorial-styles');
    if (styles) {
      styles.remove();
    }

    // Remove hooks
    if (window.PluginSystem) {
      // Note: PluginSystem doesn't have a way to unregister hooks in this implementation
      // This could be added as a feature if needed
      console.log('Tutorial hooks would be unregistered here');
    }

    console.log('Tutorial plugin cleanup complete');
  }

  /**
   * Exposed method to remove all tutorials
   */
  function removeTutorials() {
    cleanup();
  }

  // Auto-initialize the tutorial plugin after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // Expose the init function for manual initialization if needed
  window.registerTutorialPlugin = init;

})();