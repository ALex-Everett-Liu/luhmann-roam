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
      
      console.log('NodeSizeManager initialized successfully');
      isInitialized = true;
    }
    
    // Helper function to update local node data (similar to app.js)
    function updateLocalNodeData(nodeId, updateData) {
      // Update in the global nodes array if it exists
      if (window.nodes && Array.isArray(window.nodes)) {
        for (let i = 0; i < window.nodes.length; i++) {
          if (window.nodes[i].id === nodeId) {
            if (updateData.node_size !== undefined) {
              window.nodes[i].node_size = updateData.node_size;
            }
            console.log(`Updated local data for top-level node ${nodeId} with size ${updateData.node_size}`);
            return;
          }
        }
      }
      
      // If not found at top level, it might be a child node
      console.log(`Node ${nodeId} not found in top-level nodes, may be a child node`);
    }
    
    // Open modal to adjust node size
    function openNodeSizeModal(nodeId) {
      console.log('Opening node size modal for node:', nodeId);
      
      return new Promise(async (resolve) => {
        try {
          // Fetch the current node to get its current size
          console.log('Fetching node data...');
          const response = await fetch(`/api/nodes/${nodeId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch node: ${response.status} ${response.statusText}`);
          }
          
          const node = await response.json();
          console.log('Node data received:', node);
          console.log('Current node size:', node.node_size);
          
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
          description.textContent = 'Adjust the size of this node for visualizations and other features.';
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
          
          // Add a direct input box for the size value
          const sizeInput = document.createElement('input');
          sizeInput.type = 'number';
          sizeInput.id = 'node-size-input-text';
          sizeInput.min = 1;
          sizeInput.max = 100;
          sizeInput.value = node.node_size || 20;
          sizeInput.style.width = '50px';
          sizeInput.style.marginLeft = '10px';
          
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
          
          // Synchronize the slider and the text input
          sizeSlider.addEventListener('input', () => {
            sizeValue.textContent = sizeSlider.value;
            sizeInput.value = sizeSlider.value;
            previewDot.style.width = `${sizeSlider.value}px`;
            previewDot.style.height = `${sizeSlider.value}px`;
          });
          
          // Also update when direct input changes
          sizeInput.addEventListener('input', () => {
            const value = Math.min(100, Math.max(1, parseInt(sizeInput.value) || 20));
            sizeInput.value = value;
            sizeSlider.value = value;
            sizeValue.textContent = value;
            previewDot.style.width = `${value}px`;
            previewDot.style.height = `${value}px`;
          });
          
          sizeContainer.appendChild(sizeLabel);
          sizeContainer.appendChild(sizeSlider);
          sizeContainer.appendChild(sizeValue);
          sizeContainer.appendChild(sizeInput);
          
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
              console.log('Save button clicked');
              // Use the direct input value for more reliability
              const newSize = parseInt(sizeInput.value);
              console.log('About to save new node size:', newSize);
              
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
                console.error('Response not OK:', updateResponse.status, updateResponse.statusText);
                const responseText = await updateResponse.text();
                console.error('Response body:', responseText);
                throw new Error(`Failed to update node size: ${updateResponse.status} ${updateResponse.statusText}`);
              }
              
              const updatedNode = await updateResponse.json();
              console.log('Node updated successfully:', updatedNode);
              
              closeModal();
              
              // Update local node data only - no visualization refreshes
              updateLocalNodeData(nodeId, { node_size: newSize });
              
              // Show success notification
              showSuccessNotification(`Node size updated to ${newSize}`);
              
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
          alert(`Error opening size modal: ${error.message}`);
          resolve(false);
        }
      });
    }
    
    // Helper function to show success notification (similar to content copying)
    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'node-size-notification';
      notification.textContent = message;
      
      // Style the notification
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
      notification.style.padding = '12px 20px';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      notification.style.zIndex = '10000';
      notification.style.fontSize = '14px';
      notification.style.fontWeight = 'bold';
      
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
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
        
        // Update all local node data to default size
        if (window.nodes && Array.isArray(window.nodes)) {
          window.nodes.forEach(node => {
            node.node_size = 20; // Reset to default
          });
          console.log('Updated all local node sizes to default (20)');
        }
        
        // Show success notification
        showSuccessNotification('All node sizes reset to default (20)');
        
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

  // Add this to make sure it's properly loaded
  console.log('NodeSizeManager script loaded and registered on window object');