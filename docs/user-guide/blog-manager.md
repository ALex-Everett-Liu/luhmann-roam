---
title: Blog Manager
---

# Blog Manager

The Blog Manager allows you to convert your markdown notes into polished HTML blog pages using customizable templates. This feature makes it easy to publish and share your content.

## Features

- Convert markdown content from any node into a standalone HTML page
- Choose from multiple pre-designed templates
- Preview how your blog post will look before publishing
- Edit the generated HTML directly for custom styling
- Manage all your published blog pages in one place
- Delete blog pages when they're no longer needed

## Creating a Blog Page

1. Click the "Blog Manager" button in the sidebar
2. Select a node that contains markdown content
3. Click "Preview" to see the markdown rendered as HTML
4. Choose a template from the dropdown
5. Enter a title for your blog post
6. Enter a URL slug (this will be used in the URL, e.g., /blog/my-post)
7. Click "Generate Blog Page" to publish your blog

## Custom HTML Editing

After generating a blog page, you can further customize it:

1. Click "Edit HTML" to open the HTML editor
2. Make changes to the HTML code
3. Switch to "Preview" to see how your changes look
4. Click "Save Changes" to update the blog page

## Managing Blog Pages

1. In the Blog Manager, click the "Manage Blogs" tab
2. View a list of all your published blog pages
3. Click "View" to open a blog page in a new tab
4. Click "Edit" to modify a blog page
5. Click "Delete" to remove a blog page

## Creating Custom Templates

You can create your own blog templates:

1. In the server's templates/blog directory, create a new folder (e.g., "my-template")
2. Create a template.html file in that folder with your custom HTML
3. Add a preview.png image to display in the template selector
4. Use {{title}}, {{content}}, {{date}} and {{year}} placeholders in your template

## Tips for Blog Pages

- Use high-quality images in your markdown content
- Structure your content with clear headers (# and ## markdown syntax)
- Add formatting like bold, italic, and lists for better readability
- Include code blocks with appropriate syntax highlighting
- Use blockquotes for important quotes or takeaways
- Preview your blog before publishing to ensure everything looks correct