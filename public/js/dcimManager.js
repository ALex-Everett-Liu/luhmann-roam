/**
 * DCIM (Digital Content Image Management) Manager Module
 * Handles image management functionality
 */
const DcimManager = (function() {
    // Private variables
    let modalElement = null;
    let currentImages = [];
    let currentFilters = {};
    
    /**
     * Initialize the manager
     */
    function initialize() {
      // Add DCIM UI link to sidebar if it doesn't exist
      if (!document.getElementById('dcim-link')) {
        const sidebar = document.querySelector('.sidebar');
        const dcimButton = document.createElement('button');
        dcimButton.id = 'dcim-link';
        dcimButton.textContent = 'Image Manager';
        dcimButton.addEventListener('click', openImageManager);
        
        // Insert before backup button if it exists
        const backupButton = document.getElementById('backup-database');
        if (backupButton) {
          sidebar.insertBefore(dcimButton, backupButton);
        } else {
          sidebar.appendChild(dcimButton);
        }
      }
      
      // Add DCIM styles
      addDcimStyles();
      
      console.log('DCIM Manager initialized');
    }
    
    /**
     * Add CSS styles for DCIM components
     */
    function addDcimStyles() {
      if (document.getElementById('dcim-styles')) return;
      
      const styleElement = document.createElement('style');
      styleElement.id = 'dcim-styles';
      styleElement.textContent = `
        .dcim-modal {
          width: 90% !important;
          max-width: 1600px !important;
          max-height: 90vh !important;
        }
        
        .dcim-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 15px;
          height: 100%;
        }
        
        .dcim-sidebar {
          border-right: 1px solid #ddd;
          padding-right: 15px;
        }
        
        .dcim-main {
          overflow: auto;
        }
        
        .dcim-image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          padding: 10px 0;
        }
        
        .dcim-image-card {
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
          transition: transform 0.2s;
          cursor: pointer;
        }
        
        .dcim-image-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .dcim-thumbnail {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
        }
        
        .dcim-image-info {
          padding: 8px;
          font-size: 12px;
        }
        
        .dcim-image-title {
          font-weight: bold;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .dcim-image-meta {
          color: #666;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        
        .dcim-filters {
          margin-bottom: 20px;
        }
        
        .dcim-filter-group {
          margin-bottom: 15px;
        }
        
        .dcim-filter-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .dcim-actions {
          margin-bottom: 20px;
        }
        
        .dcim-detail-view {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .dcim-detail-image {
          max-height: 300px;
          object-fit: contain;
          margin-bottom: 15px;
        }
        
        .dcim-detail-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          overflow: auto;
        }
        
        .dcim-form-group {
          margin-bottom: 10px;
        }
        
        .dcim-rating {
          display: flex;
          gap: 5px;
        }
        
        .dcim-star {
          cursor: pointer;
          font-size: 18px;
          color: #ccc;
        }
        
        .dcim-star.active {
          color: gold;
        }
        
        .dcim-detail-actions {
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .dcim-container {
            grid-template-columns: 1fr;
          }
          
          .dcim-sidebar {
            border-right: none;
            border-bottom: 1px solid #ddd;
            padding-right: 0;
            padding-bottom: 15px;
          }
          
          .dcim-detail-form {
            grid-template-columns: 1fr;
          }
        }
      `;
      
      document.head.appendChild(styleElement);
    }
    
    /**
     * Creates the DCIM modal if it doesn't exist
     * @returns {HTMLElement} The modal element
     */
    function createModal() {
      if (document.getElementById('dcim-modal')) {
        return document.getElementById('dcim-modal');
      }
      
      const modalHTML = `
        <div id="dcim-modal" class="modal-overlay" style="display: none;">
          <div class="modal dcim-modal">
            <div class="modal-header">
              <h3 class="modal-title">Image Manager</h3>
              <button class="modal-close" id="close-dcim-modal">&times;</button>
            </div>
            <div class="modal-body" style="height: calc(90vh - 130px);">
              <div class="dcim-container">
                <div class="dcim-sidebar">
                  <div class="dcim-actions">
                    <button id="dcim-add-image" class="btn btn-primary">Add New Image</button>
                    <button id="dcim-settings" class="btn">Settings</button>
                  </div>
                  <div class="dcim-filters">
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Filter by Rating</div>
                      <select id="filter-rating" class="dcim-select">
                        <option value="">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                        <option value="1">1+ Star</option>
                      </select>
                    </div>
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Search</div>
                      <input type="text" id="dcim-search" placeholder="Search images..." class="dcim-input">
                    </div>
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Tags</div>
                      <div id="dcim-tag-filters">
                        <!-- Tags will be dynamically added here -->
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dcim-main">
                  <div id="dcim-image-grid" class="dcim-image-grid">
                    <!-- Images will be loaded here -->
                  </div>
                  <div id="dcim-detail-view" class="dcim-detail-view" style="display: none;">
                    <!-- Image details will be shown here -->
                  </div>
                  <div id="dcim-add-form" style="display: none;">
                    <!-- Add image form will be shown here -->
                  </div>
                  <div id="dcim-settings-view" style="display: none;">
                    <!-- Settings will be shown here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      const modal = document.getElementById('dcim-modal');
      
      // Set up event listeners
      document.getElementById('close-dcim-modal').addEventListener('click', closeModal);
      document.getElementById('dcim-add-image').addEventListener('click', showAddImageForm);
      document.getElementById('dcim-settings').addEventListener('click', showSettings);
      document.getElementById('filter-rating').addEventListener('change', applyFilters);
      document.getElementById('dcim-search').addEventListener('input', applyFilters);
      
      return modal;
    }
    
    /**
     * Opens the Image Manager modal
     */
    function openImageManager() {
      modalElement = createModal();
      modalElement.style.display = 'flex';
      
      // Load images
      loadImages();
    }
    
    /**
     * Closes the modal
     */
    function closeModal() {
      if (modalElement) {
        modalElement.style.display = 'none';
      }
    }
    
    /**
     * Loads images from the server
     */
    async function loadImages() {
      try {
        const response = await fetch('/api/dcim');
        currentImages = await response.json();
        
        // Populate tag filters
        populateTagFilters(currentImages);
        
        // Render the images
        renderImageGrid(currentImages);
      } catch (error) {
        console.error('Error loading images:', error);
        alert('Failed to load images');
      }
    }
    
    /**
     * Populates tag filters based on available tags
     * @param {Array} images - The array of image objects
     */
    function populateTagFilters(images) {
      const tagsContainer = document.getElementById('dcim-tag-filters');
      const allTags = new Set();
      
      // Collect all unique tags
      images.forEach(img => {
        if (img.tags) {
          img.tags.split(',').forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) allTags.add(trimmedTag);
          });
        }
      });
      
      // Sort tags alphabetically
      const sortedTags = Array.from(allTags).sort();
      
      // Create tag filter checkboxes
      tagsContainer.innerHTML = '';
      
      sortedTags.forEach(tag => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'dcim-tag-filter';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `tag-${tag}`;
        checkbox.value = tag;
        checkbox.addEventListener('change', applyFilters);
        
        const label = document.createElement('label');
        label.htmlFor = `tag-${tag}`;
        label.textContent = tag;
        
        tagDiv.appendChild(checkbox);
        tagDiv.appendChild(label);
        tagsContainer.appendChild(tagDiv);
      });
    }
    
    /**
     * Applies current filters and updates the image grid
     */
    function applyFilters() {
      const ratingFilter = document.getElementById('filter-rating').value;
      const searchFilter = document.getElementById('dcim-search').value.toLowerCase();
      const tagCheckboxes = document.querySelectorAll('#dcim-tag-filters input:checked');
      const selectedTags = Array.from(tagCheckboxes).map(cb => cb.value);
      
      // Store current filters
      currentFilters = {
        rating: ratingFilter,
        search: searchFilter,
        tags: selectedTags
      };
      
      // Filter images
      const filteredImages = currentImages.filter(img => {
        // Rating filter
        if (ratingFilter && (!img.rating || img.rating < parseInt(ratingFilter))) {
          return false;
        }
        
        // Search filter
        if (searchFilter) {
          const searchFields = [
            img.filename,
            img.tags,
            img.person,
            img.location,
            img.type
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchFields.includes(searchFilter)) {
            return false;
          }
        }
        
        // Tag filter
        if (selectedTags.length > 0 && img.tags) {
          const imageTags = img.tags.split(',').map(t => t.trim());
          const hasAllSelectedTags = selectedTags.every(tag => imageTags.includes(tag));
          if (!hasAllSelectedTags) {
            return false;
          }
        }
        
        return true;
      });
      
      // Render filtered images
      renderImageGrid(filteredImages);
    }
    
    /**
     * Renders the image grid with given images
     * @param {Array} images - The array of image objects to render
     */
    function renderImageGrid(images) {
      const gridContainer = document.getElementById('dcim-image-grid');
      
      // Show grid, hide detail view
      gridContainer.style.display = 'grid';
      document.getElementById('dcim-detail-view').style.display = 'none';
      document.getElementById('dcim-add-form').style.display = 'none';
      document.getElementById('dcim-settings-view').style.display = 'none';
      
      // Clear grid and render images
      gridContainer.innerHTML = '';
      
      if (images.length === 0) {
        gridContainer.innerHTML = '<div class="dcim-empty-state">No images found. Add some images to get started.</div>';
        return;
      }
      
      images.forEach(img => {
        const card = document.createElement('div');
        card.className = 'dcim-image-card';
        card.addEventListener('click', () => showImageDetail(img.id));
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'dcim-thumbnail';
        thumbnail.src = img.thumbnail_path || img.url || '/img/placeholder.png';
        thumbnail.alt = img.filename;
        
        const info = document.createElement('div');
        info.className = 'dcim-image-info';
        
        const title = document.createElement('div');
        title.className = 'dcim-image-title';
        title.textContent = img.filename;
        
        const meta = document.createElement('div');
        meta.className = 'dcim-image-meta';
        
        const size = document.createElement('span');
        size.textContent = formatFileSize(img.file_size);
        
        const rating = document.createElement('span');
        rating.textContent = img.rating ? '★'.repeat(img.rating) : '';
        
        meta.appendChild(size);
        meta.appendChild(rating);
        
        info.appendChild(title);
        info.appendChild(meta);
        
        card.appendChild(thumbnail);
        card.appendChild(info);
        
        gridContainer.appendChild(card);
      });
    }
    
    /**
     * Shows the detail view for a specific image
     * @param {string} imageId - The ID of the image to display
     */
    async function showImageDetail(imageId) {
      try {
        const response = await fetch(`/api/dcim/${imageId}`);
        const image = await response.json();
        
        const detailView = document.getElementById('dcim-detail-view');
        
        // Show detail view, hide other views
        document.getElementById('dcim-image-grid').style.display = 'none';
        document.getElementById('dcim-add-form').style.display = 'none';
        document.getElementById('dcim-settings-view').style.display = 'none';
        detailView.style.display = 'flex';
        
        // Render detail view
        detailView.innerHTML = `
          <div class="dcim-detail-header">
            <h3>${image.filename}</h3>
            <button id="dcim-back-button" class="btn">Back to Gallery</button>
          </div>
          <img class="dcim-detail-image" src="${image.url}" alt="${image.filename}">
          <div class="dcim-detail-form">
            <div class="dcim-form-group">
              <label>Filename</label>
              <input type="text" id="edit-filename" value="${image.filename || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>File Size</label>
              <input type="text" value="${formatFileSize(image.file_size)}" readonly class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Rating</label>
              <div class="dcim-rating" id="edit-rating">
                <span class="dcim-star ${image.rating >= 1 ? 'active' : ''}" data-value="1">★</span>
                <span class="dcim-star ${image.rating >= 2 ? 'active' : ''}" data-value="2">★</span>
                <span class="dcim-star ${image.rating >= 3 ? 'active' : ''}" data-value="3">★</span>
                <span class="dcim-star ${image.rating >= 4 ? 'active' : ''}" data-value="4">★</span>
                <span class="dcim-star ${image.rating >= 5 ? 'active' : ''}" data-value="5">★</span>
              </div>
            </div>
            <div class="dcim-form-group">
              <label>Tags (comma separated)</label>
              <input type="text" id="edit-tags" value="${image.tags || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Person</label>
              <input type="text" id="edit-person" value="${image.person || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Location</label>
              <input type="text" id="edit-location" value="${image.location || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Type</label>
              <input type="text" id="edit-type"
                <input type="text" id="edit-type" value="${image.type || ''}" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Creation Time</label>
            <input type="datetime-local" id="edit-creation-time" 
              value="${image.creation_time ? new Date(parseInt(image.creation_time)).toISOString().slice(0, 16) : ''}" 
              class="dcim-input">
          </div>
        </div>
        <div class="dcim-detail-actions">
          <div>
            <button id="dcim-save-image" class="btn btn-primary">Save Changes</button>
            <button id="dcim-convert-webp" class="btn">Convert to WebP</button>
          </div>
          <button id="dcim-delete-image" class="btn btn-danger">Delete Image</button>
        </div>
      `;
      
      // Add event listeners
      document.getElementById('dcim-back-button').addEventListener('click', () => {
        document.getElementById('dcim-image-grid').style.display = 'grid';
        detailView.style.display = 'none';
      });
      
      document.getElementById('dcim-save-image').addEventListener('click', () => saveImageChanges(image.id));
      document.getElementById('dcim-delete-image').addEventListener('click', () => deleteImage(image.id));
      document.getElementById('dcim-convert-webp').addEventListener('click', () => convertToWebP(image.id));
      
      // Star rating functionality
      const stars = document.querySelectorAll('.dcim-star');
      stars.forEach(star => {
        star.addEventListener('click', function() {
          const value = parseInt(this.getAttribute('data-value'));
          
          // Toggle off if already active
          const newRating = (image.rating === value) ? 0 : value;
          
          // Update UI
          stars.forEach(s => {
            const starValue = parseInt(s.getAttribute('data-value'));
            if (starValue <= newRating) {
              s.classList.add('active');
            } else {
              s.classList.remove('active');
            }
          });
          
          // Update image object
          image.rating = newRating;
        });
      });
      
    } catch (error) {
      console.error('Error loading image details:', error);
      alert('Failed to load image details');
    }
  }
  
  /**
   * Saves changes to an image
   * @param {string} imageId - The ID of the image to update
   */
  async function saveImageChanges(imageId) {
    try {
      const updatedData = {
        filename: document.getElementById('edit-filename').value,
        tags: document.getElementById('edit-tags').value,
        person: document.getElementById('edit-person').value,
        location: document.getElementById('edit-location').value,
        type: document.getElementById('edit-type').value,
        rating: document.querySelector('.dcim-star.active:last-of-type') ? 
               parseInt(document.querySelector('.dcim-star.active:last-of-type').getAttribute('data-value')) : 0
      };
      
      const creationTime = document.getElementById('edit-creation-time').value;
      if (creationTime) {
        updatedData.creation_time = new Date(creationTime).getTime();
      }
      
      const response = await fetch(`/api/dcim/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      if (response.ok) {
        alert('Image updated successfully');
        
        // Refresh image data
        const updatedImg = await response.json();
        
        // Update in current images array
        const index = currentImages.findIndex(img => img.id === imageId);
        if (index !== -1) {
          currentImages[index] = updatedImg;
        }
        
        // Reapply filters and refresh the view
        applyFilters();
      } else {
        alert('Failed to update image');
      }
    } catch (error) {
      console.error('Error saving image changes:', error);
      alert('Failed to save changes');
    }
  }
  
  /**
   * Deletes an image
   * @param {string} imageId - The ID of the image to delete
   */
  async function deleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/dcim/${imageId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Image deleted successfully');
        
        // Remove from current images array
        currentImages = currentImages.filter(img => img.id !== imageId);
        
        // Go back to grid view
        document.getElementById('dcim-image-grid').style.display = 'grid';
        document.getElementById('dcim-detail-view').style.display = 'none';
        
        // Reapply filters and refresh the view
        applyFilters();
      } else {
        alert('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  }
  
  /**
   * Converts an image to WebP format
   * @param {string} imageId - The ID of the image to convert
   */
  async function convertToWebP(imageId) {
    try {
      const quality = prompt('Enter WebP quality (1-100):', '80');
      if (!quality) return;
      
      const qualityNum = parseInt(quality);
      if (isNaN(qualityNum) || qualityNum < 1 || qualityNum > 100) {
        alert('Please enter a valid quality number between 1 and 100');
        return;
      }
      
      const response = await fetch(`/api/dcim/${imageId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality: qualityNum })
      });
      
      if (response.ok) {
        const updatedImg = await response.json();
        alert('Image converted to WebP successfully');
        
        // Update in current images array
        const index = currentImages.findIndex(img => img.id === imageId);
        if (index !== -1) {
          currentImages[index] = updatedImg;
        }
        
        // Refresh the detail view with the updated image
        showImageDetail(imageId);
      } else {
        alert('Failed to convert image');
      }
    } catch (error) {
      console.error('Error converting image:', error);
      alert('Failed to convert image');
    }
  }
  
  /**
   * Shows the add image form
   */
  function showAddImageForm() {
    const gridContainer = document.getElementById('dcim-image-grid');
    const detailView = document.getElementById('dcim-detail-view');
    const addForm = document.getElementById('dcim-add-form');
    const settingsView = document.getElementById('dcim-settings-view');
    
    // Show add form, hide other views
    gridContainer.style.display = 'none';
    detailView.style.display = 'none';
    settingsView.style.display = 'none';
    addForm.style.display = 'block';
    
    // Render the add form
    addForm.innerHTML = `
      <div class="dcim-form-header">
        <h3>Add New Image</h3>
        <button id="dcim-back-from-add" class="btn">Back to Gallery</button>
      </div>
      <form id="add-image-form" class="dcim-add-form">
        <div class="dcim-form-group">
          <label>Upload Image</label>
          <input type="file" id="add-image-file" accept="image/*" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Or Image URL</label>
          <input type="text" id="add-image-url" placeholder="https://example.com/image.jpg" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Filename (optional, will use original filename if not provided)</label>
          <input type="text" id="add-image-filename" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Rating</label>
          <div class="dcim-rating" id="add-rating">
            <span class="dcim-star" data-value="1">★</span>
            <span class="dcim-star" data-value="2">★</span>
            <span class="dcim-star" data-value="3">★</span>
            <span class="dcim-star" data-value="4">★</span>
            <span class="dcim-star" data-value="5">★</span>
          </div>
        </div>
        <div class="dcim-form-group">
          <label>Tags (comma separated)</label>
          <input type="text" id="add-image-tags" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Person</label>
          <input type="text" id="add-image-person" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Location</label>
          <input type="text" id="add-image-location" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Type</label>
          <input type="text" id="add-image-type" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Creation Time</label>
          <input type="datetime-local" id="add-image-creation-time" class="dcim-input">
        </div>
        <div class="dcim-form-actions">
          <button type="submit" class="btn btn-primary">Add Image</button>
        </div>
      </form>
    `;
    
    // Add event listeners
    document.getElementById('dcim-back-from-add').addEventListener('click', () => {
      gridContainer.style.display = 'grid';
      addForm.style.display = 'none';
    });
    
    document.getElementById('add-image-form').addEventListener('submit', function(e) {
      e.preventDefault();
      addNewImage();
    });
    
    // Add star rating functionality
    const stars = document.querySelectorAll('#add-rating .dcim-star');
    let selectedRating = 0;
    
    stars.forEach(star => {
      star.addEventListener('click', function() {
        const value = parseInt(this.getAttribute('data-value'));
        
        // Toggle off if already selected
        selectedRating = (selectedRating === value) ? 0 : value;
        
        // Update UI
        stars.forEach(s => {
          const starValue = parseInt(s.getAttribute('data-value'));
          if (starValue <= selectedRating) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });
  }
  
  /**
   * Adds a new image
   */
  async function addNewImage() {
    const fileInput = document.getElementById('add-image-file');
    const urlInput = document.getElementById('add-image-url');
    
    // Validate that at least one of file or URL is provided
    if (!fileInput.files.length && !urlInput.value) {
      alert('Please upload a file or provide an image URL');
      return;
    }
    
    try {
      // Prepare form data
      const formData = new FormData();
      
      if (fileInput.files.length) {
        formData.append('image', fileInput.files[0]);
      }
      
      if (urlInput.value) {
        formData.append('url', urlInput.value);
      }
      
      // Add other form fields
      formData.append('filename', document.getElementById('add-image-filename').value);
      formData.append('tags', document.getElementById('add-image-tags').value);
      formData.append('person', document.getElementById('add-image-person').value);
      formData.append('location', document.getElementById('add-image-location').value);
      formData.append('type', document.getElementById('add-image-type').value);
      
      // Get rating
      const selectedRating = document.querySelector('#add-rating .dcim-star.active:last-of-type');
      if (selectedRating) {
        formData.append('rating', selectedRating.getAttribute('data-value'));
      }
      
      // Get creation time
      const creationTime = document.getElementById('add-image-creation-time').value;
      if (creationTime) {
        formData.append('creation_time', new Date(creationTime).getTime().toString());
      }
      
      const response = await fetch('/api/dcim', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const newImage = await response.json();
        alert('Image added successfully');
        
        // Add to current images array
        currentImages.unshift(newImage);
        
        // Go back to grid view
        document.getElementById('dcim-image-grid').style.display = 'grid';
        document.getElementById('dcim-add-form').style.display = 'none';
        
        // Reapply filters and refresh the view
        applyFilters();
      } else {
        alert('Failed to add image');
      }
    } catch (error) {
      console.error('Error adding image:', error);
      alert('Failed to add image');
    }
  }
  
  /**
   * Shows the settings view
   */
  function showSettings() {
    const gridContainer = document.getElementById('dcim-image-grid');
    const detailView = document.getElementById('dcim-detail-view');
    const addForm = document.getElementById('dcim-add-form');
    const settingsView = document.getElementById('dcim-settings-view');
    
    // Show settings view, hide other views
    gridContainer.style.display = 'none';
    detailView.style.display = 'none';
    addForm.style.display = 'none';
    settingsView.style.display = 'block';
    
    // Render the settings view
    settingsView.innerHTML = `
      <div class="dcim-form-header">
        <h3>DCIM Settings</h3>
        <button id="dcim-back-from-settings" class="btn">Back to Gallery</button>
      </div>
      <form id="dcim-settings-form" class="dcim-settings-form">
        <div class="dcim-form-group">
          <label>Asset Directory</label>
          <input type="text" id="asset-dir" placeholder="Path to assets directory" class="dcim-input">
        </div>
        <div class="dcim-form-group">
          <label>Thumbnail Directory</label>
          <input type="text" id="thumbnail-dir" placeholder="Path to thumbnails directory" class="dcim-input">
        </div>
        <div class="dcim-form-actions">
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
    `;
    
    // Add event listeners
    document.getElementById('dcim-back-from-settings').addEventListener('click', () => {
      gridContainer.style.display = 'grid';
      settingsView.style.display = 'none';
    });
    
    // Fetch current directory settings
    fetchDirectorySettings();
    
    // Add form submit handler
    document.getElementById('dcim-settings-form').addEventListener('submit', function(e) {
      e.preventDefault();
      saveDirectorySettings();
    });
  }
  
  /**
   * Fetches the current directory settings
   */
  async function fetchDirectorySettings() {
    try {
      const response = await fetch('/api/dcim/directories');
      const directories = await response.json();
      
      // Check if directories is an array
      if (Array.isArray(directories)) {
        // Find asset and thumbnail directories
        const assetDir = directories.find(dir => dir.type === 'asset');
        const thumbnailDir = directories.find(dir => dir.type === 'thumbnail');
        
        // Set values in form
        if (assetDir) {
          document.getElementById('asset-dir').value = assetDir.path;
        }
        
        if (thumbnailDir) {
          document.getElementById('thumbnail-dir').value = thumbnailDir.path;
        }
      } else {
        console.log('Directory data is not an array:', directories);
      }
    } catch (error) {
      console.error('Error fetching directory settings:', error);
      alert('Failed to load directory settings');
    }
  }
  
  /**
   * Saves the directory settings
   */
  async function saveDirectorySettings() {
    try {
      const assetDir = document.getElementById('asset-dir').value;
      const thumbnailDir = document.getElementById('thumbnail-dir').value;
      
      const response = await fetch('/api/dcim/directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetDir, thumbnailDir })
      });
      
      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving directory settings:', error);
      alert('Failed to save settings');
    }
  }
  
  /**
   * Formats file size in a human-readable format
   * @param {number} size - The file size in bytes
   * @returns {string} Formatted file size
   */
  function formatFileSize(size) {
    if (!size) return 'Unknown';
    
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }
  
  // Public API
  return {
    initialize: initialize,
    openManager: openImageManager
  };
})();

// Initialize the DCIM Manager when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  DcimManager.initialize();
});

// Export the module for use in other files
window.DcimManager = DcimManager;