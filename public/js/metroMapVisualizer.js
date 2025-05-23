/**
 * MetroMapVisualizer - A module for visualizing nodes as a metro/subway map
 * 
 * This module creates a subway-style map visualization of nodes based on node attributes.
 * It allows users to:
 * - View nodes as stations on metro lines
 * - Navigate between connected stations
 * - Create and edit metro lines and stations
 * 
 * Implementation follows the same pattern as CosmicNodeVisualizer2D using the revealing
 * module pattern for proper encapsulation.
 */

const MetroMapVisualizer = (function() {
    // Private variables
    let canvas, ctx;
    let container;
    let currentNode;
    let stations = [];
    let lines = [];
    let interchanges = [];
    let animationFrameId = null;
    let _isVisible = false;
    let zoomLevel = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let minZoom = 0.2;
    let maxZoom = 3;
    let selectedStation = null;
    let selectedLine = null;
    let editMode = false;
    
    // Add these variables to the private variables section (around line 27)
    let stationScaleFactor = 1.0;
    let textScaleFactor = 1.0;
    
    // Add these constants for min/max scaling (near the other constants)
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 5.0;
    const DEFAULT_SCALE = 1.0;
    
    // Constants for the visualization
    const STATION_RADIUS = 8;
    const INTERCHANGE_RADIUS = 12;
    const LINE_WIDTH = 6;
    const GRID_SIZE = 40;
    const STATION_COLORS = {
        regular: '#ffffff',
        selected: '#ffcc00',
        terminal: '#f0f0f0',
        interchange: '#ffffff'
    };
    
    // Metro line colors 
    const LINE_COLORS = [
        '#e41a1c', // Red
        '#377eb8', // Blue
        '#4daf4a', // Green
        '#984ea3', // Purple
        '#ff7f00', // Orange
        '#ffff33', // Yellow
        '#a65628', // Brown
        '#f781bf', // Pink
        '#999999', // Gray
        '#00ffff', // Cyan
        '#8a2be2', // Violet
        '#006400'  // Dark Green
    ];
    
    // Add these variables to the private variables section
    let showOrderNumbers = false;  // Toggle for showing order numbers instead of station names
    let orderViewMode = false;     // Toggle for the order view mode that fades station names
    
    // Add these constants for transit types near the other constants
    const TRANSIT_TYPES = {
        METRO: 'metro',
        BUS: 'bus',
        STREETCAR: 'streetcar',
        BRT: 'brt'
    };
    
    // Add line style constants based on transit type
    const LINE_STYLES = {
        [TRANSIT_TYPES.METRO]: {
            width: 6,
            dash: []  // Solid line
        },
        [TRANSIT_TYPES.BUS]: {
            width: 4,
            dash: [5, 5]  // Dashed line
        },
        [TRANSIT_TYPES.STREETCAR]: {
            width: 3,
            dash: [8, 4]  // Long dash
        },
        [TRANSIT_TYPES.BRT]: {
            width: 5,
            dash: [10, 4, 4, 4]  // Dash-dot pattern
        }
    };
    
    // Add station style constants based on transit type
    const STATION_STYLES = {
        [TRANSIT_TYPES.METRO]: {
            radius: STATION_RADIUS,
            interchangeRadius: INTERCHANGE_RADIUS,
            color: '#ffffff'
        },
        [TRANSIT_TYPES.BUS]: {
            radius: STATION_RADIUS * 0.8,
            interchangeRadius: INTERCHANGE_RADIUS * 0.8,
            color: '#f2f2f2',
            shape: 'square'  // Bus stops are square
        },
        [TRANSIT_TYPES.STREETCAR]: {
            radius: STATION_RADIUS * 0.7,
            interchangeRadius: INTERCHANGE_RADIUS * 0.7,
            color: '#e6e6e6',
            shape: 'diamond'  // Streetcar stops are diamond shaped
        },
        [TRANSIT_TYPES.BRT]: {
            radius: STATION_RADIUS * 0.9,
            interchangeRadius: INTERCHANGE_RADIUS * 0.9,
            color: '#f8f8f8',
            shape: 'hexagon'  // BRT stations are hexagonal
        }
    };
    
    // Initialize the visualizer
    function initialize() {
        console.log('Initializing Metro Map Visualizer');
        
        // Add custom styles
        // const styleElement = document.createElement('style');
        // styleElement.textContent = metroStyles;
        // document.head.appendChild(styleElement);
        
        createContainer();
        
        // Load scale settings
        loadScaleSettings();
        
        // Set up pan and zoom
        setupPanAndZoom();
        
        // Set up edit mode handlers
        setupEditModeHandlers();
        
        // Prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Add event listeners for window resize
        window.addEventListener('resize', onWindowResize);
        
        // Hide initially
        hide();
    }
    
    // Create the container and canvas
    function createContainer() {
        // Create main container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.className = 'metro-visualizer-container';
            document.body.appendChild(container);
        }

        // Remove existing canvas if it exists
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        // Create new canvas element
        canvas = document.createElement('canvas');
        container.appendChild(canvas);
        
        // Get the 2D context
        ctx = canvas.getContext('2d');
        
        // Set up the controls
        setupControls();
        
        // Create info panel
        createInfoPanel();
    }

    // Add this function before setupControls or after it
    function toggleScaleSettings() {
        const scalePanel = container.querySelector('.metro-scale-settings');
        
        if (scalePanel) {
            scalePanel.remove();
        } else {
            createScaleSettings();
        }
    }

    // Make sure createScaleSettings is defined before toggleScaleSettings is called
    function createScaleSettings() {
        // Check if settings panel already exists
        const existingPanel = container.querySelector('.metro-scale-settings');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Load saved scale settings
        loadScaleSettings();
        
        // Create settings panel
        const scalePanel = document.createElement('div');
        scalePanel.className = 'metro-scale-settings';
        
        scalePanel.innerHTML = `
            <h3>Scale Settings</h3>
            
            <div class="metro-scale-slider">
                <label for="station-scale">Station Size: <span class="scale-value">${(stationScaleFactor * 100).toFixed(0)}%</span></label>
                <input type="range" id="station-scale" min="${MIN_SCALE * 100}" max="${MAX_SCALE * 100}" value="${stationScaleFactor * 100}" step="5">
            </div>
            
            <div class="metro-scale-slider">
                <label for="text-scale">Text Size: <span class="scale-value">${(textScaleFactor * 100).toFixed(0)}%</span></label>
                <input type="range" id="text-scale" min="${MIN_SCALE * 100}" max="${MAX_SCALE * 100}" value="${textScaleFactor * 100}" step="5">
            </div>
            
            <div class="metro-scale-actions">
                <button class="reset">Reset to Default</button>
                <button class="save">Save Settings</button>
            </div>
        `;
        
        container.appendChild(scalePanel); // The scalePanel is appended to the main container, making it visible on the page.
        
        // Add event listeners
        const stationScaleSlider = scalePanel.querySelector('#station-scale');
        const textScaleSlider = scalePanel.querySelector('#text-scale');
        const stationScaleValue = scalePanel.querySelector('label[for="station-scale"] .scale-value');
        const textScaleValue = scalePanel.querySelector('label[for="text-scale"] .scale-value');
        const resetButton = scalePanel.querySelector('button.reset');
        const saveButton = scalePanel.querySelector('button.save');
        
        // Update values as sliders are moved
        stationScaleSlider.addEventListener('input', (e) => {
            stationScaleFactor = parseInt(e.target.value) / 100;
            stationScaleValue.textContent = `${(stationScaleFactor * 100).toFixed(0)}%`;
            drawMap();
        });
        
        textScaleSlider.addEventListener('input', (e) => {
            textScaleFactor = parseInt(e.target.value) / 100;
            textScaleValue.textContent = `${(textScaleFactor * 100).toFixed(0)}%`;
            drawMap();
        });
        
        // Reset button
        resetButton.addEventListener('click', () => {
            stationScaleFactor = DEFAULT_SCALE;
            textScaleFactor = DEFAULT_SCALE;
            stationScaleSlider.value = DEFAULT_SCALE * 100;
            textScaleSlider.value = DEFAULT_SCALE * 100;
            stationScaleValue.textContent = `${(DEFAULT_SCALE * 100).toFixed(0)}%`;
            textScaleValue.textContent = `${(DEFAULT_SCALE * 100).toFixed(0)}%`;
            drawMap();
        });
        
        // Save button
        saveButton.addEventListener('click', () => {
            saveScaleSettings();
            // Provide feedback
            saveButton.textContent = 'Saved!';
            setTimeout(() => {
                saveButton.textContent = 'Save Settings';
            }, 1500);
        });
    }

    // Also make sure these functions are defined
    function loadScaleSettings() {
        try {
            const savedSettings = localStorage.getItem('metroMapScaleSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                stationScaleFactor = settings.stationScale || DEFAULT_SCALE;
                textScaleFactor = settings.textScale || DEFAULT_SCALE;
                console.log('Loaded scale settings:', { stationScaleFactor, textScaleFactor });
            } else {
                // Use defaults
                stationScaleFactor = DEFAULT_SCALE;
                textScaleFactor = DEFAULT_SCALE;
            }
        } catch (error) {
            console.error('Error loading scale settings:', error);
            // Use defaults on error
            stationScaleFactor = DEFAULT_SCALE;
            textScaleFactor = DEFAULT_SCALE;
        }
    }

    function saveScaleSettings() {
        try {
            const settings = {
                stationScale: stationScaleFactor,
                textScale: textScaleFactor
            };
            localStorage.setItem('metroMapScaleSettings', JSON.stringify(settings));
            console.log('Saved scale settings:', settings);
        } catch (error) {
            console.error('Error saving scale settings:', error);
        }
    }
    
    // Set up control buttons
    function setupControls() {
        const controls = document.createElement('div');
        controls.className = 'metro-controls';
        
        // Existing reset view button
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '⟲';
        resetButton.title = 'Reset view';
        resetButton.addEventListener('click', resetView);
        controls.appendChild(resetButton);
        
        // Add zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'metro-zoom-controls';
        
        // Zoom in button
        const zoomInButton = document.createElement('button');
        zoomInButton.innerHTML = '+';
        zoomInButton.title = 'Zoom in';
        zoomInButton.addEventListener('click', () => {
            setZoom(zoomLevel * 1.2);
        });
        zoomControls.appendChild(zoomInButton);
        
        // Zoom out button
        const zoomOutButton = document.createElement('button');
        zoomOutButton.innerHTML = '−';
        zoomOutButton.title = 'Zoom out';
        zoomOutButton.addEventListener('click', () => {
            setZoom(zoomLevel * 0.8);
        });
        zoomControls.appendChild(zoomOutButton);
        
        // Zoom level display
        const zoomDisplay = document.createElement('span');
        zoomDisplay.className = 'metro-zoom-display';
        zoomDisplay.id = 'metro-zoom-display';
        zoomDisplay.textContent = '100%';
        zoomControls.appendChild(zoomDisplay);
        
        controls.appendChild(zoomControls);
        
        // Toggle edit mode button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit Map';
        editButton.title = 'Toggle edit mode';
        editButton.addEventListener('click', toggleEditMode);
        controls.appendChild(editButton);
        
        // Add a "Manage Line" button for direct access
        const manageLineButton = document.createElement('button');
        manageLineButton.textContent = 'Manage Lines';
        manageLineButton.title = 'List and manage all metro lines';
        manageLineButton.addEventListener('click', openLineManagerDialog);
        controls.appendChild(manageLineButton);
        
        // Add a "Manage Stations" button for direct access
        const manageStationsButton = document.createElement('button');
        manageStationsButton.textContent = 'Manage Stations';
        manageStationsButton.title = 'List and manage all stations';
        manageStationsButton.addEventListener('click', openStationManagerDialog);
        controls.appendChild(manageStationsButton);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.className = 'metro-close-button';
        closeButton.title = 'Close metro map';
        closeButton.addEventListener('click', hide);
        controls.appendChild(closeButton);
        
        // Settings button
        const settingsButton = document.createElement('button');
        settingsButton.innerHTML = '⚙️';
        settingsButton.title = 'Scale Settings';
        settingsButton.addEventListener('click', toggleScaleSettings);
        controls.appendChild(settingsButton);
        
        // Add toggle order view button
        const orderViewButton = document.createElement('button');
        orderViewButton.id = 'toggle-order-view';
        orderViewButton.textContent = 'Show Order Numbers';
        orderViewButton.title = 'Toggle showing station order numbers';
        orderViewButton.addEventListener('click', toggleOrderView);
        controls.appendChild(orderViewButton);
        
        // Add transit type filters ONLY ONCE here
        setupTransitTypeFilters(controls);
        
        container.appendChild(controls);
    }
    
    // Add this function after toggleScaleSettings or in a similar location
    function toggleOrderView() {
        orderViewMode = !orderViewMode;
        drawMap();
        
        // Update UI to reflect the current mode
        const orderViewButton = container.querySelector('#toggle-order-view');
        if (orderViewButton) {
            orderViewButton.textContent = orderViewMode ? 'Hide Order Numbers' : 'Show Order Numbers';
            orderViewButton.classList.toggle('active', orderViewMode);
        }
    }
    
    // Create info panel
    function createInfoPanel() {
        const infoPanel = document.createElement('div');
        infoPanel.className = 'metro-info-panel';
        infoPanel.innerHTML = '<h3>Metro Map</h3><p>Click on a station to see more information.</p>';
        container.appendChild(infoPanel);
    }
    
    // Handle window resize
    function onWindowResize() {
        if (!_isVisible) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Redraw the map
        drawMap();
    }
    
    // Reset the view
    function resetView() {
        // Reset zoom and pan
        zoomLevel = 1;
        offsetX = 0;
        offsetY = 0;
        
        // Update zoom display
        updateZoomDisplay();
        
        // Redraw
        drawMap();
    }
    
    // Toggle edit mode
    function toggleEditMode() {
        editMode = !editMode;
        console.log('Edit mode toggled to:', editMode);
        
        // Show/hide edit mode banner
        if (editMode) {
            const banner = document.createElement('div');
            banner.className = 'metro-edit-mode-banner';
            banner.id = 'edit-mode-banner';
            banner.textContent = 'EDIT MODE';
            container.appendChild(banner);
            console.log('Edit mode banner added');
        } else {
            const banner = document.getElementById('edit-mode-banner');
            if (banner) banner.remove();
            console.log('Edit mode banner removed');
        }
        
        // Redraw the map
        drawMap();
    }
    
    // Set up pan and zoom
    function setupPanAndZoom() {
        // Mouse wheel for zoom
        canvas.addEventListener('wheel', handleMouseWheel);
        
        // Mouse down for pan or select
        canvas.addEventListener('mousedown', handleMouseDown);
        
        // Mouse move for pan
        canvas.addEventListener('mousemove', handleMouseMove);
        
        // Mouse up to end pan
        canvas.addEventListener('mouseup', handleMouseUp);
        
        // Mouse leave to end pan if cursor leaves canvas
        canvas.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // Handle mouse wheel for zooming
    function handleMouseWheel(event) {
        event.preventDefault();
        
        // Determine zoom direction
        const zoomDirection = event.deltaY < 0 ? 1 : -1;
        
        // Calculate new zoom level
        const zoomFactor = 1.1;
        const newZoom = zoomDirection > 0 ? 
            zoomLevel * zoomFactor : 
            zoomLevel / zoomFactor;
        
        // Apply zoom
        setZoom(newZoom);
    }
    
    // Handle mouse down for panning or selecting
    function handleMouseDown(event) {
        if (event.button === 2 || event.button === 1) {
            // Right or middle button for panning
            event.preventDefault();
            isDragging = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            // Change cursor to indicate panning is active
            canvas.style.cursor = 'grabbing';
        } else if (event.button === 0 && !editMode) {  // <-- Add check for !editMode
            // Left click for selection only when not in edit mode
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Check if clicking on a station
            handleCanvasClick(x, y);
        }
    }
    
    // Handle mouse move for panning
    function handleMouseMove(event) {
        if (isDragging) {
            // Calculate how much the mouse has moved
            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            
            // Update last position
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            // Update offset
            offsetX += deltaX;
            offsetY += deltaY;
            
            // Redraw
            drawMap();
        }
    }
    
    // Handle mouse up to end panning
    function handleMouseUp(event) {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
        }
    }
    
    // Handle mouse leave to end panning if cursor leaves canvas
    function handleMouseLeave(event) {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
        }
    }
    
    // Set zoom level
    function setZoom(newZoom) {
        // Constrain zoom level between min and max
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        // Update the zoom display
        updateZoomDisplay();
        
        // Redraw with new zoom level
        drawMap();
    }
    
    // Update zoom display
    function updateZoomDisplay() {
        const zoomDisplay = document.getElementById('metro-zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
        }
    }
    
    // Handle canvas click for selecting stations or lines
    function handleCanvasClick(x, y) {
        // Apply inverse transformation to click coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Adjust for the center, zoom, and offset with inverted Y
        const adjustedX = (x - centerX) / zoomLevel - offsetX / zoomLevel + centerX;
        const adjustedY = -(y - centerY) / zoomLevel + offsetY / zoomLevel + centerY;
        
        console.log('Clicked coordinates:', {
            original: { x, y },
            adjusted: { x: adjustedX, y: adjustedY }
        });
        
        // Check if clicking on a station
        for (const station of stations) {
            const dx = adjustedX - station.x;
            const dy = adjustedY - station.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const stationRadius = station.interchange ? INTERCHANGE_RADIUS : STATION_RADIUS;
            
            if (distance <= stationRadius) {
                // Select this station
                selectedStation = station;
                selectedLine = null;
                updateInfoPanel(station);
                drawMap();
                return;
            }
        }
        
        // If not on a station, check if clicking on a line
        for (const line of lines) {
            // Check each segment of the line
            for (let i = 0; i < line.stations.length - 1; i++) {
                const station1 = findStationById(line.stations[i]);
                const station2 = findStationById(line.stations[i + 1]);
                
                if (station1 && station2) {
                    if (isPointNearLineSegment(
                        adjustedX, adjustedY,
                        station1.x, station1.y,
                        station2.x, station2.y,
                        LINE_WIDTH
                    )) {
                        // Select this line
                        selectedLine = line;
                        selectedStation = null;
                        updateInfoPanelForLine(line);
                        drawMap();
                        return;
                    }
                }
            }
        }
        
        // If clicked on empty space, deselect
        selectedStation = null;
        selectedLine = null;
        resetInfoPanel();
        drawMap();
    }
    
    // Check if a point is near a line segment
    function isPointNearLineSegment(px, py, x1, y1, x2, y2, threshold) {
        // Calculate the distance from point to line segment
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= threshold;
    }
    
    // Find a station by its ID
    function findStationById(stationId) {
        return stations.find(s => s.id === stationId);
    }
    
    // Main drawing function
    function drawMap() {
        if (!canvas || !ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save the current context state
        ctx.save();
        
        // Apply transformations for zoom and pan
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Translate to the center
        ctx.translate(centerX, centerY);
        // Apply zoom centered on the canvas
        ctx.scale(zoomLevel, -zoomLevel); // Negative scale for Y to invert the axis
        // Apply pan offset
        ctx.translate(offsetX / zoomLevel, -offsetY / zoomLevel); // Negate offsetY
        // Translate back from the center
        ctx.translate(-centerX, -centerY);
        
        // Draw grid in edit mode
        if (editMode) {
            drawGrid();
        }
        
        // Draw metro lines
        drawLines();
        
        // Draw stations
        drawStations();
        
        // Restore the canvas state
        ctx.restore();
    }
    
    // Draw the grid for edit mode
    function drawGrid() {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 0.5;
        
        const gridSize = GRID_SIZE;
        const width = canvas.width;
        const height = canvas.height;
        
        // Calculate grid boundaries based on viewport
        const startX = Math.floor(-offsetX / zoomLevel / gridSize) * gridSize;
        const startY = Math.floor(-offsetY / zoomLevel / gridSize) * gridSize;
        const endX = width + Math.abs(offsetX / zoomLevel) + gridSize;
        const endY = height + Math.abs(offsetY / zoomLevel) + gridSize;
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }
    
    // Draw metro lines
    function drawLines() {
        for (const line of lines) {
            // Skip lines with less than 2 stations
            if (line.stations.length < 2) continue;
            
            // Skip if this transit type is filtered out
            const transitType = line.transit_type || TRANSIT_TYPES.METRO; // Default to metro if not specified
            const typeButton = document.querySelector(`.transit-filter-btn[data-type="${transitType}"]`);
            if (typeButton && !typeButton.classList.contains('active')) continue;
            
            // Get line style based on transit type
            const lineStyle = LINE_STYLES[transitType] || LINE_STYLES[TRANSIT_TYPES.METRO];
            
            ctx.strokeStyle = line.color;
            ctx.lineWidth = lineStyle.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Set line dash pattern if any
            ctx.setLineDash(lineStyle.dash);
            
            // Highlight selected line
            if (selectedLine && selectedLine.id === line.id) {
                ctx.lineWidth = lineStyle.width + 2;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
            }
            
            ctx.beginPath();
            
            // Find the first station
            const firstStation = findStationById(line.stations[0]);
            if (!firstStation) continue;
            
            ctx.moveTo(firstStation.x, firstStation.y);
            
            // Connect the dots for remaining stations
            for (let i = 1; i < line.stations.length; i++) {
                const station = findStationById(line.stations[i]);
                if (!station) continue;
                
                // Check if we need to draw curves or straight segments
                if (line.curved) {
                    // Get previous and next stations for curve calculation
                    const prevStation = findStationById(line.stations[i-1]);
                    
                    // Calculate control points for curved lines
                    // This is a simple midpoint control point, could be enhanced further
                    const midX = (prevStation.x + station.x) / 2;
                    const midY = (prevStation.y + station.y) / 2;
                    
                    // Draw quadratic curve
                    ctx.quadraticCurveTo(midX, midY, station.x, station.y);
                } else {
                    // Draw straight line segment
                    ctx.lineTo(station.x, station.y);
                }
            }
            
            ctx.stroke();
            
            // Reset dash pattern and shadow
            ctx.setLineDash([]);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }
    
    // Draw stations
    function drawStations() {
        for (const station of stations) {
            // Skip if this station's transit type is filtered out
            const transitType = station.transit_type || TRANSIT_TYPES.METRO; // Default to metro if not specified
            const typeButton = document.querySelector(`.transit-filter-btn[data-type="${transitType}"]`);
            if (typeButton && !typeButton.classList.contains('active')) continue;
            
            const x = station.x;
            const y = station.y;
            const isInterchange = station.interchange;
            const isTerminal = station.terminal;
            const isSelected = (selectedStation && selectedStation.id === station.id);
            
            // Get style based on transit type
            const stationStyle = STATION_STYLES[transitType] || STATION_STYLES[TRANSIT_TYPES.METRO];
            
            // Determine station radius with scaling
            const radius = (isInterchange ? stationStyle.interchangeRadius : stationStyle.radius) * stationScaleFactor;
            
            // Draw station based on shape
            ctx.beginPath();
            
            if (stationStyle.shape === 'square') {
                // Square for bus stops
                ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            } else if (stationStyle.shape === 'diamond') {
                // Diamond for streetcar stops
                ctx.moveTo(x, y - radius);
                ctx.lineTo(x + radius, y);
                ctx.lineTo(x, y + radius);
                ctx.lineTo(x - radius, y);
                ctx.closePath();
            } else if (stationStyle.shape === 'hexagon') {
                // Hexagon for BRT stations
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
                }
                ctx.closePath();
            } else {
                // Circle for metro stations (default)
                ctx.arc(x, y, radius, 0, Math.PI * 2);
            }
            
            // Fill and stroke based on station type
            if (isSelected) {
                // Selected station
                ctx.fillStyle = STATION_COLORS.selected;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
            } else if (isInterchange) {
                // Interchange station
                ctx.fillStyle = stationStyle.color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            } else if (isTerminal) {
                // Terminal station
                ctx.fillStyle = STATION_COLORS.terminal;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            } else {
                // Regular station
                ctx.fillStyle = stationStyle.color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
            }
            
            ctx.fill();
            ctx.stroke();
            
            // Save context before text rendering
            ctx.save();
            
            // Invert Y-axis again for text (so it's not drawn upside-down)
            ctx.scale(1, -1);
            
            // Determine the station order numbers for each line
            let stationOrderInfo = [];
            if (orderViewMode || showOrderNumbers) {
                for (const line of lines) {
                    const index = line.stations.indexOf(station.id);
                    if (index !== -1) {
                        stationOrderInfo.push({
                            lineId: line.id,
                            lineColor: line.color,
                            orderNumber: index + 1,
                            totalStations: line.stations.length
                        });
                    }
                }
            }
            
            // Draw station name (with inverted Y position) - fade if in order view mode
            const nameOpacity = orderViewMode ? 0.3 : 1;
            ctx.font = `${Math.round(12 * textScaleFactor)}px Arial`;
            ctx.fillStyle = `rgba(0, 0, 0, ${nameOpacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(station.name, x, -y - radius - 4 - 12); // Note the negative Y
            
            // Draw order numbers if enabled
            if (orderViewMode && stationOrderInfo.length > 0) {
                const orderY = -y - radius - 4 - 28; // Position above the station name
                
                // If multiple lines, arrange numbers horizontally
                const totalWidth = stationOrderInfo.length * 20;
                let startX = x - totalWidth / 2 + 10;
                
                stationOrderInfo.forEach(info => {
                    ctx.fillStyle = info.lineColor;
                    ctx.font = `bold ${Math.round(14 * textScaleFactor)}px Arial`;
                    
                    // Draw order badge with border
                    ctx.beginPath();
                    ctx.arc(startX, orderY + 7, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    // Draw order number
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(info.orderNumber.toString(), startX, orderY + 7);
                    
                    startX += 20;
                });
            }
            
            // Draw station marker if in edit mode
            if (editMode) {
                ctx.font = `${Math.round(10 * textScaleFactor)}px Arial`;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(`[${Math.round(x)},${Math.round(y)}]`, x, -y - radius - 20 - 10); // Note the negative Y
            }
            
            // Restore context after text rendering
            ctx.restore();
        }
    }
    
    // Update the info panel for a station
    function updateInfoPanel(station) {
        const infoPanel = container.querySelector('.metro-info-panel');
        if (!infoPanel) return;
        
        // Get station details
        const stationLines = findLinesForStation(station.id);
        
        let content = `<h3>${station.name}</h3>`;
        
        if (station.description) {
            content += `<p>${station.description}</p>`;
        }
        
        if (station.node_id) {
            content += `<p>Node ID: ${station.node_id}</p>`;
        }
        
        // Add line information
        if (stationLines.length > 0) {
            content += `<p>Lines: `;
            stationLines.forEach((line, index) => {
                content += `<span class="metro-line-badge" style="background-color:${line.color}"></span>${line.name}`;
                if (index < stationLines.length - 1) content += ', ';
            });
            content += `</p>`;
        }
        
        // Station type
        if (station.interchange) {
            content += `<p>Type: Interchange station</p>`;
        } else if (station.terminal) {
            content += `<p>Type: Terminal station</p>`;
        }
        
        // Add focus button if station corresponds to a node
        if (station.node_id) {
            content += `<button class="metro-focus-btn">Focus on this node</button>`;
        }
        
        infoPanel.innerHTML = content;
        
        // Add event listener to focus button
        const focusBtn = infoPanel.querySelector('.metro-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                hide();
                if (window.BreadcrumbManager && station.node_id) {
                    window.BreadcrumbManager.focusOnNode(station.node_id);
                }
            });
        }
    }
    
    // Update the info panel for a metro line
    function updateInfoPanelForLine(line) {
        const infoPanel = container.querySelector('.metro-info-panel');
        if (!infoPanel) return;
        
        let content = `
            <h3>
                <span class="metro-line-badge" style="background-color:${line.color}"></span>
                ${line.name}
            </h3>
        `;
        
        if (line.description) {
            content += `<p>${line.description}</p>`;
        }
        
        // Show stations on this line
        content += `<p>Stations (${line.stations.length}):</p>`;
        content += `<ul style="padding-left: 20px; margin-top: 5px;">`;
        for (const stationId of line.stations) {
            const station = findStationById(stationId);
            if (station) {
                content += `<li>${station.name}</li>`;
            }
        }
        content += `</ul>`;
        
        infoPanel.innerHTML = content;
    }
    
    // Reset info panel to default
    function resetInfoPanel() {
        const infoPanel = container.querySelector('.metro-info-panel');
        if (infoPanel) {
            infoPanel.innerHTML = '<h3>Metro Map</h3><p>Click on a station to see more information.</p>';
        }
    }
    
    // Find all lines that a station belongs to
    function findLinesForStation(stationId) {
        return lines.filter(line => line.stations.includes(stationId));
    }
    
    // Add a new station
    async function addStation(nodeId, options = {}) {
        try {
            // First fetch the node details to get its name
            const response = await fetch(`/api/nodes/${nodeId}`);
            const node = await response.json();
            
            if (!response.ok) {
                throw new Error('Failed to fetch node');
            }
            
            // Generate unique ID for the station
            const id = 'station_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            // Create station object
            const station = {
                id,
                node_id: nodeId,
                name: node.content,
                x: options.x || Math.floor(Math.random() * 500 + 100),
                y: options.y || Math.floor(Math.random() * 500 + 100),
                interchange: options.interchange || false,
                terminal: options.terminal || false,
                description: options.description || ''
            };
            
            // Save station to database
            await saveStationToDatabase(station);
            
            // Add to local array
            stations.push(station);
            
            // Redraw
            drawMap();
            
            return station;
        } catch (error) {
            console.error('Error adding station:', error);
            throw error;
        }
    }
    
    // Add a new metro line
    async function addLine(name, options = {}) {
        try {
            // Generate unique ID for the line
            const id = 'line_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            // Choose color (pick the next unused one)
            let color = options.color;
            if (!color) {
                const usedColors = lines.map(l => l.color);
                color = LINE_COLORS.find(c => !usedColors.includes(c)) || LINE_COLORS[0];
            }
            
            // Create line object
            const line = {
                id,
                name,
                color,
                stations: options.stations || [],
                curved: options.curved || false,
                description: options.description || ''
            };
            
            // Save line to database
            await saveLineToDatabase(line);
            
            // Add to local array
            lines.push(line);
            
            // Redraw
            drawMap();
            
            return line;
        } catch (error) {
            console.error('Error adding line:', error);
            throw error;
        }
    }
    
    // Add a station to a line
    async function addStationToLine(stationId, lineId) {
        try {
            const line = lines.find(l => l.id === lineId);
            if (!line) throw new Error('Line not found');
            
            const station = findStationById(stationId);
            if (!station) throw new Error('Station not found');
            
            // Don't add if already in the line
            if (line.stations.includes(stationId)) {
                return;
            }
            
               // Add this check before using line.stations.push
                if (typeof line.stations === 'string') {
                    line.stations = JSON.parse(line.stations);
                }
                
                // Ensure it's an array
                if (!Array.isArray(line.stations)) {
                    line.stations = [];
                }
                
                // Now it's safe to push
                line.stations.push(stationId);
            
            // Check if this is an interchange station
            const stationLines = findLinesForStation(stationId);
            if (stationLines.length > 1) {
                station.interchange = true;
                await updateStationInDatabase(station);
            }
            
            // Update line in database
            await updateLineInDatabase(line);
            
            // Redraw
            drawMap();
        } catch (error) {
            console.error('Error adding station to line:', error);
            throw error;
        }
    }
    
    // Show the visualizer with a node as the central station
    async function show(nodeId) {
        if (!nodeId) {
            console.error('Node ID is required to show the metro map');
            return;
        }
        
        console.log('Showing metro map for node:', nodeId);
        
        try {
            // Make sure container and canvas are created
            if (!container || !canvas) {
                console.log('Container or canvas not initialized, creating now...');
                createContainer();
            }
            
            // Set canvas size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Set container visible
            container.style.display = 'block';
            _isVisible = true;
            
            // Reset selection
            selectedStation = null;
            selectedLine = null;
            
            // Show loading
            showLoading();
            
            // Load data
            await loadMetroMapData(nodeId);
            
            // Generate and center the map
            centerMapOnNode(nodeId);
            
            // Hide loading
            hideLoading();
            
            // Start animation if needed
            startAnimation();
            
            console.log('Metro map should now be visible');
        } catch (error) {
            console.error('Error showing metro map:', error);
            hideLoading();
        }
    }
    
    // Load metro map data from the database
    async function loadMetroMapData(centralNodeId) {
        try {
            // Load stations
            const stationsResponse = await fetch('/api/metro-map/stations');
            // Load lines
            const linesResponse = await fetch('/api/metro-map/lines');
            
            if (!stationsResponse.ok || !linesResponse.ok) {
                // If API endpoints don't exist, check for node attributes with metro map data
                await loadFromNodeAttributes(centralNodeId);
            } else {
                // Load from dedicated tables
                stations = await stationsResponse.json();
                lines = await linesResponse.json();
            }
            
            // Ensure all lines have stations as arrays, not JSON strings
            lines = lines.map(line => {
                // If stations is a string, parse it
                if (typeof line.stations === 'string') {
                    try {
                        line.stations = JSON.parse(line.stations || '[]');
                    } catch (error) {
                        console.error('Error parsing stations for line:', line.id, error);
                        line.stations = [];
                    }
                }
                
                // If stations is not an array after parsing, initialize as empty array
                if (!Array.isArray(line.stations)) {
                    line.stations = [];
                }
                
                return line;
            });
            
            console.log('Loaded metro map data:', { stations, lines });
        } catch (error) {
            console.error('Error loading metro map data:', error);
            
            // If there's an error (likely because endpoints don't exist yet),
            // fall back to loading from node attributes
            await loadFromNodeAttributes(centralNodeId);
        }
    }
    
    // Load metro map data from node attributes
    async function loadFromNodeAttributes(centralNodeId) {
        try {
            // Approach: Fetch all nodes with metro_station attribute
            const response = await fetch('/api/nodes/query', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    query: 'metro_station:*',
                    page: 1,
                    pageSize: 100
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to query nodes with metro_station attribute');
            }
            
            const data = await response.json();
            
            // Clear existing data
            stations = [];
            lines = [];
            
            // Process nodes with metro_station attributes
            for (const node of data.results) {
                const stationAttr = node.attributes.find(a => a.key === 'metro_station');
                const lineAttr = node.attributes.find(a => a.key === 'metro_line');
                
                if (stationAttr) {
                    try {
                        // Parse station data from attribute value
                        const stationData = JSON.parse(stationAttr.value);
                        
                        // Create station object
                        const station = {
                            id: stationData.id || `station_${node.id}`,
                            node_id: node.id,
                            name: node.content,
                            x: stationData.x || Math.random() * 500,
                            y: stationData.y || Math.random() * 500,
                            interchange: stationData.interchange || false,
                            terminal: stationData.terminal || false,
                            description: stationData.description || ''
                        };
                        
                        stations.push(station);
                    } catch (parseError) {
                        console.error('Error parsing station data:', parseError);
                    }
                }
                
                if (lineAttr) {
                    try {
                        // Parse line data from attribute value
                        const lineData = JSON.parse(lineAttr.value);
                        
                        // Check if line already exists
                        const existingLine = lines.find(l => l.id === lineData.id);
                        
                        if (existingLine) {
                            // Add this station to the existing line if not already there
                            if (!existingLine.stations.includes(`station_${node.id}`)) {
                                existingLine.stations.push(`station_${node.id}`);
                            }
                        } else {
                            // Create new line
                            const line = {
                                id: lineData.id || `line_${Date.now()}`,
                                name: lineData.name || 'Line ' + (lines.length + 1),
                                color: lineData.color || LINE_COLORS[lines.length % LINE_COLORS.length],
                                stations: lineData.stations || [`station_${node.id}`],
                                curved: lineData.curved || false,
                                description: lineData.description || ''
                            };
                            lines.push(line);
                        }
                    } catch (parseError) {
                        console.error('Error parsing line data:', parseError);
                    }
                }
            }
            
            // If no stations were found, create a default station for the central node
            if (stations.length === 0 && centralNodeId) {
                const nodeResponse = await fetch(`/api/nodes/${centralNodeId}`);
                if (nodeResponse.ok) {
                    const node = await nodeResponse.json();
                    const defaultStation = {
                        id: `station_${centralNodeId}`,
                        node_id: centralNodeId,
                        name: node.content,
                        x: canvas.width / 2,
                        y: canvas.height / 2,
                        interchange: false,
                        terminal: true,
                        description: 'Central station'
                    };
                    stations.push(defaultStation);
                }
            }
        } catch (error) {
            console.error('Error loading from node attributes:', error);
            // Create minimal default data
            stations = [];
            lines = [];
        }
    }
    
    // Save a station to the database
    async function saveStationToDatabase(station) {
        try {
            // First, try to use dedicated endpoint if available
            try {
                const response = await fetch('/api/metro-map/stations', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(station)
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to saving as node attribute
            if (station.node_id) {
                const attrResponse = await fetch('/api/node-attributes', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        node_id: station.node_id,
                        key: 'metro_station',
                        value: JSON.stringify({
                            id: station.id,
                            x: station.x,
                            y: station.y,
                            interchange: station.interchange,
                            terminal: station.terminal,
                            description: station.description
                        })
                    })
                });
                
                if (!attrResponse.ok) {
                    throw new Error('Failed to save station as node attribute');
                }
                
                return station;
            } else {
                throw new Error('Cannot save station without node_id');
            }
        } catch (error) {
            console.error('Error saving station:', error);
            throw error;
        }
    }
    
    // Save a line to the database
    async function saveLineToDatabase(line) {
        try {
            // Add console log for debugging
            console.log('Saving line to database with transit_type:', line.transit_type);
            
            // First, try to use dedicated endpoint if available
            try {
                const response = await fetch('/api/metro-map/lines', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(line)
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to saving as node attribute on the first station in the line
            if (line.stations && line.stations.length > 0) {
                const stationId = line.stations[0];
                const station = stations.find(s => s.id === stationId);
                if (station && station.node_id) {
                    const attrResponse = await fetch('/api/node-attributes', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            node_id: station.node_id,
                            key: 'metro_line',
                            value: JSON.stringify({
                                ...line,
                                transit_type: line.transit_type // Ensure transit_type is included
                            })
                        })
                    });
                    if (!attrResponse.ok) {
                        throw new Error('Failed to save line as node attribute');
                    }
                    return line;
                }
            }
            throw new Error('Cannot save line without stations');
        } catch (error) {
            console.error('Error saving line:', error);
            throw error;
        }
    }
    
    // Update a station in the database
    async function updateStationInDatabase(station) {
        try {
            // Make a copy of the station object to ensure we don't modify the original
            const stationToUpdate = {...station};
            
            // Ensure boolean values are converted to 0/1 for database
            stationToUpdate.interchange = stationToUpdate.interchange ? 1 : 0;
            stationToUpdate.terminal = stationToUpdate.terminal ? 1 : 0;
            
            // Add console log for debugging
            console.log('Sending station update to database:', stationToUpdate);
            console.log('Transit type being sent:', stationToUpdate.transit_type);
            
            // Try dedicated endpoint first
            try {
                const response = await fetch(`/api/metro-map/stations/${stationToUpdate.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(stationToUpdate)
                });
                
                if (response.ok) {
                    // The response will update our local copy too
                    const updatedStation = await response.json();
                    console.log('Server response after update:', updatedStation);
                    
                    // Update the original station object with the updated values
                    station.interchange = updatedStation.interchange;
                    station.terminal = updatedStation.terminal;
                    station.transit_type = updatedStation.transit_type; // Make sure this gets updated
                    
                    return updatedStation;
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to updating node attribute with explicit boolean conversion
            if (stationToUpdate.node_id) {
                // First, get the existing attribute to get its ID
                const getAttrsResponse = await fetch(`/api/nodes/${stationToUpdate.node_id}/attributes`);
                if (!getAttrsResponse.ok) {
                    throw new Error('Failed to get node attributes');
                }
                
                const attributes = await getAttrsResponse.json();
                const stationAttr = attributes.find(a => a.key === 'metro_station');
                
                if (stationAttr) {
                    // Update the existing attribute with properly converted boolean values
                    // and make sure to include transit_type
                    const updateResponse = await fetch(`/api/node-attributes/${stationAttr.id}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            value: JSON.stringify({
                                id: stationToUpdate.id,
                                x: stationToUpdate.x,
                                y: stationToUpdate.y,
                                interchange: stationToUpdate.interchange ? 1 : 0,
                                terminal: stationToUpdate.terminal ? 1 : 0,
                                transit_type: stationToUpdate.transit_type, // Include transit_type here
                                description: stationToUpdate.description
                            })
                        })
                    });
                    
                    if (!updateResponse.ok) {
                        throw new Error('Failed to update station attribute');
                    }
                } else {
                    // Create new attribute
                    await saveStationToDatabase(stationToUpdate);
                }
                
                return stationToUpdate;
            } else {
                throw new Error('Cannot update station without node_id');
            }
        } catch (error) {
            console.error('Error updating station:', error);
            throw error;
        }
    }
    
    // Update a line in the database
    async function updateLineInDatabase(line) {
        try {
            // Make a copy of the line object to ensure we don't modify the original
            const lineToUpdate = {...line};
            
            // Ensure boolean values are converted to 0/1 for database
            lineToUpdate.curved = lineToUpdate.curved ? 1 : 0;
            
            // Try dedicated endpoint first
            try {
                const response = await fetch(`/api/metro-map/lines/${lineToUpdate.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(lineToUpdate)
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to updating node attribute
            if (lineToUpdate.stations && lineToUpdate.stations.length > 0) {
                const stationId = lineToUpdate.stations[0];
                const station = stations.find(s => s.id === stationId);
                
                if (station && station.node_id) {
                    // First, get the existing attribute to get its ID
                    const getAttrsResponse = await fetch(`/api/nodes/${station.node_id}/attributes`);
                    if (!getAttrsResponse.ok) {
                        throw new Error('Failed to get node attributes');
                    }
                    
                    const attributes = await getAttrsResponse.json();
                    const lineAttr = attributes.find(a => a.key === 'metro_line');
                    
                    if (lineAttr) {
                        // Update the existing attribute
                        const updateResponse = await fetch(`/api/node-attributes/${lineAttr.id}`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                value: JSON.stringify({
                                    ...lineToUpdate,
                                    curved: lineToUpdate.curved ? 1 : 0
                                })
                            })
                        });
                        
                        if (!updateResponse.ok) {
                            throw new Error('Failed to update line attribute');
                        }
                    } else {
                        // Create new attribute
                        await saveLineToDatabase(lineToUpdate);
                    }
                    
                    return lineToUpdate;
                }
            }
            
            throw new Error('Cannot update line without stations');
        } catch (error) {
            console.error('Error updating line:', error);
            throw error;
        }
    }
    
    // Center the map on a specific node
    function centerMapOnNode(nodeId) {
        // Find the station that corresponds to this node
        const station = stations.find(s => s.node_id === nodeId);
        if (station) {
            // Center the map on this station
            offsetX = 0;
            offsetY = 0;
            // Select this station
            selectedStation = station;
            selectedLine = null;
            // Update info panel
            updateInfoPanel(station);
        } else {
            // Reset selection
            selectedStation = null;
            selectedLine = null;
            resetInfoPanel();
        }
        // Draw the map
        drawMap();
    }
    
    // Start animation if needed
    function startAnimation() {
        // This is a placeholder - we may not need any animations
        // for the basic metro map, but could add them later
        drawMap();
    }
    
    // Show loading indicator
    function showLoading() {
        // Make sure container exists
        if (!container) {
            console.error('Container not initialized in showLoading');
            return;
        }
        
        // Remove existing loading indicator if present
        const existingLoading = container.querySelector('.metro-loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        
        const loading = document.createElement('div');
        loading.className = 'metro-loading';
        loading.textContent = 'Loading';
        container.appendChild(loading);
    }
    
    // Hide loading indicator
    function hideLoading() {
        // Make sure container exists
        if (!container) {
            console.error('Container not initialized in hideLoading');
            return;
        }
        
        const loading = container.querySelector('.metro-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    // Hide the visualizer
    function hide() {
        console.log('Hiding metro map visualizer');
        // Cancel animation frame if needed
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Hide container
        container.style.display = 'none';
        _isVisible = false;
    }
    
    // Check if visualizer is visible
    function isVisible() {
        return _isVisible;
    }
    
    // Add this function to handle map clicks in edit mode
    function setupEditModeHandlers() {
        console.log('Setting up edit mode handlers');
        console.log('Canvas element exists:', !!canvas);
        
        // Remove any existing click handler first to avoid duplicates
        canvas.removeEventListener('click', handleEditModeClick);
        
        // Add the click handler for edit mode
        canvas.addEventListener('click', handleEditModeClick);
    }
    
    // Handle clicks in edit mode
    async function handleEditModeClick(event) {
        console.log('Canvas click detected', {
            editMode,
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            stations: stations.length
        });
        
        // If not in edit mode, we should use the regular click handler
        if (!editMode) {
            // Instead of ignoring clicks in non-edit mode, handle them properly
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Use the regular handleCanvasClick function
            handleCanvasClick(x, y);
            return;
        }
        
        // Rest of the existing edit mode click handling code...
        // If right click or middle click, don't handle as edit
        if (event.button !== 0) return;
        
        // Get click coordinates adjusted for zoom and pan
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Apply inverse transformation to get actual map coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Adjust for the center, zoom, and offset
        const adjustedX = (x - centerX) / zoomLevel - offsetX / zoomLevel + centerX;
        const adjustedY = -(y - centerY) / zoomLevel + offsetY / zoomLevel + centerY;
        
        // Check if clicking on an existing station first
        for (const station of stations) {
            const dx = adjustedX - station.x;
            const dy = adjustedY - station.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const stationRadius = station.interchange ? INTERCHANGE_RADIUS : STATION_RADIUS;
            
            if (distance <= stationRadius) {
                // Open station edit menu
                openStationEditMenu(station, x, y);
                return;
            }
        }
        
        // Check if clicking on a line
        for (const line of lines) {
            // Check each segment of the line
            for (let i = 0; i < line.stations.length - 1; i++) {
                const station1 = findStationById(line.stations[i]);
                const station2 = findStationById(line.stations[i + 1]);
                
                if (station1 && station2) {
                    if (isPointNearLineSegment(
                        adjustedX, adjustedY,
                        station1.x, station1.y,
                        station2.x, station2.y,
                        LINE_WIDTH
                    )) {
                        // Open line edit menu
                        openLineEditMenu(line, x, y);
                        return;
                    }
                }
            }
        }
        
        // If not clicking on anything, add a new station
        console.log('No station or line clicked, opening node selector for new station');
        openNodeSelectorForNewStation(adjustedX, adjustedY, x, y);
    }
    
    // Enhanced function to create a new station with either existing or new node
    async function openNodeSelectorForNewStation(mapX, mapY, screenX, screenY) {
        try {
            console.log('Opening node selector for new station', { mapX, mapY, screenX, screenY });
            
            // Create a new element for node selection
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'metro-edit-menu';
            selectorContainer.style.left = `${screenX}px`;
            selectorContainer.style.top = `${screenY}px`;
            selectorContainer.style.position = 'absolute';
            selectorContainer.style.zIndex = '3000';
            selectorContainer.style.width = '350px'; // Make it wider for the new form
            
            // First, create and add structure for existing node option which we'll show by default
            selectorContainer.innerHTML = `
                <h3>Create New Station</h3>
                <div class="metro-tabs">
                    <button id="tab-existing-node" class="metro-tab active">Use Existing Node</button>
                    <button id="tab-new-node" class="metro-tab">Create New Node</button>
                </div>
                
                <div id="existing-node-content" class="tab-content" style="display: block;">
                    <p>Select a node to associate with this station:</p>
                    <select id="metro-node-selector" style="width: 100%; margin-bottom: 10px;">
                        <option value="">Loading nodes...</option>
                    </select>
                    <button id="metro-create-station">Create Station</button>
                    <button id="metro-cancel">Cancel</button>
                </div>
            `;
            
            container.appendChild(selectorContainer);
            
            // SEPARATELY create and append the new node section
            const newNodeSection = document.createElement('div');
            newNodeSection.id = 'new-node-content';
            newNodeSection.className = 'tab-content';
            newNodeSection.style.display = 'none';
            newNodeSection.innerHTML = `
                <p>Create a new node for this station:</p>
                <div style="margin-bottom: 10px;">
                    <label>Node Content:</label>
                    <input type="text" id="new-node-content-input" class="node-content-input" style="width: 100%;" placeholder="Enter node name/content">
                </div>
                <div style="margin-bottom: 10px;">
                    <label>Parent Node:</label>
                    <select id="parent-node-selector" style="width: 100%;">
                        <option value="">No parent (root node)</option>
                    </select>
                </div>
                <button id="create-node-and-station">Create Node & Station</button>
                <button id="new-node-cancel">Cancel</button>
            `;
            
            // Append the new node section to the container
            selectorContainer.appendChild(newNodeSection);
            
            console.log('Selector container added to DOM');
            
            // Add tab switching functionality (use event delegation for more reliability)
            selectorContainer.addEventListener('click', (event) => {
                const target = event.target;
                
                if (target.id === 'tab-existing-node') {
                    document.getElementById('existing-node-content').style.display = 'block';
                    document.getElementById('new-node-content').style.display = 'none';
                    document.getElementById('tab-existing-node').classList.add('active');
                    document.getElementById('tab-new-node').classList.remove('active');
                } 
                else if (target.id === 'tab-new-node') {
                    document.getElementById('existing-node-content').style.display = 'none';
                    document.getElementById('new-node-content').style.display = 'block';
                    document.getElementById('tab-existing-node').classList.remove('active');
                    document.getElementById('tab-new-node').classList.add('active');
                }
                else if (target.id === 'metro-create-station') {
                    const selectedNodeId = document.getElementById('metro-node-selector').value;
                    if (!selectedNodeId) {
                        alert('Please select a node');
                        return;
                    }
                    
                    createNewStation(selectedNodeId, mapX, mapY);
                    selectorContainer.remove();
                }
                else if (target.id === 'create-node-and-station') {
                    const nodeContentInput = document.getElementById('new-node-content-input');
                    const parentNodeSelector = document.getElementById('parent-node-selector');
                    
                    if (!nodeContentInput) {
                        console.error('Could not find new-node-content-input element');
                        alert('Error: Could not find the node content input field.');
                        return;
                    }
                    
                    const nodeContent = nodeContentInput.value.trim();
                    const parentNodeId = parentNodeSelector ? parentNodeSelector.value : '';
                    
                    if (!nodeContent) {
                        alert('Please enter content for the new node');
                        return;
                    }
                    
                    (async () => {
                        try {
                            // Create new node first
                            const newNodeId = await createNewNode(nodeContent, parentNodeId);
                            if (newNodeId) {
                                // Then create station for the new node
                                createNewStation(newNodeId, mapX, mapY);
                                selectorContainer.remove();
                            }
                        } catch (error) {
                            console.error('Error creating new node:', error);
                            alert(`Failed to create new node: ${error.message}`);
                        }
                    })();
                }
                else if (target.id === 'metro-cancel' || target.id === 'new-node-cancel') {
                    selectorContainer.remove();
                }
            });
            
            // Fetch available nodes
            console.log('Fetching available nodes');
            let availableNodes = [];
            try {
                const response = await fetch('/api/nodes');
                if (!response.ok) {
                    throw new Error(`Failed to fetch nodes: ${response.status}`);
                }
                availableNodes = await response.json();
                console.log(`Fetched ${availableNodes.length} nodes`);
                
                // Populate both selectors
                populateNodeSelectors(availableNodes);
                
            } catch (fetchError) {
                console.error('Error fetching nodes:', fetchError);
                handleFetchError(selectorContainer);
                return;
            }
            
            // Helper function to populate both node selectors
            function populateNodeSelectors(nodes) {
                // Populate existing node selector
                const existingNodeSelector = document.getElementById('metro-node-selector');
                if (existingNodeSelector) {
                    existingNodeSelector.innerHTML = '';
                    
                    if (nodes.length === 0) {
                        existingNodeSelector.innerHTML = '<option value="">No available nodes found</option>';
                    } else {
                        // Add a blank default option
                        existingNodeSelector.innerHTML = '<option value="">Select a node...</option>';
                        
                        for (const node of nodes) {
                            // Skip nodes that already have stations
                            if (stations.some(s => s.node_id === node.id)) continue;
                            
                            const option = document.createElement('option');
                            option.value = node.id;
                            option.textContent = node.content || `Node ${node.id}`;
                            existingNodeSelector.appendChild(option);
                        }
                    }
                }
                
                // Populate parent node selector
                const parentNodeSelector = document.getElementById('parent-node-selector');
                if (parentNodeSelector) {
                    // Keep the "No parent" option and add all nodes
                    for (const node of nodes) {
                        const option = document.createElement('option');
                        option.value = node.id;
                        option.textContent = node.content || `Node ${node.id}`;
                        parentNodeSelector.appendChild(option);
                    }
                }
            }
            
            // Helper function to handle fetch errors
            function handleFetchError(container) {
                container.innerHTML = `
                    <h3>Error Loading Nodes</h3>
                    <p>Could not load nodes from the server. Please try again.</p>
                    <button id="metro-cancel">Cancel</button>
                `;
                document.getElementById('metro-cancel')?.addEventListener('click', () => {
                    container.remove();
                });
            }
            
        } catch (error) {
            console.error('Error opening node selector:', error);
            alert('An error occurred while trying to create a new station. See console for details.');
        }
    }
    
    // Create a new station
    async function createNewStation(nodeId, x, y) {
        try {
            console.log('Creating new station for node:', nodeId, 'at position:', { x, y });
            
            // Get node details
            const response = await fetch(`/api/nodes/${nodeId}`);
            if (!response.ok) {
                throw new Error(`Failed to get node data: ${response.status}`);
            }
            
            const node = await response.json();
            console.log('Fetched node data:', node);
            
            // Create a station object
            const stationId = `station_${nodeId}`;
            const newStation = {
                id: stationId,
                node_id: nodeId,
                name: node.content || `Node ${nodeId}`,
                x: Math.round(x),
                y: Math.round(y),
                interchange: false,
                terminal: false,
                description: ''
            };
            
            console.log('Created new station object:', newStation);
            
            // Save to database
            console.log('Saving station to database');
            await saveStationToDatabase(newStation);
            
            // Add to stations array
            stations.push(newStation);
            console.log('Station added to stations array, now has', stations.length, 'stations');
            
            // Open station edit menu
            console.log('Opening edit menu for new station');
            openStationEditMenu(newStation, x, y);
            
            // Redraw
            drawMap();
        } catch (error) {
            console.error('Error creating station:', error);
            alert(`Failed to create station: ${error.message}`);
        }
    }
    
    // Open menu to edit station properties
    function openStationEditMenu(station, x, y) {
        // Create a new element for station editing
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        menuContainer.style.position = 'fixed';
        menuContainer.style.left = '50%';
        menuContainer.style.top = '40%';
        menuContainer.style.transform = 'translate(-50%, -50%)';
        menuContainer.style.maxHeight = '80vh';
        menuContainer.style.overflowY = 'auto';
        
        // Convert possible 0/1 values to booleans for proper checkbox handling
        const isInterchange = station.interchange === true || station.interchange === 1;
        const isTerminal = station.terminal === true || station.terminal === 1;
        
        // Create transit type options
        let transitTypeOptionsHTML = '';
        Object.entries(TRANSIT_TYPES).forEach(([key, type]) => {
            transitTypeOptionsHTML += `
                <option value="${type}" ${(station.transit_type || TRANSIT_TYPES.METRO) === type ? 'selected' : ''}>
                    ${key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
            `;
        });
        
        menuContainer.innerHTML = `
            <h3>Edit Station: ${station.name}</h3>
            <label>
                Description:
                <input type="text" id="station-description" value="${station.description || ''}" style="width: 100%;">
            </label>
            <div style="margin: 10px 0;">
                <label>Transit Type:
                    <select id="station-transit-type" style="width: 100%;">
                        ${transitTypeOptionsHTML}
                    </select>
                </label>
            </div>
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" id="station-interchange" ${isInterchange ? 'checked' : ''}>
                    Interchange Station
                </label>
            </div>
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" id="station-terminal" ${isTerminal ? 'checked' : ''}>
                    Terminal Station
                </label>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <button id="edit-station-save">Save</button>
                <button id="edit-station-delete">Delete</button>
                <button id="edit-station-cancel">Cancel</button>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
                <button id="add-to-line">Add to Line</button>
                <button id="create-new-line">Create New Line</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Add event listeners - explicitly convert checked state to integers (0/1)
        document.getElementById('edit-station-save').addEventListener('click', async () => {
            // Get updated values
            station.description = document.getElementById('station-description').value;
            station.transit_type = document.getElementById('station-transit-type').value;
            // Convert boolean checkbox states to 0/1 values for storage
            station.interchange = document.getElementById('station-interchange').checked ? 1 : 0;
            station.terminal = document.getElementById('station-terminal').checked ? 1 : 0;
            
            console.log('Saving station with transit type:', station.transit_type);
            
            // Save to database
            await updateStationInDatabase(station);
            
            // Remove menu and redraw
            menuContainer.remove();
            drawMap();
        });
        
        document.getElementById('edit-station-delete').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this station?')) {
                // Remove station from lines
                for (const line of lines) {
                    line.stations = line.stations.filter(id => id !== station.id);
                    if (line.stations.length > 0) {
                        await updateLineInDatabase(line);
                    }
                }
                
                // Remove station from array
                stations = stations.filter(s => s.id !== station.id);
                
                // Remove from database (we don't have a dedicated delete function, 
                // but we can handle this through node attributes for now)
                if (station.node_id) {
                    try {
                        const attrResponse = await fetch(`/api/nodes/${station.node_id}/attributes`);
                        if (attrResponse.ok) {
                            const attributes = await attrResponse.json();
                            const stationAttr = attributes.find(a => a.key === 'metro_station');
                            
                            if (stationAttr) {
                                // Delete the attribute
                                await fetch(`/api/node-attributes/${stationAttr.id}`, {
                                    method: 'DELETE'
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error deleting station attribute:', error);
                    }
                }
                
                // Remove menu and redraw
                menuContainer.remove();
                drawMap();
            }
        });
        
        document.getElementById('edit-station-cancel').addEventListener('click', () => {
            menuContainer.remove();
        });
        
        document.getElementById('add-to-line').addEventListener('click', () => {
            menuContainer.remove();
            openAddToLineMenu(station, x, y);
        });
        
        document.getElementById('create-new-line').addEventListener('click', () => {
            menuContainer.remove();
            openCreateLineMenu(station, x, y);
        });
    }
    
    // Open menu to add station to an existing line
    function openAddToLineMenu(station, x, y) {
        if (lines.length === 0) {
            alert('No lines exist. Create a new line first.');
            openCreateLineMenu(station, x, y);
            return;
        }
        
        // Create a new element for line selection
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        menuContainer.style.left = `${x}px`;
        menuContainer.style.top = `${y}px`;
        
        let lineOptionsHTML = '';
        for (const line of lines) {
            const lineColor = line.color || '#666';
            lineOptionsHTML += `
                <div style="margin: 5px 0;">
                    <label>
                        <input type="radio" name="line-select" value="${line.id}">
                        <span class="metro-line-badge" style="background-color:${lineColor}"></span>
                        ${line.name}
                    </label>
                </div>
            `;
        }
        
        menuContainer.innerHTML = `
            <h3>Add to Line</h3>
            <p>Select a line to add this station to:</p>
            <form id="line-select-form">
                ${lineOptionsHTML}
            </form>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="add-to-line-save">Add</button>
                <button id="add-to-line-cancel">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Add event listeners
        document.getElementById('add-to-line-save').addEventListener('click', async () => {
            const selectedLine = document.querySelector('input[name="line-select"]:checked');
            if (!selectedLine) {
                alert('Please select a line');
                return;
            }
            
            const lineId = selectedLine.value;
            const line = lines.find(l => l.id === lineId);
            
            if (line) {
                // Don't add if already in the line
                if (line.stations.includes(station.id)) {
                    alert('This station is already on this line');
                    menuContainer.remove();
                    return;
                }
                
                // Add station to line
                line.stations.push(station.id);
                
                // Update line in database
                await updateLineInDatabase(line);
                
                // Check if this is now an interchange station
                const stationLines = lines.filter(l => l.stations.includes(station.id));
                if (stationLines.length > 1 && !station.interchange) {
                    station.interchange = true;
                    await updateStationInDatabase(station);
                }
                
                // Remove menu and redraw
                menuContainer.remove();
                drawMap();
            }
        });
        
        document.getElementById('add-to-line-cancel').addEventListener('click', () => {
            menuContainer.remove();
        });
    }
    
    // Open menu to create a new line starting with the given station
    function openCreateLineMenu(station, x, y) {
        // Create a new element for creating a line
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        menuContainer.style.position = 'fixed';
        menuContainer.style.left = '50%';
        menuContainer.style.top = '40%';
        menuContainer.style.transform = 'translate(-50%, -50%)';
        menuContainer.style.maxHeight = '80vh';
        menuContainer.style.overflowY = 'auto';
        
        // Create transit type options
        let transitTypeOptionsHTML = '';
        Object.entries(TRANSIT_TYPES).forEach(([key, type]) => {
            transitTypeOptionsHTML += `
                <option value="${type}">
                    ${key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
            `;
        });
        
        // Create color picker options
        let colorOptionsHTML = '';
        for (const color of LINE_COLORS) {
            colorOptionsHTML += `
                <div style="display: inline-block; margin: 5px;">
                    <label>
                        <input type="radio" name="line-color" value="${color}">
                        <span style="display: inline-block; width: 20px; height: 20px; background-color:${color}; border-radius: 50%;"></span>
                    </label>
                </div>
            `;
        }
        
        menuContainer.innerHTML = `
            <h3>Create New Line</h3>
            <label>
                Line Name:
                <input type="text" id="line-name" placeholder="Line Name" style="width: 100%;">
            </label>
            <div style="margin: 10px 0;">
                <label>Transit Type:
                    <select id="line-transit-type" style="width: 100%;">
                        ${transitTypeOptionsHTML}
                    </select>
                </label>
            </div>
            <div style="margin: 10px 0;">
                <p>Line Color:</p>
                <div style="margin: 5px 0;">
                    ${colorOptionsHTML}
                </div>
            </div>
            <label>
                Description:
                <input type="text" id="line-description" placeholder="Line Description" style="width: 100%;">
            </label>
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" id="line-curved">
                    Use curved line segments
                </label>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="create-line-save">Create</button>
                <button id="create-line-cancel">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Select the first color by default
        const firstColorOption = menuContainer.querySelector('input[name="line-color"]');
        if (firstColorOption) firstColorOption.checked = true;
        
        // Use the default transit type based on the station's transit type
        const transitTypeSelector = document.getElementById('line-transit-type');
        if (transitTypeSelector && station.transit_type) {
            transitTypeSelector.value = station.transit_type;
        }
        
        // Add event listeners
        document.getElementById('create-line-save').addEventListener('click', async () => {
            const lineName = document.getElementById('line-name').value.trim();
            if (!lineName) {
                alert('Please enter a line name');
                return;
            }
            
            const lineTransitType = document.getElementById('line-transit-type').value;
            const lineColor = document.querySelector('input[name="line-color"]:checked')?.value || LINE_COLORS[0];
            const lineDescription = document.getElementById('line-description').value.trim();
            const lineCurved = document.getElementById('line-curved').checked;
            
            // Create a new line
            const lineId = `line_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
            const newLine = {
                id: lineId,
                name: lineName,
                transit_type: lineTransitType,
                color: lineColor,
                stations: [station.id],
                curved: lineCurved,
                description: lineDescription
            };
            
            // Save to database
            await saveLineToDatabase(newLine);
            
            // Add to lines array
            lines.push(newLine);
            
            // Remove menu and redraw
            menuContainer.remove();
            drawMap();
        });
        
        document.getElementById('create-line-cancel').addEventListener('click', () => {
            menuContainer.remove();
        });
    }
    
    // Open menu to edit a line
    function openLineEditMenu(line, x, y) {
        // Create a new element for editing a line
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        menuContainer.style.left = `${x}px`;
        menuContainer.style.top = `${y}px`;
        
        // Create color picker options
        let colorOptionsHTML = '';
        for (const color of LINE_COLORS) {
            colorOptionsHTML += `
                <div style="display: inline-block; margin: 5px;">
                    <label>
                        <input type="radio" name="line-color" value="${color}" ${line.color === color ? 'checked' : ''}>
                        <span style="display: inline-block; width: 20px; height: 20px; background-color:${color}; border-radius: 50%;"></span>
                    </label>
                </div>
            `;
        }
        
        // Convert possible 0/1 value to boolean for proper checkbox handling
        const isCurved = line.curved === true || line.curved === 1;
        
        menuContainer.innerHTML = `
            <h3>Edit Line: ${line.name}</h3>
            <label>
                Line Name:
                <input type="text" id="line-name" value="${line.name}" style="width: 100%;">
            </label>
            <div style="margin: 10px 0;">
                <p>Line Color:</p>
                <div style="margin: 5px 0;">
                    ${colorOptionsHTML}
                </div>
            </div>
            <label>
                Description:
                <input type="text" id="line-description" value="${line.description || ''}" style="width: 100%;">
            </label>
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" id="line-curved" ${isCurved ? 'checked' : ''}>
                    Use curved line segments
                </label>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="edit-line-save">Save</button>
                <button id="edit-line-delete">Delete</button>
                <button id="edit-line-cancel">Cancel</button>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
                <p>Stations on this line: ${line.stations.length}</p>
                <button id="manage-line-stations">Manage Stations</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Add event listeners with explicit 0/1 conversion
        document.getElementById('edit-line-save').addEventListener('click', async () => {
            // Get updated values
            line.name = document.getElementById('line-name').value.trim();
            line.color = document.querySelector('input[name="line-color"]:checked')?.value || line.color;
            line.description = document.getElementById('line-description').value.trim();
            // Convert boolean checkbox state to 0/1 value for storage
            line.curved = document.getElementById('line-curved').checked ? 1 : 0;
            
            console.log('Saving line with curved:', line.curved);
            
            // Save to database
            await updateLineInDatabase(line);
            
            // Remove menu and redraw
            menuContainer.remove();
            drawMap();
        });
        
        document.getElementById('edit-line-delete').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this line?')) {
                // Remove line from array
                lines = lines.filter(l => l.id !== line.id);
                
                // Remove from database (we don't have a dedicated delete function, 
                // but we can handle this through node attributes for now)
                if (line.stations && line.stations.length > 0) {
                    try {
                        const stationId = line.stations[0];
                        const station = stations.find(s => s.id === stationId);
                        
                        if (station && station.node_id) {
                            const attrResponse = await fetch(`/api/nodes/${station.node_id}/attributes`);
                            if (attrResponse.ok) {
                                const attributes = await attrResponse.json();
                                const lineAttr = attributes.find(a => a.key === 'metro_line');
                                
                                if (lineAttr) {
                                    // Delete the attribute
                                    await fetch(`/api/node-attributes/${lineAttr.id}`, {
                                        method: 'DELETE'
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error deleting line attribute:', error);
                    }
                }
                
                // Check if any stations are no longer interchanges
                for (const station of stations) {
                    const stationLines = lines.filter(l => l.stations.includes(station.id));
                    if (stationLines.length <= 1 && station.interchange) {
                        station.interchange = false;
                        await updateStationInDatabase(station);
                    }
                }
                
                // Remove menu and redraw
                menuContainer.remove();
                drawMap();
            }
        });
        
        document.getElementById('edit-line-cancel').addEventListener('click', () => {
            menuContainer.remove();
        });
        
        document.getElementById('manage-line-stations').addEventListener('click', () => {
            menuContainer.remove();
            openManageLineStationsMenu(line, x, y);
        });
    }
    
    // Open menu to manage stations on a line
    function openManageLineStationsMenu(line, x, y) {
        // Create a new element for managing stations
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        
        // Use fixed positioning and center it on screen instead of relative to click position
        menuContainer.style.position = 'fixed';
        menuContainer.style.left = '50%';
        menuContainer.style.top = '40%'; // Position it at 40% from top rather than 50% to make it higher
        menuContainer.style.transform = 'translate(-50%, -50%)';
        menuContainer.style.width = '350px';
        menuContainer.style.maxHeight = '80vh'; // Limit height to 80% of viewport
        menuContainer.style.overflowY = 'auto'; // Add scrolling if needed
        
        // Build list of stations on this line with drag handles and order numbers
        let stationListHTML = '';
        for (let i = 0; i < line.stations.length; i++) {
            const stationId = line.stations[i];
            const station = stations.find(s => s.id === stationId);
            
            if (station) {
                // Determine if this is a terminal station
                const isFirstStation = i === 0;
                const isLastStation = i === line.stations.length - 1;
                const terminalClass = (isFirstStation || isLastStation) ? 'station-terminal' : '';
                const terminalText = isFirstStation ? '(Start)' : (isLastStation ? '(End)' : '');
                
                stationListHTML += `
                    <div class="line-station-item ${terminalClass}" data-station-id="${station.id}" data-order="${i+1}" style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; border: 1px solid #ddd; background: #f8f8f8;">
                        <span class="station-order-badge" style="background-color: ${line.color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">${i+1}</span>
                        <span class="station-drag-handle" style="cursor: grab; margin-right: 10px;">≡</span>
                        <span style="flex-grow: 1;">${station.name} <small style="color: #666;">${terminalText}</small></span>
                        <button class="remove-station-btn" data-station-id="${station.id}" style="background: none; border: none; color: red; cursor: pointer;">×</button>
                    </div>
                `;
            }
        }
        
        // Show line direction controls if there are at least 2 stations
        const directionControlsHTML = line.stations.length >= 2 ? `
            <div style="margin: 15px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                <h4 style="margin-top: 0;">Line Direction</h4>
                <p>First station is the start, last station is the end.</p>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <button id="reverse-line-direction">↑↓ Reverse Direction</button>
                    <button id="toggle-order-view-local">👁️ Toggle Order View</button>
                </div>
            </div>
        ` : '';
        
        menuContainer.innerHTML = `
            <h3>Manage Stations on ${line.name}</h3>
            <p>Drag to reorder stations or use the direction controls:</p>
            ${directionControlsHTML}
            <div id="line-stations-list" style="max-height: 300px; overflow-y: auto;">
                ${stationListHTML}
            </div>
            <div style="margin-top: 15px;">
                <button id="add-more-stations">Add More Stations</button>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="save-station-order">Save Order</button>
                <button id="cancel-station-manage">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Set up event listeners
        setupStationDragHandlers(menuContainer, line);
        
        // Add event listener for the reverse direction button
        const reverseDirectionButton = document.getElementById('reverse-line-direction');
        if (reverseDirectionButton) {
            reverseDirectionButton.addEventListener('click', () => {
                // Reverse the array of stations
                line.stations.reverse();
                
                // Refresh the menu to show the new order
                menuContainer.remove();
                openManageLineStationsMenu(line, x, y);
            });
        }
        
        // Add event listener for the local order view toggle
        const toggleOrderViewButton = document.getElementById('toggle-order-view-local');
        if (toggleOrderViewButton) {
            toggleOrderViewButton.addEventListener('click', () => {
                toggleOrderView();
            });
        }
        
        document.getElementById('save-station-order').addEventListener('click', async () => {
            // Save the new order
            const stationElements = menuContainer.querySelectorAll('.line-station-item');
            const newOrder = Array.from(stationElements).map(el => el.dataset.stationId);
            
            // Update line stations
            line.stations = newOrder;
            
            // Update terminal status for stations
            if (line.stations.length >= 2) {
                // Mark first and last stations as terminals
                const firstStationId = line.stations[0];
                const lastStationId = line.stations[line.stations.length - 1];
                
                for (const stationId of line.stations) {
                    const station = stations.find(s => s.id === stationId);
                    if (station) {
                        // Set terminal status based on position in line
                        const isTerminal = (stationId === firstStationId || stationId === lastStationId);
                        
                        // Only update if the terminal status changed
                        if (station.terminal !== isTerminal) {
                            station.terminal = isTerminal;
                            await updateStationInDatabase(station);
                        }
                    }
                }
            }
            
            // Save to database
            await updateLineInDatabase(line);
            
            // Remove menu and redraw
            menuContainer.remove();
            drawMap();
        });
        
        document.getElementById('cancel-station-manage').addEventListener('click', () => {
            menuContainer.remove();
        });
        
        document.getElementById('add-more-stations').addEventListener('click', () => {
            menuContainer.remove();
            openAddStationsToLineMenu(line, x, y);
        });
        
        // Add event listeners for remove buttons
        menuContainer.querySelectorAll('.remove-station-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const stationId = this.dataset.stationId;
                
                // Remove station from line
                line.stations = line.stations.filter(id => id !== stationId);
                
                // If line has no stations left, delete it
                if (line.stations.length === 0) {
                    if (confirm('This line has no stations left. Delete the line?')) {
                        // Remove line from array
                        lines = lines.filter(l => l.id !== line.id);
                        menuContainer.remove();
                        drawMap();
                        return;
                    }
                }
                
                // Check if this station is still an interchange
                const station = stations.find(s => s.id === stationId);
                if (station) {
                    const stationLines = lines.filter(l => l.stations.includes(stationId));
                    if (stationLines.length <= 1 && station.interchange) {
                        station.interchange = false;
                        await updateStationInDatabase(station);
                    }
                }
                
                // Update line
                await updateLineInDatabase(line);
                
                // Refresh this menu
                menuContainer.remove();
                openManageLineStationsMenu(line, x, y);
            });
        });
    }
    
    // Set up drag and drop for station reordering
    function setupStationDragHandlers(menuContainer, line) {
        const stationsList = menuContainer.querySelector('#line-stations-list');
        let draggedItem = null;
        
        // Add event listeners to each drag handle
        menuContainer.querySelectorAll('.station-drag-handle').forEach(handle => {
            const item = handle.closest('.line-station-item');
            
            handle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                draggedItem = item;
                item.style.opacity = '0.5';
                
                // Add a class to indicate we're dragging
                item.classList.add('dragging');
                
                // Create a function for the drag move
                const moveAt = function(pageY) {
                    const rect = stationsList.getBoundingClientRect();
                    const scrollTop = stationsList.scrollTop;
                    const relativeY = pageY - rect.top + scrollTop;
                    
                    // Auto-scroll if near edges
                    if (pageY < rect.top + 30) {
                        stationsList.scrollTop -= 10;
                    } else if (pageY > rect.bottom - 30) {
                        stationsList.scrollTop += 10;
                    }
                    
                    // Find item we're hovering over
                    const items = Array.from(stationsList.querySelectorAll('.line-station-item:not(.dragging)'));
                    
                    for (const currentItem of items) {
                        const currentRect = currentItem.getBoundingClientRect();
                        const currentMiddle = currentRect.top + currentRect.height / 2;
                        
                        if (pageY < currentMiddle) {
                            stationsList.insertBefore(draggedItem, currentItem);
                            return;
                        }
                    }
                    
                    // If we get here, append to the end
                    stationsList.appendChild(draggedItem);
                };
                
                // Add the mousemove event to the document
                function onMouseMove(e) {
                    moveAt(e.pageY);
                }
                
                document.addEventListener('mousemove', onMouseMove);
                
                // Add mouseup to stop dragging
                document.addEventListener('mouseup', function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    if (draggedItem) {
                        draggedItem.style.opacity = '1';
                        draggedItem.classList.remove('dragging');
                        draggedItem = null;
                    }
                });
            });
        });
    }
    
    // Open menu to add more stations to a line
    function openAddStationsToLineMenu(line, x, y) {
        // Create a new element for adding stations
        const menuContainer = document.createElement('div');
        menuContainer.className = 'metro-edit-menu';
        menuContainer.style.left = `${x}px`;
        menuContainer.style.top = `${y}px`;
        menuContainer.style.width = '300px';  // Make it wider
        
        // Find stations not on this line
        const availableStations = stations.filter(station => !line.stations.includes(station.id));
        
        if (availableStations.length === 0) {
            alert('All stations are already on this line. Create a new station first.');
            menuContainer.remove();
            return;
        }
        
        let stationOptionsHTML = '';
        for (const station of availableStations) {
            stationOptionsHTML += `
                <div style="margin: 5px 0;">
                    <label>
                        <input type="checkbox" name="add-station" value="${station.id}">
                        ${station.name}
                    </label>
                </div>
            `;
        }
        
        menuContainer.innerHTML = `
            <h3>Add Stations to ${line.name}</h3>
            <p>Select stations to add:</p>
            <div style="max-height: 300px; overflow-y: auto;">
                ${stationOptionsHTML}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="add-stations-save">Add Selected</button>
                <button id="add-stations-cancel">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Add event listeners
        document.getElementById('add-stations-save').addEventListener('click', async () => {
            const selectedStations = Array.from(
                menuContainer.querySelectorAll('input[name="add-station"]:checked')
            ).map(input => input.value);
            
            if (selectedStations.length === 0) {
                alert('Please select at least one station to add');
                return;
            }
            
            // Add stations to line
            line.stations = [...line.stations, ...selectedStations];
            
            // Update interchange status for added stations
            for (const stationId of selectedStations) {
                const station = stations.find(s => s.id === stationId);
                if (station) {
                    const stationLines = lines.filter(l => l.stations.includes(stationId));
                    if (stationLines.length > 1 && !station.interchange) {
                        station.interchange = true;
                        await updateStationInDatabase(station);
                    }
                }
            }
            
            // Save to database
            await updateLineInDatabase(line);
            
            // Remove menu and redraw
            menuContainer.remove();
            drawMap();
        });
        
        document.getElementById('add-stations-cancel').addEventListener('click', () => {
            menuContainer.remove();
        });
    }
    
    // Function to create a new node in the database
    async function createNewNode(content, parentId) {
        try {
            console.log('Creating new node with content:', content, 'parent ID:', parentId || 'none (root)');
            
            // Calculate position (at the end of siblings)
            let position = 0;
            
            if (parentId) {
                // Get the count of existing children to place this at the end
                const childrenResponse = await fetch(`/api/nodes/${parentId}/children`);
                if (childrenResponse.ok) {
                    const children = await childrenResponse.json();
                    position = children.length;
                } else {
                    console.log('No existing children found or error retrieving them, using position 0');
                }
            } else {
                // Get the count of root nodes to place this at the end
                const rootNodesResponse = await fetch('/api/nodes?root=true');
                if (rootNodesResponse.ok) {
                    const rootNodes = await rootNodesResponse.json();
                    position = rootNodes.length;
                } else {
                    console.log('Error fetching root nodes, using position 0');
                }
            }
            
            // Create the new node
            const nodeData = {
                content: content,
                content_zh: content, // Use same content for both languages
                parent_id: parentId || null,
                position: position,
                is_expanded: true
            };
            
            const response = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nodeData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create node: ${response.status}`);
            }
            
            const newNode = await response.json();
            console.log('Successfully created new node:', newNode);
            
            return newNode.id;
        } catch (error) {
            console.error('Error in createNewNode:', error);
            throw error;
        }
    }
    
    // Helper function to ensure line.stations is always an array
    function ensureLineStationsArray(line) {
        if (!line) return line;
        
        // If stations is a string, parse it
        if (typeof line.stations === 'string') {
            try {
                line.stations = JSON.parse(line.stations || '[]');
            } catch (error) {
                console.error('Error parsing stations for line:', line.id, error);
                line.stations = [];
            }
        }
        
        // If stations is not an array after parsing, initialize as empty array
        if (!Array.isArray(line.stations)) {
            line.stations = [];
        }
        
        return line;
    }

    // Add these new functions to provide direct management interfaces

