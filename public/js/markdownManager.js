/**
 * Markdown Manager Module
 * Handles all markdown-related functionality for nodes
 */
const MarkdownManager = (function() {
  // Private variables
  let modalElement = null;
  let currentNodeId = null;
  let imageViewMode = localStorage.getItem('markdownImageViewMode') || 'lightbox'; // Default to lightbox
  
  // Add CSS styles for the wider markdown modal
  function addModalStyles() {
    // Check if our styles are already added
    if (document.getElementById('markdown-modal-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'markdown-modal-styles';
    styleElement.textContent = `
      .markdown-modal-wide {
        width: 80% !important;
        max-width: 1500px !important;
      }
      
      .markdown-editor, 
      .markdown-preview {
        min-height: 400px !important;
      }
      
      @media (max-width: 768px) {
        .markdown-modal-wide {
          width: 95% !important;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
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
        <div class="modal markdown-modal-wide">
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
                
                <!-- Image size control for selected image -->
                <div class="image-size-control">
                  <label>Selected Image Width (px): 
                    <input type="number" id="image-width-input" min="50" max="2000" value="800" disabled>
                    <button id="apply-image-width" class="btn-small" disabled>Apply</button>
                    <button id="remove-image-width" class="btn-small btn-danger-small" disabled>Remove</button>
                  </label>
                  <span id="no-image-selected-msg">Select an image to resize (${imageViewMode === 'lightbox' ? 'Ctrl+Click' : 'Right-Click'} on image)</span>
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
      
      // Update the help message
      const helpMsg = document.getElementById('no-image-selected-msg');
      if (helpMsg) {
        helpMsg.textContent = `Select an image to resize (${imageViewMode === 'lightbox' ? 'Ctrl+Click' : 'Right-Click'} on image)`;
      }
      
      // Re-render the markdown to apply the new image view mode
      const markdownContent = document.getElementById('markdown-editor').value;
      renderMarkdown(markdownContent);
    });
    
    // Add event listener for applying image width
    document.getElementById('apply-image-width').addEventListener('click', function() {
      applySelectedImageWidth();
    });
    
    // Add event listener for removing image width
    document.getElementById('remove-image-width').addEventListener('click', function() {
      removeSelectedImageWidth();
    });
    
    // Add event listener for Enter key on width input
    document.getElementById('image-width-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        applySelectedImageWidth();
      }
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
    
    // Set up image resize handlers after rendering
    setupImageResizeHandlers();
    
    // Hide the resize panel initially
    const resizePanel = document.getElementById('image-resize-panel');
    if (resizePanel) {
      resizePanel.style.display = 'none';
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
    const contentDiv = document.getElementById('markdown-content');
    
    // Add help message
    const helpMessage = `
      <div class="resize-help-message">
        <p><strong>Tip:</strong> ${imageViewMode === 'lightbox' ? 
          'Ctrl+Click (or Cmd+Click) on any image to resize it.' : 
          'Right-click on any image to resize it.'}</p>
      </div>
    `;

    contentDiv.innerHTML = helpMessage + html;
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
    // Add the styles before opening the modal
    addModalStyles();
    
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
   * Sets up image click handlers for resize functionality in preview mode
   */
  function setupImageResizeHandlers() {
    // Find all images in the preview
    const images = document.querySelectorAll('#markdown-content .markdown-image');
    let selectedImage = null;
    
    // Get the control elements
    const widthInput = document.getElementById('image-width-input');
    const applyButton = document.getElementById('apply-image-width');
    const removeButton = document.getElementById('remove-image-width');
    const noSelectionMsg = document.getElementById('no-image-selected-msg');
    
    // Reset the selection state
    widthInput.disabled = true;
    applyButton.disabled = true;
    removeButton.disabled = true;
    noSelectionMsg.style.display = 'inline';
    
    if (selectedImage) {
      selectedImage.classList.remove('selected-for-resize');
      selectedImage = null;
    }
    
    // Add click handler to each image
    images.forEach(img => {
      // Modify click behavior for lightbox mode
      if (imageViewMode === 'lightbox') {
        // Override the default lightbox click handler
        img.onclick = (e) => {
          // If Ctrl/Cmd key is pressed, open resize panel instead of lightbox
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            selectImageForResize(img);
          } else {
            // Otherwise proceed with lightbox
            const src = img.getAttribute('src');
            openImageViewer(src);
          }
        };
      } else {
        // For new tab mode, add a right-click handler (contextmenu)
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          selectImageForResize(img);
        });
      }
      
      // Add a special class to indicate the image is resizable
      img.classList.add('resizable-image');
    });
    
    // Function to select an image for resizing
    function selectImageForResize(img) {
      // Unhighlight previously selected image
      if (selectedImage) {
        selectedImage.classList.remove('selected-for-resize');
      }
      
      // Highlight the selected image
      selectedImage = img;
      selectedImage.classList.add('selected-for-resize');
      
      // Set the current width in the input
      const currentWidth = img.getAttribute('width') || Math.round(img.offsetWidth);
      widthInput.value = currentWidth;
      
      // Enable the controls
      widthInput.disabled = false;
      applyButton.disabled = false;
      removeButton.disabled = false;
      noSelectionMsg.style.display = 'none';
      
      // Focus the input for immediate editing
      widthInput.focus();
      widthInput.select();
    }
    
    // Function to apply width to the selected image
    window.applySelectedImageWidth = function() {
      if (!selectedImage) return;
      
      const newWidth = widthInput.value;
      if (!newWidth || isNaN(parseInt(newWidth))) return;
      
      // Apply width to the selected image
      updateImageInMarkdown(selectedImage, parseInt(newWidth));
      
      // Reset selection state
      resetImageSelection();
    };
    
    // Function to remove width from the selected image
    window.removeSelectedImageWidth = function() {
      if (!selectedImage) return;
      
      // Remove width from the selected image
      updateImageInMarkdown(selectedImage, null);
      
      // Reset selection state
      resetImageSelection();
    };
    
    // Function to reset the image selection state
    function resetImageSelection() {
      if (selectedImage) {
        selectedImage.classList.remove('selected-for-resize');
      }
      
      selectedImage = null;
      widthInput.disabled = true;
      applyButton.disabled = true;
      removeButton.disabled = true;
      noSelectionMsg.style.display = 'inline';
    }
  }
  
  /**
   * Updates the image width directly in the markdown content
   * @param {HTMLElement} imgElement - The selected image element
   * @param {number|null} width - The new width to apply, or null to remove width
   */
  function updateImageInMarkdown(imgElement, width) {
    // Get the current markdown content
    const markdownContent = document.getElementById('markdown-editor').value;
    const imgSrc = imgElement.getAttribute('src');
    const imgAlt = imgElement.getAttribute('alt') || '';
    
    // Extract the filename from the src (removing /attachment/ if present)
    let filename = imgSrc.split('/').pop();
    
    // Check if this is an HTML img tag or a markdown image
    let isHtmlImg = false;
    let updatedMarkdown = '';
    
    // Try to find the exact image in the markdown content
    const htmlImgRegex = new RegExp(`<img[^>]*src=["']([^"']*${filename})[^>]*>`, 'g');
    const markdownImgRegex = new RegExp(`!\\[(.*?)\\]\\(([^\\)]*${filename}[^\\)]*)\\)(?:{([^}]*)})?`, 'g');
    
    if (htmlImgRegex.test(markdownContent)) {
      isHtmlImg = true;
      
      // Replace HTML img tag
      updatedMarkdown = markdownContent.replace(htmlImgRegex, (match, src) => {
        // Remove any existing width attribute
        let newTag = match.replace(/width=["'][^"']*["']/g, '');
        
        // Add the new width if provided
        if (width) {
          // If the tag ends with /> or >, insert before that
          if (newTag.endsWith('/>')) {
            newTag = newTag.replace(/\/>$/, ` width="${width}" />`);
          } else if (newTag.endsWith('>')) {
            newTag = newTag.replace(/>$/, ` width="${width}">`);
          } else {
            // Just append
            newTag = newTag + ` width="${width}"`;
          }
        }
        
        return newTag;
      });
    } else if (markdownImgRegex.test(markdownContent)) {
      // Replace markdown image syntax
      updatedMarkdown = markdownContent.replace(markdownImgRegex, (match, alt, src, options) => {
        if (width) {
          // If options exist, update them
          if (options) {
            // Remove any existing width option
            const updatedOptions = options.replace(/width=\d+/g, '').trim();
            return `![${alt}](${src}){${updatedOptions ? updatedOptions + ' ' : ''}width=${width}}`;
          } else {
            // Add new options
            return `![${alt}](${src}){width=${width}}`;
          }
        } else {
          // Remove width option if it exists
          if (options) {
            const updatedOptions = options.replace(/width=\d+/g, '').trim();
            if (updatedOptions) {
              return `![${alt}](${src}){${updatedOptions}}`;
            } else {
              return `![${alt}](${src})`;
            }
          } else {
            return match; // No change needed
          }
        }
      });
    } else {
      // Image not found in markdown - could be a newly added image or syntax we don't recognize
      alert('Could not locate this image in the markdown. Please adjust the width manually.');
      return;
    }
    
    // Update the editor with the new content
    document.getElementById('markdown-editor').value = updatedMarkdown;
    
    // Re-render to see changes
    renderMarkdown(updatedMarkdown);
    
    // Flash the image to show it's been updated
    imgElement.classList.add('resize-updated');
    setTimeout(() => {
      imgElement.classList.remove('resize-updated');
    }, 1000);
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