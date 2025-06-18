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
    
    // Add these variables to the private variables section (around line 27, after existing variables)
    let currentCity = 'all';
    let availableCities = [];
    
    // Add the new setting variable for excluding bus interchanges
    let excludeBusInterchanges = false;
    
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
        
        // Load interchange exclusion setting
        loadInterchangeSettings();
        
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
        loadInterchangeSettings();
        
        // Create settings panel
        const scalePanel = document.createElement('div');
        scalePanel.className = 'metro-scale-settings';
        
        scalePanel.innerHTML = `
            <h3>Display Settings</h3>
            
            <div class="metro-scale-slider">
                <label for="station-scale">Station Size: <span class="scale-value">${(stationScaleFactor * 100).toFixed(0)}%</span></label>
                <input type="range" id="station-scale" min="${MIN_SCALE * 100}" max="${MAX_SCALE * 100}" value="${stationScaleFactor * 100}" step="5">
            </div>
            
            <div class="metro-scale-slider">
                <label for="text-scale">Text Size: <span class="scale-value">${(textScaleFactor * 100).toFixed(0)}%</span></label>
                <input type="range" id="text-scale" min="${MIN_SCALE * 100}" max="${MAX_SCALE * 100}" value="${textScaleFactor * 100}" step="5">
            </div>
            
            <div class="metro-interchange-settings" style="margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">Interchange Station Rules</h4>
                <label style="display: flex; align-items: center; cursor: pointer; margin: 5px 0;">
                    <input type="checkbox" id="exclude-bus-interchanges" ${excludeBusInterchanges ? 'checked' : ''} style="margin-right: 8px;">
                    <span style="font-size: 13px;">Exclude bus-only and bus/metro mix interchanges</span>
                </label>
                <div style="font-size: 11px; color: #666; margin-top: 5px; line-height: 1.3;">
                    When enabled, only rail-based interchanges (metro-metro, metro-streetcar, etc.) will be specially highlighted. 
                    Bus-only interchanges and bus/metro mixed interchanges will appear as regular stations.
                </div>
            </div>
            
            <div class="metro-scale-actions">
                <button class="reset">Reset to Default</button>
                <button class="save">Save Settings</button>
            </div>
        `;
        
        container.appendChild(scalePanel);
        
        // Add event listeners
        const stationScaleSlider = scalePanel.querySelector('#station-scale');
        const textScaleSlider = scalePanel.querySelector('#text-scale');
        const excludeBusCheckbox = scalePanel.querySelector('#exclude-bus-interchanges');
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
        
        // Interchange exclusion checkbox
        excludeBusCheckbox.addEventListener('change', (e) => {
            excludeBusInterchanges = e.target.checked;
            // Recalculate interchange status for all stations
            recalculateInterchangeStatus();
            drawMap();
        });
        
        // Reset button
        resetButton.addEventListener('click', () => {
            stationScaleFactor = DEFAULT_SCALE;
            textScaleFactor = DEFAULT_SCALE;
            excludeBusInterchanges = false;
            stationScaleSlider.value = DEFAULT_SCALE * 100;
            textScaleSlider.value = DEFAULT_SCALE * 100;
            excludeBusCheckbox.checked = false;
            stationScaleValue.textContent = `${(DEFAULT_SCALE * 100).toFixed(0)}%`;
            textScaleValue.textContent = `${(DEFAULT_SCALE * 100).toFixed(0)}%`;
            recalculateInterchangeStatus();
            drawMap();
        });
        
        // Save button
        saveButton.addEventListener('click', () => {
            saveScaleSettings();
            saveInterchangeSettings();
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
        
        // Add City Management Section (similar to library management in DCIM)
        const citySection = document.createElement('div');
        citySection.className = 'metro-city-section';
        citySection.style.marginBottom = '10px';
        citySection.style.padding = '8px';
        citySection.style.border = '1px solid #ddd';
        citySection.style.borderRadius = '4px';
        citySection.style.backgroundColor = '#f9f9f9';
        
        const cityHeader = document.createElement('div');
        cityHeader.className = 'metro-city-header';
        cityHeader.style.display = 'flex';
        cityHeader.style.justifyContent = 'space-between';
        cityHeader.style.alignItems = 'center';
        cityHeader.style.marginBottom = '5px';
        
        const cityTitle = document.createElement('div');
        cityTitle.className = 'metro-city-title';
        cityTitle.textContent = 'Current City';
        cityTitle.style.fontWeight = 'bold';
        cityTitle.style.fontSize = '12px';
        
        const cityActions = document.createElement('div');
        cityActions.className = 'metro-city-actions';
        
        const manageCitiesBtn = document.createElement('button');
        manageCitiesBtn.id = 'metro-manage-cities';
        manageCitiesBtn.className = 'btn btn-small';
        manageCitiesBtn.title = 'Manage Cities';
        manageCitiesBtn.textContent = '⚙️';
        manageCitiesBtn.style.marginRight = '5px';
        manageCitiesBtn.addEventListener('click', showCityManager);
        
        const newCityBtn = document.createElement('button');
        newCityBtn.id = 'metro-new-city';
        newCityBtn.className = 'btn btn-small';
        newCityBtn.title = 'New City';
        newCityBtn.textContent = '+';
        newCityBtn.addEventListener('click', showNewCityDialog);
        
        cityActions.appendChild(manageCitiesBtn);
        cityActions.appendChild(newCityBtn);
        
        cityHeader.appendChild(cityTitle);
        cityHeader.appendChild(cityActions);
        
        const citySelector = document.createElement('select');
        citySelector.id = 'metro-city-selector';
        citySelector.className = 'metro-select';
        citySelector.style.width = '100%';
        citySelector.style.marginBottom = '5px';
        citySelector.innerHTML = '<option value="all">All Cities</option>';
        citySelector.addEventListener('change', switchCity);
        
        const cityInfo = document.createElement('div');
        cityInfo.id = 'metro-current-city-info';
        cityInfo.className = 'metro-city-info';
        cityInfo.style.fontSize = '11px';
        cityInfo.style.color = '#666';
        cityInfo.textContent = 'Loading cities...';
        
        citySection.appendChild(cityHeader);
        citySection.appendChild(citySelector);
        citySection.appendChild(cityInfo);
        
        controls.appendChild(citySection);
        
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
        
        // Add transit type filters
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
        let linesToRender = lines;
        
        // Filter by current city if not showing all
        if (currentCity !== 'all') {
            linesToRender = lines.filter(line => line.city === currentCity);
        }
        
        for (const line of linesToRender) {
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
    
    // Enhanced drawStations function with debugging for the specific station
    function drawStations() {
        let stationsToRender = stations;
        
        // Filter by current city if not showing all
        if (currentCity !== 'all') {
            stationsToRender = stations.filter(station => station.city === currentCity);
        }
        
        for (const station of stationsToRender) {
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
            
            // Use the new interchange logic
            const newInterchangeStatus = shouldMarkAsInterchange(station);
            if (station.interchange !== newInterchangeStatus) {
                station.interchange = newInterchangeStatus;
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
            // Load all stations and lines first
            const stationsResponse = await fetch('/api/metro-map/stations');
            const linesResponse = await fetch('/api/metro-map/lines');
            
            if (!stationsResponse.ok || !linesResponse.ok) {
                throw new Error('Failed to load metro map data from API');
            }
            
            // Parse the responses
            stations = await stationsResponse.json();
            lines = await linesResponse.json();
            
            // Ensure all lines have stations as arrays, not JSON strings
            lines = lines.map(line => {
                if (typeof line.stations === 'string') {
                    try {
                        line.stations = JSON.parse(line.stations || '[]');
                    } catch (error) {
                        console.error('Error parsing stations for line:', line.id, error);
                        line.stations = [];
                    }
                }
                
                if (!Array.isArray(line.stations)) {
                    line.stations = [];
                }
                
                return line;
            });
            
            // Initialize city management
            updateCitySelector();
            
            // Set to default city or current city
            const defaultCity = getDefaultCity();
            if (availableCities.includes(defaultCity) || defaultCity === 'all') {
                currentCity = defaultCity;
                const citySelector = document.getElementById('metro-city-selector');
                if (citySelector) {
                    citySelector.value = defaultCity;
                }
            } else {
                currentCity = 'all';
            }
            
            updateCityInfo();
            
            // IMPORTANT: Recalculate interchange status based on current settings after loading data
            recalculateInterchangeStatus();
            
            console.log('Loaded metro map data:', { stations, lines });
        } catch (error) {
            console.error('Error loading metro map data:', error);
            
            // If there's an error (likely because endpoints don't exist yet),
            // fall back to loading from node attributes
            await loadFromNodeAttributes(centralNodeId);
        }
    }

    // Add missing showErrorMessage function
    function showErrorMessage(message) {
        console.error(message);
        
        // Create a simple error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'metro-error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Update the getCurrentCity function to handle missing elements
    function getCurrentCity() {
        const citySelector = document.getElementById('metro-city-selector');
        return citySelector ? citySelector.value : getDefaultCity();
    }

    // Update getDefaultCity to provide a fallback
    function getDefaultCity() {
        return localStorage.getItem('metro-default-city') || 'all';
    }

    async function switchCity(cityName) {
        try {
            showLoading();
            // Save current view state if needed
            const previousCity = getCurrentCity();
            
            // Update UI
            const citySelector = document.getElementById('metro-city-selector');
            if (citySelector) {
                citySelector.value = cityName;
            }
            
            // Reload data for new city
            await loadMetroMapData();
            
            // Reset view and update UI
            resetView();
            updateCityInfo();
            
            hideLoading();
        } catch (error) {
            console.error('Error switching city:', error);
            hideLoading();
            showErrorMessage('Failed to switch city');
        }
    }

    // Update station creation to include city
    async function createNewStation(nodeId, x, y) {
        try {
            // Get node details first
            const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
            if (!nodeResponse.ok) {
                throw new Error('Failed to get node data');
            }
            const node = await nodeResponse.json();
            
            const currentCity = getCurrentCity();
            
            const response = await fetch('/api/metro-map/stations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    node_id: nodeId,
                    name: node.content || `Node ${nodeId}`,
                    x: Math.round(x),
                    y: Math.round(y),
                    city: currentCity === 'all' ? 'default' : currentCity
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create station');
            }
            
            const station = await response.json();
            
            // Update local data and redraw
            stations.push(station);
            drawMap();
            
            return station;
        } catch (error) {
            console.error('Error creating station:', error);
            showErrorMessage('Failed to create station: ' + error.message);
            return null;
        }
    }

    // Update line creation to include city
    async function createNewLine(name, options = {}) {
        try {
            const currentCity = getCurrentCity();
            
            const response = await fetch('/api/metro-map/lines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    color: options.color || '#000000',
                    stations: options.stations || [],
                    curved: options.curved || false,
                    description: options.description || '',
                    transit_type: options.transit_type || 'metro',
                    city: currentCity === 'all' ? 'default' : currentCity
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create line');
            }
            
            const line = await response.json();
            
            // Update local data and redraw
            lines.push(line);
            drawMap();
            
            return line;
        } catch (error) {
            console.error('Error creating line:', error);
            showErrorMessage('Failed to create line: ' + error.message);
            return null;
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
            // Ensure city is included in the station data
            if (!station.city && currentCity !== 'all') {
                station.city = currentCity;
            }
            
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
                            city: station.city,
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
            // Ensure city is included in the line data
            if (!line.city && currentCity !== 'all') {
                line.city = currentCity;
            }
            
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
            
            // Fall back to saving as node attribute
            // For lines, we'll save the line info to the first station in the line
            if (line.stations && line.stations.length > 0) {
                const firstStationId = line.stations[0];
                const station = stations.find(s => s.id === firstStationId);
                
                if (station && station.node_id) {
                    const attrResponse = await fetch('/api/node-attributes', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            node_id: station.node_id,
                            key: 'metro_line',
                            value: JSON.stringify({
                                id: line.id,
                                name: line.name,
                                color: line.color,
                                city: line.city,
                                stations: line.stations,
                                curved: line.curved,
                                description: line.description
                            })
                        })
                    });
                    
                    if (!attrResponse.ok) {
                        throw new Error('Failed to save line as node attribute');
                    }
                    
                    return line;
                }
            }
            
            throw new Error('Cannot save line without stations or valid node_id');
        } catch (error) {
            console.error('Error saving line to database:', error);
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
            // console.log('Sending station update to database:', stationToUpdate);
            // console.log('Transit type being sent:', stationToUpdate.transit_type);
            
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
                    // console.log('Server response after update:', updatedStation);
                    
                    // CRITICAL: Don't overwrite the local station object with server response
                    // because it might have different boolean representation
                    // Just log the server response for debugging
                    
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
                                city: stationToUpdate.city,
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
        
        // Use fixed positioning and center it on screen to ensure it's always visible
        menuContainer.style.position = 'fixed';
        menuContainer.style.left = '50%';
        menuContainer.style.top = '40%';
        menuContainer.style.transform = 'translate(-50%, -50%)';
        menuContainer.style.width = '350px';
        menuContainer.style.maxHeight = '80vh';
        menuContainer.style.overflowY = 'auto';
        menuContainer.style.zIndex = '3000';
        
        let lineOptionsHTML = `
            <div style="margin-bottom: 10px;">
                <input type="text" id="add-line-search" placeholder="Search lines..." 
                       style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                    <span id="line-search-results-count">${lines.length} lines shown</span>
                    <button id="clear-line-search" style="margin-left: 10px; padding: 2px 6px; font-size: 11px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; display: none;">Clear</button>
                </div>
            </div>
            <div id="add-line-list" style="max-height: 250px; overflow-y: auto;">
        `;
        
        for (const line of lines) {
            const lineColor = line.color || '#666';
            lineOptionsHTML += `
                <div class="line-option" data-line-name="${line.name.toLowerCase()}" style="margin: 5px 0; padding: 5px; border-radius: 4px; transition: background-color 0.2s ease;">
                    <label style="display: flex; align-items: center; cursor: pointer; margin: 0;">
                        <input type="radio" name="line-select" value="${line.id}" style="margin-right: 8px;">
                        <span class="metro-line-badge" style="background-color:${lineColor}; display: inline-block; width: 16px; height: 16px; border-radius: 50%; margin-right: 8px;"></span>
                        <div>
                            <div style="font-weight: bold;">${line.name}</div>
                            <div style="font-size: 12px; color: #666;">${line.stations.length} stations</div>
                        </div>
                    </label>
                </div>
            `;
        }
        
        lineOptionsHTML += '</div>';
        
        menuContainer.innerHTML = `
            <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: grab; user-select: none;">
                <h3 style="margin: 0;">Add "${station.name}" to Line</h3>
                <button id="add-to-line-close" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 5px;">&times;</button>
            </div>
            <p>Select a line to add this station to:</p>
            ${lineOptionsHTML}
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="add-to-line-save">Add to Selected Line</button>
                <button id="add-to-line-cancel">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Make the dialog draggable (with error handling)
        try {
            makeDraggable(menuContainer);
        } catch (error) {
            console.warn('Failed to make dialog draggable:', error);
            // Continue without dragging functionality
        }
        
        // Set up line search functionality
        setupAddToLineSearch();
        
        // Add event listeners
        document.getElementById('add-to-line-close').addEventListener('click', () => {
            menuContainer.remove();
        });
        
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
        
        // Close dialog when clicking outside of it (with delay to prevent immediate closing)
        setTimeout(() => {
            document.addEventListener('click', function closeOnOutsideClick(event) {
                if (!menuContainer.contains(event.target)) {
                    menuContainer.remove();
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            });
        }, 100);
        
        // Prevent closing when clicking inside the dialog
        menuContainer.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
    
    // Function to set up line search for "Add to Line" dialog
    function setupAddToLineSearch() {
        const searchInput = document.getElementById('add-line-search');
        const clearButton = document.getElementById('clear-line-search');
        const resultsCount = document.getElementById('line-search-results-count');
        const lineList = document.getElementById('add-line-list');
        
        if (!searchInput || !clearButton || !resultsCount || !lineList) {
            console.warn('Add to line search elements not found');
            return;
        }
        
        // Function to filter lines based on search term
        function filterLines(searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            const options = lineList.querySelectorAll('.line-option');
            let visibleCount = 0;
            
            options.forEach(option => {
                const lineName = option.dataset.lineName || '';
                const matches = lineName.includes(term);
                
                if (matches || term === '') {
                    option.style.display = '';
                    visibleCount++;
                } else {
                    option.style.display = 'none';
                }
            });
            
            // Update results count
            resultsCount.textContent = `${visibleCount} lines shown`;
            
            // Show/hide clear button
            clearButton.style.display = term ? 'inline-block' : 'none';
        }
        
        // Set up search input event listener
        searchInput.addEventListener('input', (e) => {
            filterLines(e.target.value);
        });
        
        // Set up clear button event listener
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            filterLines('');
            searchInput.focus();
        });
        
        // Set up keyboard shortcuts
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterLines('');
            }
        });
    }
    
    // Helper function to make dialogs draggable
    function makeDraggable(element) {
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        // Find the drag handle (the header area)
        const header = element.querySelector('.dialog-header');
        if (!header) {
            console.warn('No drag handle found for draggable element');
            return;
        }
        
        header.addEventListener('mousedown', (e) => {
            // Don't drag when clicking buttons
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            header.style.cursor = 'grabbing';
            
            const rect = element.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            // Remove transform to switch to absolute positioning
            element.style.transform = 'none';
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            let newX = e.clientX - dragOffsetX;
            let newY = e.clientY - dragOffsetY;
            
            // Keep dialog within viewport bounds
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
            }
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
        
        // Use fixed positioning and center it on screen to ensure it's always visible
        menuContainer.style.position = 'fixed';
        menuContainer.style.left = '50%';
        menuContainer.style.top = '40%';
        menuContainer.style.transform = 'translate(-50%, -50%)';
        menuContainer.style.width = '400px';  // Made wider for search
        menuContainer.style.maxHeight = '80vh';
        menuContainer.style.overflowY = 'auto';
        menuContainer.style.zIndex = '3000';
        
        // Find stations not on this line
        const availableStations = stations.filter(station => !line.stations.includes(station.id));
        
        if (availableStations.length === 0) {
            alert('All stations are already on this line. Create a new station first.');
            return;
        }
        
        let stationOptionsHTML = `
            <div style="margin-bottom: 10px;">
                <input type="text" id="add-stations-search" placeholder="Search available stations..." 
                       style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                    <span id="add-stations-results-count">${availableStations.length} stations available</span>
                    <button id="clear-add-stations-search" style="margin-left: 10px; padding: 2px 6px; font-size: 11px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; display: none;">Clear</button>
                </div>
            </div>
            <div id="add-stations-list" style="max-height: 250px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; background: #fafafa;">
        `;
        
        for (const station of availableStations) {
            let stationType = 'Regular';
            if (station.interchange) stationType = 'Interchange';
            else if (station.terminal) stationType = 'Terminal';
            
            const cityName = station.city || 'Default';
            
            stationOptionsHTML += `
                <div class="add-station-option" data-station-name="${station.name.toLowerCase()}" data-station-type="${stationType.toLowerCase()}" data-station-city="${cityName.toLowerCase()}" style="margin: 5px 0; padding: 5px; border-radius: 4px; transition: background-color 0.2s ease;">
                    <label style="display: flex; align-items: center; cursor: pointer; margin: 0;">
                        <input type="checkbox" name="add-station" value="${station.id}" style="margin-right: 8px;">
                        <div style="flex-grow: 1;">
                            <div style="font-weight: bold;">${station.name}</div>
                            <div style="font-size: 12px; color: #666;">${stationType} • ${cityName}</div>
                        </div>
                    </label>
                </div>
            `;
        }
        
        stationOptionsHTML += '</div>';
        
        menuContainer.innerHTML = `
            <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: grab; user-select: none;">
                <h3 style="margin: 0;">Add Stations to ${line.name}</h3>
                <button id="add-stations-close" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 5px;">&times;</button>
            </div>
            <p>Select stations to add to this line:</p>
            ${stationOptionsHTML}
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="add-stations-save">Add Selected</button>
                <button id="add-stations-cancel">Cancel</button>
            </div>
        `;
        
        container.appendChild(menuContainer);
        
        // Make the dialog draggable
        try {
            makeDraggable(menuContainer);
        } catch (error) {
            console.warn('Failed to make dialog draggable:', error);
        }
        
        // Set up search functionality
        setupAddStationsSearch();
        
        // Add event listeners
        document.getElementById('add-stations-close').addEventListener('click', () => {
            menuContainer.remove();
        });
        
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
    
    // Function to set up station search for "Add Stations to Line" dialog
    function setupAddStationsSearch() {
        const searchInput = document.getElementById('add-stations-search');
        const clearButton = document.getElementById('clear-add-stations-search');
        const resultsCount = document.getElementById('add-stations-results-count');
        const stationsList = document.getElementById('add-stations-list');
        
        if (!searchInput || !clearButton || !resultsCount || !stationsList) {
            console.warn('Add stations search elements not found');
            return;
        }
        
        // Function to filter stations based on search term
        function filterStations(searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            const options = stationsList.querySelectorAll('.add-station-option');
            let visibleCount = 0;
            
            options.forEach(option => {
                const stationName = option.dataset.stationName || '';
                const stationType = option.dataset.stationType || '';
                const stationCity = option.dataset.stationCity || '';
                
                const matches = stationName.includes(term) || 
                              stationType.includes(term) || 
                              stationCity.includes(term);
                
                if (matches || term === '') {
                    option.style.display = '';
                    visibleCount++;
                } else {
                    option.style.display = 'none';
                }
            });
            
            // Update results count
            resultsCount.textContent = `${visibleCount} stations available`;
            
            // Show/hide clear button
            clearButton.style.display = term ? 'inline-block' : 'none';
        }
        
        // Set up search input event listener
        searchInput.addEventListener('input', (e) => {
            filterStations(e.target.value);
        });
        
        // Set up clear button event listener
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            filterStations('');
            searchInput.focus();
        });
        
        // Set up keyboard shortcuts
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterStations('');
            }
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
    managerContainer.style.width = '500px'; // Made wider for search
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
            <div style="max-height: 400px; overflow-y: auto;" id="lines-table-container">
                <table style="width: 100%; border-collapse: collapse;" id="lines-table">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Line</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Stations</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Type</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="lines-table-body">
        `;
        
        for (const line of lines) {
            const transitType = line.transit_type || 'metro';
            const transitTypeDisplay = transitType.charAt(0).toUpperCase() + transitType.slice(1);
            const cityName = line.city || 'Default';
            
            linesHTML += `
                <tr class="line-row" data-line-name="${line.name.toLowerCase()}" data-line-type="${transitType.toLowerCase()}" data-line-city="${cityName.toLowerCase()}">
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center;">
                            <span class="metro-line-badge" style="background-color:${line.color}; display: inline-block; width: 16px; height: 16px; border-radius: 50%; margin-right: 8px;"></span>
                            <div>
                                <div style="font-weight: bold;">${line.name}</div>
                                <div style="font-size: 12px; color: #666;">${cityName}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${line.stations.length}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${transitTypeDisplay}</td>
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
        <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: grab; user-select: none;">
            <h2 style="margin: 0; font-size: 18px;">Manage Metro Lines (${lines.length})</h2>
            <button id="close-line-manager" style="background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="margin-bottom: 15px;">
            <input type="text" id="line-search" placeholder="Search lines by name, type, or city..." 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
                <span id="line-search-results-count">${lines.length} lines shown</span>
                <button id="clear-line-search-manager" style="margin-left: 10px; padding: 2px 6px; font-size: 11px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;">Clear</button>
            </div>
        </div>
        
        <p>Click "Manage" to edit a line's stations and properties.</p>
        ${linesHTML}
        <div style="margin-top: 15px; text-align: center;">
            <button id="create-new-line-btn">Create New Line</button>
        </div>
    `;
    
    container.appendChild(managerContainer);
    
    // Make the dialog draggable
    try {
        makeDraggable(managerContainer);
    } catch (error) {
        console.warn('Failed to make dialog draggable:', error);
    }
    
    // Set up search functionality
    setupLineManagerSearch();
    
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

// Function to set up line search for line manager dialog
function setupLineManagerSearch() {
    const searchInput = document.getElementById('line-search');
    const clearButton = document.getElementById('clear-line-search-manager');
    const resultsCount = document.getElementById('line-search-results-count');
    const tableBody = document.getElementById('lines-table-body');
    
    if (!searchInput || !clearButton || !resultsCount || !tableBody) {
        console.warn('Line manager search elements not found');
        return;
    }
    
    // Function to filter lines based on search term
    function filterLines(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const rows = tableBody.querySelectorAll('.line-row');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const lineName = row.dataset.lineName || '';
            const lineType = row.dataset.lineType || '';
            const lineCity = row.dataset.lineCity || '';
            
            const matches = lineName.includes(term) || 
                          lineType.includes(term) || 
                          lineCity.includes(term);
            
            if (matches || term === '') {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update results count
        resultsCount.textContent = `${visibleCount} lines shown`;
        
        // Show/hide clear button
        clearButton.style.display = term ? 'inline-block' : 'none';
    }
    
    // Set up search input event listener
    searchInput.addEventListener('input', (e) => {
        filterLines(e.target.value);
    });
    
    // Set up clear button event listener
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        filterLines('');
        searchInput.focus();
    });
    
    // Set up keyboard shortcuts
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterLines('');
        }
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
    managerContainer.style.width = '500px'; // Made wider for search
    managerContainer.style.maxHeight = '80vh';
    managerContainer.style.overflowY = 'auto';
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
            <div style="max-height: 400px; overflow-y: auto;" id="stations-table-container">
                <table style="width: 100%; border-collapse: collapse;" id="stations-table">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Station</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Type</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">City</th>
                            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="stations-table-body">
        `;
        
        for (const station of stations) {
            let stationType = 'Regular';
            if (station.interchange) stationType = 'Interchange';
            else if (station.terminal) stationType = 'Terminal';
            
            const cityName = station.city || 'Default';
            
            stationsHTML += `
                <tr class="station-row" data-station-name="${station.name.toLowerCase()}" data-station-type="${stationType.toLowerCase()}" data-station-city="${cityName.toLowerCase()}">
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${station.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${stationType}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${cityName}</td>
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
        <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: grab; user-select: none;">
            <h2 style="margin: 0; font-size: 18px;">Manage Metro Stations (${stations.length})</h2>
            <button id="close-station-manager" style="background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="margin-bottom: 15px;">
            <input type="text" id="station-search" placeholder="Search stations by name, type, or city..." 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
                <span id="search-results-count">${stations.length} stations shown</span>
                <button id="clear-station-search" style="margin-left: 10px; padding: 2px 6px; font-size: 11px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;">Clear</button>
            </div>
        </div>
        
        ${stationsHTML}
        
        <div style="margin-top: 15px; text-align: center;">
            <button id="create-new-station-btn">Create New Station</button>
        </div>
    `;
    
    container.appendChild(managerContainer);
    
    // Make the dialog draggable
    try {
        makeDraggable(managerContainer);
    } catch (error) {
        console.warn('Failed to make dialog draggable:', error);
    }
    
    // Set up search functionality
    setupStationSearch();
    
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
        const centerMapX = 0;
        const centerMapY = 0;
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
    
    // Create station selection options with search
    let stationOptionsHTML = `
        <div style="margin-bottom: 10px;">
            <input type="text" id="line-station-search" placeholder="Search stations..." 
                   style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
        </div>
        <div id="line-station-list" style="max-height: 150px; overflow-y: auto;">
    `;
    
    for (const station of stations) {
        stationOptionsHTML += `
            <div style="margin: 5px 0;" class="line-station-option" data-station-name="${station.name.toLowerCase()}">
                <label>
                    <input type="checkbox" name="line-station" value="${station.id}">
                    ${station.name}
                </label>
            </div>
        `;
    }
    
    stationOptionsHTML += '</div>';
    
    menuContainer.innerHTML = `
        <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: grab; user-select: none;">
            <h3 style="margin: 0;">Create New Line</h3>
            <button id="create-line-close" style="background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
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
            <div style="border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                ${stationOptionsHTML}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 15px;">
            <button id="create-line-save">Create</button>
            <button id="create-line-cancel">Cancel</button>
        </div>
    `;
    
    container.appendChild(menuContainer);
    
    // Make the dialog draggable
    try {
        makeDraggable(menuContainer);
    } catch (error) {
        console.warn('Failed to make dialog draggable:', error);
    }
    
    // Set up station search for line creation
    setupLineStationSearch();
    
    // Select the first color by default
    const firstColorOption = menuContainer.querySelector('input[name="line-color"]');
    if (firstColorOption) firstColorOption.checked = true;
    
    // Add event listeners
    document.getElementById('create-line-close').addEventListener('click', () => {
        menuContainer.remove();
    });
    
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

// Function to set up station search for line creation dialog
function setupLineStationSearch() {
    const searchInput = document.getElementById('line-station-search');
    const stationList = document.getElementById('line-station-list');
    
    if (!searchInput || !stationList) {
        console.warn('Line station search elements not found');
        return;
    }
    
    // Function to filter stations in line creation dialog
    function filterLineStations(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const options = stationList.querySelectorAll('.line-station-option');
        
        options.forEach(option => {
            const stationName = option.dataset.stationName || '';
            const matches = stationName.includes(term);
            
            if (matches || term === '') {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    // Set up search input event listener
    searchInput.addEventListener('input', (e) => {
        filterLineStations(e.target.value);
    });
    
    // Set up keyboard shortcuts
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterLineStations('');
        }
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

/**
 * Get all available cities from stations and lines
 */
function getAvailableCities() {
    const cities = new Set();
    
    // Get cities from stations
    stations.forEach(station => {
        if (station.city && station.city.trim()) {
            cities.add(station.city.trim());
        }
    });
    
    // Get cities from lines
    lines.forEach(line => {
        if (line.city && line.city.trim()) {
            cities.add(line.city.trim());
        }
    });
    
    return Array.from(cities).sort();
}

/**
 * Update the city selector with available cities
 */
function updateCitySelector() {
    const selector = document.getElementById('metro-city-selector');
    if (!selector) return;
    
    availableCities = getAvailableCities();
    
    // Save current selection
    const currentSelection = selector.value;
    
    // Clear and rebuild options
    selector.innerHTML = '<option value="all">All Cities</option>';
    
    availableCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        selector.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (availableCities.includes(currentSelection) || currentSelection === 'all') {
        selector.value = currentSelection;
    } else {
        // If current selection no longer exists, use default city or 'all'
        const defaultCity = getDefaultCity();
        selector.value = availableCities.includes(defaultCity) ? defaultCity : 'all';
    }
    
    updateCityInfo();
}

/**
 * Switch to a different city
 */
function switchCity() {
    const selector = document.getElementById('metro-city-selector');
    currentCity = selector.value;
    
    updateCityInfo();
    
    // Filter and redraw the map with current city data
    filterMapDataByCity();
    drawMap();
}

/**
 * Filter map data by current city
 */
function filterMapDataByCity() {
    // Note: We don't modify the original data arrays, just filter when rendering
    // The actual filtering will happen in the draw functions
}

/**
 * Update city information display
 */
function updateCityInfo() {
    const infoElement = document.getElementById('metro-current-city-info');
    if (!infoElement) return;
    
    let cityStations, cityLines;
    
    if (currentCity === 'all') {
        cityStations = stations;
        cityLines = lines;
    } else {
        cityStations = stations.filter(station => station.city === currentCity);
        cityLines = lines.filter(line => line.city === currentCity);
    }
    
    const totalStations = cityStations.length;
    const totalLines = cityLines.length;
    const interchangeStations = cityStations.filter(station => station.interchange).length;
    
    let infoText = `${totalStations} stations, ${totalLines} lines`;
    if (interchangeStations > 0) {
        infoText += ` (${interchangeStations} interchanges)`;
    }
    
    infoElement.textContent = infoText;
}

/**
 * Get default city from localStorage
 */
function getDefaultCity() {
    return localStorage.getItem('metro-default-city') || 'all';
}

/**
 * Set default city
 */
function setDefaultCity(cityName) {
    localStorage.setItem('metro-default-city', cityName);
}

/**
 * Show city management dialog
 */
function showCityManager() {
    const dialogHTML = `
        <div id="city-manager-dialog" class="modal-overlay metro-manager-dialog" style="display: flex; z-index: 10000;">
            <div class="modal" style="width: 600px; max-width: 95%;">
                <div class="modal-header">
                    <h3 class="modal-title">City Management</h3>
                    <button class="modal-close" id="close-city-manager">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <label for="default-city-select">Default City:</label>
                        <select id="default-city-select" class="dcim-select" style="width: 100%;">
                            <option value="all">All Cities</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4>Existing Cities</h4>
                        <div id="city-list" style="margin-top: 10px;">
                            <!-- City list will be populated here -->
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4>Create New City</h4>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="new-city-name" class="dcim-input" placeholder="City name" style="flex: 1;">
                            <button id="create-city" class="btn btn-primary">Create</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-city-settings" class="btn btn-primary">Save Settings</button>
                    <button id="cancel-city-manager" class="btn">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // Populate default city selector
    updateDefaultCitySelector();
    
    // Populate city list
    updateCityList();
    
    // Add event listeners
    document.getElementById('close-city-manager').addEventListener('click', closeCityManager);
    document.getElementById('cancel-city-manager').addEventListener('click', closeCityManager);
    document.getElementById('save-city-settings').addEventListener('click', saveCitySettings);
    document.getElementById('create-city').addEventListener('click', createNewCity);
}

/**
 * Update the default city selector in the manager dialog
 */
function updateDefaultCitySelector() {
    const selector = document.getElementById('default-city-select');
    if (!selector) return;
    
    const currentDefault = getDefaultCity();
    
    selector.innerHTML = '<option value="all">All Cities</option>';
    availableCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        selector.appendChild(option);
    });
    
    selector.value = currentDefault;
}

/**
 * Update the city list in the manager dialog
 */
function updateCityList() {
    const listElement = document.getElementById('city-list');
    if (!listElement) return;
    
    if (availableCities.length === 0) {
        listElement.innerHTML = '<p>No cities found. Create your first city below.</p>';
        return;
    }
    
    listElement.innerHTML = '';
    
    availableCities.forEach(city => {
        const stationCount = stations.filter(station => station.city === city).length;
        const lineCount = lines.filter(line => line.city === city).length;
        
        const cityItem = document.createElement('div');
        cityItem.className = 'city-item';
        cityItem.style.display = 'flex';
        cityItem.style.justifyContent = 'space-between';
        cityItem.style.alignItems = 'center';
        cityItem.style.marginBottom = '8px';
        cityItem.style.padding = '8px';
        cityItem.style.backgroundColor = '#f9f9f9';
        cityItem.style.borderRadius = '4px';
        
        cityItem.innerHTML = `
            <span><strong>${city}</strong> (${stationCount} stations, ${lineCount} lines)</span>
            <div>
                <button class="btn btn-small rename-city" data-city="${city}">Rename</button>
                <button class="btn btn-small btn-danger delete-city" data-city="${city}">Delete</button>
            </div>
        `;
        
        listElement.appendChild(cityItem);
    });
    
    // Add event listeners for rename and delete buttons
    document.querySelectorAll('.rename-city').forEach(btn => {
        btn.addEventListener('click', () => renameCity(btn.dataset.city));
    });
    
    document.querySelectorAll('.delete-city').forEach(btn => {
        btn.addEventListener('click', () => deleteCity(btn.dataset.city));
    });
}

/**
 * Create a new city
 */
function createNewCity() {
    const nameInput = document.getElementById('new-city-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter a city name');
        return;
    }
    
    if (availableCities.includes(name)) {
        alert('A city with this name already exists');
        return;
    }
    
    // Add to available cities list
    availableCities.push(name);
    availableCities.sort();
    
    nameInput.value = '';
    updateDefaultCitySelector();
    updateCityList();
}

/**
 * Rename a city
 */
async function renameCity(oldName) {
    const newName = prompt(`Rename city "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    
    if (availableCities.includes(newName)) {
        alert('A city with this name already exists');
        return;
    }
    
    try {
        // Update all stations with this city
        const stationsToUpdate = stations.filter(station => station.city === oldName);
        const linesToUpdate = lines.filter(line => line.city === oldName);
        
        // Update stations
        for (const station of stationsToUpdate) {
            station.city = newName;
            await updateStationInDatabase(station);
        }
        
        // Update lines
        for (const line of linesToUpdate) {
            line.city = newName;
            await updateLineInDatabase(line);
        }
        
        // Update local state
        const index = availableCities.indexOf(oldName);
        if (index !== -1) {
            availableCities[index] = newName;
            availableCities.sort();
        }
        
        // Update current city if it was the renamed one
        if (currentCity === oldName) {
            currentCity = newName;
            document.getElementById('metro-city-selector').value = newName;
        }
        
        // Refresh the UI
        updateDefaultCitySelector();
        updateCityList();
        updateCitySelector();
        
        alert('City renamed successfully');
    } catch (error) {
        console.error('Error renaming city:', error);
        alert('Failed to rename city');
    }
}

/**
 * Delete a city
 */
async function deleteCity(cityName) {
    const stationCount = stations.filter(station => station.city === cityName).length;
    const lineCount = lines.filter(line => line.city === cityName).length;
    
    if (!confirm(`Are you sure you want to delete city "${cityName}"? This will remove the city assignment from ${stationCount} stations and ${lineCount} lines (the stations and lines themselves will not be deleted).`)) {
        return;
    }
    
    try {
        // Update all stations and lines in this city to have no city
        const stationsToUpdate = stations.filter(station => station.city === cityName);
        const linesToUpdate = lines.filter(line => line.city === cityName);
        
        for (const station of stationsToUpdate) {
            station.city = '';
            await updateStationInDatabase(station);
        }
        
        for (const line of linesToUpdate) {
            line.city = '';
            await updateLineInDatabase(line);
        }
        
        // Remove from available cities
        const index = availableCities.indexOf(cityName);
        if (index !== -1) {
            availableCities.splice(index, 1);
        }
        
        // Switch to 'all' if we were viewing the deleted city
        if (currentCity === cityName) {
            currentCity = 'all';
            document.getElementById('metro-city-selector').value = 'all';
        }
        
        // Refresh the UI
        updateDefaultCitySelector();
        updateCityList();
        updateCitySelector();
        filterMapDataByCity();
        drawMap();
        
        alert('City deleted successfully');
    } catch (error) {
        console.error('Error deleting city:', error);
        alert('Failed to delete city');
    }
}

/**
 * Save city settings
 */
function saveCitySettings() {
    const defaultSelector = document.getElementById('default-city-select');
    if (defaultSelector) {
        setDefaultCity(defaultSelector.value);
    }
    
    closeCityManager();
    alert('City settings saved');
}

/**
 * Close city manager dialog
 */
function closeCityManager() {
    const dialog = document.getElementById('city-manager-dialog');
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Show new city dialog
 */
function showNewCityDialog() {
    const dialogHTML = `
        <div id="new-city-dialog" class="modal-overlay" style="display: flex; z-index: 10000;">
            <div class="modal" style="width: 400px; max-width: 95%;">
                <div class="modal-header">
                    <h3 class="modal-title">Create New City</h3>
                    <button class="modal-close" id="close-new-city-dialog">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-city-input">City Name:</label>
                        <input type="text" id="new-city-input" class="dcim-input" 
                               placeholder="Enter city name" style="width: 100%;">
                    </div>
                    <div class="form-actions" style="margin-top: 15px;">
                        <button id="create-new-city" class="btn btn-primary">Create</button>
                        <button id="cancel-new-city" class="btn">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHTML);

    const dialog = document.getElementById('new-city-dialog');
    const input = document.getElementById('new-city-input');

    // Add event listeners
    document.getElementById('close-new-city-dialog').addEventListener('click', closeDialog);
    document.getElementById('cancel-new-city').addEventListener('click', closeDialog);
    document.getElementById('create-new-city').addEventListener('click', createCity);
    
    // Add enter key support
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            createCity();
        }
    });

    input.focus();

    function closeDialog() {
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    }

    function createCity() {
        const name = input.value.trim();
        
        if (!name) {
            alert('Please enter a valid city name');
            input.focus();
            return;
        }
        
        if (availableCities.includes(name)) {
            alert('A city with this name already exists');
            input.focus();
            return;
        }
        
        // Add to available cities
        availableCities.push(name);
        availableCities.sort();
        
        // Update selector and switch to the new city
        updateCitySelector();
        document.getElementById('metro-city-selector').value = name;
        switchCity();
        
        closeDialog();
    }
}

