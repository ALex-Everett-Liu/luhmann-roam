/**
 * Blog Manager Module
 * Handles converting markdown content to HTML blog pages with templates
 */
const BlogManager = (function() {
    // Private variables
    let modalElement = null;
    let templates = [];
    let currentNodeId = null;
    let currentLanguage = 'en';
    let currentTemplate = null;
    
    /**
     * Initialize the manager
     */
    function initialize() {
      // Get the initial language setting from I18n if available
      if (window.I18n) {
        currentLanguage = I18n.getCurrentLanguage();
      }
      console.log('BlogManager initialized with language:', currentLanguage);
      
      // Fetch available templates
      fetchTemplates();
      
      // Add a blog button to the sidebar
      addBlogButton();
    }
    
    /**
     * Fetch available HTML templates from the server
     */
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/blog/templates');
        templates = await response.json();
        console.log('Loaded templates:', templates);
      } catch (error) {
        console.error('Error fetching blog templates:', error);
      }
    }
    
    /**
     * Add a blog manager button to the sidebar
     */
    function addBlogButton() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const blogButton = document.createElement('button');
        blogButton.id = 'open-blog-manager';
        blogButton.className = 'feature-toggle';
        blogButton.innerHTML = '📝 Blog Manager';
        blogButton.title = 'Manage HTML blog pages from markdown content';
        
        blogButton.addEventListener('click', openBlogManagerModal);
        
        sidebar.appendChild(blogButton);
      }
    }
    
    /**
     * Creates the blog manager modal
     */
    function createModal() {
      if (document.getElementById('blog-manager-modal')) {
        return document.getElementById('blog-manager-modal');
      }
      
      // Translate UI text if I18n is available
      const modalTitle = window.I18n ? I18n.t('blogManagerTitle') : 'Blog Manager';
      const selectNodeText = window.I18n ? I18n.t('selectNode') : 'Select Node with Markdown';
      const previewText = window.I18n ? I18n.t('preview') : 'Preview';
      const selectTemplateText = window.I18n ? I18n.t('selectTemplate') : 'Select Template';
      const generateText = window.I18n ? I18n.t('generateBlog') : 'Generate Blog Page';
      const editHtmlText = window.I18n ? I18n.t('editHtml') : 'Edit HTML';
      const blogListText = window.I18n ? I18n.t('blogList') : 'Published Blog Pages';
      
      const modalHTML = `
        <div id="blog-manager-modal" class="modal-overlay" style="display: none;">
          <div class="modal blog-manager-modal">
            <div class="modal-header">
              <h3 class="modal-title">${modalTitle}</h3>
              <button class="modal-close" id="close-blog-modal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="blog-manager-tabs">
                <button id="create-tab-btn" class="tab-btn active">Create Blog</button>
                <button id="manage-tab-btn" class="tab-btn">Manage Blogs</button>
              </div>
              
              <div id="create-tab" class="tab-content">
                <div class="form-group">
                  <label for="node-selector">${selectNodeText}</label>
                  <div class="select-with-button">
                    <select id="node-selector" class="form-control"></select>
                    <button id="preview-markdown-btn" class="btn-small">${previewText}</button>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="template-selector">${selectTemplateText}</label>
                  <div class="select-with-preview">
                    <select id="template-selector" class="form-control"></select>
                    <div id="template-preview" class="template-preview">
                      <img id="template-preview-img" class="template-preview-img" />
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="blog-title">Blog Title</label>
                  <input type="text" id="blog-title" class="form-control" placeholder="Enter blog title">
                </div>
                
                <div class="form-group">
                  <label for="blog-slug">URL Slug</label>
                  <input type="text" id="blog-slug" class="form-control" placeholder="my-blog-post">
                  <small class="form-text text-muted">Will be used in the URL: /blog/my-blog-post</small>
                </div>
                
                <div class="preview-container">
                  <h4>Preview</h4>
                  <div id="blog-preview" class="blog-preview"></div>
                </div>
              </div>
              
              <div id="manage-tab" class="tab-content" style="display: none;">
                <h4>${blogListText}</h4>
                <div id="blog-list" class="blog-list">
                  <div class="loader">Loading blogs...</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="generate-blog" class="btn btn-primary">${generateText}</button>
              <button id="edit-html" class="btn btn-secondary">${editHtmlText}</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      const modal = document.getElementById('blog-manager-modal');
      
      // Set up event listeners
      document.getElementById('close-blog-modal').addEventListener('click', closeModal);
      document.getElementById('preview-markdown-btn').addEventListener('click', previewMarkdown);
      document.getElementById('generate-blog').addEventListener('click', generateBlog);
      document.getElementById('edit-html').addEventListener('click', editHtml);
      document.getElementById('template-selector').addEventListener('change', updateTemplatePreview);
      document.getElementById('node-selector').addEventListener('change', () => {
        currentNodeId = document.getElementById('node-selector').value;
        updatePreview();
      });
      document.getElementById('blog-title').addEventListener('input', updatePreview);
      
      // Tab switching
      document.getElementById('create-tab-btn').addEventListener('click', () => {
        switchTab('create');
      });
      document.getElementById('manage-tab-btn').addEventListener('click', () => {
        switchTab('manage');
        loadPublishedBlogs();
      });
      
      // Auto-generate slug from title
      document.getElementById('blog-title').addEventListener('input', function() {
        const titleInput = document.getElementById('blog-title');
        const slugInput = document.getElementById('blog-slug');
        
        // Only auto-generate if slug is empty or hasn't been manually edited
        if (!slugInput.dataset.manuallyEdited) {
          const slug = titleInput.value
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Remove consecutive hyphens
          
          slugInput.value = slug;
        }
      });
      
      document.getElementById('blog-slug').addEventListener('input', function() {
        this.dataset.manuallyEdited = 'true';
      });
      
      return modal;
    }
    
    /**
     * Switch between tabs
     */
    function switchTab(tabName) {
      const createTab = document.getElementById('create-tab');
      const manageTab = document.getElementById('manage-tab');
      const createBtn = document.getElementById('create-tab-btn');
      const manageBtn = document.getElementById('manage-tab-btn');
      
      if (tabName === 'create') {
        createTab.style.display = 'block';
        manageTab.style.display = 'none';
        createBtn.classList.add('active');
        manageBtn.classList.remove('active');
        document.getElementById('generate-blog').style.display = 'block';
        document.getElementById('edit-html').style.display = 'block';
      } else {
        createTab.style.display = 'none';
        manageTab.style.display = 'block';
        createBtn.classList.remove('active');
        manageBtn.classList.add('active');
        document.getElementById('generate-blog').style.display = 'none';
        document.getElementById('edit-html').style.display = 'none';
      }
    }
    
    /**
     * Load the list of published blog pages
     */
    async function loadPublishedBlogs() {
      const blogList = document.getElementById('blog-list');
      blogList.innerHTML = '<div class="loader">Loading blogs...</div>';
      
      try {
        const response = await fetch('/api/blog/pages');
        const blogs = await response.json();
        
        if (blogs.length === 0) {
          blogList.innerHTML = '<div class="no-blogs">No published blog pages yet</div>';
          return;
        }
        
        let blogHtml = '<ul class="published-blogs">';
        blogs.forEach(blog => {
          blogHtml += `
            <li class="blog-item">
              <div class="blog-info">
                <h4>${blog.title}</h4>
                <span class="blog-date">${new Date(blog.created_at).toLocaleDateString()}</span>
                <a href="/blog/${blog.slug}" target="_blank" class="blog-link">View</a>
              </div>
              <div class="blog-actions">
                <button class="btn-small edit-blog" data-id="${blog.id}">Edit</button>
                <button class="btn-small btn-danger-small delete-blog" data-id="${blog.id}">Delete</button>
              </div>
            </li>
          `;
        });
        blogHtml += '</ul>';
        
        blogList.innerHTML = blogHtml;
        
        // Add event listeners to the edit and delete buttons
        document.querySelectorAll('.edit-blog').forEach(btn => {
          btn.addEventListener('click', () => editBlog(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-blog').forEach(btn => {
          btn.addEventListener('click', () => deleteBlog(btn.dataset.id));
        });
        
      } catch (error) {
        console.error('Error loading blogs:', error);
        blogList.innerHTML = '<div class="error">Failed to load blogs</div>';
      }
    }
    
    /**
     * Open the blog manager modal
     */
    async function openBlogManagerModal() {
      modalElement = createModal();
      modalElement.style.display = 'flex';
      
      try {
        // Add a search field to the node selector
        const nodeSelector = document.getElementById('node-selector');
        
        // Create a search container to hold both search and dropdown
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        // Create a search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'node-search';
        searchInput.className = 'form-control';
        searchInput.placeholder = window.I18n ? I18n.t('searchNodes') : 'Search nodes...';
        
        // Insert search input before the node selector
        nodeSelector.parentNode.insertBefore(searchContainer, nodeSelector);
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(nodeSelector);
        
        // Use the existing search API endpoint to find nodes with markdown
        const response = await fetch('/api/nodes/search?q=&has_markdown=true');
        const nodes = await response.json();
        
        // Store all nodes for filtering
        const allMarkdownNodes = nodes;
        
        // Populate the node selector initially
        populateNodeSelector(allMarkdownNodes);
        
        // Add search functionality
        searchInput.addEventListener('input', async () => {
          const searchTerm = searchInput.value.toLowerCase();
          
          if (searchTerm.trim() === '') {
            // Empty search, show all markdown nodes
            const emptyResponse = await fetch('/api/nodes/search?q=&has_markdown=true');
            const allNodes = await emptyResponse.json();
            populateNodeSelector(allNodes);
          } else {
            // Search with the entered term
            const searchResponse = await fetch(`/api/nodes/search?q=${encodeURIComponent(searchTerm)}&has_markdown=true`);
            const filteredNodes = await searchResponse.json();
            populateNodeSelector(filteredNodes);
          }
        });
        
        // Populate the template selector
        const templateSelector = document.getElementById('template-selector');
        templateSelector.innerHTML = '<option value="">-- Select a template --</option>';
        
        templates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = template.name;
          templateSelector.appendChild(option);
        });
        
        // Update template preview for the first template
        if (templates.length > 0) {
          templateSelector.value = templates[0].id;
          updateTemplatePreview();
        }
      } catch (error) {
        console.error('Error loading data for blog manager:', error);
      }
    }
    
    /**
     * Populate the node selector with the given nodes
     */
    function populateNodeSelector(nodes) {
      const nodeSelector = document.getElementById('node-selector');
      nodeSelector.innerHTML = '<option value="">-- Select a node --</option>';
      
      // Get the current language
      const currentLanguage = I18n ? I18n.getCurrentLanguage() : 'en';
      
      // Sort nodes alphabetically based on the current language content
      nodes.sort((a, b) => {
        const aContent = currentLanguage === 'zh' && a.content_zh ? a.content_zh : a.content;
        const bContent = currentLanguage === 'zh' && b.content_zh ? b.content_zh : b.content;
        return aContent.localeCompare(bContent);
      });
      
      nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        
        // Display content based on current language
        const displayContent = currentLanguage === 'zh' && node.content_zh ? 
          node.content_zh : node.content;
        
        // Truncate long content for display
        let contentText = displayContent;
        if (contentText.length > 50) {
          contentText = contentText.substring(0, 47) + '...';
        }
        
        option.textContent = contentText;
        nodeSelector.appendChild(option);
      });
      
      // Update the counter
      const searchContainer = document.querySelector('.search-container');
      let counter = searchContainer.querySelector('.node-counter');
      
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'node-counter';
        searchContainer.appendChild(counter);
      }
      
      counter.textContent = `${nodes.length} nodes found`;
    }
    
    /**
     * Update the template preview image
     */
    function updateTemplatePreview() {
      const templateSelector = document.getElementById('template-selector');
      const previewImg = document.getElementById('template-preview-img');
      
      if (!templateSelector.value) {
        previewImg.src = '';
        previewImg.style.display = 'none';
        return;
      }
      
      const selectedTemplate = templates.find(t => t.id === templateSelector.value);
      currentTemplate = selectedTemplate;
      
      if (selectedTemplate && selectedTemplate.preview_image) {
        previewImg.src = selectedTemplate.preview_image;
        previewImg.style.display = 'block';
      } else {
        previewImg.src = '';
        previewImg.style.display = 'none';
      }
      
      updatePreview();
    }
    
    /**
     * Preview the markdown content for a selected node
     */
    async function previewMarkdown() {
      const nodeId = document.getElementById('node-selector').value;
      
      if (!nodeId) {
        alert('Please select a node first');
        return;
      }
      
      currentNodeId = nodeId;
      
      try {
        const response = await fetch(`/api/nodes/${nodeId}/markdown`);
        const data = await response.json();
        
        // Update the preview
        const blogPreview = document.getElementById('blog-preview');
        if (data.content) {
          blogPreview.innerHTML = simpleMarkdownToHtml(data.content);
        } else {
          blogPreview.innerHTML = '<p>No markdown content found for this node.</p>';
        }
      } catch (error) {
        console.error('Error fetching markdown:', error);
        alert('Failed to load markdown content');
      }
    }
    
    /**
     * Update the blog preview based on selected template and content
     */
    async function updatePreview() {
      if (!currentNodeId || !currentTemplate) return;
      
      try {
        const response = await fetch(`/api/nodes/${currentNodeId}/markdown`);
        const data = await response.json();
        
        if (!data.content) {
          document.getElementById('blog-preview').innerHTML = '<p>No markdown content found</p>';
          return;
        }
        
        // Apply basic preview using the selected template
        const blogTitle = document.getElementById('blog-title').value || 'Blog Title';
        const blogPreview = document.getElementById('blog-preview');
        
        // Apply the template to the markdown content
        const htmlContent = simpleMarkdownToHtml(data.content);
        
        // Create a simple preview based on the selected template
        blogPreview.innerHTML = `
          <div class="blog-template-preview" data-template="${currentTemplate.id}">
            <div class="preview-header">
              <h2>${blogTitle}</h2>
              <div class="preview-metadata">
                <span>Posted on: ${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div class="preview-content">
              ${htmlContent}
            </div>
            <div class="preview-footer">
              <p>This is a preview of how your blog post might look with the ${currentTemplate.name} template.</p>
            </div>
          </div>
        `;
      } catch (error) {
        console.error('Error updating preview:', error);
      }
    }
    
    /**
     * Generate and save the blog page
     */
    async function generateBlog() {
      const nodeId = document.getElementById('node-selector').value;
      const templateId = document.getElementById('template-selector').value;
      const blogTitle = document.getElementById('blog-title').value;
      const blogSlug = document.getElementById('blog-slug').value;
      
      if (!nodeId || !templateId || !blogTitle || !blogSlug) {
        alert('Please fill in all fields');
        return;
      }
      
      try {
        const response = await fetch('/api/blog/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nodeId,
            templateId,
            title: blogTitle,
            slug: blogSlug
          })
        });
        
        // Log the actual error response
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || 'Failed to generate blog page');
          } catch (jsonError) {
            throw new Error(`Server error: ${errorText || response.statusText}`);
          }
        }
        
        const result = await response.json();
        
        alert(`Blog page created successfully! View it at: /blog/${blogSlug}`);
        closeModal();
        
        // Open the newly created blog in a new tab
        window.open(`/blog/${blogSlug}`, '_blank');
      } catch (error) {
        console.error('Error generating blog:', error);
        alert(`Failed to generate blog page: ${error.message}`);
      }
    }
    
    /**
     * Open the HTML editor for the current blog
     */
    function editHtml() {
      const nodeId = document.getElementById('node-selector').value;
      const templateId = document.getElementById('template-selector').value;
      const blogTitle = document.getElementById('blog-title').value;
      const blogSlug = document.getElementById('blog-slug').value;
      
      if (!nodeId || !templateId || !blogTitle || !blogSlug) {
        alert('Please fill in all fields and generate the blog first');
        return;
      }
      
      // Open the HTML editor modal for the selected blog
      openHtmlEditor(blogSlug);
    }
    
    /**
     * Open HTML editor for an existing blog
     */
    async function editBlog(blogId) {
      try {
        const response = await fetch(`/api/blog/pages/${blogId}`);
        const blog = await response.json();
        
        // Open the HTML editor with the blog data
        openHtmlEditor(blog.slug);
      } catch (error) {
        console.error('Error opening blog for editing:', error);
        alert('Failed to load blog for editing');
      }
    }
    
    /**
     * Open HTML editor modal
     */
    async function openHtmlEditor(slug) {
      try {
        const response = await fetch(`/api/blog/pages/html/${slug}`);
        const htmlContent = await response.text();
        
        // Create and open HTML editor modal
        createHtmlEditorModal(slug, htmlContent);
      } catch (error) {
        console.error('Error loading HTML content:', error);
        alert('Failed to load HTML content for editing');
      }
    }
    
    /**
     * Create HTML editor modal
     */
    function createHtmlEditorModal(slug, htmlContent) {
      // Remove existing modal if it exists
      const existingModal = document.getElementById('html-editor-modal');
      if (existingModal) {
        document.body.removeChild(existingModal);
      }
      
      const editorHTML = `
        <div id="html-editor-modal" class="modal-overlay" style="display: flex;">
          <div class="modal html-editor-modal">
            <div class="modal-header">
              <h3 class="modal-title">Edit HTML - ${slug}</h3>
              <div class="html-mode-toggle">
                <button id="code-mode-btn" class="mode-btn active">Code</button>
                <button id="preview-mode-btn" class="mode-btn">Preview</button>
              </div>
              <button class="modal-close" id="close-html-editor">&times;</button>
            </div>
            <div class="modal-body">
              <textarea id="html-code-editor" class="html-code-editor">${htmlContent}</textarea>
              <div id="html-preview" class="html-preview" style="display: none;"></div>
            </div>
            <div class="modal-footer">
              <button id="save-html" class="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', editorHTML);
      
      // Add event listeners
      document.getElementById('close-html-editor').addEventListener('click', () => {
        document.getElementById('html-editor-modal').remove();
      });
      
      document.getElementById('code-mode-btn').addEventListener('click', () => {
        document.getElementById('code-mode-btn').classList.add('active');
        document.getElementById('preview-mode-btn').classList.remove('active');
        document.getElementById('html-code-editor').style.display = 'block';
        document.getElementById('html-preview').style.display = 'none';
      });
      
      document.getElementById('preview-mode-btn').addEventListener('click', () => {
        document.getElementById('code-mode-btn').classList.remove('active');
        document.getElementById('preview-mode-btn').classList.add('active');
        document.getElementById('html-code-editor').style.display = 'none';
        document.getElementById('html-preview').style.display = 'block';
        
        // Update the preview with the current HTML
        const htmlCode = document.getElementById('html-code-editor').value;
        document.getElementById('html-preview').innerHTML = `
          <iframe id="preview-iframe" style="width:100%;height:500px;border:none;"></iframe>
        `;
        
        const iframe = document.getElementById('preview-iframe');
        iframe.onload = function() {
          // Apply any additional styles if needed
        };
        
        // Write content to the iframe
        const previewDoc = iframe.contentDocument || iframe.contentWindow.document;
        previewDoc.open();
        previewDoc.write(htmlCode);
        previewDoc.close();
      });
      
      document.getElementById('save-html').addEventListener('click', async () => {
        const htmlCode = document.getElementById('html-code-editor').value;
        
        try {
          const response = await fetch(`/api/blog/pages/html/${slug}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/html'
            },
            body: htmlCode
          });
          
          if (response.ok) {
            alert('HTML saved successfully!');
            document.getElementById('html-editor-modal').remove();
          } else {
            alert('Failed to save HTML');
          }
        } catch (error) {
          console.error('Error saving HTML:', error);
          alert('Failed to save HTML: ' + error.message);
        }
      });
    }
    
    /**
     * Delete a blog page
     */
    async function deleteBlog(blogId) {
      if (!confirm('Are you sure you want to delete this blog page? This action cannot be undone.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/blog/pages/${blogId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Blog page deleted successfully');
          loadPublishedBlogs(); // Refresh the list
        } else {
          alert('Failed to delete blog page');
        }
      } catch (error) {
        console.error('Error deleting blog:', error);
        alert('Failed to delete blog page: ' + error.message);
      }
    }
    
    /**
     * Close the blog manager modal
     */
    function closeModal() {
      if (modalElement) {
        modalElement.style.display = 'none';
      }
    }
    
    /**
     * Simple markdown to HTML converter
     * Reusing the existing function from MarkdownManager with slight modifications
     */
    function simpleMarkdownToHtml(markdown) {
      if (!markdown) return '';
      
      // Preserve any existing HTML img tags
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
      
      // Replace images with custom size syntax
      html = html.replace(/!\[(.*?)\]\((.*?)\)(?:{([^}]*)})?/g, (match, alt, src, options) => {
        // Path handling
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
        
        // Just return a regular image tag (no special handling needed for blog)
        return `<img src="${src}" alt="${alt}" class="blog-image"${sizeAttrsStr}>`;
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
     * Update the language
     */
    function updateLanguage(language) {
      currentLanguage = language;
      console.log('BlogManager language updated to:', language);
      
      // Update any open modals
      if (modalElement && modalElement.style.display !== 'none') {
        closeModal();
        openBlogManagerModal();
      }
    }
    
    // Public API
    return {
      initialize: initialize,
      updateLanguage: updateLanguage,
      openModal: openBlogManagerModal
    };
  })();
  
  // Export the module for use in other files
  window.BlogManager = BlogManager;