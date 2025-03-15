/**
 * TimestampManager - Module for displaying node creation and update timestamps
 */
const TimestampManager = (function() {
    // Module state
    let currentLanguage = 'en';
    
    // DOM elements
    let timestampModal = null;
    let modalOverlay = null;
    
    // Initialize the module
    function initialize() {
      console.log('TimestampManager initialized');
      createModal();
    }
    
    // Update language
    function updateLanguage(language) {
      currentLanguage = language;
      updateModalText();
    }
    
    // Create the timestamp modal
    function createModal() {
      // Create modal overlay if it doesn't exist
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'none';
        document.body.appendChild(modalOverlay);
        
        // Close modal when clicking outside
        modalOverlay.addEventListener('click', function(e) {
          if (e.target === modalOverlay) {
            closeModal();
          }
        });
      }
      
      // Create modal if it doesn't exist
      if (!timestampModal) {
        timestampModal = document.createElement('div');
        timestampModal.className = 'modal timestamp-modal';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.id = 'timestamp-modal-title';
        modalTitle.textContent = currentLanguage === 'en' ? 'Node Timestamps' : '节点时间戳';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', closeModal);
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        const timestampInfo = document.createElement('div');
        timestampInfo.className = 'timestamp-info';
        
        // Created timestamp
        const createdSection = document.createElement('div');
        createdSection.className = 'timestamp-section';
        
        const createdLabel = document.createElement('h3');
        createdLabel.id = 'created-label';
        createdLabel.textContent = currentLanguage === 'en' ? 'Created:' : '创建时间:';
        
        const createdTime = document.createElement('p');
        createdTime.id = 'created-time';
        createdTime.className = 'timestamp';
        
        createdSection.appendChild(createdLabel);
        createdSection.appendChild(createdTime);
        
        // Updated timestamp
        const updatedSection = document.createElement('div');
        updatedSection.className = 'timestamp-section';
        
        const updatedLabel = document.createElement('h3');
        updatedLabel.id = 'updated-label';
        updatedLabel.textContent = currentLanguage === 'en' ? 'Last Updated:' : '最后更新:';
        
        const updatedTime = document.createElement('p');
        updatedTime.id = 'updated-time';
        updatedTime.className = 'timestamp';
        
        updatedSection.appendChild(updatedLabel);
        updatedSection.appendChild(updatedTime);
        
        timestampInfo.appendChild(createdSection);
        timestampInfo.appendChild(updatedSection);
        modalBody.appendChild(timestampInfo);
        
        // Assemble modal
        timestampModal.appendChild(modalHeader);
        timestampModal.appendChild(modalBody);
        
        modalOverlay.appendChild(timestampModal);
      }
    }
    
    // Update modal text based on language
    function updateModalText() {
      document.getElementById('timestamp-modal-title').textContent = 
        currentLanguage === 'en' ? 'Node Timestamps' : '节点时间戳';
      document.getElementById('created-label').textContent = 
        currentLanguage === 'en' ? 'Created:' : '创建时间:';
      document.getElementById('updated-label').textContent = 
        currentLanguage === 'en' ? 'Last Updated:' : '最后更新:';
    }
    
    // Format timestamp to readable date/time
    function formatTimestamp(timestamp) {
      if (!timestamp) return 'N/A';
      
      const date = new Date(timestamp);
      
      // Format: YYYY-MM-DD HH:MM:SS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    // Open the timestamp modal for a specific node
    async function openModal(nodeId) {
      try {
        // Fetch node data
        const response = await fetch(`/api/nodes/${nodeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch node data');
        }
        
        const node = await response.json();
        
        // Update modal with timestamp information
        document.getElementById('created-time').textContent = formatTimestamp(node.created_at);
        document.getElementById('updated-time').textContent = formatTimestamp(node.updated_at);
        
        // Show the modal
        modalOverlay.style.display = 'flex';
      } catch (error) {
        console.error('Error opening timestamp modal:', error);
      }
    }
    
    // Close the timestamp modal
    function closeModal() {
      modalOverlay.style.display = 'none';
    }
    
    // Add timestamp button to node actions
    function addTimestampButtonToNode(nodeElement, nodeId) {
      const nodeActions = nodeElement.querySelector('.node-actions');
      if (nodeActions) {
        const timestampButton = document.createElement('button');
        timestampButton.className = 'timestamp-button';
        timestampButton.innerHTML = '🕒';
        timestampButton.title = currentLanguage === 'en' ? 'View timestamps' : '查看时间戳';
        timestampButton.addEventListener('click', () => openModal(nodeId));
        
        // Insert the timestamp button after the position button
        const positionButton = nodeActions.querySelector('.position-button');
        if (positionButton) {
          nodeActions.insertBefore(timestampButton, positionButton.nextSibling);
        } else {
          nodeActions.appendChild(timestampButton);
        }
      }
    }
    
    // Public API
    return {
      initialize,
      updateLanguage,
      openModal,
      addTimestampButtonToNode
    };
  })();
  
  // Make the module available globally
  window.TimestampManager = TimestampManager;