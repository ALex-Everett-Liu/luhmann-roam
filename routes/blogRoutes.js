// blogRoutes.js - Routes for blog operations
const express = require('express');
const blogController = require('../controllers/blogController');

const router = express.Router();

// Get all blog templates
router.get('/templates', blogController.getTemplates);

// Generate a blog page
router.post('/generate', blogController.generateBlog);

// Get all published blog pages
router.get('/pages', blogController.getAllBlogPages);

// Get a specific blog page by ID
router.get('/pages/:id', blogController.getBlogPageById);

// Get HTML content of a blog page by slug
router.get('/pages/html/:slug', blogController.getBlogHtml);

// Update HTML content of a blog page
router.post('/pages/html/:slug', blogController.updateBlogHtml);

// Delete a blog page
router.delete('/pages/:id', blogController.deleteBlogPage);

module.exports = router;