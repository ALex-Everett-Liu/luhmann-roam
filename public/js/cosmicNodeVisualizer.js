/**
 * CosmicNodeVisualizer - Provides a solar system visualization of nodes
 * The selected node becomes the "sun" and its children orbit as "planets"
 */
const CosmicNodeVisualizer = (function() {
    // Private variables
    let scene, camera, renderer, controls;
    let sunNode = null;
    let planetNodes = [];
    let orbitLines = [];
    let nodeObjects = new Map(); // Maps node IDs to their 3D objects
    let container = null;
    let animationId = null;
    let isVisible = false;
    let currentLanguage = 'en';
    
    // Constants for visualization
    const SUN_SIZE_MULTIPLIER = 3;
    const MIN_PLANET_SIZE = 0.5;
    const MAX_PLANET_SIZE = 2.5;
    const ORBITAL_SPEED_FACTOR = 0.2;
    const STARS_COUNT = 2000;
    
    // Color palette for planets based on node properties
    const COLORS = {
      sun: 0xFDB813,       // Golden yellow for the sun
      regular: 0x4285F4,   // Blue for regular nodes
      markdown: 0x0F9D58,  // Green for nodes with markdown
      largeNode: 0xDB4437, // Red for nodes with large size
      orbital: 0x666666    // Grey for orbit lines
    };
    
    /**
     * Initialize the visualizer
     */
    function initialize() {
      if (window.I18n) {
        currentLanguage = I18n.getCurrentLanguage();
      }
      
      createContainer();
      
      // Listen for language changes
      document.addEventListener('languageChanged', function(e) {
        if (e.detail && e.detail.language) {
          currentLanguage = e.detail.language;
          if (isVisible && sunNode) {
            refreshLabels();
          }
        }
      });
      
      console.log('CosmicNodeVisualizer initialized');
    }
    
    /**
     * Create the container for the 3D visualization
     */
    function createContainer() {
      // Create container
      container = document.createElement('div');
      container.id = 'cosmic-visualizer-container';
      container.className = 'cosmic-visualizer-container';
      container.style.display = 'none'; // Hidden by default
      
      // Create controls panel
      const controls = document.createElement('div');
      controls.className = 'cosmic-controls';
      
      // Close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.title = 'Close visualization';
      closeButton.className = 'cosmic-close-button';
      closeButton.addEventListener('click', hide);
      controls.appendChild(closeButton);
      
      // Reset view button
      const resetButton = document.createElement('button');
      resetButton.innerHTML = '⟲';
      resetButton.title = 'Reset camera view';
      resetButton.addEventListener('click', resetCameraView);
      controls.appendChild(resetButton);
      
      // Node info panel
      const infoPanel = document.createElement('div');
      infoPanel.className = 'cosmic-info-panel';
      infoPanel.id = 'cosmic-info-panel';
      
      // Add controls and info panel to container
      container.appendChild(controls);
      container.appendChild(infoPanel);
      
      // Add container to body
      document.body.appendChild(container);
    }
    
    /**
     * Set up the Three.js scene
     */
    function setupScene() {
      // Clear any existing scene
      if (renderer) {
        container.removeChild(renderer.domElement);
        cancelAnimationFrame(animationId);
      }
      
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000510); // Dark space color
      
      // Create camera
      const aspect = container.clientWidth / container.clientHeight;
      camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
      camera.position.set(0, 15, 30);
      camera.lookAt(0, 0, 0);
      
      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      
      // Add orbit controls for interaction
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x333333);
      scene.add(ambientLight);
      
      // Add directional light (sun-like)
      const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
      directionalLight.position.set(0, 0, 0); // Light emanates from the sun position
      scene.add(directionalLight);
      
      // Add stars
      addStars();
      
      // Handle window resizing
      window.addEventListener('resize', onWindowResize);
    }
    
    /**
     * Add background stars to the scene
     */
    function addStars() {
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
      });
      
      const starVertices = [];
      for (let i = 0; i < STARS_COUNT; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
      }
      
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
    }
    
    /**
     * Handle window resize to maintain aspect ratio
     */
    function onWindowResize() {
      if (!camera || !renderer || !container) return;
      
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    /**
     * Reset camera to default view
     */
    function resetCameraView() {
      if (!controls) return;
      
      // Animate camera back to initial position
      new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 15, z: 30 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
      
      // Reset orbit controls
      new TWEEN.Tween(controls.target)
        .to({ x: 0, y: 0, z: 0 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start()
        .onComplete(() => {
          controls.reset();
        });
    }
    
    /**
     * Animation loop
     */
    function animate() {
      animationId = requestAnimationFrame(animate);
      
      // Update orbit controls
      controls.update();
      
      // Update planet positions
      updatePlanetPositions();
      
      // Update any tweens
      TWEEN.update();
      
      // Render scene
      renderer.render(scene, camera);
    }
    
    /**
     * Update planet orbit positions
     */
    function updatePlanetPositions() {
      const time = Date.now() * 0.001; // Current time in seconds
      
      // Update each planet's position based on its orbit
      planetNodes.forEach((planet, index) => {
        if (!nodeObjects.has(planet.id)) return;
        
        const planetObj = nodeObjects.get(planet.id);
        
        // Calculate orbital parameters based on node properties
        const distance = 5 + (index * 3); // Distance from sun increases with each planet
        
        // Orbital speed is inversely proportional to distance (like real planets)
        // Also influenced by node size
        const nodeSize = planet.node_size || 20;
        const speed = ORBITAL_SPEED_FACTOR * (1 / distance) * (20 / nodeSize);
        
        // Calculate new position
        const angle = time * speed;
        planetObj.position.x = distance * Math.cos(angle);
        planetObj.position.z = distance * Math.sin(angle);
        
        // Update the orbit line
        if (orbitLines[index]) {
          orbitLines[index].position.copy(scene.position);
        }
      });
    }
    
    /**
     * Visualize a node as the central sun with its children as planets
     */
    async function visualizeNode(nodeId) {
      try {
        // Load the requested node
        const response = await fetch(`/api/nodes/${nodeId}?lang=${currentLanguage}`);
        sunNode = await response.json();
        
        // Fetch children nodes
        const childrenResponse = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}`);
        planetNodes = await childrenResponse.json();
        
        console.log(`Visualizing node ${nodeId} with ${planetNodes.length} children`);
        
        // Setup Three.js scene
        setupScene();
        
        // Clear any existing objects
        nodeObjects.clear();
        orbitLines = [];
        
        // Create the sun (central node)
        createSun(sunNode);
        
        // Create the planets (children nodes)
        createPlanets(planetNodes);
        
        // Update info panel with sun node details
        updateInfoPanel(sunNode);
        
        // Start animation loop
        animate();
        
        // Mark as visible
        isVisible = true;
      } catch (error) {
        console.error('Error visualizing node:', error);
      }
    }
    
    /**
     * Create the sun object representing the central node
     */
    function createSun(node) {
      // Create sun geometry
      const size = (node.node_size || 20) / 5 * SUN_SIZE_MULTIPLIER;
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      
      // Create a glowing material for the sun
      const material = new THREE.MeshBasicMaterial({
        color: COLORS.sun,
        transparent: true,
        opacity: 0.9
      });
      
      // Create the sun mesh
      const sun = new THREE.Mesh(geometry, material);
      scene.add(sun);
      
      // Add a point light emanating from the sun
      const sunLight = new THREE.PointLight(COLORS.sun, 1, 100);
      sun.add(sunLight);
      
      // Add a glow effect
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          "c": { value: 0.2 },
          "p": { value: 5.0 },
          glowColor: { value: new THREE.Color(COLORS.sun) },
          viewVector: { value: new THREE.Vector3() }
        },
        vertexShader: `
          uniform vec3 viewVector;
          uniform float c;
          uniform float p;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normal);
            vec3 vNormel = normalize(viewVector);
            intensity = pow(abs(dot(vNormal, vNormel)), p);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;
          void main() {
            gl_FragColor = vec4(glowColor, intensity);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      
      const glowSize = size * 1.5;
      const glowGeometry = new THREE.SphereGeometry(glowSize, 32, 32);
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      scene.add(glowMesh);
      
      // Add label
      addNodeLabel(node, sun, true);
      
      // Store reference
      nodeObjects.set(node.id, sun);
    }
    
    /**
     * Create planet objects representing child nodes
     */
    function createPlanets(nodes) {
      // Calculate sizes based on node properties
      const maxNodeSize = Math.max(...nodes.map(n => n.node_size || 20));
      
      nodes.forEach((node, index) => {
        // Determine planet size based on node size
        const nodeSize = node.node_size || 20;
        const relativeSize = nodeSize / maxNodeSize;
        const size = MIN_PLANET_SIZE + relativeSize * (MAX_PLANET_SIZE - MIN_PLANET_SIZE);
        
        // Create planet geometry
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        
        // Determine color based on node properties
        let color = COLORS.regular;
        if (node.has_markdown) {
          color = COLORS.markdown;
        }
        if (nodeSize > 30) {
          color = COLORS.largeNode;
        }
        
        // Create material with slight texture
        const material = new THREE.MeshPhongMaterial({
          color: color,
          shininess: 20,
          metalness: 0.1,
          roughness: 0.8
        });
        
        // Create the planet mesh
        const planet = new THREE.Mesh(geometry, material);
        
        // Initial position in orbit
        const distance = 5 + (index * 3);
        const angle = Math.random() * Math.PI * 2;
        planet.position.x = distance * Math.cos(angle);
        planet.position.z = distance * Math.sin(angle);
        
        scene.add(planet);
        
        // Create orbit line
        createOrbitLine(distance);
        
        // Add label
        addNodeLabel(node, planet, false);
        
        // Store reference
        nodeObjects.set(node.id, planet);
        
        // Add click handler for the planet
        makeObjectClickable(planet, node);
      });
    }
    
    /**
     * Create an orbital line for a planet
     */
    function createOrbitLine(radius) {
      const segments = 128;
      const orbitGeometry = new THREE.BufferGeometry();
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: COLORS.orbital,
        transparent: true,
        opacity: 0.3
      });
      
      const vertices = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
          radius * Math.cos(theta),
          0,
          radius * Math.sin(theta)
        );
      }
      
      orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
      scene.add(orbit);
      orbitLines.push(orbit);
      
      return orbit;
    }
    
    /**
     * Add a text label to a node object
     */
    function addNodeLabel(node, object, isSun) {
      // Get node content based on language
      const content = currentLanguage === 'en' ? 
        node.content : (node.content_zh || node.content);
      
      // Create a sprite for the text
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const fontSize = isSun ? 40 : 20;
      context.font = `${fontSize}px Arial`;
      
      // Measure text width
      const textWidth = context.measureText(content).width;
      
      // Set canvas size
      canvas.width = textWidth + 20;
      canvas.height = fontSize + 10;
      
      // Clear background
      context.fillStyle = 'rgba(0,0,0,0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      context.font = `${fontSize}px Arial`;
      context.fillStyle = isSun ? '#FDB813' : 'white';
      context.fillText(content, 10, fontSize);
      
      // Create texture
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      
      // Position the sprite above the object
      const objectSize = object.geometry.parameters.radius;
      sprite.position.set(0, objectSize + 1, 0);
      sprite.scale.set(5, 2.5, 1);
      
      // Add sprite to the object
      object.add(sprite);
      
      // Store sprite reference for later updates
      object.userData.label = sprite;
    }
    
    /**
     * Make an object clickable to focus on it
     */
    function makeObjectClickable(object, node) {
      object.userData.node = node;
      
      // Get the dom element
      const domElement = renderer.domElement;
      
      // Use a raycaster to detect clicks on objects
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      // Add click event listener
      domElement.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        const rect = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);
        
        // Check for intersections with this object
        const intersects = raycaster.intersectObject(object);
        
        if (intersects.length > 0) {
          // Handle click - focus on this node
          focusOnObject(object);
          
          // Update info panel with node details
          updateInfoPanel(node);
          
          // Option to make this node the new center
          showNodeActionMenu(node, event);
        }
      });
    }
    
    /**
     * Focus camera on a specific object
     */
    function focusOnObject(object) {
      const position = object.position.clone();
      
      // Animate camera to position
      new TWEEN.Tween(controls.target)
        .to({
          x: position.x,
          y: position.y,
          z: position.z
        }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
      
      // Animate camera position
      new TWEEN.Tween(camera.position)
        .to({
          x: position.x + 5,
          y: position.y + 5,
          z: position.z + 10
        }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    }
    
    /**
     * Show action menu for a node
     */
    function showNodeActionMenu(node, event) {
      // Remove any existing menu
      const existingMenu = document.getElementById('node-action-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      
      // Create menu
      const menu = document.createElement('div');
      menu.id = 'node-action-menu';
      menu.className = 'cosmic-node-menu';
      
      // Position near click
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;
      
      // Make this node the new center button
      const centerButton = document.createElement('button');
      centerButton.textContent = 'Make this the center';
      centerButton.addEventListener('click', () => {
        visualizeNode(node.id);
        menu.remove();
      });
      menu.appendChild(centerButton);
      
      // View in outliner button
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View in outliner';
      viewButton.addEventListener('click', () => {
        if (window.BreadcrumbManager) {
          hide();
          BreadcrumbManager.focusOnNode(node.id);
        }
        menu.remove();
      });
      menu.appendChild(viewButton);
      
      // Close button
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close menu';
      closeButton.addEventListener('click', () => {
        menu.remove();
      });
      menu.appendChild(closeButton);
      
      // Add to document
      document.body.appendChild(menu);
      
      // Close menu when clicking elsewhere
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== menu) {
          menu.remove();
        }
      }, { once: true });
    }
    
    /**
     * Update info panel with node details
     */
    function updateInfoPanel(node) {
      const infoPanel = document.getElementById('cosmic-info-panel');
      if (!infoPanel) return;
      
      const content = currentLanguage === 'en' ? 
        node.content : (node.content_zh || node.content);
      
      infoPanel.innerHTML = `
        <h3>${content}</h3>
        <p>ID: ${node.id}</p>
        <p>Size: ${node.node_size || 20}</p>
        ${node.has_markdown ? '<p><span class="markdown-badge">Has Markdown</span></p>' : ''}
        <button id="focus-node-btn" class="cosmic-focus-btn">Focus in Outliner</button>
      `;
      
      // Add event listener for focus button
      const focusButton = document.getElementById('focus-node-btn');
      if (focusButton) {
        focusButton.addEventListener('click', () => {
          if (window.BreadcrumbManager) {
            hide();
            BreadcrumbManager.focusOnNode(node.id);
          }
        });
      }
    }
    
    /**
     * Refresh node labels when language changes
     */
    function refreshLabels() {
      // Update sun label
      if (sunNode && nodeObjects.has(sunNode.id)) {
        const sunObj = nodeObjects.get(sunNode.id);
        if (sunObj.userData.label) {
          sunObj.remove(sunObj.userData.label);
          addNodeLabel(sunNode, sunObj, true);
        }
      }
      
      // Update planet labels
      planetNodes.forEach(node => {
        if (nodeObjects.has(node.id)) {
          const planetObj = nodeObjects.get(node.id);
          if (planetObj.userData.label) {
            planetObj.remove(planetObj.userData.label);
            addNodeLabel(node, planetObj, false);
          }
        }
      });
      
      // Update info panel
      if (sunNode) {
        updateInfoPanel(sunNode);
      }
    }
    
    /**
     * Show the cosmic visualizer
     */
    function show(nodeId) {
      if (!container) return;
      
      // If no nodeId provided, use the last focused node or the first root node
      if (!nodeId) {
        if (window.lastFocusedNodeId) {
          nodeId = window.lastFocusedNodeId;
        } else {
          // Get the first available node
          fetch(`/api/nodes?lang=${currentLanguage}`)
            .then(response => response.json())
            .then(nodes => {
              if (nodes && nodes.length > 0) {
                show(nodes[0].id);
              }
            })
            .catch(error => console.error('Error fetching nodes:', error));
          return;
        }
      }
      
      container.style.display = 'block';
      
      // Load Three.js and TWEEN.js dynamically
      loadDependencies()
        .then(() => {
          visualizeNode(nodeId);
        })
        .catch(error => {
          console.error('Error loading dependencies:', error);
        });
    }
    
    /**
     * Hide the cosmic visualizer
     */
    function hide() {
      if (!container) return;
      
      container.style.display = 'none';
      isVisible = false;
      
      // Stop animation loop
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      // Clean up Three.js resources
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        container.removeChild(renderer.domElement);
        renderer = null;
      }
      
      scene = null;
      camera = null;
      controls = null;
    }
    
    /**
     * Check if the visualizer is currently visible
     */
    function getVisibilityStatus() {
      return container && container.style.display !== 'none';
    }
    
    /**
     * Load Three.js and TWEEN.js dependencies dynamically
     */
    function loadDependencies() {
      return new Promise((resolve, reject) => {
        // Check if Three.js is already loaded
        if (window.THREE) {
          // Check if TWEEN is already loaded
          if (window.TWEEN) {
            resolve();
            return;
          }
        }
        
        // Load Three.js
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js';
        document.head.appendChild(threeScript);
        
        // Load OrbitControls
        const orbitControlsScript = document.createElement('script');
        orbitControlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.min.js';
        
        // Load TWEEN.js
        const tweenScript = document.createElement('script');
        tweenScript.src = 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.umd.js';
        
        // Wait for Three.js to load before loading OrbitControls
        threeScript.onload = function() {
          console.log('Three.js loaded');
          document.head.appendChild(orbitControlsScript);
        };
        
        // Wait for OrbitControls to load before loading TWEEN
        orbitControlsScript.onload = function() {
          console.log('OrbitControls loaded');
          document.head.appendChild(tweenScript);
        };
        
        // Wait for TWEEN to load before resolving
        tweenScript.onload = function() {
          console.log('TWEEN.js loaded');
          resolve();
        };
        
        // Handle errors
        threeScript.onerror = reject;
        orbitControlsScript.onerror = reject;
        tweenScript.onerror = reject;
      });
    }
    
    // Public API
    return {
      initialize,
      show,
      hide,
      isVisible: getVisibilityStatus
    };
  })();
  
  // Make it available globally
  window.CosmicNodeVisualizer = CosmicNodeVisualizer;