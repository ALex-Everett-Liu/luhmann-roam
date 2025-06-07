// DragDropManager - Handles node drag and drop functionality
(function() {
  // Create the DragDropManager object
  const DragDropManager = {
    // Private variables
    currentLanguage: 'en',
    draggedNodeId: null,
    isInitialized: false,
    dragStartHandler: null,
    dragEndHandler: null,
    dragOverHandler: null,
    dragLeaveHandler: null,
    dropHandler: null,
    observerActive: false,
    enabled: true,
    
    // Initialize the manager
    initialize: function() {
      if (this.isInitialized) {
        console.log('DragDropManager already initialized, skipping');
        return this;
      }
      
      console.log('DragDropManager initializing...');
      
      // Get the initial language setting from I18n if available
      if (window.I18n) {
        this.currentLanguage = I18n.getCurrentLanguage();
      } else {
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
      }
      
      // Check if there's a saved preference for drag-drop state
      const savedEnabledState = localStorage.getItem('dragDropEnabled');
      if (savedEnabledState !== null) {
        this.enabled = savedEnabledState === 'true';
        console.log(`DragDropManager enabled state loaded from storage: ${this.enabled}`);
      }
      
      // Create bound event handlers that we can reference for removal
      this.createBoundEventHandlers();
      
      // Only set up drag and drop if enabled
      if (this.enabled) {
        setTimeout(() => this.setupDragAndDrop(), 100);
      } else {
        console.log('DragDropManager initialized in disabled state');
      }
      
      this.isInitialized = true;
      console.log('DragDropManager initialization complete');
      return this;
    },
    
    // Create bound event handlers that we can reference for removal
    createBoundEventHandlers: function() {
      const self = this;
      
      this.dragStartHandler = function(e) {
        // Get the node ID from the dataset
        self.draggedNodeId = this.dataset.id;
        console.log(`Drag started for node ${self.draggedNodeId}`);
        
        // Set the data transfer
        try {
          e.dataTransfer.setData('text/plain', self.draggedNodeId);
          e.dataTransfer.effectAllowed = 'move';
          
          // Add a delay to prevent the dragged element from disappearing immediately
          setTimeout(() => {
            this.parentElement.parentElement.style.opacity = '0.4';
          }, 0);
        } catch (error) {
          console.error('Error in drag start:', error);
        }
      };
      
      this.dragEndHandler = function() {
        console.log(`Drag ended for node ${self.draggedNodeId}`);
        this.parentElement.parentElement.style.opacity = '1';
        // Don't reset draggedNodeId here, as it might be needed in the drop handler
        // self.draggedNodeId = null;
      };
      
      this.dragOverHandler = function(e) {
        // This is critical - must prevent default to allow drop
        e.preventDefault();
        
        // Set the drop effect
        e.dataTransfer.dropEffect = 'move';
        
        const rect = this.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        // Clear all previous visual indicators
        this.style.borderTop = '';
        this.style.borderBottom = '';
        this.style.backgroundColor = '';
        
        if (y < rect.height / 3) {
          // Drop above
          this.style.borderTop = '2px solid #4285f4';
        } else if (y > rect.height * 2 / 3) {
          // Drop below
          this.style.borderBottom = '2px solid #4285f4';
        } else {
          // Drop as child
          this.style.backgroundColor = '#e8f0fe';
        }
      };
      
      this.dragLeaveHandler = function() {
        // Clear visual indicators
        this.style.borderTop = '';
        this.style.borderBottom = '';
        this.style.backgroundColor = '';
      };
      
      this.dropHandler = async function(e) {
        // Prevent default browser behavior
        e.preventDefault();
        e.stopPropagation();
        
        const targetNodeId = this.dataset.id;
        console.log(`Drop event on node ${targetNodeId}`);
        
        // Make sure we have a valid dragged node ID
        if (!self.draggedNodeId) {
          console.error('No dragged node ID found');
          return;
        }
        
        // If dropping onto itself, do nothing
        if (self.draggedNodeId === targetNodeId) {
          console.log('Cannot drop node onto itself');
          return;
        }
        
        // Clear visual indicators
        this.style.borderTop = '';
        this.style.borderBottom = '';
        this.style.backgroundColor = '';
        
        const rect = this.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        try {
          if (y < rect.height / 3) {
            // Drop above
            console.log(`Dropping node ${self.draggedNodeId} above node ${targetNodeId}`);
            const targetNode = await (await fetch(`/api/nodes/${targetNodeId}`)).json();
            
            // Ensure we're sending the correct data format
            const requestData = {
              nodeId: self.draggedNodeId,
              newParentId: targetNode.parent_id,
              newPosition: targetNode.position
            };
            
            console.log('Sending reorder request with data:', requestData);
            
            const response = await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Server error (${response.status}):`, errorText);
              throw new Error(`Server error: ${response.status}`);
            }
            
          } else if (y > rect.height * 2 / 3) {
            // Drop below
            console.log(`Dropping node ${self.draggedNodeId} below node ${targetNodeId}`);
            const targetNode = await (await fetch(`/api/nodes/${targetNodeId}`)).json();
            
            // Ensure we're sending the correct data format
            const requestData = {
              nodeId: self.draggedNodeId,
              newParentId: targetNode.parent_id,
              newPosition: targetNode.position + 1
            };
            
            console.log('Sending reorder request with data:', requestData);
            
            const response = await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Server error (${response.status}):`, errorText);
              throw new Error(`Server error: ${response.status}`);
            }
            
          } else {
            // Drop as child
            console.log(`Dropping node ${self.draggedNodeId} as child of node ${targetNodeId}`);
            const children = await self.fetchChildren(targetNodeId);
            const maxPosition = children.length > 0 ? Math.max(...children.map(n => n.position)) + 1 : 0;
            
            // Ensure we're sending the correct data format
            const requestData = {
              nodeId: self.draggedNodeId,
              newParentId: targetNodeId,
              newPosition: maxPosition
            };
            
            console.log('Sending reorder request with data:', requestData);
            
            const response = await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Server error (${response.status}):`, errorText);
              throw new Error(`Server error: ${response.status}`);
            }
            
            // Ensure the target is expanded
            await fetch(`/api/nodes/${targetNodeId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                is_expanded: true
              })
            });
          }
          
          // Refresh the outliner
          if (window.fetchNodes) {
            console.log('Refreshing nodes after successful reorder');
            window.fetchNodes(true);
          }
        } catch (error) {
          console.error('Error reordering nodes:', error);
          alert(window.I18n ? I18n.t('errorMovingNode') : 'Error moving node. Please try again.');
        } finally {
          // Reset the dragged node ID after the operation is complete
          self.draggedNodeId = null;
        }
      };
    },
    
    // Update language setting
    updateLanguage: function(language) {
      this.currentLanguage = language;
      console.log('DragDropManager language updated to:', this.currentLanguage);
    },
    
    // Remove all drag and drop event listeners
    removeAllEventListeners: function() {
      console.log('Removing all drag and drop event listeners');
      
      // Remove event listeners from drag handles
      const dragHandles = document.querySelectorAll('.drag-handle');
      dragHandles.forEach(handle => {
        if (this.dragStartHandler) handle.removeEventListener('dragstart', this.dragStartHandler);
        if (this.dragEndHandler) handle.removeEventListener('dragend', this.dragEndHandler);
      });
      
      // Remove event listeners from drop targets
      const dropTargets = document.querySelectorAll('.node');
      dropTargets.forEach(target => {
        if (this.dragOverHandler) target.removeEventListener('dragover', this.dragOverHandler);
        if (this.dragLeaveHandler) target.removeEventListener('dragleave', this.dragLeaveHandler);
        if (this.dropHandler) target.removeEventListener('drop', this.dropHandler);
      });
    },
    
    // Set up drag and drop
    setupDragAndDrop: function() {
      // First, remove all existing event listeners to prevent duplicates
      this.removeAllEventListeners();
      
      console.log('Setting up drag and drop handlers');
      const dragHandles = document.querySelectorAll('.drag-handle');
      const dropTargets = document.querySelectorAll('.node');
      
      console.log(`Found ${dragHandles.length} drag handles and ${dropTargets.length} drop targets`);
      
      // Set up drag handles
      dragHandles.forEach(handle => {
        // Explicitly set draggable attribute
        handle.setAttribute('draggable', 'true');
        
        // Make sure the handle has a data-id attribute
        if (!handle.dataset.id) {
          const parentNode = handle.closest('.node');
          if (parentNode && parentNode.dataset.id) {
            handle.dataset.id = parentNode.dataset.id;
          }
        }
        
        // Add event listeners
        handle.addEventListener('dragstart', this.dragStartHandler);
        handle.addEventListener('dragend', this.dragEndHandler);
        
        // Add a visual indicator that this element is draggable
        handle.style.cursor = 'grab';
      });
      
      // Set up drop targets
      dropTargets.forEach(target => {
        // Add event listeners
        target.addEventListener('dragover', this.dragOverHandler);
        target.addEventListener('dragleave', this.dragLeaveHandler);
        target.addEventListener('drop', this.dropHandler);
      });
    },
    
    // Helper function to fetch children for a node
    fetchChildren: async function(nodeId) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/children?lang=${this.currentLanguage}`);
        return await response.json();
      } catch (error) {
        console.error(`Error fetching children for node ${nodeId}:`, error);
        return [];
      }
    },
    
    // Manual trigger for setting up drag and drop (useful for debugging)
    manualSetup: function() {
      console.log('Manually triggering drag and drop setup');
      this.setupDragAndDrop();
      return 'Drag and drop setup triggered manually';
    },
    
    // Reset the manager (useful for debugging)
    reset: function() {
      console.log('Resetting DragDropManager');
      this.removeAllEventListeners();
      this.isInitialized = false;
      this.draggedNodeId = null;
      return 'DragDropManager reset complete';
    },
    
    // Debug the server API (useful for troubleshooting)
    debugServerAPI: async function() {
      try {
        // Test the reorder API with minimal data
        const testData = {
          nodeId: "test-node-id",
          newParentId: null,
          newPosition: 0
        };
        
        console.log('Testing reorder API with data:', testData);
        
        const response = await fetch('/api/nodes/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testData)
        });
        
        const responseText = await response.text();
        
        return {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText
        };
      } catch (error) {
        console.error('Error testing API:', error);
        return {
          error: error.message
        };
      }
    },
    
    // Toggle drag and drop functionality
    toggle: function() {
      this.enabled = !this.enabled;
      console.log(`DragDropManager ${this.enabled ? 'enabled' : 'disabled'}`);
      
      // Save preference to localStorage
      localStorage.setItem('dragDropEnabled', this.enabled);
      
      if (this.enabled) {
        this.setupDragAndDrop();
      } else {
        this.removeAllEventListeners();
      }
      
      // Update the toggle button if it exists
      const toggleButton = document.getElementById('toggle-drag-drop');
      if (toggleButton) {
        toggleButton.textContent = this.enabled ? 'Disable Drag & Drop' : 'Enable Drag & Drop';
        toggleButton.classList.toggle('active', this.enabled);
      }
      
      return this.enabled;
    },
    
    // Get current enabled state
    isEnabled: function() {
      return this.enabled;
    },
    
    cleanup: function() {
      console.log('Cleaning up DragDropManager');
      this.removeAllEventListeners();
      this.isInitialized = false;
      this.draggedNodeId = null;
      localStorage.removeItem('dragDropEnabled');
      
      // Remove toggle button if it exists
      const toggleButton = document.getElementById('toggle-drag-drop');
      if (toggleButton) {
        toggleButton.remove();
      }
      
      return true;
    }
  };
  
  // Make it available globally
  window.DragDropManager = DragDropManager;
  
  // REMOVED: Auto-initialization code
  // Instead, initialization will be handled by PluginAwareInitializer
  
})();

// Add a console message to confirm the script loaded
console.log('DragDropManager script loaded (initialization deferred)'); 