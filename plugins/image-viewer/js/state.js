// Global state for Image Viewer Plugin

let images = [];
let currentImage = null;
let zoomLevel = 1;
let isFullscreen = false;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let allTags = [];
let selectedTags = [];
let tagFilterSearchQuery = '';
let currentTagPage = 1;
const TAGS_PER_PAGE = 20;
let currentImagePage = 1;
const IMAGES_PER_PAGE = 24;
let scanFolders = [];

