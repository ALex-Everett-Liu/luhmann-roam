// NodeSizeManager - Manages node size adjustments
const NodeSizeManager = (function() {
    // Private variables
    let isInitialized = false;
    
    // Initialize the manager
    function initialize() {
      if (isInitialized) {
        console.log('NodeSizeManager already initialized, skipping');
        return;
      }
      
      console.log('NodeSizeManager initialized');
      isInitialized = true;
    }
    
    // Open modal to adjust node size
    function openNodeSizeModal(nodeId) {
      return new Promise(async (resolve) => {
        try {
          // Fetch the current node to get its current size
          const response = await fetch(`/api/nodes/${nodeId}`);
          const node = await response.json();
          
          // Create modal container
          const modalContainer = document.createElement('div');
          modalContainer.className = 'modal-container';
          modalContainer.style.display = 'flex';
          
          // Create modal content
          const modalContent = document.createElement('div');
          modalContent.className = 'modal-content node-size-modal';
          
          // Add header
          const header = document.createElement('h2');
          header.textContent = 'Adjust Node Size';
          modalContent.appendChild(header);
          
          // Add description
          const description = document.createElement('p');
          description.textContent = 'Adjust the size of this node in the grid visualization.';
          modalContent.appendChild(description);
          
          // Create size input with range slider
          const sizeContainer = document.createElement('div');
          sizeContainer.className = 'size-input-container';
          
          const sizeLabel = document.createElement('label');
          sizeLabel.textContent = 'Node Size: ';
          sizeLabel.htmlFor = 'node-size-input';
          
          const sizeValue = document.createElement('span');
          sizeValue.id = 'node-size-value';
          sizeValue.textContent = node.node_size || 20;
          
          const sizeSlider = document.createElement('input');
          sizeSlider.type = 'range';
          sizeSlider.id = 'node-size-input';
          sizeSlider.min = 1;
          sizeSlider.max = 100;
          sizeSlider.value = node.node_size || 20;
          
          // Add preview of the node size
          const previewContainer = document.createElement('div');
          previewContainer.className = 'node-size-preview';
          previewContainer.style.padding = '20px';
          previewContainer.style.display = 'flex';
          previewContainer.style.justifyContent = 'center';
          previewContainer.style.alignItems = 'center';
          
          const previewDot = document.createElement('div');
          previewDot.className = 'node-size-preview-dot';
          previewDot.style.width = `${sizeSlider.value}px`;
          previewDot.style.height = `${sizeSlider.value}px`;
          previewDot.style.borderRadius = '50%';
          previewDot.style.backgroundColor = '#4285F4';
          previewDot.style.transition = 'all 0.2s';
          
          // Update preview and value display when slider changes
          sizeSlider.addEventListener('input', () => {
            sizeValue.textContent = sizeSlider.value;
            previewDot.style.width = `${sizeSlider.value}px`;
            previewDot.style.height = `${sizeSlider.value}px`;
          });
          
          sizeContainer.appendChild(sizeLabel);
          sizeContainer.appendChild(sizeSlider);
          sizeContainer.appendChild(sizeValue);
          
          previewContainer.appendChild(previewDot);
          
          modalContent.appendChild(sizeContainer);
          modalContent.appendChild(previewContainer);
          
          // Add buttons
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'modal-buttons';
          
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save';
          saveButton.className = 'btn btn-primary';
          saveButton.addEventListener('click', async () => {
            try {
              const newSize = parseInt(sizeSlider.value);
              
              // Update the node size in the database
              const updateResponse = await fetch(`/api/nodes/${nodeId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  node_size: newSize
                })
              });
              
              if (!updateResponse.ok) {
                throw new Error('Failed to update node size');
              }
              
              closeModal();
              
              // Redraw the grid visualization if it's visible
              if (window.NodeGridVisualizer) {
                NodeGridVisualizer.loadAndVisualizeAllNodes();
              }
              
              resolve(true);
            } catch (error) {
              console.error('Error updating node size:', error);
              alert(`Failed to update node size: ${error.message}`);
              resolve(false);
            }
          });
          
          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.className = 'btn btn-secondary';
          cancelButton.addEventListener('click', () => {
            closeModal();
            resolve(false);
          });
          
          buttonsContainer.appendChild(saveButton);
          buttonsContainer.appendChild(cancelButton);
          modalContent.appendChild(buttonsContainer);
          
          // Add modal content to container
          modalContainer.appendChild(modalContent);
          
          // Add modal to document
          document.body.appendChild(modalContainer);
          
          // Function to close modal
          function closeModal() {
            document.body.removeChild(modalContainer);
          }
          
          // Handle clicking outside modal to close it
          modalContainer.addEventListener('click', event => {
            if (event.target === modalContainer) {
              closeModal();
              resolve(false);
            }
          });
        } catch (error) {
          console.error('Error opening node size modal:', error);
          resolve(false);
        }
      });
    }
    
    // Reset all node sizes to default (20)
    async function resetAllNodeSizes() {
      try {
        const response = await fetch('/api/nodes/reset-sizes', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Failed to reset node sizes');
        }
        
        // Redraw the grid visualization if it's visible
        if (window.NodeGridVisualizer) {
          NodeGridVisualizer.loadAndVisualizeAllNodes();
        }
        
        return true;
      } catch (error) {
        console.error('Error resetting node sizes:', error);
        return false;
      }
    }
    
    // Public API
    return {
      initialize,
      openNodeSizeModal,
      resetAllNodeSizes
    };
  })();
  
  // Make it available globally
  window.NodeSizeManager = NodeSizeManager;
  
  // Auto-initialize when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing NodeSizeManager');
    NodeSizeManager.initialize();
  });