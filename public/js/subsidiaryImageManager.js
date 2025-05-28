/**
 * Subsidiary Image Manager
 * Responsible for managing subsidiary images functionality
 */
const SubsidiaryImageManager = (function() {
    // Utility function to format file size
    function formatFileSize(size) {
      if (!size) return 'Unknown';
      
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
  
    /**
     * Loads subsidiary images for a parent image
     * @param {string} parentId - The parent image ID
     */
    async function loadSubsidiaryImages(parentId) {
      try {
        const response = await fetch(`/api/dcim/${parentId}/subsidiaries`);
        if (!response.ok) {
          throw new Error('Failed to load subsidiary images');
        }
        
        const subsidiaries = await response.json();
        renderSubsidiaryGrid(subsidiaries, parentId);
      } catch (error) {
        console.error('Error loading subsidiary images:', error);
        document.getElementById('dcim-subsidiary-grid').innerHTML = `
          <div class="dcim-empty-state">
            <p>Error loading subsidiary images.</p>
          </div>
        `;
      }
    }
    
    /**
     * Renders the subsidiary image grid
     * @param {Array} images - Array of subsidiary images
     * @param {string} parentId - The parent image ID
     */
    function renderSubsidiaryGrid(images, parentId) {
      const gridContainer = document.getElementById('dcim-subsidiary-grid');
      
      if (!images || images.length === 0) {
        gridContainer.innerHTML = `
          <div class="dcim-empty-state">
            <p>No subsidiary images. Add subsidiary images to enhance this entry.</p>
          </div>
        `;
        return;
      }
      
      // Clear loading indicator and create grid
      gridContainer.innerHTML = '';
      
      images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'dcim-subsidiary-card';
        card.dataset.id = image.id;
        
        card.innerHTML = `
          <img src="${image.thumbnail_path || image.url}" alt="${image.filename}" 
            class="dcim-subsidiary-thumbnail" onerror="this.src='/images/default-thumbnail.jpg'">
          <div class="dcim-subsidiary-info">
            <div class="dcim-subsidiary-title">${image.filename}</div>
            <div class="dcim-subsidiary-actions">
              <button class="btn-small view-subsidiary" data-id="${image.id}">View</button>
              <button class="btn-small promote-subsidiary" data-id="${image.id}">Promote</button>
              <button class="btn-small detach-subsidiary" data-id="${image.id}">Detach</button>
              <button class="btn-small delete-subsidiary" data-id="${image.id}">Delete</button>
            </div>
          </div>
        `;
        
        // Add event listeners
        card.querySelector('.view-subsidiary').addEventListener('click', (e) => {
          e.stopPropagation();
          window.DcimManager.showImageDetail(image.id);
        });
        
        card.querySelector('.promote-subsidiary').addEventListener('click', (e) => {
          e.stopPropagation();
          promoteSubsidiaryImage(image.id, parentId);
        });
        
        card.querySelector('.detach-subsidiary').addEventListener('click', (e) => {
          e.stopPropagation();
          detachSubsidiaryImage(image.id, parentId);
        });
        
        card.querySelector('.delete-subsidiary').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSubsidiaryImage(image.id, parentId);
        });
        
        gridContainer.appendChild(card);
      });
    }
    
    /**
     * Shows the form to add a subsidiary image
     * @param {string} parentId - The parent image ID
     */
    function showAddSubsidiaryForm(parentId) {
      // Create a modal dialog for adding subsidiary images
      const dialogHTML = `
        <div id="subsidiary-dialog" class="modal-overlay" style="display: flex; z-index: 10000;">
          <div class="modal" style="width: 500px; max-width: 95%;">
            <div class="modal-header">
              <h3 class="modal-title">Add Subsidiary Image</h3>
              <button class="modal-close" id="close-subsidiary-dialog">&times;</button>
            </div>
            <div class="modal-body">
              <form id="add-subsidiary-form">
                <div class="dcim-form-group">
                  <label for="subsidiary-file-input">Upload Image File:</label>
                  <input type="file" id="subsidiary-file-input" accept="image/*" class="dcim-input">
                </div>
                <div class="dcim-form-group">
                  <label for="subsidiary-url-input">OR Image URL:</label>
                  <input type="text" id="subsidiary-url-input" placeholder="https://example.com/image.jpg" class="dcim-input">
                </div>
                <div class="dcim-form-group">
                  <label for="subsidiary-file-path-input">OR Local File Path:</label>
                  <input type="text" id="subsidiary-file-path-input" placeholder="/path/to/local/image.jpg" class="dcim-input">
                </div>
                <div class="dcim-form-group">
                  <label>Filename (optional, will use original filename if not provided)</label>
                  <input type="text" id="subsidiary-filename" class="dcim-input">
                </div>
                <div class="dcim-form-group">
                  <div class="dcim-checkbox">
                    <input type="checkbox" id="inherit-metadata" checked>
                    <label for="inherit-metadata">Inherit metadata from parent image (tags, rating, etc.)</label>
                  </div>
                </div>
                <div class="dcim-form-actions">
                  <button type="submit" class="btn btn-primary">Add Subsidiary Image</button>
                  <button type="button" id="cancel-subsidiary" class="btn">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      
      // Add dialog to DOM
      document.body.insertAdjacentHTML('beforeend', dialogHTML);
      
      // Add event listeners
      document.getElementById('close-subsidiary-dialog').addEventListener('click', closeSubsidiaryDialog);
      document.getElementById('cancel-subsidiary').addEventListener('click', closeSubsidiaryDialog);
      
      // Form submission
      document.getElementById('add-subsidiary-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addSubsidiaryImage(parentId);
      });
    }
    
    /**
     * Closes the subsidiary image dialog
     */
    function closeSubsidiaryDialog() {
      const dialog = document.getElementById('subsidiary-dialog');
      if (dialog) {
        dialog.remove();
      }
    }
    
    /**
     * Adds a new subsidiary image
     * @param {string} parentId - The parent image ID
     */
    async function addSubsidiaryImage(parentId) {
      try {
        const fileInput = document.getElementById('subsidiary-file-input');
        const urlInput = document.getElementById('subsidiary-url-input').value.trim();
        const filePathInput = document.getElementById('subsidiary-file-path-input').value.trim();
        const filenameInput = document.getElementById('subsidiary-filename').value.trim();
        const inheritMetadata = document.getElementById('inherit-metadata').checked;
        
        // Validate that at least one source is provided
        if (!fileInput.files.length && !urlInput && !filePathInput) {
          alert('Please provide a file, URL, or local file path');
          return;
        }
        
        // Create FormData for the request
        const formData = new FormData();
        
        // Add file if it exists
        if (fileInput.files.length > 0) {
          formData.append('image', fileInput.files[0]);
          console.log('File appended:', fileInput.files[0].name, fileInput.files[0].size);
        }
        
        // Add URL if provided
        if (urlInput) {
          formData.append('url', urlInput);
          console.log('URL appended:', urlInput);
        }
        
        // Add file path if provided
        if (filePathInput) {
          formData.append('file_path', filePathInput);
          console.log('File path appended:', filePathInput);
        }
        
        // Add parent ID and inherit metadata flag
        formData.append('parent_id', parentId);
        formData.append('inherit_metadata', inheritMetadata);
        console.log('Parent ID:', parentId, 'Inherit metadata:', inheritMetadata);
        
        // Add filename if provided
        if (filenameInput) {
          formData.append('filename', filenameInput);
          console.log('Filename appended:', filenameInput);
        }
        
        // Show loading state
        const addButton = document.querySelector('#add-subsidiary-form button[type="submit"]');
        addButton.textContent = 'Adding...';
        addButton.disabled = true;
        
        console.log('About to send request to /api/dcim/subsidiary');
        
        // Send the request
        const response = await fetch('/api/dcim/subsidiary', {
          method: 'POST',
          body: formData
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          throw new Error(errorData.error || 'Failed to add subsidiary image');
        }
        
        const newImage = await response.json();
        console.log('Subsidiary image added successfully:', newImage);
        
        // Close the dialog
        closeSubsidiaryDialog();
        
        // Refresh the subsidiary images list
        loadSubsidiaryImages(parentId);
        
      } catch (error) {
        console.error('Error adding subsidiary image:', error);
        alert('Failed to add subsidiary image: ' + error.message);
        
        // Reset button state
        const addButton = document.querySelector('#add-subsidiary-form button[type="submit"]');
        if (addButton) {
          addButton.textContent = 'Add Subsidiary Image';
          addButton.disabled = false;
        }
      }
    }
    
    /**
     * Promotes a subsidiary image to become the main image
     * @param {string} subsidiaryId - The subsidiary image ID to promote
     * @param {string} parentId - The current parent image ID
     */
    async function promoteSubsidiaryImage(subsidiaryId, parentId) {
      if (!confirm('Promote this subsidiary image to be the main image? The current main image will become a subsidiary.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/dcim/${subsidiaryId}/promote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ parent_id: parentId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to promote subsidiary image');
        }
        
        // After successful promotion, reload the main image detail view
        window.DcimManager.showImageDetail(subsidiaryId);
        
      } catch (error) {
        console.error('Error promoting subsidiary image:', error);
        alert('Failed to promote subsidiary image: ' + error.message);
      }
    }
    
    /**
     * Detaches a subsidiary image from its parent (makes it independent)
     * @param {string} subsidiaryId - The subsidiary image ID to detach
     * @param {string} parentId - The parent image ID
     */
    async function detachSubsidiaryImage(subsidiaryId, parentId) {
      if (!confirm('Detach this subsidiary image from the group? It will become an independent major image.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/dcim/${subsidiaryId}/detach`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Failed to detach subsidiary image');
        }
        
        // Refresh the subsidiary images list
        loadSubsidiaryImages(parentId);
        
      } catch (error) {
        console.error('Error detaching subsidiary image:', error);
        alert('Failed to detach subsidiary image: ' + error.message);
      }
    }
    
    /**
     * Deletes a subsidiary image completely
     * @param {string} subsidiaryId - The subsidiary image ID to delete
     * @param {string} parentId - The parent image ID
     */
    async function deleteSubsidiaryImage(subsidiaryId, parentId) {
      if (!confirm('Permanently delete this subsidiary image? This action cannot be undone.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/dcim/${subsidiaryId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete subsidiary image');
        }
        
        // Refresh the subsidiary images list
        loadSubsidiaryImages(parentId);
        
      } catch (error) {
        console.error('Error deleting subsidiary image:', error);
        alert('Failed to delete subsidiary image: ' + error.message);
      }
    }
    
    /**
     * Shows a dialog to manage all subsidiary images
     * @param {string} parentId - The parent image ID
     */
    function showManageSubsidiariesDialog(parentId) {
      // Create a modal dialog for managing subsidiary images
      const dialogHTML = `
        <div id="manage-subsidiaries-dialog" class="modal-overlay" style="display: flex; z-index: 10000;">
          <div class="modal" style="width: 700px; max-width: 95%; min-height: 500px;">
            <div class="modal-header">
              <h3 class="modal-title">Manage Subsidiary Images</h3>
              <button class="modal-close" id="close-manage-dialog">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
              <div id="manage-subsidiaries-container">
                <div class="dcim-loading">Loading subsidiary images...</div>
              </div>
            </div>
            <div class="modal-footer" style="padding: 10px; text-align: right;">
              <button id="close-manage-subsidiaries" class="btn">Close</button>
            </div>
          </div>
        </div>
      `;
      
      // Add dialog to DOM
      document.body.insertAdjacentHTML('beforeend', dialogHTML);
      
      // Add event listeners
      document.getElementById('close-manage-dialog').addEventListener('click', closeManageSubsidiariesDialog);
      document.getElementById('close-manage-subsidiaries').addEventListener('click', closeManageSubsidiariesDialog);
      
      // Load subsidiary images
      loadAndDisplaySubsidiaries(parentId);
    }
    
    /**
     * Loads and displays subsidiaries for the management dialog
     * @param {string} parentId - The parent image ID
     */
    async function loadAndDisplaySubsidiaries(parentId) {
      try {
        const response = await fetch(`/api/dcim/${parentId}/subsidiaries`);
        if (!response.ok) {
          throw new Error('Failed to load subsidiary images');
        }
        
        const subsidiaries = await response.json();
        const container = document.getElementById('manage-subsidiaries-container');
        
        if (!subsidiaries || subsidiaries.length === 0) {
          container.innerHTML = `
            <div class="dcim-empty-state">
              <p>No subsidiary images found.</p>
            </div>
          `;
          return;
        }
        
        // Create table
        let html = `
          <table class="dcim-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="width: 80px;">Thumbnail</th>
                <th>Filename</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        subsidiaries.forEach(img => {
          html += `
            <tr>
              <td>
                <img src="${img.thumbnail_path || img.url}" alt="${img.filename}" 
                  class="dcim-thumbnail-small" style="width: 60px; height: 60px; object-fit: cover;" 
                  onerror="this.src='/images/default-thumbnail.jpg'">
              </td>
              <td>${img.filename}</td>
              <td>${formatFileSize(img.file_size || 0)}</td>
              <td>
                <button class="btn-small view-subsidiary" data-id="${img.id}">View</button>
                <button class="btn-small promote-subsidiary" data-id="${img.id}">Promote</button>
                <button class="btn-small detach-subsidiary" data-id="${img.id}">Detach</button>
                <button class="btn-small delete-subsidiary" data-id="${img.id}">Delete</button>
              </td>
            </tr>
          `;
        });
        
        html += `
            </tbody>
          </table>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.view-subsidiary').forEach(btn => {
          btn.addEventListener('click', () => {
            closeManageSubsidiariesDialog();
            window.DcimManager.showImageDetail(btn.dataset.id);
          });
        });
        
        container.querySelectorAll('.promote-subsidiary').forEach(btn => {
          btn.addEventListener('click', () => {
            promoteSubsidiaryImage(btn.dataset.id, parentId)
              .then(() => {
                closeManageSubsidiariesDialog();
              });
          });
        });
        
        container.querySelectorAll('.detach-subsidiary').forEach(btn => {
          btn.addEventListener('click', () => {
            detachSubsidiaryImage(btn.dataset.id, parentId)
              .then(() => {
                loadAndDisplaySubsidiaries(parentId);
              });
          });
        });
        
        container.querySelectorAll('.delete-subsidiary').forEach(btn => {
          btn.addEventListener('click', () => {
            deleteSubsidiaryImage(btn.dataset.id, parentId)
              .then(() => {
                loadAndDisplaySubsidiaries(parentId);
              });
          });
        });
        
      } catch (error) {
        console.error('Error loading subsidiary images:', error);
        document.getElementById('manage-subsidiaries-container').innerHTML = `
          <div class="dcim-empty-state">
            <p>Error loading subsidiary images: ${error.message}</p>
          </div>
        `;
      }
    }
    
    /**
     * Closes the manage subsidiaries dialog
     */
    function closeManageSubsidiariesDialog() {
      const dialog = document.getElementById('manage-subsidiaries-dialog');
      if (dialog) {
        dialog.remove();
      }
    }
  
    // Public API
    return {
      loadSubsidiaryImages,
      renderSubsidiaryGrid,
      showAddSubsidiaryForm,
      addSubsidiaryImage,
      promoteSubsidiaryImage,
      detachSubsidiaryImage,
      deleteSubsidiaryImage,
      showManageSubsidiariesDialog,
      loadAndDisplaySubsidiaries,
      closeManageSubsidiariesDialog
    };
  })();