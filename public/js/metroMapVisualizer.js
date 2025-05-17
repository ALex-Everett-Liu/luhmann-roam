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
    
    // CSS styles for the module
    const metroStyles = `
    .metro-visualizer-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2000;
        background-color: #f8f8f8;
        overflow: hidden;
        font-family: 'Arial', sans-serif;
    }
    
    .metro-controls {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: 2001;
        display: flex;
        gap: 10px;
    }
    
    .metro-controls button {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 6px 12px;
        color: #333;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }
    
    .metro-controls button:hover {
        background: rgba(255, 255, 255, 1);
        transform: translateY(-2px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .metro-close-button {
        font-size: 18px !important;
    }
    
    .metro-zoom-controls {
        display: flex;
        align-items: center;
        margin: 0 10px;
    }
    
    .metro-zoom-controls button {
        width: 30px;
        height: 30px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 5px;
    }
    
    .metro-zoom-display {
        color: #333;
        font-size: 14px;
        margin: 0 5px;
        min-width: 50px;
        text-align: center;
    }
    
    .metro-info-panel {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        padding: 15px;
        color: #333;
        width: 300px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 2001;
        transition: transform 0.3s ease;
    }
    
    .metro-info-panel:hover {
        transform: translateY(-5px);
    }
    
    .metro-info-panel h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 18px;
        font-weight: 600;
        color: #333;
    }
    
    .metro-info-panel p {
        margin: 5px 0;
        font-size: 14px;
        color: #555;
    }
    
    .metro-focus-btn {
        margin-top: 10px;
        background: #4285F4;
        border: none;
        border-radius: 4px;
        padding: 8px 15px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
    }
    
    .metro-focus-btn:hover {
        background: #5c94f5;
        transform: scale(1.05);
    }
    
    .metro-edit-menu {
        position: absolute;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        padding: 15px;
        z-index: 3000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }
    
    .metro-edit-menu button {
        background: #f8f8f8;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px 12px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: background 0.2s ease;
    }
    
    .metro-edit-menu button:hover {
        background: #f0f0f0;
    }
    
    .metro-line-badge {
        display: inline-block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        margin-right: 8px;
    }
    
    .metro-edit-mode-banner {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 0, 0.8);
        color: #333;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        z-index: 2001;
    }
    
    .metro-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #333;
        font-size: 18px;
        text-align: center;
    }
    
    .metro-loading:after {
        content: '.';
        animation: dots 1.5s steps(5, end) infinite;
    }
    
    @keyframes dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60% { content: '...'; }
        80%, 100% { content: ''; }
    }
    `;
    
    // Initialize the visualizer
    function initialize() {
        console.log('Initializing Metro Map Visualizer');
        
        // Add custom styles
        const styleElement = document.createElement('style');
        styleElement.textContent = metroStyles;
        document.head.appendChild(styleElement);
        
        createContainer();
        
        // Set up pan and zoom
        setupPanAndZoom();
        
        // Prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Add event listeners for window resize
        window.addEventListener('resize', onWindowResize);
        
        // Hide initially
        hide();
    }
    
    // Create the container and canvas
    function createContainer() {
        // Create main container
        container = document.createElement('div');
        container.className = 'metro-visualizer-container';
        
        // Create canvas element
        canvas = document.createElement('canvas');
        container.appendChild(canvas);
        
        // Get the 2D context
        ctx = canvas.getContext('2d');
        
        // Set up the controls
        setupControls();
        
        // Create info panel
        createInfoPanel();
        
        // Add to document
        document.body.appendChild(container);
    }
    
    // Set up control buttons
    function setupControls() {
        const controls = document.createElement('div');
        controls.className = 'metro-controls';
        
        // Reset view button
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
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.className = 'metro-close-button';
        closeButton.title = 'Close metro map';
        closeButton.addEventListener('click', hide);
        controls.appendChild(closeButton);
        
        container.appendChild(controls);
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
        
        // Show/hide edit mode banner
        if (editMode) {
            const banner = document.createElement('div');
            banner.className = 'metro-edit-mode-banner';
            banner.id = 'edit-mode-banner';
            banner.textContent = 'EDIT MODE';
            container.appendChild(banner);
        } else {
            const banner = document.getElementById('edit-mode-banner');
            if (banner) banner.remove();
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
        } else if (event.button === 0) {
            // Left click for selection
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
        
        // Adjust for the center, zoom, and offset
        const adjustedX = (x - centerX) / zoomLevel - offsetX / zoomLevel + centerX;
        const adjustedY = (y - centerY) / zoomLevel - offsetY / zoomLevel + centerY;
        
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
        ctx.scale(zoomLevel, zoomLevel);
        // Apply pan offset
        ctx.translate(offsetX / zoomLevel, offsetY / zoomLevel);
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
            
            ctx.strokeStyle = line.color;
            ctx.lineWidth = LINE_WIDTH;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Highlight selected line
            if (selectedLine && selectedLine.id === line.id) {
                ctx.lineWidth = LINE_WIDTH + 2;
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
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }
    
    // Draw stations
    function drawStations() {
        for (const station of stations) {
            const x = station.x;
            const y = station.y;
            const isInterchange = station.interchange;
            const isTerminal = station.terminal;
            const isSelected = (selectedStation && selectedStation.id === station.id);
            
            // Determine station radius
            const radius = isInterchange ? INTERCHANGE_RADIUS : STATION_RADIUS;
            
            // Draw station circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            
            // Fill and stroke based on station type
            if (isSelected) {
                // Selected station
                ctx.fillStyle = STATION_COLORS.selected;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
            } else if (isInterchange) {
                // Interchange station
                ctx.fillStyle = STATION_COLORS.interchange;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            } else if (isTerminal) {
                // Terminal station
                ctx.fillStyle = STATION_COLORS.terminal;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            } else {
                // Regular station
                ctx.fillStyle = STATION_COLORS.regular;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
            }
            
            ctx.fill();
            ctx.stroke();
            
            // Draw station name
            ctx.font = '12px Arial';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(station.name, x, y + radius + 4);
            
            // Draw station marker if in edit mode
            if (editMode) {
                ctx.font = '10px Arial';
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(`[${Math.round(x)},${Math.round(y)}]`, x, y + radius + 20);
            }
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
            
            // Add station to line
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
            
            // Fall back to saving as node attribute if (station.node_id) {
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
    }
    
    // Save a line to the database
    async function saveLineToDatabase(line) {
        try {
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
                            value: JSON.stringify(line)
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
            // Try dedicated endpoint first
            try {
                const response = await fetch(`/api/metro-map/stations/${station.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(station)
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to updating node attribute if (station.node_id) {
            // First, get the existing attribute to get its ID
            const getAttrsResponse = await fetch(`/api/nodes/${station.node_id}/attributes`);
            if (!getAttrsResponse.ok) {
                throw new Error('Failed to get node attributes');
            }
            const attributes = await getAttrsResponse.json();
            const stationAttr = attributes.find(a => a.key === 'metro_station');
            if (stationAttr) {
                // Update the existing attribute
                const updateResponse = await fetch(`/api/node-attributes/${stationAttr.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
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
                if (!updateResponse.ok) {
                    throw new Error('Failed to update station attribute');
                }
            } else {
                // Create new attribute
                await saveStationToDatabase(station);
            }
            return station;
        } else {
            throw new Error('Cannot update station without node_id');
        }
    }
    
    // Update a line in the database
    async function updateLineInDatabase(line) {
        try {
            // Try dedicated endpoint first
            try {
                const response = await fetch(`/api/metro-map/lines/${line.id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(line)
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (apiError) {
                console.log('Dedicated API not available, falling back to node attributes');
            }
            
            // Fall back to updating node attribute if (line.stations && line.stations.length > 0) {
            const stationId = line.stations[0];
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
                            value: JSON.stringify(line)
                        })
                    });
                    if (!updateResponse.ok) {
                        throw new Error('Failed to update line attribute');
                    }
                } else {
                    // Create new attribute
                    await saveLineToDatabase(line);
                }
                return line;
            } else {
                throw new Error('Cannot update line without stations');
            }
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
        const loading = document.createElement('div');
        loading.className = 'metro-loading';
        loading.textContent = 'Loading';
        container.appendChild(loading);
    }
    
    // Hide loading indicator
    function hideLoading() {
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
    
    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible,
        addStation,
        addLine,
        addStationToLine
    };
})();

// Make the module globally accessible (crucial step!)
window.MetroMapVisualizer = MetroMapVisualizer;
console.log('MetroMapVisualizer assigned to window object');