// Function to open a dialog showing all lines for management
function openLineManagerDialog() {
    // Create a new element for the line manager
    const managerContainer = document.createElement('div');
    managerContainer.className = 'metro-manager-dialog';
    
    // Use fixed positioning and center it on screen rather than absolute positioning
    managerContainer.style.position = 'fixed';
    managerContainer.style.left = '50%';
    managerContainer.style.top = '40%'; // Position it at 40% from top rather than 50% to make it higher
    managerContainer.style.transform = 'translate(-50%, -50%)';
    managerContainer.style.width = '450px';
    managerContainer.style.maxHeight = '80vh'; // Limit height to 80% of viewport
    managerContainer.style.overflowY = 'auto'; // Add scrolling if needed
    managerContainer.style.background = 'white';
    managerContainer.style.border = '1px solid #ccc';
    managerContainer.style.borderRadius = '8px';
    managerContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    managerContainer.style.padding = '20px';
    managerContainer.style.zIndex = '3000';
    
    let linesHTML = '';
    
    if (lines.length === 0) {
        linesHTML = '<p>No lines found. Create a new line first.</p>';
    } else {
        linesHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Line</th>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Stations</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const line of lines) {
            linesHTML += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center;">
                            <span class="metro-line-badge" style="background-color:${line.color}"></span>
                            ${line.name}
                        </div>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${line.stations.length}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
                        <button class="manage-line-btn" data-line-id="${line.id}">Manage</button>
                    </td>
                </tr>
            `;
        }
        
        linesHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    managerContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0; font-size: 18px;">Manage Metro Lines</h2>
            <button id="close-line-manager" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
        </div>
        <p>Click "Manage" to edit a line's stations and properties.</p>
        ${linesHTML}
        <div style="margin-top: 15px; text-align: center;">
            <button id="create-new-line-btn">Create New Line</button>
        </div>
    `;
    
    container.appendChild(managerContainer);
    
    // Add event listeners
    document.getElementById('close-line-manager').addEventListener('click', () => {
        managerContainer.remove();
    });
    
    // Add event listeners for manage buttons
    managerContainer.querySelectorAll('.manage-line-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lineId = btn.dataset.lineId;
            const line = lines.find(l => l.id === lineId);
            if (line) {
                managerContainer.remove();
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                openManageLineStationsMenu(line, centerX, centerY);
            }
        });
    });
    
    // Create new line button
    document.getElementById('create-new-line-btn').addEventListener('click', () => {
        managerContainer.remove();
        if (stations.length === 0) {
            alert('No stations available. Create at least one station first before creating a line.');
            return;
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        openCreateLineWithStationsDialog(centerX, centerY);
    });
}

