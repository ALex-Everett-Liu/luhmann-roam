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
    
    // Constants for the visualization
    const PLANET_COLORS = [
        '#4fc3f7', '#2196f3', '#1976d2', '#0d47a1',
        '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
        '#ffc107', '#ff9800', '#ff5722', '#f44336'
    ];
    
    // Animation settings
    const ANIMATION_SPEED = 0.005;
    
    // Initialize the visualizer
    function initialize() {
        console.log('Initializing 2D Cosmic Node Visualizer');
        createContainer();
        
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
        // Simply redraw the current node's system
        if (currentNode) {
            visualizeNode(currentNode.id);
        }
    }
    
    // Handle canvas click
    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if user clicked on sun
        if (sun && isPointInCircle(x, y, sun.x, sun.y, sun.radius)) {
            showNodeActionMenu(sun.node, event);
            return;
        }
        
        // Check if user clicked on a planet
        for (const planet of planets) {
            if (isPointInCircle(x, y, planet.x, planet.y, planet.radius)) {
                showNodeActionMenu(planet.node, event);
                return;
            }
        }
        
        // Check if user clicked on a portal
        for (const portal of portals) {
            if (isPointInCircle(x, y, portal.x, portal.y, portal.radius)) {
                showTravelOptionsMenu(portal, event);
                return;
            }
        }
    }
    
    // Helper function to check if a point is inside a circle
    function isPointInCircle(x, y, cx, cy, radius) {
        const dx = x - cx;
        const dy = y - cy;
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
        
        // Draw background stars
        drawStars();
        
        // Draw orbit lines
        drawOrbitLines();
        
        // Update and draw planets
        updateAndDrawPlanets();
        
        // Draw sun
        drawSun();
        
        // Draw portals
        updateAndDrawPortals();
        
        // Draw labels
        drawLabels();
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
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let i = 0; i < planets.length; i++) {
            const planet = planets[i];
            
            // Update position
            planet.angle += ANIMATION_SPEED / Math.sqrt(planet.orbitRadius);
            planet.x = centerX + Math.cos(planet.angle) * planet.orbitRadius;
            planet.y = centerY + Math.sin(planet.angle) * planet.orbitRadius;
            
            // Draw planet
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
            
            // Create gradient
            const gradient = ctx.createRadialGradient(
                planet.x, planet.y, 0,
                planet.x, planet.y, planet.radius
            );
            gradient.addColorStop(0, planet.color);
            gradient.addColorStop(1, adjustColor(planet.color, -30));
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw planet border
            ctx.strokeStyle = adjustColor(planet.color, 30);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Draw sun
    function drawSun() {
        if (!sun) return;
        
        // Draw sun
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
        
        // Create gradient
        const gradient = ctx.createRadialGradient(
            sun.x, sun.y, 0,
            sun.x, sun.y, sun.radius
        );
        gradient.addColorStop(0, '#FDB813');
        gradient.addColorStop(1, '#F77F00');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw sun glow
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius + 10, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
            sun.x, sun.y, sun.radius,
            sun.x, sun.y, sun.radius + 10
        );
        glowGradient.addColorStop(0, 'rgba(253, 184, 19, 0.5)');
        glowGradient.addColorStop(1, 'rgba(253, 184, 19, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.fill();
    }
    
    // Update and draw portals
    function updateAndDrawPortals() {
        for (let i = 0; i < portals.length; i++) {
            const portal = portals[i];
            
            // Draw portal base
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 149, 237, 0.3)';
            ctx.fill();
            
            // Draw portal rings
            for (let j = 0; j < 3; j++) {
                const ringRadius = portal.radius * (0.6 + j * 0.2);
                const ringWidth = 2;
                
                portal.ringAngles[j] += 0.01 * (j + 1);
                
                ctx.beginPath();
                ctx.arc(portal.x, portal.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 149, 237, ${0.5 + j * 0.2})`;
                ctx.lineWidth = ringWidth;
                ctx.stroke();
            }
            
            // Draw number of connections
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(portal.links.length.toString(), portal.x, portal.y);
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
            
            // Create sun (current node)
            createSun(node);
            
            // Create planets (children)
            createPlanets(children);
            
            // Create portal for links
            if (links && links.length > 0) {
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
            radius: 40,
            color: '#FDB813'
        };
    }
    
    // Create planets (children)
    function createPlanets(nodes) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const basePlanetSize = 15;
        
        // Calculate base orbit radius based on canvas size
        const minDimension = Math.min(canvas.width, canvas.height);
        const baseOrbitRadius = minDimension * 0.2;
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            
            // Determine planet size based on content length or any other property
            const contentLength = node.content ? node.content.length : 1;
            const planetSize = Math.max(basePlanetSize, Math.min(basePlanetSize * 1.5, contentLength / 5));
            
            // Calculate orbit radius - increasing with each planet
            const orbitRadius = baseOrbitRadius + (i * 50);
            
            // Calculate initial position on the orbit
            const angle = Math.random() * Math.PI * 2;
            const x = centerX + Math.cos(angle) * orbitRadius;
            const y = centerY + Math.sin(angle) * orbitRadius;
            
            // Create planet object
            const planet = {
                node: node,
                x: x,
                y: y,
                radius: planetSize,
                orbitRadius: orbitRadius,
                angle: angle,
                color: PLANET_COLORS[i % PLANET_COLORS.length]
            };
            
            planets.push(planet);
        }
    }
    
    // Create portal (links)
    function createPortal(node, links) {
        if (!links || links.length === 0) return;
        
        // Position portal in the top right quadrant
        const portalX = canvas.width * 0.8;
        const portalY = canvas.height * 0.2;
        
        const portal = {
            node: node,
            links: links,
            x: portalX,
            y: portalY,
            radius: 25,
            ringAngles: [0, Math.PI/2, Math.PI]
        };
        
        portals.push(portal);
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
        
        portal.links.forEach(link => {
            const option = document.createElement('div');
            option.className = 'travel-option';
            
            const content = document.createElement('div');
            content.className = 'travel-option-content';
            
            // Direction icon
            const icon = document.createElement('span');
            icon.className = `direction-icon ${link.direction}`;
            icon.textContent = link.direction === 'outgoing' ? '→' : '←';
            content.appendChild(icon);
            
            // Node name
            const name = document.createElement('span');
            name.className = 'travel-destination-name';
            name.textContent = link.target_content;
            content.appendChild(name);
            
            option.appendChild(content);
            
            // Add click event to travel to the node
            option.addEventListener('click', () => {
                animateWormholeTravel(() => {
                    visualizeNode(link.target_id);
                });
            });
            
            optionsList.appendChild(option);
        });
        
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
        
        let content = `<h3>${node.content}</h3>`;
        
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
    function adjustColor(color, amount) {
        // Convert hex to RGB
        let r, g, b;
        
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        } else {
            return color; // Return original if format not recognized
        }
        
        // Adjust and clamp RGB values
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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