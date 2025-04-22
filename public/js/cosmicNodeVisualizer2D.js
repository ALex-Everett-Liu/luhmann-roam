// 2D Cosmic Node Visualizer
// A performance-optimized 2D version of the cosmic solar system visualization

/**
 * IMPLEMENTATION NOTES:
 * 
 * 1. MODULE ARCHITECTURE:
 *    - This module uses the Revealing Module Pattern (IIFE) for encapsulation
 *    - Private variables and functions are contained inside the module scope
 *    - Only necessary methods are exposed through the returned object
 * 
 * 2. GLOBAL ACCESSIBILITY:
 *    - IMPORTANT: This module MUST be explicitly added to the window object
 *    - Without the window.CosmicNodeVisualizer2D assignment at the end of this file,
 *      the module won't be accessible from app.js and other modules
 *    - This line is crucial: window.CosmicNodeVisualizer2D = CosmicNodeVisualizer2D;
 * 
 * 3. SCRIPT LOADING:
 *    - Ensure this script is loaded before app.js in the HTML file
 *    - The order of loading is important: dependencies first, then this module, then app.js
 * 
 * 4. VISUAL DESIGN:
 *    - Uses HTML5 Canvas for efficient 2D rendering
 *    - Follows similar visual metaphor as the 3D version for consistency
 *    - Optimized for performance with reduced complexity compared to 3D version
 */

