// DragDropManager - Handles node drag and drop functionality
(function() {
  // Create the DragDropManager object
  const DragDropManager = {
    // Private variables
    currentLanguage: localStorage.getItem('preferredLanguage') || 'en',
    draggedNodeId: null,
    isInitialized: false,
    dragStartHandler: null,
    dragEndHandler: null,
    dragOverHandler: null,
    dragLeaveHandler: null,
    dropHandler: null,
    observerActive: false,
    
    // Initialize the manager
    initialize: function() {
      if (this.isInitialized) {
        console.log('DragDropManager already initialized, skipping');
        return this;
      }
      
      console.log('DragDropManager initializing...');
      this.currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
      
      // Create bound event handlers that we can reference for removal
      this.createBoundEventHandlers();
      
      // Set up drag and drop with a slight delay to ensure DOM is ready
      setTimeout(() => this.setupDragAndDrop(), 100);
      
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
        self.draggedNodeId = null;
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
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: self.draggedNodeId,
                newParentId: targetNode.parent_id,
                newPosition: targetNode.position
              })
            });
          } else if (y > rect.height * 2 / 3) {
            // Drop below
            console.log(`Dropping node ${self.draggedNodeId} below node ${targetNodeId}`);
            const targetNode = await (await fetch(`/api/nodes/${targetNodeId}`)).json();
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: self.draggedNodeId,
                newParentId: targetNode.parent_id,
                newPosition: targetNode.position + 1
              })
            });
          } else {
            // Drop as child
            console.log(`Dropping node ${self.draggedNodeId} as child of node ${targetNodeId}`);
            const children = await self.fetchChildren(targetNodeId);
            const maxPosition = children.length > 0 ? Math.max(...children.map(n => n.position)) + 1 : 0;
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: self.draggedNodeId,
                newParentId: targetNodeId,
                newPosition: maxPosition
              })
            });
            
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
            window.fetchNodes(true);
          }
        } catch (error) {
          console.error('Error reordering nodes:', error);
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
    }
  };
  
  // Make it available globally
  window.DragDropManager = DragDropManager;
  
  // Auto-initialize when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing DragDropManager');
    DragDropManager.initialize();
  });
  
  // Also initialize immediately if the DOM is already loaded
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('DOM already ready, initializing DragDropManager immediately');
    DragDropManager.initialize();
  }
})();

// Add a console message to confirm the script loaded
console.log('DragDropManager script loaded'); 