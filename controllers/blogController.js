// blogController.js - Logic for blog operations
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

// Define directory paths
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'blog');
const BLOG_PAGES_DIR = path.join(__dirname, '..', 'public', 'blog');

// Create necessary directories
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

if (!fs.existsSync(BLOG_PAGES_DIR)) {
  fs.mkdirSync(BLOG_PAGES_DIR, { recursive: true });
}

/**
 * Get all available blog templates
 * GET /api/blog/templates
 */
exports.getTemplates = (req, res) => {
  try {
    // Check if templates directory exists and create default template if needed
    ensureDefaultTemplateExists();
    
    // Read template directories
    const templates = [];
    const templateDirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Get info for each template
    templateDirs.forEach(templateDir => {
      const templatePath = path.join(TEMPLATES_DIR, templateDir);
      const templateFile = path.join(templatePath, 'template.html');
      
      if (fs.existsSync(templateFile)) {
        // Find a preview image
        let previewImage = null;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
        for (const ext of imageExtensions) {
          const previewFile = path.join(templatePath, 'preview' + ext);
          if (fs.existsSync(previewFile)) {
            previewImage = `/templates/blog/${templateDir}/preview${ext}`;
            break;
          }
        }
        
        templates.push({
          id: templateDir,
          name: templateDir.charAt(0).toUpperCase() + templateDir.slice(1).replace(/-/g, ' '),
          preview_image: previewImage
        });
      }
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

/**
 * Generate a blog page from markdown content
 * POST /api/blog/generate
 */
exports.generateBlog = async (req, res) => {
  const { nodeId, templateId, title, slug } = req.body;
  
  console.log('Blog generation request:', { nodeId, templateId, title, slug });
  
  if (!nodeId || !templateId || !title || !slug) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate slug format (alphanumeric with hyphens)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' });
  }
  
  try {
    const db = await getDb();
    
    // Check if slug already exists
    const existingPage = await db.get('SELECT id FROM blog_pages WHERE slug = ?', [slug]);
    
    if (existingPage) {
      return res.status(400).json({ error: 'A blog page with this slug already exists' });
    }
    
    // Get the markdown content directly from file instead of database
    console.log('Fetching markdown for node:', nodeId);
    const markdownPath = path.join(__dirname, '..', 'markdown', `${nodeId}.md`);
    console.log('Looking for markdown file at:', markdownPath);
    
    let markdownContent = '';
    if (fs.existsSync(markdownPath)) {
      console.log('Markdown file found, reading content');
      markdownContent = fs.readFileSync(markdownPath, 'utf8');
    } else {
      console.log('No markdown file found for node');
      return res.status(404).json({ error: 'No markdown content found for this node' });
    }
    
    // Get the template
    const templateFile = path.join(TEMPLATES_DIR, templateId, 'template.html');
    console.log('Template path:', templateFile);
    console.log('Template exists:', fs.existsSync(templateFile));
    
    if (!fs.existsSync(templateFile)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let templateHtml = fs.readFileSync(templateFile, 'utf8');
    
    // Convert markdown to HTML
    console.log('Converting markdown to HTML, markdown length:', markdownContent.length);
    let contentHtml;
    try {
      contentHtml = markdownToHtml(markdownContent);
      console.log('Markdown converted to HTML successfully');
    } catch (mdError) {
      console.error('Error converting markdown to HTML:', mdError);
      return res.status(500).json({ error: 'Failed to convert markdown to HTML' });
    }
    
    // Replace placeholders in the template
    const date = new Date().toLocaleDateString();
    const year = new Date().getFullYear();
    
    templateHtml = templateHtml
      .replace(/{{title}}/g, title)
      .replace(/{{content}}/g, contentHtml)
      .replace(/{{date}}/g, date)
      .replace(/{{year}}/g, year);
    
    console.log('Template processed with content');
    
    // Create blog directory if it doesn't exist
    if (!fs.existsSync(BLOG_PAGES_DIR)) {
      console.log('Creating blog directory:', BLOG_PAGES_DIR);
      fs.mkdirSync(BLOG_PAGES_DIR, { recursive: true });
    }
    
    // Write the HTML file
    const blogFilePath = path.join(BLOG_PAGES_DIR, `${slug}.html`);
    console.log('Writing blog file to:', blogFilePath);
    fs.writeFileSync(blogFilePath, templateHtml);
    
    // Save the blog page info to the database
    console.log('Saving blog page info to database');
    await db.run(
      'INSERT INTO blog_pages (node_id, template_id, title, slug) VALUES (?, ?, ?, ?)',
      [nodeId, templateId, title, slug]
    );
    
    console.log('Blog generated successfully!');
    res.json({ success: true, slug });
  } catch (error) {
    console.error('Error in blog generation:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get all published blog pages
 * GET /api/blog/pages
 */
exports.getAllBlogPages = async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM blog_pages ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching blog pages:', err);
    return res.status(500).json({ error: 'Failed to fetch blog pages' });
  }
};

/**
 * Get a specific blog page by ID
 * GET /api/blog/pages/:id
 */
exports.getBlogPageById = async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT * FROM blog_pages WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Blog page not found' });
    }
    
    res.json(row);
  } catch (err) {
    console.error('Error fetching blog page:', err);
    return res.status(500).json({ error: 'Failed to fetch blog page' });
  }
};

/**
 * Get HTML content of a blog page by slug
 * GET /api/blog/pages/html/:slug
 */
exports.getBlogHtml = (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (!fs.existsSync(blogFilePath)) {
    return res.status(404).json({ error: 'Blog page not found' });
  }
  
  const html = fs.readFileSync(blogFilePath, 'utf8');
  res.set('Content-Type', 'text/html');
  res.send(html);
};

/**
 * Update HTML content of a blog page
 * POST /api/blog/pages/html/:slug
 */
exports.updateBlogHtml = async (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (!fs.existsSync(blogFilePath)) {
    return res.status(404).json({ error: 'Blog page not found' });
  }
  
  // Get the raw HTML content from the request body
  let htmlContent = '';
  req.on('data', chunk => {
    htmlContent += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      // Write the HTML file
      fs.writeFileSync(blogFilePath, htmlContent);
      
      // Update the 'updated_at' timestamp in the database
      const db = await getDb();
      await db.run(
        'UPDATE blog_pages SET updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
        [req.params.slug]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving blog HTML:', error);
      res.status(500).json({ error: 'Failed to save blog HTML' });
    }
  });
};

/**
 * Delete a blog page
 * DELETE /api/blog/pages/:id
 */
exports.deleteBlogPage = async (req, res) => {
  try {
    const db = await getDb();
    
    // Get the slug for the page to delete the file
    const row = await db.get('SELECT slug FROM blog_pages WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Blog page not found' });
    }
    
    // Delete the HTML file
    const blogFilePath = path.join(BLOG_PAGES_DIR, `${row.slug}.html`);
    if (fs.existsSync(blogFilePath)) {
      fs.unlinkSync(blogFilePath);
    }
    
    // Delete the database entry
    await db.run('DELETE FROM blog_pages WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog page:', error);
    res.status(500).json({ error: 'Failed to delete blog page' });
  }
};

