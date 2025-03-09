/**
 * Markdown Manager Module
 * Handles all markdown-related functionality for nodes
 */
const MarkdownManager = (function() {
  // Private variables
  let modalElement = null;
  let currentNodeId = null;
  
  /**
   * Creates the markdown modal if it doesn't exist
   * @returns {HTMLElement} The modal element
   */
  function createModal() {
    if (document.getElementById('markdown-modal')) {
      return document.getElementById('markdown-modal');
    }
    
    const modalHTML = `
      <div id="markdown-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Edit Markdown Content</h3>
            <button class="modal-close" id="close-markdown-modal">&times;</button>
          </div>
          <div class="modal-body">
            <textarea id="markdown-editor" class="markdown-editor" placeholder="Enter markdown content..."></textarea>
          </div>
          <div class="modal-footer">
            <button id="delete-markdown" class="btn btn-danger">Delete Markdown</button>
            <button id="save-markdown" class="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('markdown-modal');
    
    // Set up event listeners
    document.getElementById('close-markdown-modal').addEventListener('click', closeModal);
    document.getElementById('save-markdown').addEventListener('click', saveMarkdown);
    document.getElementById('delete-markdown').addEventListener('click', deleteMarkdown);
    
    return modal;
  }
  
  /**
   * Opens the markdown modal for a specific node
   * @param {string} nodeId - The ID of the node
   */
  async function openMarkdownModal(nodeId) {
    currentNodeId = nodeId;
    modalElement = createModal();
    
    try {
      const response = await fetch(`/api/nodes/${nodeId}/markdown`);
      const data = await response.json();
      
      document.getElementById('markdown-editor').value = data.content || '';
      modalElement.style.display = 'flex';
    } catch (error) {
      console.error('Error fetching markdown:', error);
      alert('Failed to load markdown content');
    }
  }
  
  /**
   * Closes the markdown modal
   */
  function closeModal() {
    if (modalElement) {
      modalElement.style.display = 'none';
      currentNodeId = null;
    }
  }
  
  /**
   * Saves the markdown content for the current node
   */
  async function saveMarkdown() {
    if (!currentNodeId) return;
    
    const content = document.getElementById('markdown-editor').value;
    
    try {
      const response = await fetch(`/api/nodes/${currentNodeId}/markdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      // Check if the response is ok or if we need to verify the save another way
      if (response.ok) {
        console.log('Markdown saved successfully via API response');
        updateUIAfterSave(content);
      } else {
        console.warn(`Server returned ${response.status} when saving markdown, checking if content was saved anyway...`);
        
        // Verify if the content was saved despite the error
        try {
          const verifyResponse = await fetch(`/api/nodes/${currentNodeId}/markdown`);
          const savedData = await verifyResponse.json();
          
          if (savedData.content === content) {
            console.log('Markdown was saved successfully despite error response');
            updateUIAfterSave(content);
          } else {
            console.error('Markdown verification failed, content was not saved');
            alert('Failed to save markdown content');
          }
        } catch (verifyError) {
          console.error('Error verifying markdown save:', verifyError);
          alert('Failed to save markdown content');
        }
      }
    } catch (error) {
      console.error('Error saving markdown:', error);
      alert('Failed to save markdown content');
    }
  }
  
  /**
   * Updates the UI after a successful save
   * @param {string} content - The saved content
   */
  function updateUIAfterSave(content) {
    // Update the node's visual indicator
    const nodeElement = document.querySelector(`[data-id="${currentNodeId}"]`);
    if (nodeElement) {
      const nodeText = nodeElement.querySelector('.node-text');
      if (content.trim()) {
        nodeText.classList.add('has-markdown');
      } else {
        nodeText.classList.remove('has-markdown');
      }
    }
    
    // Refresh the main UI to reflect changes
    if (window.fetchNodes) {
      window.fetchNodes();
    }
    
    closeModal();
  }
  
  /**
   * Deletes the markdown content for the current node
   */
  async function deleteMarkdown() {
    if (!currentNodeId || !confirm('Are you sure you want to delete this markdown content?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/nodes/${currentNodeId}/markdown`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Update the node's visual indicator
        const nodeElement = document.querySelector(`[data-id="${currentNodeId}"]`);
        if (nodeElement) {
          const nodeText = nodeElement.querySelector('.node-text');
          nodeText.classList.remove('has-markdown');
        }
        
        document.getElementById('markdown-editor').value = '';
        closeModal();
      } else {
        alert('Failed to delete markdown content');
      }
    } catch (error) {
      console.error('Error deleting markdown:', error);
      alert('Failed to delete markdown content');
    }
  }
  
  /**
   * Updates the visual indicator for a node with markdown content
   * @param {string} nodeId - The ID of the node
   * @param {boolean} hasMarkdown - Whether the node has markdown content
   */
  function updateMarkdownIndicator(nodeId, hasMarkdown) {
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeElement) {
      const nodeText = nodeElement.querySelector('.node-text');
      if (hasMarkdown) {
        nodeText.classList.add('has-markdown');
      } else {
        nodeText.classList.remove('has-markdown');
      }
    }
  }
  
  // Public API
  return {
    openModal: openMarkdownModal,
    closeModal: closeModal,
    updateIndicator: updateMarkdownIndicator
  };
})();

// Export the module for use in other files
window.MarkdownManager = MarkdownManager; 