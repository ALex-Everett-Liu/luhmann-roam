# DCIM Module Migration Guide

## Overview
This document outlines the process of migrating the Digital Content Image Management (DCIM) module from the Luhmann-Roam application to a standalone project. The DCIM module provides comprehensive image management functionality including uploading, viewing, converting, and organizing images.

## Data Model

### Core Entities

1. Images (dcim_images table)

- id: UUID primary key
- filename: Image filename
- url: Web URL to the image (optional)
- file_path: Local file path (optional)

3. Directories (dcim_directories table)

- id: UUID primary key
- name: Directory name

## UI/Frontend Functionality

### Key Components

1. Image Grid
    - Displays thumbnails of images in a responsive grid
    - Shows basic metadata (filename, size, rating)
    - Supports filtering and sorting

2. Image Detail View
    - Form to edit all image metadata
    - Buttons for operations (save, delete, convert)
    - Link to full image viewer

## Backend API

### Endpoints

1. GET /api/dcim
    - Retrieves all images
    - Returns array of image objects

### Backend Dependencies

Express.js for API routing
Multer for file uploads
Sharp for image processing
UUID for ID generation
SQLite database (via custom DB interface)