const CosmicNodeVisualizer2D = (function() {
    // Private variables
    let canvas, ctx;
    let container;
    let currentNode;
    let planets = [];
    let portals = [];
    let sun;
    let animationFrameId = null;
    let _isVisible = false;
    let labels = [];
    let stars = [];
    let frameCounter = 0;
    let moons = []; // New array to store moon data
    let zoomLevel = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let minZoom = 0.2;
    let maxZoom = 5;
    
    // Constants for the visualization
    const PLANET_COLORS = [
        '#4fc3f7', '#2196f3', '#1976d2', '#0d47a1',
        '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
        '#ffc107', '#ff9800', '#ff5722', '#f44336'
    ];
    
    // Add these missing constants
    const PLANETS_PER_ORBIT = 6; // Number of planets per orbit
    const BASE_ORBIT_RADIUS = 120; // Base radius for the first orbit
    const ORBIT_SPACING = 80; // Space between orbits
    
    // Animation settings
    const ANIMATION_SPEED = 0.005;
    
    // Add this near the top of the file, with other style definitions
    const menuStyles = `
    .cosmic-links-button {
        background-color: #6495ED; /* A bluish color to match the portal theme */
        color: white;
        margin-top: 5px;
    }

    .cosmic-zoom-controls {
        display: flex;
        align-items: center;
        margin: 0 10px;
    }

    .cosmic-zoom-controls button {
        width: 30px;
        height: 30px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 5px;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: white;
        border-radius: 50%;
        cursor: pointer;
    }

    .cosmic-zoom-controls button:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .cosmic-zoom-display {
        color: white;
        font-size: 14px;
        margin: 0 5px;
        min-width: 50px;
        text-align: center;
    }
    `;
    
    // Initialize the visualizer
    function initialize() {
        console.log('Initializing 2D Cosmic Node Visualizer');
        
        // Add custom styles for the links button
        const styleElement = document.createElement('style');
        styleElement.textContent = menuStyles;
        document.head.appendChild(styleElement);
        
        createContainer();
        
        // Set up pan and zoom
        setupPanAndZoom();
        
        // Prevent context menu on canvas (to allow right-click dragging)
        canvas.addEventListener('contextmenu', preventContextMenu);
        
        // Add event listeners for window resize
        window.addEventListener('resize', onWindowResize);
        
        // Hide initially
        hide();
    }
    
    // Create the container and canvas
    function createContainer() {
        // Create main container
        container = document.createElement('div');
        container.className = 'cosmic-visualizer-container';
        
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
        controls.className = 'cosmic-controls';
        
        // Reset view button
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '⟲';
        resetButton.title = 'Reset view';
        resetButton.addEventListener('click', resetView);
        controls.appendChild(resetButton);
        
        // Add zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'cosmic-zoom-controls';
        
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
        zoomDisplay.className = 'cosmic-zoom-display';
        zoomDisplay.id = 'cosmic-zoom-display';
        zoomDisplay.textContent = '100%';
        zoomControls.appendChild(zoomDisplay);
        
        controls.appendChild(zoomControls);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.className = 'cosmic-close-button';
        closeButton.title = 'Close cosmic view';
        closeButton.addEventListener('click', hide);
        controls.appendChild(closeButton);
        
        container.appendChild(controls);
    }
    
    // Create info panel
    function createInfoPanel() {
        const infoPanel = document.createElement('div');
        infoPanel.className = 'cosmic-info-panel';
        infoPanel.innerHTML = '<h3>Select a node</h3><p>Click on a node to see more information.</p>';
        container.appendChild(infoPanel);
    }
    
    // Handle window resize
    function onWindowResize() {
        if (!_isVisible) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        if (currentNode) {
            visualizeNode(currentNode.id);
        }
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
        if (currentNode) {
            visualizeNode(currentNode.id);
        }
    }
    
    // Handle canvas click
    function handleCanvasClick(event) {
        // Only handle click if not dragging
        if (isDragging) {
            // This was a drag end, not a click
            isDragging = false;
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        console.log('Canvas click at position:', x, y);
        
        // Debug portals
        if (portals.length > 0) {
            console.log('Portal positions:', portals.map(p => ({x: p.x, y: p.y, radius: p.radius})));
        }
        
        // Check if user clicked on sun
        if (sun && isPointInCircle(x, y, sun.x, sun.y, sun.radius)) {
            console.log('Sun clicked');
            showNodeActionMenu(sun.node, event);
            return;
        }
        
        // Check if user clicked on a moon (check moons first since they're on top of planets)
        for (const moon of moons) {
            if (isPointInCircle(x, y, moon.x, moon.y, moon.radius)) {
                console.log('Moon clicked:', moon.node.content);
                showNodeActionMenu(moon.node, event);
                return;
            }
        }
        
        // Check if user clicked on a planet
        for (const planet of planets) {
            if (isPointInCircle(x, y, planet.x, planet.y, planet.radius)) {
                console.log('Planet clicked:', planet.node.content);
                showNodeActionMenu(planet.node, event);
                return;
            }
        }
        
        // Check if user clicked on a portal
        for (const portal of portals) {
            if (isPointInCircle(x, y, portal.x, portal.y, portal.radius)) {
                console.log('Portal clicked with', portal.links.length, 'links');
                showTravelOptionsMenu(portal, event);
                return;
            }
        }
        
        console.log('Click not on any interactive element');
    }
    
    // Helper function to check if a point is inside a circle
    function isPointInCircle(x, y, cx, cy, radius) {
        // Apply inverse transformation to click coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Adjust for the center, zoom, and offset
        const adjustedX = (x - centerX) / zoomLevel - offsetX / zoomLevel + centerX;
        const adjustedY = (y - centerY) / zoomLevel - offsetY / zoomLevel + centerY;
        
        // Now check if the adjusted point is in the circle
        const dx = adjustedX - cx;
        const dy = adjustedY - cy;
        return (dx * dx + dy * dy) <= (radius * radius);
    }
    
    // Add stars to the background
    function addStars() {
        stars = [];
        const starCount = Math.floor(canvas.width * canvas.height / 3000);
        
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    // Draw stars
    function drawStars() {
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
        }
    }
    
    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save the current context state
        ctx.save();
        
        // Apply transformations for zoom and pan
        // Calculate the center of the canvas
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
        
        // Draw background stars
        drawStars();
        
        // Draw orbit lines
        drawOrbitLines();
        
        // Update and draw planets
        updateAndDrawPlanets();
        
        // Update and draw moons
        updateAndDrawMoons();
        
        // Draw sun
        drawSun();
        
        // Draw portals
        updateAndDrawPortals();
        
        // Draw labels
        drawLabels();
        
        // Restore the canvas state
        ctx.restore();
        
        // Increment frame counter
        frameCounter++;
    }
    
    // Draw orbit lines
    function drawOrbitLines() {
        ctx.save();
        
        // Draw from the center of the canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (const planet of planets) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, planet.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.setLineDash([5, 3]);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Update and draw planets
    function updateAndDrawPlanets() {
        for (let i = 0; i < planets.length; i++) {
            const planet = planets[i];
            
            // Update planet position
            planet.orbitAngle += planet.angleSpeed * ANIMATION_SPEED;
            planet.x = canvas.width / 2 + Math.cos(planet.orbitAngle) * planet.orbitRadius;
            planet.y = canvas.height / 2 + Math.sin(planet.orbitAngle) * planet.orbitRadius;
            
            // Draw planet
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
            
            // Create gradient
            const gradient = ctx.createRadialGradient(
                planet.x, planet.y, 0,
                planet.x, planet.y, planet.radius
            );
            gradient.addColorStop(0, adjustColor(planet.color, 20));
            gradient.addColorStop(1, planet.color);
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw rings if planet has links
            if (planet.hasRings) {
                drawCelestialRings(planet);
            }
            
            // Draw city structures if planet has markdown
            if (planet.hasMarkdown) {
                drawCelestialCity(planet);
            }
        }
    }
    
    // Draw sun
    function drawSun() {
        if (!sun) return;
        
        // Draw sun
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
        
        // Create gradient for sun
        const gradient = ctx.createRadialGradient(
            sun.x, sun.y, 0,
            sun.x, sun.y, sun.radius
        );
        gradient.addColorStop(0, '#ffee00');
        gradient.addColorStop(1, sun.color);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw rings if sun has links
        if (sun.hasRings) {
            drawCelestialRings(sun);
        }
        
        // Draw city structures if sun has markdown
        if (sun.hasMarkdown) {
            drawCelestialCity(sun);
        }
    }
    
    // Update and draw portals
    function updateAndDrawPortals() {
        if (portals.length === 0) {
            return; // No portals to draw
        }
        
        // Only log every 100 frames to avoid console flooding
        if (frameCounter % 100 === 0) {
            console.log('Drawing', portals.length, 'portals');
        }
        
        for (let i = 0; i < portals.length; i++) {
            const portal = portals[i];
            
            // Skip this portal if coordinates are invalid
            if (!isFinite(portal.x) || !isFinite(portal.y) || !isFinite(portal.radius)) {
                console.error('Portal has invalid coordinates:', portal);
                continue;
            }
            
            // Draw a connecting line from sun to portal
            if (sun && isFinite(sun.x) && isFinite(sun.y)) {
                ctx.beginPath();
                ctx.moveTo(sun.x, sun.y);
                ctx.lineTo(portal.x, portal.y);
                ctx.strokeStyle = 'rgba(100, 149, 237, 0.3)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            // Draw portal base
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
            
            try {
                // Use a gradient for the portal base
                const gradient = ctx.createRadialGradient(
                    portal.x, portal.y, 0,
                    portal.x, portal.y, portal.radius
                );
                gradient.addColorStop(0, 'rgba(120, 180, 255, 0.5)');
                gradient.addColorStop(1, 'rgba(70, 130, 220, 0.2)');
                
                ctx.fillStyle = gradient;
                ctx.fill();
            } catch (error) {
                console.error('Error creating portal gradient:', error, 'Portal:', portal);
                // Use a fallback solid color
                ctx.fillStyle = 'rgba(70, 130, 220, 0.5)';
                ctx.fill();
            }
            
            // Draw portal rings
            for (let j = 0; j < 3; j++) {
                const ringRadius = portal.radius * (0.6 + j * 0.2);
                const ringWidth = 3;
                
                // Ensure ringAngles array exists
                if (!portal.ringAngles) {
                    portal.ringAngles = [0, Math.PI/2, Math.PI];
                }
                
                portal.ringAngles[j] += 0.01 * (j + 1);
                
                ctx.beginPath();
                ctx.arc(portal.x, portal.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 180, 255, ${0.6 + j * 0.15})`;
                ctx.lineWidth = ringWidth;
                ctx.stroke();
            }
            
            // FIXED: Calculate link count safely
            let linkCount = 0;
            
            // Determine the link count based on the structure of portal.links
            if (portal.links) {
                if (Array.isArray(portal.links)) {
                    linkCount = portal.links.length;
                } else if (typeof portal.links === 'object') {
                    // Check for outgoing and incoming arrays
                    const outgoingCount = Array.isArray(portal.links.outgoing) ? portal.links.outgoing.length : 0;
                    const incomingCount = Array.isArray(portal.links.incoming) ? portal.links.incoming.length : 0;
                    linkCount = outgoingCount + incomingCount;
                }
            }
            
            // Draw number of connections
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(linkCount.toString(), portal.x, portal.y);
            
            // Add "LINKS" text below the number
            ctx.font = '12px Arial';
            ctx.fillText('LINKS', portal.x, portal.y + 18);
        }
    }
    
    // Draw labels
    function drawLabels() {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Draw sun label
        if (sun) {
            const labelY = sun.y + sun.radius + 10;
            ctx.fillText(sun.node.content, sun.x, labelY);
        }
        
        // Draw planet labels
        for (const planet of planets) {
            const labelY = planet.y + planet.radius + 5;
            ctx.fillText(planet.node.content, planet.x, labelY);
            
            // Add indicator for planets with moons
            const moonCount = moons.filter(moon => moon.planetId === planet.node.id).length;
            if (moonCount > 0) {
                const moonIndicatorY = planet.y + planet.radius + 25;
                ctx.font = '12px Arial';
                ctx.fillText(`(${moonCount} moons)`, planet.x, moonIndicatorY);
                ctx.font = '14px Arial'; // Reset font size for next labels
            }
        }
    }
    
    // Visualize a node and its connected nodes
    async function visualizeNode(nodeId) {
        console.log('Visualizing node:', nodeId);
        
        try {
            // First show loading indicator
            showLoading();
            
            // Fetch the node data
            const response = await fetch(`/api/nodes/${nodeId}`);
            const node = await response.json();
            
            // Fetch children
            const children = await window.fetchChildren(nodeId);
            
            // Fetch links
            const linksResponse = await fetch(`/api/nodes/${nodeId}/links`);
            const links = await linksResponse.json();
            
            // Clear previous data
            planets = [];
            portals = [];
            labels = [];
            moons = []; // Clear moons array too
            
            // Create sun (current node)
            createSun(node);
            
            // Create planets (children)
            createPlanets(children);
            
            // Fetch and create moons (grandchildren) for each planet
            await createMoonsForPlanets();
            
            // Create portal for links
            if (links && (Array.isArray(links) ? links.length > 0 : 
                (links.outgoing && links.outgoing.length > 0) || 
                (links.incoming && links.incoming.length > 0))) {
                createPortal(node, links);
            }
            
            // Store current node
            currentNode = node;
            
            // Update the info panel
            updateInfoPanel(node);
            
            // Hide loading indicator
            hideLoading();
            
            // Begin animation if not already running
            if (!animationFrameId) {
                animate();
            }
            
        } catch (error) {
            console.error('Error visualizing node:', error);
            hideLoading();
        }
    }
    
    // Show loading indicator
    function showLoading() {
        const loading = document.createElement('div');
        loading.className = 'cosmic-loading';
        loading.textContent = 'Loading';
        container.appendChild(loading);
    }
    
    // Hide loading indicator
    function hideLoading() {
        const loading = container.querySelector('.cosmic-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    // Create the sun (current node)
    function createSun(node) {
        sun = {
            node: node,
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 30,
            color: document.documentElement.style.getPropertyValue('--primary-color') || '#3490c2'
        };
        
        // Add new property to track if sun has rings (links)
        sun.hasRings = node.link_count && node.link_count > 0;
        
        // Add new property to track if sun has markdown
        sun.hasMarkdown = node.has_markdown;
    }
    
    // Create planets (children)
    function createPlanets(nodes) {
        planets = [];
        
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        // Calculate the number of orbits needed
        const numOrbits = Math.ceil(nodes.length / PLANETS_PER_ORBIT);
        
        // For each orbit
        for (let orbit = 0; orbit < numOrbits; orbit++) {
            // Calculate the orbit radius
            const orbitRadius = BASE_ORBIT_RADIUS + (orbit * ORBIT_SPACING);
            
            // Calculate how many planets for this orbit
            const planetsInOrbit = Math.min(PLANETS_PER_ORBIT, nodes.length - (orbit * PLANETS_PER_ORBIT));
            
            // For each planet in this orbit
            for (let i = 0; i < planetsInOrbit; i++) {
                // Get the node index
                const nodeIndex = (orbit * PLANETS_PER_ORBIT) + i;
                
                // Skip if we've run out of nodes
                if (nodeIndex >= nodes.length) {
                    break;
                }
                
                // Get the node
                const node = nodes[nodeIndex];
                
                // Calculate the position on the orbit
                const angle = (i / planetsInOrbit) * Math.PI * 2;
                const x = canvas.width / 2 + Math.cos(angle) * orbitRadius;
                const y = canvas.height / 2 + Math.sin(angle) * orbitRadius;
                
                // Calculate planet size based on content length (min 8, max 20)
                const contentLength = node.content ? node.content.length : 1;
                const planetSize = Math.max(8, Math.min(20, 8 + contentLength / 10));
                
                // Calculate planet color (use node's position to determine hue)
                const hue = (i / planetsInOrbit) * 360;
                const color = `hsl(${hue}, 70%, 60%)`;
                
                // Create planet
                const planet = {
                    node: node,
                    orbitRadius: orbitRadius,
                    orbitAngle: angle,
                    angleSpeed: 0.002 / Math.sqrt(orbit + 1), // Planets in outer orbits move slower
                    radius: planetSize,
                    x: x,
                    y: y,
                    color: color,
                    orbit: orbit,
                    // Add properties to track if planet has rings (links) or markdown
                    hasRings: node.link_count && node.link_count > 0,
                    hasMarkdown: node.has_markdown
                };
                
                // Add to planets array
                planets.push(planet);
            }
        }
    }
    
    // Create portal (links)
    function createPortal(node, links) {
        if (!links || links.length === 0) {
            console.log('No links to create portal for');
            return;
        }
        
        console.log('Creating portal for', links.length, 'links');
        
        // Position portal more prominently in the top right quadrant
        // Use relative positioning based on canvas size
        // Make sure we have valid canvas dimensions
        const portalX = (isFinite(canvas.width) ? canvas.width * 0.85 : 800 * 0.85);
        const portalY = (isFinite(canvas.height) ? canvas.height * 0.15 : 600 * 0.15);
        
        // Make the portal larger and more visible
        // Use a valid links array or default to empty
        const linksArray = Array.isArray(links) ? links : 
                          (links.outgoing && links.incoming ? 
                           [...links.outgoing, ...links.incoming] : []);
        
        const linkCount = linksArray.length || 1;
        const portalRadius = Math.max(30, 20 + (linkCount * 5));
        
        console.log(`Portal position: x=${portalX}, y=${portalY}, radius=${portalRadius}`);
        
        // Validate all values are finite
        if (!isValidCoordinate(portalX) || !isValidCoordinate(portalY) || !isValidCoordinate(portalRadius)) {
            console.error('Invalid portal coordinates:', {portalX, portalY, portalRadius});
            return;
        }
        
        const portal = {
            node: node,
            links: links,
            x: portalX,
            y: portalY,
            radius: portalRadius,
            ringAngles: [0, Math.PI/2, Math.PI]
        };
        
        portals.push(portal);
        console.log('Portal created at position:', portalX, portalY, 'with radius:', portalRadius);
    }
    
    // Show travel options menu
    function showTravelOptionsMenu(portal, event) {
        // Remove any existing menus
        hideAllMenus();
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'cosmic-travel-menu';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'travel-menu-header';
        header.innerHTML = '<h3>Travel to Connected Nodes</h3>';
        menu.appendChild(header);
        
        // Create list of options
        const optionsList = document.createElement('div');
        optionsList.className = 'travel-options-list';
        
        // Debug the portal links structure
        console.log('Portal links structure:', JSON.stringify(portal.links, null, 2));
        
        // Handle different possible link structures
        let processedLinks = [];
        
        if (Array.isArray(portal.links)) {
            // If it's a simple array of links
            processedLinks = portal.links;
        } else if (portal.links && typeof portal.links === 'object') {
            // If it's an object with outgoing/incoming properties
            if (Array.isArray(portal.links.outgoing)) {
                portal.links.outgoing.forEach(link => {
                    processedLinks.push({
                        ...link,
                        direction: 'outgoing',
                        target_id: link.target_id || link.to_node_id,
                        target_content: link.target_content || link.content
                    });
                });
            }
            
            if (Array.isArray(portal.links.incoming)) {
                portal.links.incoming.forEach(link => {
                    processedLinks.push({
                        ...link,
                        direction: 'incoming',
                        target_id: link.target_id || link.from_node_id,
                        target_content: link.target_content || link.content
                    });
                });
            }
        }
        
        console.log('Processed links:', processedLinks);
        
        if (processedLinks.length === 0) {
            const noLinks = document.createElement('div');
            noLinks.className = 'travel-option';
            noLinks.textContent = 'No linked nodes available';
            optionsList.appendChild(noLinks);
        } else {
            processedLinks.forEach(link => {
                const option = document.createElement('div');
                option.className = 'travel-option';
                
                const content = document.createElement('div');
                content.className = 'travel-option-content';
                
                // Direction icon
                const icon = document.createElement('span');
                icon.className = `direction-icon ${link.direction || 'unknown'}`;
                icon.textContent = (link.direction === 'outgoing') ? '→' : (link.direction === 'incoming' ? '←' : '↔');
                content.appendChild(icon);
                
                // Get the target node ID and content
                const targetId = link.target_id || link.to_node_id || link.from_node_id;
                const targetContent = link.target_content || link.content || 'Unknown node';
                
                // Debug each link
                console.log('Processing link:', {
                    original: link,
                    targetId,
                    targetContent
                });
                
                // Node name
                const name = document.createElement('span');
                name.className = 'travel-destination-name';
                name.textContent = targetContent;
                content.appendChild(name);
                
                option.appendChild(content);
                
                // Add click event to travel to the node only if we have a valid target ID
                if (targetId) {
                    option.addEventListener('click', async () => {
                        console.log(`Traveling to node ${targetId}`);
                        
                        // Before traveling, fetch the node's parent to visualize its context
                        try {
                            // Show travel animation
                            animateWormholeTravel(async () => {
                                // First, fetch the target node to get its information
                                const nodeResponse = await fetch(`/api/nodes/${targetId}`);
                                const targetNode = await nodeResponse.json();
                                
                                if (targetNode.parent_id) {
                                    // If the node has a parent, visualize the parent's system
                                    console.log(`Target node has parent ${targetNode.parent_id}, visualizing parent system`);
                                    visualizeNode(targetNode.parent_id);
                                } else {
                                    // If it's a root node, just visualize it directly
                                    console.log(`Target node is a root node, visualizing directly`);
                                    visualizeNode(targetId);
                                }
                            });
                        } catch (error) {
                            console.error(`Error preparing travel to node ${targetId}:`, error);
                            // Fall back to direct visualization on error
                            animateWormholeTravel(() => {
                                visualizeNode(targetId);
                            });
                        }
                    });
                } else {
                    // If we don't have a target ID, disable the option
                    option.classList.add('disabled');
                    option.title = 'Cannot travel to this node - missing ID';
                }
                
                optionsList.appendChild(option);
            });
        }
        
        menu.appendChild(optionsList);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'travel-menu-close';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', hideAllMenus);
        menu.appendChild(closeButton);
        
        // Position the menu
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        // Add to container
        container.appendChild(menu);
    }
    
    // Animate wormhole travel
    function animateWormholeTravel(callback) {
        // Create wormhole overlay
        const overlay = document.createElement('div');
        overlay.className = 'wormhole-travel-overlay';
        
        // Create wormhole tunnel
        const tunnel = document.createElement('div');
        tunnel.className = 'wormhole-tunnel';
        overlay.appendChild(tunnel);
        
        // Add some stars
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'wormhole-star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.setProperty('--star-direction', Math.random() > 0.5 ? '1' : '-1');
            star.style.animationDelay = `${Math.random() * 0.5}s`;
            tunnel.appendChild(star);
        }
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Start animation
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        // Execute callback after animation
        setTimeout(() => {
            if (callback) callback();
            
            // Remove overlay after callback
            setTimeout(() => {
                overlay.classList.add('exit');
                setTimeout(() => {
                    overlay.remove();
                }, 1000);
            }, 500);
        }, 1500);
    }
    
    // Show node action menu
    function showNodeActionMenu(node, event) {
        // Remove any existing menus
        hideAllMenus();
        
        // Update info panel
        updateInfoPanel(node);
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'cosmic-node-menu';
        
        // View node button
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View in Outliner';
        viewButton.addEventListener('click', () => {
            hide();
            // Focus on this node in the main outliner
            if (window.BreadcrumbManager) {
                window.BreadcrumbManager.focusOnNode(node.id);
            }
        });
        menu.appendChild(viewButton);
        
        // Visualize button (for planets)
        if (node.id !== currentNode.id) {
            const visualizeButton = document.createElement('button');
            visualizeButton.textContent = 'Explore Node';
            visualizeButton.addEventListener('click', () => {
                animateWormholeTravel(() => {
                    visualizeNode(node.id);
                });
            });
            menu.appendChild(visualizeButton);
        }
        
        // Add "View Links" button if the node has links
        if (node.link_count && node.link_count > 0) {
            const linksButton = document.createElement('button');
            linksButton.textContent = 'View Linked Nodes';
            linksButton.className = 'cosmic-links-button';
            linksButton.addEventListener('click', async () => {
                // Fetch links for this node
                try {
                    // Show a loading message
                    alert('Fetching links...');
                    
                    // Log the node ID being fetched
                    console.log(`Fetching links for node: ${node.id}`);
                    
                    const linksResponse = await fetch(`/api/nodes/${node.id}/links`);
                    console.log('Links response status:', linksResponse.status);
                    
                    // Try to parse the response as text first to inspect it
                    const responseText = await linksResponse.text();
                    console.log('Raw links response:', responseText);
                    
                    // Then parse it as JSON
                    let links;
                    try {
                        links = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('Error parsing links JSON:', parseError);
                        alert('Error parsing link data format');
                        return;
                    }
                    
                    console.log('Parsed links data:', links);
                    
                    // Better handling of different response formats
                    let processedLinks = [];
                    
                    if (Array.isArray(links)) {
                        console.log('Links is an array with', links.length, 'items');
                        processedLinks = links;
                    } else if (links && typeof links === 'object') {
                        console.log('Links is an object with properties:', Object.keys(links).join(', '));
                        
                        // Check for outgoing links
                        if (Array.isArray(links.outgoing)) {
                            console.log('Found', links.outgoing.length, 'outgoing links');
                            processedLinks = processedLinks.concat(links.outgoing.map(link => ({
                                ...link,
                                direction: 'outgoing',
                                target_id: link.target_id || link.to_node_id,
                                target_content: link.target_content || link.content
                            })));
                        }
                        
                        // Check for incoming links
                        if (Array.isArray(links.incoming)) {
                            console.log('Found', links.incoming.length, 'incoming links');
                            processedLinks = processedLinks.concat(links.incoming.map(link => ({
                                ...link,
                                direction: 'incoming',
                                target_id: link.target_id || link.from_node_id,
                                target_content: link.target_content || link.content
                            })));
                        }
                    }
                    
                    console.log('Processed links:', processedLinks);
                    
                    if (processedLinks && processedLinks.length > 0) {
                        // Create fake portal object to reuse the travel menu
                        const portalObj = {
                            node: node,
                            links: processedLinks  // Use processed links here
                        };
                        console.log('Creating travel menu with portal:', portalObj);
                        showTravelOptionsMenu(portalObj, event);
                    } else {
                        console.warn('No links found after processing');
                        alert('No usable links found for this node.');
                    }
                } catch (error) {
                    console.error('Error fetching links:', error);
                    alert(`Error loading links: ${error.message}`);
                }
            });
            menu.appendChild(linksButton);
        }
        
        // Position the menu
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        // Add to container
        container.appendChild(menu);
    }
    
    // Hide all menus
    function hideAllMenus() {
        const menus = container.querySelectorAll('.cosmic-node-menu, .cosmic-travel-menu');
        menus.forEach(menu => menu.remove());
    }
    
    // Update info panel
    function updateInfoPanel(node) {
        const infoPanel = container.querySelector('.cosmic-info-panel');
        if (!infoPanel) return;
        
        // Make sure we have valid node data
        if (!node) {
            infoPanel.innerHTML = '<h3>Error: No node data available</h3>';
            return;
        }
        
        // Use a safe content value, fallback to ID if content is missing
        const safeContent = node.content || `Node ${node.id || 'Unknown'}`;
        
        let content = `<h3>${safeContent}</h3>`;
        
        if (node.created_at) {
            const created = new Date(node.created_at).toLocaleString();
            content += `<p>Created: ${created}</p>`;
        }
        
        if (node.link_count) {
            content += `<p>Links: ${node.link_count}</p>`;
        }
        
        // Add markdown badge if node has markdown
        if (node.has_markdown) {
            content += `<p><span class="markdown-badge">MD</span> This node has markdown content</p>`;
        }

        // Add node ID for debugging
        content += `<p class="node-id-display">ID: ${node.id || 'Unknown'}</p>`;
        
        // Add focus button
        content += `<button class="cosmic-focus-btn">Focus on this node</button>`;
        
        infoPanel.innerHTML = content;
        
        // Add event listener to focus button
        const focusBtn = infoPanel.querySelector('.cosmic-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                hide();
                if (window.BreadcrumbManager) {
                    window.BreadcrumbManager.focusOnNode(node.id);
                }
            });
        }
    }
    
    // Show the visualizer
    function show(nodeId) {
        if (!nodeId) {
            console.error('Node ID is required to show the cosmic visualizer');
            return;
        }
        
        console.log('Showing 2D cosmic visualizer for node:', nodeId);
        
        try {
            // Set canvas size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Set container visible
            container.style.display = 'block';
            _isVisible = true;
            
            // Add click handler
            canvas.addEventListener('click', handleCanvasClick);
            
            // Generate stars
            addStars();
            
            // Visualize the node
            visualizeNode(nodeId);
            
            console.log('2D visualizer should now be visible');
        } catch (error) {
            console.error('Error showing 2D visualizer:', error);
        }
    }
    
    // Hide the visualizer
    function hide() {
        console.log('Hiding 2D cosmic visualizer');
        
        // Cancel animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Hide container
        container.style.display = 'none';
        _isVisible = false;
        
        // Remove click handler
        canvas.removeEventListener('click', handleCanvasClick);
    }
    
    // Check if visualizer is visible
    function isVisible() {
        console.log('isVisible() called, returning:', _isVisible);
        return _isVisible;
    }
    
    // Utility function to adjust color brightness
    function adjustColor(color, amount, alpha) {
        // If no valid color is provided, return a default
        if (!color || typeof color !== 'string') {
            return alpha !== undefined ? `rgba(100, 100, 100, ${alpha})` : '#646464';
        }
        
        // Handle HSL colors
        if (color.startsWith('hsl')) {
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
                const h = parseInt(hslMatch[1]);
                const s = parseInt(hslMatch[2]);
                const l = Math.min(100, Math.max(0, parseInt(hslMatch[3]) + amount / 2));
                
                if (alpha !== undefined) {
                    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
                } else {
                    return `hsl(${h}, ${s}%, ${l}%)`;
                }
            }
        }
        
        // Handle hex and RGB colors
        let r, g, b;
        
        // Check if it's a hex color
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            
            // Handle shorthand hex (#RGB)
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } 
            // Handle full hex (#RRGGBB)
            else if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            } else {
                // Invalid hex, use default
                r = g = b = 100;
            }
        } 
        // Check if it's an RGB color
        else if (color.startsWith('rgb')) {
            const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (rgbMatch) {
                r = parseInt(rgbMatch[1]);
                g = parseInt(rgbMatch[2]);
                b = parseInt(rgbMatch[3]);
            } else {
                // Invalid RGB, use default
                r = g = b = 100;
            }
        } else {
            // Unknown color format, use default
            r = g = b = 100;
        }
        
        // Adjust the color by the given amount
        r = Math.min(255, Math.max(0, r + amount));
        g = Math.min(255, Math.max(0, g + amount));
        b = Math.min(255, Math.max(0, b + amount));
        
        // Return the adjusted color
        if (alpha !== undefined) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    
    // New function to fetch and create moons for all planets
    async function createMoonsForPlanets() {
        // For each planet, fetch its children and create moons
        for (let i = 0; i < planets.length; i++) {
            const planet = planets[i];
            try {
                // Fetch children of the planet node
                const moonNodes = await window.fetchChildren(planet.node.id);
                
                if (moonNodes && moonNodes.length > 0) {
                    console.log(`Planet ${planet.node.content} has ${moonNodes.length} moons`);
                    createMoonsForPlanet(planet, moonNodes);
                }
            } catch (error) {
                console.error(`Error fetching moons for planet ${planet.node.id}:`, error);
            }
        }
    }
    
    // New function to create moons for a specific planet
    function createMoonsForPlanet(planet, moonNodes) {
        // Base moon size - smaller than planets
        const baseMoonSize = 5;
        // Base orbit radius - relative to planet size
        const baseOrbitRadius = planet.radius * 2;
        
        // Calculate moon distribution around the planet
        for (let i = 0; i < moonNodes.length; i++) {
            const moonNode = moonNodes[i];
            
            // Calculate moon size based on content length
            const contentLength = moonNode.content ? moonNode.content.length : 1;
            const moonSize = Math.max(baseMoonSize, Math.min(baseMoonSize * 1.2, contentLength / 10));
            
            // Calculate orbit radius - slightly increasing with each moon
            const orbitRadius = baseOrbitRadius + (i * 5);
            
            // Calculate initial position on the orbit
            const angle = Math.random() * Math.PI * 2;
            
            // Create moon object
            const moon = {
                node: moonNode,
                planetId: planet.node.id, // Reference to parent planet
                radius: moonSize,
                orbitRadius: orbitRadius,
                angle: angle,
                // Use a slightly different color than the planet
                color: adjustColor(planet.color, 30),
                // Add properties to track if moon has rings (links) or markdown
                hasRings: moonNode.link_count && moonNode.link_count > 0,
                hasMarkdown: moonNode.has_markdown
            };
            
            moons.push(moon);
        }
    }
    
    // Update and draw moons in the animation loop
    function updateAndDrawMoons() {
        for (let i = 0; i < moons.length; i++) {
            const moon = moons[i];
            
            // Find the parent planet
            const planet = planets.find(p => p.node.id === moon.planetId);
            if (!planet) continue; // Skip if parent planet not found
            
            // Update moon position relative to its planet
            moon.angle += ANIMATION_SPEED * 2.5 / Math.sqrt(moon.orbitRadius);
            moon.x = planet.x + Math.cos(moon.angle) * moon.orbitRadius;
            moon.y = planet.y + Math.sin(moon.angle) * moon.orbitRadius;
            
            // Draw moon
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
            
            // Create gradient
            const gradient = ctx.createRadialGradient(
                moon.x, moon.y, 0,
                moon.x, moon.y, moon.radius
            );
            gradient.addColorStop(0, moon.color);
            gradient.addColorStop(1, adjustColor(moon.color, -20));
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw moon border
            ctx.strokeStyle = adjustColor(moon.color, 20);
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw rings if moon has links
            if (moon.hasRings) {
                drawCelestialRings(moon);
            }
            
            // Draw city structures if moon has markdown
            if (moon.hasMarkdown) {
                drawCelestialCity(moon);
            }
        }
    }
    
    // Add mouse events for pan functionality
    function setupPanAndZoom() {
        // Mouse wheel for zoom
        canvas.addEventListener('wheel', handleMouseWheel);
        
        // Mouse down for pan
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
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
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
    
    // Handle mouse down for panning
    function handleMouseDown(event) {
        // Middle mouse button (wheel) or right-click for panning
        if (event.button === 1 || event.button === 2) {
            event.preventDefault();
            isDragging = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            // Change cursor to indicate panning is active
            canvas.style.cursor = 'grabbing';
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
            redrawCanvas();
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
    
    // Prevent context menu from appearing on right-click
    function preventContextMenu(event) {
        event.preventDefault();
        return false;
    }
    
    // Add a function to set the zoom level
    function setZoom(newZoom) {
        // Constrain zoom level between min and max
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        // Update the zoom display
        updateZoomDisplay();
        
        // Redraw with new zoom level
        redrawCanvas();
    }
    
    // Add a function to update the zoom display
    function updateZoomDisplay() {
        const zoomDisplay = document.getElementById('cosmic-zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
        }
    }
    
    // Add a function to redraw the canvas with current state
    function redrawCanvas() {
        // No need to call visualizeNode again, just update the drawing
        if (!animationFrameId) {
            animate(); // Start animation if not running
        }
    }
    
    // New function to draw rings around celestial bodies with links
    function drawCelestialRings(body) {
        // Skip if any coordinates are invalid
        if (!body || !isFinite(body.x) || !isFinite(body.y) || !isFinite(body.radius)) {
            console.error('Cannot draw rings for body with invalid coordinates:', body);
            return;
        }
        
        const ringWidth = body.radius * 0.4;
        const outerRadius = body.radius + ringWidth;
        const innerRadius = body.radius;
        
        // Create a ring path
        ctx.beginPath();
        ctx.arc(body.x, body.y, outerRadius, 0, Math.PI * 2);
        ctx.arc(body.x, body.y, innerRadius, 0, Math.PI * 2, true);
        
        try {
            // Create a semi-transparent gradient
            const ringGradient = ctx.createRadialGradient(
                body.x, body.y, innerRadius,
                body.x, body.y, outerRadius
            );
            
            // Get a ring color based on the body color
            let ringColor = typeof body.color === 'string' ? body.color : '#ffffff';
            
            ringGradient.addColorStop(0, adjustColor(ringColor, 40, 0.8));
            ringGradient.addColorStop(1, adjustColor(ringColor, -20, 0.2));
            
            ctx.fillStyle = ringGradient;
            ctx.fill();
        } catch (error) {
            console.error('Error creating ring gradient:', error, 'Body:', body);
            // Use a fallback solid color
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
        
        // Add animated particles to the ring to make it more dynamic
        const particleCount = Math.floor(body.radius / 2);
        const now = Date.now() / 1000;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Draw particles along the ring
        for (let i = 0; i < particleCount; i++) {
            try {
                const angle = ((i / particleCount) * Math.PI * 2) + (now % (Math.PI * 2));
                const radius = innerRadius + (Math.sin(angle * 5 + now) + 1) * (ringWidth / 2);
                const particleX = body.x + Math.cos(angle) * radius;
                const particleY = body.y + Math.sin(angle) * radius;
                const particleSize = Math.max(0.5, (ringWidth / 8) * (Math.sin(angle * 3 + now) + 1.2));
                
                if (isFinite(particleX) && isFinite(particleY) && isFinite(particleSize)) {
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            } catch (e) {
                // Skip this particle if there's an error
                console.error('Error drawing ring particle:', e);
            }
        }
    }
    
    // Add function to validate coordinates before creating any gradients
    function isValidCoordinate(value) {
        return value !== undefined && value !== null && isFinite(value);
    }
    
    // Add the missing drawCelestialCity function
    function drawCelestialCity(body) {
        // Skip if any coordinates are invalid
        if (!body || !isFinite(body.x) || !isFinite(body.y) || !isFinite(body.radius)) {
            console.error('Cannot draw city for body with invalid coordinates:', body);
            return;
        }
        
        // Parameters for the city
        const cityBaseHeight = body.radius * 0.15;
        const buildingCount = Math.floor(body.radius / 2);
        const spread = Math.PI / 3; // City covers 60° arc
        
        // Pick a random but consistent angle for the city (using hash of node ID)
        const hash = hashString(body.node.id);
        const cityAngle = (hash % 360) * (Math.PI / 180);
        
        // Draw the city buildings
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < buildingCount; i++) {
            // Calculate building angle
            const angle = cityAngle + (i / buildingCount - 0.5) * spread;
            
            // Calculate building height (varied)
            const buildingHeight = cityBaseHeight * (0.4 + Math.sin(i * 0.7) * 0.6);
            
            // Calculate building width
            const buildingWidth = body.radius * 0.04;
            
            // Calculate building position on the celestial body's surface
            const baseX = body.x + Math.cos(angle) * body.radius;
            const baseY = body.y + Math.sin(angle) * body.radius;
            
            // Calculate the building's top position
            const topX = body.x + Math.cos(angle) * (body.radius + buildingHeight);
            const topY = body.y + Math.sin(angle) * (body.radius + buildingHeight);
            
            // Calculate building sides
            const perpAngle = angle + Math.PI / 2;
            const halfWidth = buildingWidth / 2;
            
            // Draw the building
            ctx.beginPath();
            
            // Bottom edge (along planet surface)
            ctx.moveTo(baseX + Math.cos(perpAngle) * halfWidth, 
                      baseY + Math.sin(perpAngle) * halfWidth);
            ctx.lineTo(baseX - Math.cos(perpAngle) * halfWidth, 
                      baseY - Math.sin(perpAngle) * halfWidth);
            
            // Right edge
            ctx.lineTo(topX - Math.cos(perpAngle) * halfWidth, 
                      topY - Math.sin(perpAngle) * halfWidth);
            
            // Top edge
            ctx.lineTo(topX + Math.cos(perpAngle) * halfWidth, 
                      topY + Math.sin(perpAngle) * halfWidth);
            
            // Create gradient for building
            const gradient = ctx.createLinearGradient(baseX, baseY, topX, topY);
            gradient.addColorStop(0, adjustColor(body.color, 30, 0.8));
            gradient.addColorStop(1, adjustColor(body.color, 60, 0.9));
            
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.stroke();
            
            // Add windows to taller buildings
            if (buildingHeight > cityBaseHeight * 0.6) {
                const windowRows = Math.floor(buildingHeight / (cityBaseHeight * 0.2));
                const windowCols = 2;
                
                ctx.fillStyle = `rgba(255, 255, 150, ${0.4 + Math.random() * 0.6})`;
                
                for (let row = 0; row < windowRows; row++) {
                    for (let col = 0; col < windowCols; col++) {
                        // Only draw some windows (for variation)
                        if (Math.random() > 0.3) {
                            const windowSize = buildingWidth * 0.2;
                            const windowPosX = baseX + (topX - baseX) * (row + 1) / (windowRows + 1);
                            const windowPosY = baseY + (topY - baseY) * (row + 1) / (windowRows + 1);
                            
                            const windowOffsetX = (col - (windowCols - 1) / 2) * (buildingWidth * 0.4);
                            
                            ctx.beginPath();
                            ctx.arc(
                                windowPosX + Math.cos(perpAngle) * windowOffsetX,
                                windowPosY + Math.sin(perpAngle) * windowOffsetX,
                                windowSize, 0, Math.PI * 2
                            );
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }
    
    // Add the missing hashString function
    function hashString(str) {
        if (!str) return 0;
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible
    };
})();

// CRITICAL: Make the module globally accessible
// This assignment ensures that app.js can access this module
window.CosmicNodeVisualizer2D = CosmicNodeVisualizer2D;
console.log('CosmicNodeVisualizer2D assigned to window object');