// Function to set up station search functionality
function setupStationSearch() {
    const searchInput = document.getElementById('station-search');
    const clearButton = document.getElementById('clear-station-search');
    const resultsCount = document.getElementById('search-results-count');
    const tableBody = document.getElementById('stations-table-body');
    
    if (!searchInput || !clearButton || !resultsCount || !tableBody) {
        console.warn('Station search elements not found');
        return;
    }
    
    // Function to filter stations based on search term
    function filterStations(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const rows = tableBody.querySelectorAll('.station-row');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const stationName = row.dataset.stationName || '';
            const stationType = row.dataset.stationType || '';
            const stationCity = row.dataset.stationCity || '';
            
            const matches = stationName.includes(term) || 
                          stationType.includes(term) || 
                          stationCity.includes(term);
            
            if (matches || term === '') {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update results count
        resultsCount.textContent = `${visibleCount} stations shown`;
        
        // Show/hide clear button
        clearButton.style.display = term ? 'inline-block' : 'none';
    }
    
    // Set up search input event listener
    searchInput.addEventListener('input', (e) => {
        filterStations(e.target.value);
    });
    
    // Set up clear button event listener
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        filterStations('');
        searchInput.focus();
    });
    
    // Set up keyboard shortcuts
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterStations('');
        }
    });
}