// Function to open a dialog showing all stations for management
function openStationManagerDialog() {
    // Create a new element for the station manager
    const managerContainer = document.createElement('div');
    managerContainer.className = 'metro-manager-dialog';
    
    // Use fixed positioning and center it on screen rather than absolute positioning
    managerContainer.style.position = 'fixed';
    managerContainer.style.left = '50%';
    managerContainer.style.top = '40%'; // Position it at 40% from top rather than 50% to make it higher
    managerContainer.style.transform = 'translate(-50%, -50%)';
    managerContainer.style.width = '450px';
    managerContainer.style.maxHeight = '80vh'; // Limit height to 80% of viewport
    managerContainer.style.overflowY = 'auto'; // Add scrolling if needed
    managerContainer.style.background = 'white';
    managerContainer.style.border = '1px solid #ccc';
    managerContainer.style.borderRadius = '8px';
    managerContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    managerContainer.style.padding = '20px';
    managerContainer.style.zIndex = '3000';
    
    let stationsHTML = '';
    
    if (stations.length === 0) {
        stationsHTML = '<p>No stations found. Create a new station first.</p>';
    } else {
        stationsHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Station</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Type</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const station of stations) {
            let stationType = 'Regular';
            if (station.interchange) stationType = 'Interchange';
            else if (station.terminal) stationType = 'Terminal';
            
            stationsHTML += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${station.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${stationType}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
                        <button class="edit-station-btn" data-station-id="${station.id}">Edit</button>
                    </td>
                </tr>
            `;
        }
        
        stationsHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    managerContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0; font-size: 18px;">Manage Metro Stations</h2>
            <button id="close-station-manager" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
        </div>
        <p>Click "Edit" to modify a station's properties.</p>
        ${stationsHTML}
        <div style="margin-top: 15px; text-align: center;">
            <button id="create-new-station-btn">Create New Station</button>
        </div>
    `;
    
    container.appendChild(managerContainer);
    
    // Add event listeners
    document.getElementById('close-station-manager').addEventListener('click', () => {
        managerContainer.remove();
    });
    
    // Add event listeners for edit buttons
    managerContainer.querySelectorAll('.edit-station-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const stationId = btn.dataset.stationId;
            const station = stations.find(s => s.id === stationId);
            if (station) {
                managerContainer.remove();
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                openStationEditMenu(station, centerX, centerY);
            }
        });
    });
    
    // Create new station button
    document.getElementById('create-new-station-btn').addEventListener('click', () => {
        managerContainer.remove();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const centerMapX = 0; // Center of map in map coordinates
        const centerMapY = 0; // Center of map in map coordinates
        openNodeSelectorForNewStation(centerMapX, centerMapY, centerX, centerY);
    });
}

