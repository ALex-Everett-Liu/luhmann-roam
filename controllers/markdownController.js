// markdownController.js - Logic for markdown operations
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

// Define markdown directory path
const markdownDir = path.join(__dirname, '..', 'markdown');

// Create markdown directory if it doesn't exist
if (!fs.existsSync(markdownDir)) {
  fs.mkdirSync(markdownDir, { recursive: true });
}

/**
 * Get markdown content for a node
 * GET /api/nodes/:id/markdown
 */
exports.getMarkdown = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (error) {
    console.error('Error retrieving markdown:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save markdown content for a node
 * POST /api/nodes/:id/markdown
 */
exports.saveMarkdown = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    fs.writeFileSync(filePath, content);
    
    // Update the node to indicate it has markdown
    const db = await getDb();
    await db.run(
      'UPDATE nodes SET has_markdown = 1, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving markdown:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete markdown content for a node
 * DELETE /api/nodes/:id/markdown
 */
exports.deleteMarkdown = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update the node to indicate it no longer has markdown
    const db = await getDb();
    await db.run(
      'UPDATE nodes SET has_markdown = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting markdown:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Convert markdown to HTML (utility function)
 * @param {string} markdown - The markdown content to convert
 * @returns {string} HTML content
 */
exports.markdownToHtml = function(markdown) {
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
    
    return `<img src="${src}" alt="${alt}" class="markdown-image"${sizeAttrsStr}>`;
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
  html = html.replace(/```(.+?)```/gs, '<pre class="code-block"><code>$1</code></pre>');
  
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
};