/**
 * Serve a blog page
 * GET /blog/:slug
 */
exports.serveBlogPage = (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (fs.existsSync(blogFilePath)) {
    res.sendFile(blogFilePath);
  } else {
    res.status(404).send('Blog page not found');
  }
};

/**
 * Helper function to ensure the default template exists
 */
function ensureDefaultTemplateExists() {
  const defaultTemplateDir = path.join(TEMPLATES_DIR, 'default');
  if (!fs.existsSync(defaultTemplateDir)) {
    fs.mkdirSync(defaultTemplateDir, { recursive: true });
    
    // Create a simple default template
    const templateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .metadata {
            color: #666;
            font-size: 0.9em;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
          }
          code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 3px solid #ccc;
            margin-left: 0;
            padding-left: 15px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>{{title}}</h1>
          <div class="metadata">
            <span>Posted on: {{date}}</span>
          </div>
        </header>
        <main>
          {{content}}
        </main>
        <footer>
          <p>&copy; {{year}} - Generated from Luhmann-Roam</p>
        </footer>
      </body>
      </html>
    `;
    
    fs.writeFileSync(path.join(defaultTemplateDir, 'template.html'), templateHtml);
    
    // Create a preview image (dummy content)
    const previewHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#f5f5f5"/>
        <text x="200" y="150" font-family="Arial" font-size="24" text-anchor="middle">Default Template</text>
      </svg>
    `;
    fs.writeFileSync(path.join(defaultTemplateDir, 'preview.svg'), previewHtml);
  }
}

/**
 * Helper function to convert markdown to HTML
 */
function markdownToHtml(markdown) {
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