// Load interchange exclusion settings
function loadInterchangeSettings() {
    try {
        const savedSettings = localStorage.getItem('metroMapInterchangeSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            excludeBusInterchanges = settings.excludeBusInterchanges || false;
            console.log('Loaded interchange settings:', { excludeBusInterchanges });
        } else {
            // Use defaults
            excludeBusInterchanges = false;
        }
    } catch (error) {
        console.error('Error loading interchange settings:', error);
        // Use defaults on error
        excludeBusInterchanges = false;
    }
}

// Save interchange exclusion settings
function saveInterchangeSettings() {
    try {
        const settings = {
            excludeBusInterchanges: excludeBusInterchanges
        };
        localStorage.setItem('metroMapInterchangeSettings', JSON.stringify(settings));
        console.log('Saved interchange settings:', settings);
    } catch (error) {
        console.error('Error saving interchange settings:', error);
    }
}

// Function to determine if a station should be marked as an interchange
function shouldMarkAsInterchange(station) {
    const stationLines = lines.filter(l => l.stations.includes(station.id));
    
    // If station is only on one line or no lines, not an interchange
    if (stationLines.length <= 1) {
        return false;
    }
    
    // If the exclusion rule is disabled, mark all multi-line stations as interchanges
    if (!excludeBusInterchanges) {
        return true;
    }
    
    // Check the transit types of the lines this station belongs to
    const transitTypes = stationLines.map(line => line.transit_type || TRANSIT_TYPES.METRO);
    const uniqueTransitTypes = [...new Set(transitTypes)];
    
    // If all lines are bus lines, don't mark as interchange (bus-only interchange)
    if (uniqueTransitTypes.length === 1 && uniqueTransitTypes[0] === TRANSIT_TYPES.BUS) {
        return false;
    }
    
    // If it's a mix of bus and other types, and user wants to exclude mixed bus interchanges
    if (uniqueTransitTypes.includes(TRANSIT_TYPES.BUS) && uniqueTransitTypes.length > 1) {
        // Mixed bus and other types - when excluding bus interchanges, return false
        return false;
    }
    
    // For all other cases (pure rail interchanges), mark as interchange
    return true;
}

// Enhanced recalculateInterchangeStatus function with immediate redraw
function recalculateInterchangeStatus() {
    console.log('Recalculating interchange status with excludeBusInterchanges:', excludeBusInterchanges);
    
    let hasChanges = false;
    
    for (const station of stations) {
        const wasInterchange = station.interchange;
        const shouldBeInterchange = shouldMarkAsInterchange(station);
        
        if (wasInterchange !== shouldBeInterchange) {
            // IMPORTANT: Ensure the change is applied immediately and persistently
            station.interchange = shouldBeInterchange;
            hasChanges = true;
            
            // Add logging for changes
            // console.log(`Station ${station.name}: interchange changed from ${wasInterchange} to ${shouldBeInterchange}`);
            
            // Update in database asynchronously (don't await to avoid blocking)
            updateStationInDatabase(station).catch(error => {
                console.error('Error updating station interchange status:', error);
            });
        }
    }
    
    // Force immediate redraw if there were changes
    if (hasChanges) {
        console.log('Forcing immediate redraw due to interchange changes');
        drawMap();
    }
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
