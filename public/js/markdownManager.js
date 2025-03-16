/**
 * Markdown Manager Module
 * Handles all markdown-related functionality for nodes
 */
const MarkdownManager = (function() {
  // Private variables
  let modalElement = null;
  let currentNodeId = null;
  let imageViewMode = localStorage.getItem('markdownImageViewMode') || 'lightbox'; // Default to lightbox
  
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
            <div class="markdown-mode-toggle">
              <button id="edit-mode-btn" class="mode-btn active">Edit</button>
              <button id="read-mode-btn" class="mode-btn">Preview</button>
            </div>
            <button class="modal-close" id="close-markdown-modal">&times;</button>
          </div>
          <div class="modal-body">
            <textarea id="markdown-editor" class="markdown-editor" placeholder="Enter markdown content..."></textarea>
            <div id="markdown-preview" class="markdown-preview" style="display: none;">
              <div class="preview-controls">
                <div class="image-view-toggle">
                  <label>
                    <input type="checkbox" id="image-view-toggle" ${imageViewMode === 'newtab' ? 'checked' : ''}>
                    Open images in new tab
                  </label>
                </div>
                <div class="image-size-controls">
                  <label>Image Size: 
                    <select id="image-size-preset">
                      <option value="100">100% (Original)</option>
                      <option value="75">75%</option>
                      <option value="50">50%</option>
                      <option value="25">25%</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </label>
                  <div id="custom-image-size" style="display: none; margin-top: 5px;">
                    <label>Max width (px): 
                      <input type="number" id="image-max-width" min="50" max="2000" value="800">
                    </label>
                  </div>
                </div>
              </div>
              <div id="markdown-content"></div>
            </div>
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
    
    // Set up event listeners for markdown operations
    document.getElementById('close-markdown-modal').addEventListener('click', closeModal);
    document.getElementById('save-markdown').addEventListener('click', saveMarkdown);
    document.getElementById('delete-markdown').addEventListener('click', deleteMarkdown);
    
    // Add event listeners for mode toggle
    document.getElementById('edit-mode-btn').addEventListener('click', switchToEditMode);
    document.getElementById('read-mode-btn').addEventListener('click', switchToReadMode);
    
    // Add event listener for image view toggle
    document.getElementById('image-view-toggle').addEventListener('change', function() {
      imageViewMode = this.checked ? 'newtab' : 'lightbox';
      localStorage.setItem('markdownImageViewMode', imageViewMode);
      
      // Re-render the markdown to apply the new image view mode
      const markdownContent = document.getElementById('markdown-editor').value;
      renderMarkdown(markdownContent);
    });
    
    // Add event listeners for image size controls
    document.getElementById('image-size-preset').addEventListener('change', function() {
      const customSizeDiv = document.getElementById('custom-image-size');
      if (this.value === 'custom') {
        customSizeDiv.style.display = 'block';
      } else {
        customSizeDiv.style.display = 'none';
        applyImageSize(parseInt(this.value));
      }
    });
    
    document.getElementById('image-max-width').addEventListener('change', function() {
      applyImageSize('custom', parseInt(this.value));
    });
    
    return modal;
  }
  
  /**
   * Switches to edit mode
   */
  function switchToEditMode() {
    document.getElementById('edit-mode-btn').classList.add('active');
    document.getElementById('read-mode-btn').classList.remove('active');
    document.getElementById('markdown-editor').style.display = 'block';
    document.getElementById('markdown-preview').style.display = 'none';
  }
  
  /**
   * Switches to read (preview) mode
   */
  function switchToReadMode() {
    document.getElementById('edit-mode-btn').classList.remove('active');
    document.getElementById('read-mode-btn').classList.add('active');
    document.getElementById('markdown-editor').style.display = 'none';
    document.getElementById('markdown-preview').style.display = 'block';
    
    // Get the markdown content and render it
    const markdownContent = document.getElementById('markdown-editor').value;
    renderMarkdown(markdownContent);
    
    // Apply saved image size preferences
    const sizePreset = localStorage.getItem('markdownImageSizePreset') || '100';
    const customWidth = parseInt(localStorage.getItem('markdownImageCustomWidth') || '800');
    
    const sizeSelector = document.getElementById('image-size-preset');
    if (sizeSelector.querySelector(`option[value="${sizePreset}"]`)) {
      sizeSelector.value = sizePreset;
    }
    
    document.getElementById('image-max-width').value = customWidth;
    
    if (sizePreset === 'custom') {
      document.getElementById('custom-image-size').style.display = 'block';
      applyImageSize('custom', customWidth);
    } else {
      document.getElementById('custom-image-size').style.display = 'none';
      applyImageSize(parseInt(sizePreset));
    }
  }
  
  /**
   * Renders markdown content as HTML
   * @param {string} content - The markdown content to render
   */
  function renderMarkdown(content) {
    // You need to include a markdown parser library like marked.js
    // For now, we'll use a simple implementation that just handles basic formatting
    const html = simpleMarkdownToHtml(content);
    document.getElementById('markdown-content').innerHTML = html;
  }
  
  /**
   * Simple markdown to HTML converter (placeholder until a proper library is used)
   * @param {string} markdown - The markdown content
   * @returns {string} The HTML content
   */
  function simpleMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    // First, preserve any existing HTML img tags (they'll be exempt from processing)
    const htmlImgPlaceholders = [];
    markdown = markdown.replace(/<img\s+[^>]*>/gi, match => {
      const placeholder = `__HTML_IMG_${htmlImgPlaceholders.length}__`;
      htmlImgPlaceholders.push(match);
      return placeholder;
    });
    
    // Replace headers
    let html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    
    // Replace images with custom size syntax ![alt](src){width=X height=Y}
    html = html.replace(/!\[(.*?)\]\((.*?)\)(?:{([^}]*)})?/g, (match, alt, src, options) => {
      // Path handling - if it's a relative path without http/https, prefix with /attachment/
      if (!src.startsWith('http') && !src.startsWith('/')) {
        src = `/attachment/${src}`;
      }
      
      // Parse options like width and height
      let width = '';
      let height = '';
      
      if (options) {
        const widthMatch = options.match(/width=(\d+)/);
        const heightMatch = options.match(/height=(\d+)/);
        
        if (widthMatch) width = widthMatch[1];
        if (heightMatch) height = heightMatch[1];
      }
      
      const sizeAttrs = [];
      if (width) sizeAttrs.push(`width="${width}"`);
      if (height) sizeAttrs.push(`height="${height}"`);
      
      const sizeAttrsStr = sizeAttrs.length > 0 ? ' ' + sizeAttrs.join(' ') : '';
      
      if (imageViewMode === 'newtab') {
        // New tab mode - wrap image in a link that opens in a new tab
        return `<a href="${src}" target="_blank" rel="noopener noreferrer">
                  <img src="${src}" alt="${alt}" class="markdown-image"${sizeAttrsStr}>
                </a>`;
      } else {
        // Lightbox mode - make image clickable to open in lightbox
        return `<img src="${src}" alt="${alt}" class="markdown-image"${sizeAttrsStr} onclick="MarkdownManager.openImageViewer('${src}')">`;
      }
    });
    
    // Restore HTML img tags
    htmlImgPlaceholders.forEach((imgTag, index) => {
      html = html.replace(`__HTML_IMG_${index}__`, imgTag);
    });
    
    // Replace bold and italic
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\_\_(.+?)\_\_/g, '<strong>$1</strong>')
      .replace(/\_(.+?)\_/g, '<em>$1</em>');
    
    // Replace lists
    html = html
      .replace(/^\* (.+)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.+)$/gm, '<ol><li>$1</li></ol>');
    
    // Replace links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    
    // Replace inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Replace code blocks
    html = html.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
    
    // Replace paragraphs (two new lines)
    html = html.replace(/\n\s*\n/g, '</p><p>');
    
    // Wrap with paragraph tags if needed
    if (html && !html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    // Cleanup adjacent lists
    html = html
      .replace(/<\/ul><ul>/g, '')
      .replace(/<\/ol><ol>/g, '');
    
    return html;
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
      // Start in edit mode
      switchToEditMode();
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
  
  /**
   * Opens the image viewer for a full-size view
   * @param {string} imageSrc - The source URL of the image
   */
  function openImageViewer(imageSrc) {
    // Create the viewer if it doesn't exist
    let viewer = document.getElementById('markdown-image-viewer');
    if (!viewer) {
      const viewerHTML = `
        <div id="markdown-image-viewer" class="image-viewer-overlay" style="display: none;">
          <div class="image-viewer-content">
            <span class="image-viewer-close">&times;</span>
            <img id="image-viewer-img" class="image-viewer-img">
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', viewerHTML);
      viewer = document.getElementById('markdown-image-viewer');
      
      // Set up close functionality
      document.querySelector('.image-viewer-close').addEventListener('click', () => {
        viewer.style.display = 'none';
      });
      
      // Close when clicking outside the image
      viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
          viewer.style.display = 'none';
        }
      });
    }
    
    // Set the image source and show the viewer
    document.getElementById('image-viewer-img').src = imageSrc;
    viewer.style.display = 'flex';
  }
  
  /**
   * Applies size adjustments to all images in the preview
   * @param {string|number} preset - Size preset (100, 75, 50, 25) or 'custom'
   * @param {number} [customWidth] - Custom max width in pixels
   */
  function applyImageSize(preset, customWidth) {
    const images = document.querySelectorAll('#markdown-content .markdown-image');
    
    images.forEach(img => {
      // Remove any previously set inline styles
      img.style.maxWidth = '';
      
      if (preset === 'custom' && customWidth) {
        img.style.maxWidth = `${customWidth}px`;
      } else if (preset !== 100) {
        img.style.maxWidth = `${preset}%`;
      }
    });
    
    // Save preferences
    localStorage.setItem('markdownImageSizePreset', preset);
    if (customWidth) {
      localStorage.setItem('markdownImageCustomWidth', customWidth);
    }
  }
  
  // Public API
  return {
    openModal: openMarkdownModal,
    closeModal: closeModal,
    updateIndicator: updateMarkdownIndicator,
    openImageViewer: openImageViewer
  };
})();

// Export the module for use in other files
window.MarkdownManager = MarkdownManager; 