// Function to create a new line with station selection
function openCreateLineWithStationsDialog(x, y) {
    // Create a new element for creating a line
    const menuContainer = document.createElement('div');
    menuContainer.className = 'metro-edit-menu';
    
    // Use fixed positioning and center it on screen
    menuContainer.style.position = 'fixed';
    menuContainer.style.left = '50%';
    menuContainer.style.top = '40%'; // Position it at 40% from top rather than 50% to make it higher
    menuContainer.style.transform = 'translate(-50%, -50%)';
    menuContainer.style.width = '450px';
    menuContainer.style.maxHeight = '80vh'; // Limit height to 80% of viewport 
    menuContainer.style.overflowY = 'auto'; // Add scrolling if needed
    
    // Create color picker options
    let colorOptionsHTML = '';
    for (const color of LINE_COLORS) {
        colorOptionsHTML += `
            <div style="display: inline-block; margin: 5px;">
                <label>
                    <input type="radio" name="line-color" value="${color}">
                    <span style="display: inline-block; width: 20px; height: 20px; background-color:${color}; border-radius: 50%;"></span>
                </label>
            </div>
        `;
    }
    
    // Create transit type options
    let transitTypeOptionsHTML = '';
    Object.entries(TRANSIT_TYPES).forEach(([key, type]) => {
        transitTypeOptionsHTML += `
            <option value="${type}">
                ${key.charAt(0) + key.slice(1).toLowerCase()}
            </option>
        `;
    });
    
    // Create station selection options
    let stationOptionsHTML = '';
    for (const station of stations) {
        stationOptionsHTML += `
            <div style="margin: 5px 0;">
                <label>
                    <input type="checkbox" name="line-station" value="${station.id}">
                    ${station.name}
                </label>
            </div>
        `;
    }
    
    menuContainer.innerHTML = `
        <h3>Create New Line</h3>
        <label>
            Line Name:
            <input type="text" id="line-name" placeholder="Line Name" style="width: 100%;">
        </label>
        <div style="margin: 10px 0;">
            <label>Transit Type:
                <select id="line-transit-type" style="width: 100%;">
                    ${transitTypeOptionsHTML}
                </select>
            </label>
        </div>
        <div style="margin: 10px 0;">
            <p>Line Color:</p>
            <div style="margin: 5px 0;">
                ${colorOptionsHTML}
            </div>
        </div>
        <label>
            Description:
            <input type="text" id="line-description" placeholder="Line Description" style="width: 100%;">
        </label>
        <div style="margin: 10px 0;">
            <label>
                <input type="checkbox" id="line-curved">
                Use curved line segments
            </label>
        </div>
        <div style="margin: 15px 0;">
            <h4>Select Stations</h4>
            <p>Order will be the same as selection order.</p>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                ${stationOptionsHTML}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 15px;">
            <button id="create-line-save">Create</button>
            <button id="create-line-cancel">Cancel</button>
        </div>
    `;
    
    container.appendChild(menuContainer);
    
    // Select the first color by default
    const firstColorOption = menuContainer.querySelector('input[name="line-color"]');
    if (firstColorOption) firstColorOption.checked = true;
    
    // Add event listeners
    document.getElementById('create-line-save').addEventListener('click', async () => {
        const lineName = document.getElementById('line-name').value.trim();
        if (!lineName) {
            alert('Please enter a line name');
            return;
        }
        
        // Get selected stations
        const selectedStationElements = menuContainer.querySelectorAll('input[name="line-station"]:checked');
        const selectedStationIds = Array.from(selectedStationElements).map(el => el.value);
        
        if (selectedStationIds.length < 2) {
            alert('Please select at least 2 stations for the line');
            return;
        }
        
        const lineTransitType = document.getElementById('line-transit-type').value;
        const lineColor = document.querySelector('input[name="line-color"]:checked')?.value || LINE_COLORS[0];
        const lineDescription = document.getElementById('line-description').value.trim();
        const lineCurved = document.getElementById('line-curved').checked;
        
        // Create a new line
        const lineId = `line_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
        const newLine = {
            id: lineId,
            name: lineName,
            transit_type: lineTransitType,
            color: lineColor,
            stations: selectedStationIds,
            curved: lineCurved,
            description: lineDescription
        };
        
        // Save to database
        await saveLineToDatabase(newLine);
        
        // Add to lines array
        lines.push(newLine);
        
        // Update terminal status for first and last stations
        if (selectedStationIds.length >= 2) {
            const firstStationId = selectedStationIds[0];
            const lastStationId = selectedStationIds[selectedStationIds.length - 1];
            
            for (const stationId of [firstStationId, lastStationId]) {
                const station = stations.find(s => s.id === stationId);
                if (station && !station.terminal) {
                    station.terminal = true;
                    await updateStationInDatabase(station);
                }
            }
        }
        
        // Remove menu and redraw
        menuContainer.remove();
        drawMap();
    });
    
    document.getElementById('create-line-cancel').addEventListener('click', () => {
        menuContainer.remove();
    });
}

// Add this to the setupControls function to add transit type toggle buttons
function setupTransitTypeFilters(controls) {
    const transitFiltersDiv = document.createElement('div');
    transitFiltersDiv.className = 'transit-filters';
    transitFiltersDiv.style.display = 'flex';
    transitFiltersDiv.style.gap = '5px';
    transitFiltersDiv.style.margin = '0 10px';
    
    // Create toggle buttons for each transit type
    Object.entries(TRANSIT_TYPES).forEach(([key, type]) => {
        const button = document.createElement('button');
        button.className = 'transit-filter-btn active';
        button.dataset.type = type;
        button.textContent = key.charAt(0) + key.slice(1).toLowerCase();
        button.title = `Toggle ${key.toLowerCase()} lines visibility`;
        button.style.opacity = '1';
        
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            button.style.opacity = button.classList.contains('active') ? '1' : '0.5';
            drawMap(); // Redraw with updated filters
        });
        
        transitFiltersDiv.appendChild(button);
    });
    
    controls.appendChild(transitFiltersDiv);
}

    
    // Public API
    return {
        initialize,  // This exposes initialize to be called as MetroMapVisualizer.initialize()
        show,
        hide,
        isVisible,
        addStation,
        addLine,
        addStationToLine
    };
})();

// Initialize the module when it's loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the module
    MetroMapVisualizer.initialize(); // Call through the public API
    console.log('MetroMapVisualizer initialized');
});

// Make the module globally accessible (crucial step!)
window.MetroMapVisualizer = MetroMapVisualizer;
console.log('MetroMapVisualizer assigned to window object');
