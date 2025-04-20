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

    // Add these constants for portal configuration - place near the top with other constants
    const PORTAL_SETTINGS = {
        size: 1.2,          // Size multiplier for the portal
        segments: 32,       // Detail level of portal rings
        ringCount: 3,       // Number of concentric rings
        rotationSpeed: 0.5, // Rotation speed for animation
        colors: {
        outer: 0x9c27b0,  // Purple outer ring
        middle: 0x2196f3, // Blue middle ring
        inner: 0x4caf50   // Green inner ring
        }
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
      
      // Add click handler to the NEW renderer.domElement
      renderer.domElement.addEventListener('click', handleSceneClick);
      
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

// Add this function for scene click handling
function handleSceneClick(event) {
    if (!renderer) return;
    
    // Get normalized coordinates
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Get all objects in the scene to check for intersections
    const allObjects = [];
    scene.traverse(object => {
      if (object.isMesh || object.isLine || object.isPoints) {
        allObjects.push(object);
      }
    });
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      // Find the first interactive object (portal or node)
      let portalObject = null;
      let nodeObject = null;
      
      for (const intersect of intersects) {
        // Check if it's a portal or part of a portal
        let parent = intersect.object;
        while (parent) {
          if (parent.userData && parent.userData.isPortal) {
            portalObject = parent;
            break;
          }
          if (parent.userData && parent.userData.node) {
            nodeObject = parent;
          }
          parent = parent.parent;
        }
        
        if (portalObject) break;
      }
      
      // Handle portal click first if found
      if (portalObject) {
        showTravelOptionsMenu(portalObject, event);
        return;
      }
      
      // Otherwise handle node click as before
      if (nodeObject && nodeObject.userData.node) {
        focusOnObject(nodeObject);
        updateInfoPanel(nodeObject.userData.node);
        showNodeActionMenu(nodeObject.userData.node, event);
      }
    }
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

      // Update portal animations
      updatePortals();
      
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

    function updatePortals() {
        // Get all portals in the scene
        nodeObjects.forEach((nodeObject, nodeId) => {
          const portal = nodeObject.getObjectByName('portal');
          if (!portal) return;
          
          // Update portal rings rotation
          const rings = portal.userData.rings;
          if (rings) {
            rings.forEach((ring, index) => {
              // Rotate each ring at different speeds and axes
              ring.rotation.x += PORTAL_SETTINGS.rotationSpeed * 0.01 * (index + 1);
              ring.rotation.y += PORTAL_SETTINGS.rotationSpeed * 0.005 * (index + 1);
              ring.rotation.z += PORTAL_SETTINGS.rotationSpeed * 0.003 * (index + 1);
            });
          }
          
          // Pulse the center sphere
          const sphere = portal.userData.sphere;
          if (sphere) {
            const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
            sphere.scale.set(pulse, pulse, pulse);
            sphere.material.opacity = 0.5 + (pulse * 0.2);
          }
        });
      }

// Add this function for portal travel
function showTravelOptionsMenu(portal, event) {
    // Get node data from the portal
    const node = portal.userData.node;
    if (!node || !node.links) return;
    
    console.log('Portal clicked, showing travel options for node:', node.id);
    
    // Remove any existing menu
    const existingMenu = document.getElementById('travel-options-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Collect all linked nodes (both incoming and outgoing)
    const linkedNodes = [];
    
    // Add outgoing links
    if (node.links.outgoing && node.links.outgoing.length > 0) {
      node.links.outgoing.forEach(link => {
        linkedNodes.push({
          id: link.to_node_id,
          content: currentLanguage === 'en' ? link.content : (link.content_zh || link.content),
          weight: link.weight,
          direction: 'outgoing',
          description: link.description || ''
        });
      });
    }
    
    // Add incoming links
    if (node.links.incoming && node.links.incoming.length > 0) {
      node.links.incoming.forEach(link => {
        linkedNodes.push({
          id: link.from_node_id,
          content: currentLanguage === 'en' ? link.content : (link.content_zh || link.content),
          weight: link.weight,
          direction: 'incoming',
          description: link.description || ''
        });
      });
    }
    
    // Create travel options menu
    const menu = document.createElement('div');
    menu.id = 'travel-options-menu';
    menu.className = 'cosmic-travel-menu';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'travel-menu-header';
    header.innerHTML = `<h3>Wormhole Travel Options</h3>`;
    menu.appendChild(header);
    
    // Add options list
    const optionsList = document.createElement('div');
    optionsList.className = 'travel-options-list';
    
    if (linkedNodes.length === 0) {
      optionsList.innerHTML = '<p class="no-links">No destinations available</p>';
    } else {
      linkedNodes.forEach(linkedNode => {
        const option = document.createElement('div');
        option.className = 'travel-option';
        option.dataset.nodeId = linkedNode.id;
        
        // Direction indicator 
        const directionIcon = linkedNode.direction === 'outgoing' ? '→' : '←';
        const directionClass = linkedNode.direction === 'outgoing' ? 'outgoing' : 'incoming';
        
        option.innerHTML = `
          <div class="travel-option-content">
            <span class="direction-icon ${directionClass}">${directionIcon}</span>
            <span class="travel-destination-name">${linkedNode.content}</span>
            <span class="travel-link-weight">(Weight: ${linkedNode.weight})</span>
          </div>
          <div class="travel-option-description">${linkedNode.description}</div>
        `;
        
        option.addEventListener('click', () => {
          // Close the menu
          menu.remove();
          
          // Animate wormhole travel effect
          animateWormholeTravel(() => {
            // Load the new solar system after animation
            visualizeNode(linkedNode.id);
          });
        });
        
        optionsList.appendChild(option);
      });
    }
    menu.appendChild(optionsList);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'travel-menu-close';
    closeButton.innerHTML = 'Cancel';
    closeButton.addEventListener('click', () => {
      menu.remove();
    });
    menu.appendChild(closeButton);
    
    // Position the menu
    const renderRect = renderer.domElement.getBoundingClientRect();
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    // Keep menu within bounds
    setTimeout(() => {
      const menuRect = menu.getBoundingClientRect();
      if (menuRect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - menuRect.width - 20}px`;
      }
      if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - menuRect.height - 20}px`;
      }
    }, 0);
    
    // Add to document
    document.body.appendChild(menu);
  }
  
  // Add this function for wormhole travel animation
  function animateWormholeTravel(callback) {
    console.log('Animating wormhole travel effect');
    
    // Create a full-screen wormhole effect
    const wormholeOverlay = document.createElement('div');
    wormholeOverlay.className = 'wormhole-travel-overlay';
    document.body.appendChild(wormholeOverlay);
    
    // Create the wormhole tunnel element
    const wormholeTunnel = document.createElement('div');
    wormholeTunnel.className = 'wormhole-tunnel';
    wormholeOverlay.appendChild(wormholeTunnel);
    
    // Add stars to the tunnel
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.className = 'wormhole-star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 1.5}s`;
      star.style.animationDuration = `${0.5 + Math.random() * 1}s`;
      // Random direction
      star.style.setProperty('--star-direction', Math.random() > 0.5 ? '1' : '-1');
      wormholeTunnel.appendChild(star);
    }
    
    // Animate the wormhole effect
    setTimeout(() => {
      wormholeOverlay.classList.add('active');
      
      // Wait for animation to complete, then remove overlay and call callback
      setTimeout(() => {
        wormholeOverlay.classList.add('exit');
        
        setTimeout(() => {
          wormholeOverlay.remove();
          if (callback) callback();
        }, 1000); // Exit animation duration
      }, 1500); // Main travel animation duration
    }, 100);
  }
    
    /**
     * Visualize a node as the central sun with its children as planets
     */
    async function visualizeNode(nodeId) {
      try {
        console.log(`Attempting to visualize node ${nodeId}`);
        
        // Load the requested node
        console.log(`Fetching node data for ${nodeId}`);
        const response = await fetch(`/api/nodes/${nodeId}?lang=${currentLanguage}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch node: ${response.status} ${response.statusText}`);
        }
        
        sunNode = await response.json();
        console.log(`Node data received:`, sunNode);
        
        // Fetch children nodes
        console.log(`Fetching children for node ${nodeId}`);
        const childrenResponse = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}`);
        
        if (!childrenResponse.ok) {
          throw new Error(`Failed to fetch children: ${childrenResponse.status} ${childrenResponse.statusText}`);
        }
        
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
        
        // Show error in the container
        const infoPanel = document.getElementById('cosmic-info-panel');
        if (infoPanel) {
          infoPanel.innerHTML = `
            <h3>Error Visualizing Node</h3>
            <p>${error.message}</p>
            <button id="focus-node-btn" class="cosmic-focus-btn">Try Another Node</button>
          `;
          
          // Add event listener for the button
          const focusButton = document.getElementById('focus-node-btn');
          if (focusButton) {
            focusButton.addEventListener('click', () => {
              // Try to visualize the first available node
              fetch(`/api/nodes?lang=${currentLanguage}`)
                .then(response => response.json())
                .then(nodes => {
                  if (nodes && nodes.length > 0) {
                    visualizeNode(nodes[0].id);
                  }
                })
                .catch(err => console.error('Error fetching nodes:', err));
            });
          }
        }
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

      // Add portal to sun if it has links
      createPortalForNode(node, sun);
      
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

        // Add portal to planet if it has links
        createPortalForNode(node, planet);
        
        // Store reference
        nodeObjects.set(node.id, planet);
        
        // Add click handler for the planet
        makeObjectClickable(planet, node);
      });
    }

// Add this function after createSun and createPlanets functions
/**
 * Create a wormhole portal for nodes with links
 */
function createPortalForNode(node, nodeObject) {
    // First, fetch links for this node
    fetch(`/api/nodes/${node.id}/links`)
      .then(response => response.json())
      .then(links => {
        // Only create portals for nodes with links
        if ((!links.outgoing || links.outgoing.length === 0) && 
            (!links.incoming || links.incoming.length === 0)) {
          return;
        }
        
        console.log(`Creating portal for node ${node.id} with links`);
        
        // Store links with the node for later use
        node.links = links;
        
        // Calculate total links for sizing
        const totalLinks = (links.outgoing ? links.outgoing.length : 0) + 
                          (links.incoming ? links.incoming.length : 0);
        
        // Create container for the portal
        const portalContainer = new THREE.Object3D();
        portalContainer.name = 'portal';
        
        // Create portal rings with different sizes and colors
        const rings = [];
        const nodeSize = nodeObject.geometry.parameters.radius;
        const baseSize = nodeSize * 1.2 * PORTAL_SETTINGS.size;
        
        // Create each ring
        const createRing = (radius, color, index) => {
          const ringGeometry = new THREE.TorusGeometry(
            radius, 
            radius * 0.1, // thickness
            PORTAL_SETTINGS.segments, 
            PORTAL_SETTINGS.segments
          );
          
          // Create glow material
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
          });
          
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          
          // Set initial rotation 
          ring.rotation.x = Math.PI / 2; // Align with horizontal plane
          ring.rotation.y = index * (Math.PI / PORTAL_SETTINGS.ringCount); // Stagger rotations
          
          portalContainer.add(ring);
          rings.push(ring);
          
          // Add a particle system inside the ring for extra effect
          const particleCount = 50 + (totalLinks * 5);
          const particleGeometry = new THREE.BufferGeometry();
          const particlePositions = [];
          const particleSizes = [];
          
          for (let i = 0; i < particleCount; i++) {
            // Create particles in a circular pattern
            const angle = Math.random() * Math.PI * 2;
            const radialDistance = (Math.random() * 0.5 + 0.5) * radius;
            
            particlePositions.push(
              Math.cos(angle) * radialDistance, // x
              (Math.random() - 0.5) * (radius * 0.1), // y (slight variance in height)
              Math.sin(angle) * radialDistance  // z
            );
            
            // Vary particle sizes
            particleSizes.push(Math.random() * 0.4 + 0.1);
          }
          
          particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
          particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1));
          
          const particleMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
          });
          
          const particles = new THREE.Points(particleGeometry, particleMaterial);
          portalContainer.add(particles);
        };
        
        // Create portal rings
        createRing(baseSize, PORTAL_SETTINGS.colors.outer, 0);
        createRing(baseSize * 0.75, PORTAL_SETTINGS.colors.middle, 1);
        createRing(baseSize * 0.5, PORTAL_SETTINGS.colors.inner, 2);
        
        // Create a glow sphere in the center
        const sphereGeometry = new THREE.SphereGeometry(baseSize * 0.25, 20, 20);
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        portalContainer.add(sphere);
        
        // Position the portal next to the node
        portalContainer.position.set(nodeSize * 1.5, nodeSize * 1.5, 0);
        
        // Store the rings for animation
        portalContainer.userData.rings = rings;
        portalContainer.userData.sphere = sphere;
        portalContainer.userData.node = node;
        portalContainer.userData.isPortal = true;
        
        // Add a direct click handler for debugging
        portalContainer.traverse(obj => {
          if (obj.isMesh) {
            obj.callback = function(event) {
              console.log("Direct portal mesh click detected!");
              event.stopPropagation();
              showTravelOptionsMenu(portalContainer, event);
            };
          }
        });
        
        // Add portal to the node
        nodeObject.add(portalContainer);
      })
      .catch(error => {
        console.error(`Error fetching links for node ${node.id}:`, error);
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
      
      console.log('CosmicNodeVisualizer.show() called with nodeId:', nodeId);
      
      // If no nodeId provided, use the last focused node or the first root node
      if (!nodeId) {
        console.log('No nodeId provided, checking for lastFocusedNodeId');
        
        if (window.lastFocusedNodeId) {
          nodeId = window.lastFocusedNodeId;
          console.log('Using lastFocusedNodeId:', nodeId);
        } else {
          console.log('No lastFocusedNodeId available, fetching first root node');
          // Get the first available node
          fetch(`/api/nodes?lang=${currentLanguage}`)
            .then(response => response.json())
            .then(nodes => {
              if (nodes && nodes.length > 0) {
                console.log('Found first node:', nodes[0].id);
                show(nodes[0].id);
              } else {
                console.error('No nodes found');
              }
            })
            .catch(error => console.error('Error fetching nodes:', error));
          return;
        }
      }
      
      container.style.display = 'block';
      
      // Add loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'cosmic-loading';
      loadingIndicator.textContent = 'Loading cosmic view';
      container.appendChild(loadingIndicator);
      
      // Load Three.js and TWEEN.js dynamically
      loadDependencies()
        .then(() => {
          console.log('Dependencies loaded, visualizing node:', nodeId);
          container.removeChild(loadingIndicator);
          visualizeNode(nodeId);
        })
        .catch(error => {
          console.error('Error loading dependencies:', error);
          container.removeChild(loadingIndicator);
          
          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.className = 'cosmic-error';
          errorMessage.textContent = 'Failed to load visualization libraries. Please check your internet connection.';
          container.appendChild(errorMessage);
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
        console.log('Loading dependencies...');
        
        // Check if Three.js is already loaded
        if (window.THREE) {
          console.log('THREE is already loaded');
          // Check if TWEEN is already loaded
          if (window.TWEEN) {
            console.log('TWEEN is already loaded');
            resolve();
            return;
          }
        }
        
        // Set a timeout for loading
        const timeoutId = setTimeout(() => {
          reject(new Error('Dependency loading timed out after 15 seconds'));
        }, 15000);
        
        // Load Three.js
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js';
        threeScript.onerror = (e) => {
          clearTimeout(timeoutId);
          console.error('Failed to load Three.js', e);
          reject(new Error('Failed to load Three.js'));
        };
        document.head.appendChild(threeScript);
        
        // Load OrbitControls after Three.js loads
        threeScript.onload = function() {
          console.log('Three.js loaded successfully');
          
          const orbitControlsScript = document.createElement('script');
          orbitControlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.min.js';
          orbitControlsScript.onerror = (e) => {
            clearTimeout(timeoutId);
            console.error('Failed to load OrbitControls', e);
            reject(new Error('Failed to load OrbitControls'));
          };
          document.head.appendChild(orbitControlsScript);
          
          // Load TWEEN.js after OrbitControls loads
          orbitControlsScript.onload = function() {
            console.log('OrbitControls loaded successfully');
            
            const tweenScript = document.createElement('script');
            tweenScript.src = 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.umd.js';
            tweenScript.onerror = (e) => {
              clearTimeout(timeoutId);
              console.error('Failed to load TWEEN.js', e);
              reject(new Error('Failed to load TWEEN.js'));
            };
            document.head.appendChild(tweenScript);
            
            // Resolve promise when TWEEN.js loads
            tweenScript.onload = function() {
              console.log('TWEEN.js loaded successfully');
              clearTimeout(timeoutId);
              
              // Verify that everything is actually loaded and available
              if (!window.THREE) {
                console.error('THREE is not available after loading');
                reject(new Error('THREE is not available after loading'));
                return;
              }
              
              if (!window.THREE.OrbitControls) {
                console.error('THREE.OrbitControls is not available after loading');
                reject(new Error('THREE.OrbitControls is not available after loading'));
                return;
              }
              
              if (!window.TWEEN) {
                console.error('TWEEN is not available after loading');
                reject(new Error('TWEEN is not available after loading'));
                return;
              }
              
              resolve();
            };
          };
        };
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