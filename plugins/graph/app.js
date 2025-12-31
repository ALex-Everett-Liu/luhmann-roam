let graph;
let appMode = 'select';
let contextMenu = null;
// Use relative path to main server API
const API_BASE = '/api/plugins/graph';

// Track unsaved changes
let unsavedChanges = {
    nodes: new Map(), // nodeId -> {type: 'create'|'update'|'delete', data: {...}, originalData: {...}}
    edges: new Map()  // edgeId -> {type: 'create'|'update'|'delete', data: {...}, originalData: {...}}
};

// Store original state from database
let originalState = {
    nodes: new Map(), // nodeId -> node data
    edges: new Map()  // edgeId -> edge data
};

function init() {
    const canvas = document.getElementById('canvas');
    // Remove automatic saving - track changes instead
    graph = new Graph(canvas, {
        onNodeCreate: trackNodeCreate,
        onNodeUpdate: trackNodeUpdate,
        onNodeDelete: trackNodeDelete,
        onEdgeCreate: trackEdgeCreate,
        onEdgeUpdate: trackEdgeUpdate,
        onEdgeDelete: trackEdgeDelete
    });

    setupEventListeners();
    setupContextMenu();
    setupDialogs();

    // Set initial mode
    setMode('select');
    
    // Load existing graph data from database
    loadGraphFromDb();
    
    // Initialize save/discard button visibility
    updateSaveButtonVisibility();
}

function setupEventListeners() {
    // Mode buttons
    document.getElementById('select-mode').addEventListener('click', () => setMode('select'));
    document.getElementById('node-mode').addEventListener('click', () => setMode('node'));
    document.getElementById('edge-mode').addEventListener('click', () => setMode('edge'));

    // Action buttons
    document.getElementById('clear-btn').addEventListener('click', async () => {
        if (confirm('Clear all nodes and edges? This will delete all data from the database.')) {
            await clearGraphInDb();
            graph.clear();
            // Clear unsaved changes tracking
            unsavedChanges.nodes.clear();
            unsavedChanges.edges.clear();
            originalState.nodes.clear();
            originalState.edges.clear();
            updateSaveButtonVisibility();
        }
    });

    // Save/Discard buttons
    const saveChangesButton = document.getElementById('save-changes');
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', saveAllChanges);
    }

    const discardChangesButton = document.getElementById('discard-changes');
    if (discardChangesButton) {
        discardChangesButton.addEventListener('click', discardAllChanges);
    }

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        hideContextMenu();
    });
}

function setupContextMenu() {
    contextMenu = document.getElementById('context-menu');

    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            handleContextMenuAction(action);
            hideContextMenu();
        });
    });
}

function setupDialogs() {
    // Node dialog
    document.getElementById('node-save').addEventListener('click', saveNodeEdit);
    document.getElementById('node-cancel').addEventListener('click', () => {
        document.getElementById('node-dialog').style.display = 'none';
    });

    // Edge dialog
    document.getElementById('edge-save').addEventListener('click', saveEdgeEdit);
    document.getElementById('edge-cancel').addEventListener('click', () => {
        document.getElementById('edge-dialog').style.display = 'none';
    });
}

function setMode(mode) {
    appMode = mode;
    window.appMode = mode;

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + '-mode').classList.add('active');

    // Update cursor
    const canvas = document.getElementById('canvas');
    canvas.className = mode === 'select' ? 'select-mode' : '';

    // Reset edge creation state
    if (graph) {
        graph.tempEdgeStart = null;
    }
}

function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

function handleContextMenuAction(action) {
    if (action === 'edit') {
        if (graph.selectedNode) {
            showNodeDialog();
        } else if (graph.selectedEdge) {
            showEdgeDialog();
        }
    } else if (action === 'delete') {
        if (graph.selectedNode) {
            graph.deleteNode(graph.selectedNode);
        } else if (graph.selectedEdge) {
            graph.deleteEdge(graph.selectedEdge);
        }
    }
}

function showNodeDialog() {
    if (!graph.selectedNode) return;

    const dialog = document.getElementById('node-dialog');
    const labelInput = document.getElementById('node-label');
    const colorInput = document.getElementById('node-color');

    labelInput.value = graph.selectedNode.label;
    colorInput.value = graph.selectedNode.color;

    dialog.style.display = 'block';
}

function showEdgeDialog() {
    if (!graph.selectedEdge) return;

    const dialog = document.getElementById('edge-dialog');
    const weightInput = document.getElementById('edge-weight');

    weightInput.value = graph.selectedEdge.weight;

    dialog.style.display = 'block';
}

function saveNodeEdit() {
    if (!graph.selectedNode) return;

    const label = document.getElementById('node-label').value;
    const color = document.getElementById('node-color').value;

    graph.selectedNode.label = label || 'Node';
    graph.selectedNode.color = color;
    graph.selectedNode.fullContent = label || 'Node';

    document.getElementById('node-dialog').style.display = 'none';
    graph.render();
    
    // Track as unsaved change instead of saving immediately
    trackNodeUpdate(graph.selectedNode);
}

function saveEdgeEdit() {
    if (!graph.selectedEdge) return;

    const weight = parseFloat(document.getElementById('edge-weight').value);

    graph.selectedEdge.weight = weight;

    document.getElementById('edge-dialog').style.display = 'none';
    graph.render();
    
    // Track as unsaved change instead of saving immediately
    trackEdgeUpdate(graph.selectedEdge);
}

// ========== Database Operations ==========

async function loadGraphFromDb() {
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) {
            console.warn('Could not load graph data from database. Server may not be running.');
            return;
        }
        
        const data = await response.json();
        if (data.nodes && data.edges) {
            // Convert database format to graph format
            const convertedData = {
                nodes: data.nodes.map(node => ({...node})),
                edges: data.edges.map(edge => ({
                    id: edge.id,
                    from: edge.from_node_id,
                    to: edge.to_node_id,
                    weight: edge.weight
                }))
            };
            
            // Store original state (in graph format)
            originalState.nodes.clear();
            originalState.edges.clear();
            convertedData.nodes.forEach(node => {
                originalState.nodes.set(node.id, {...node});
            });
            convertedData.edges.forEach(edge => {
                originalState.edges.set(edge.id, {...edge});
            });
            
            graph.importData(convertedData, true); // true = skip callbacks to avoid tracking
            console.log(`Loaded ${data.metadata.totalNodes} nodes and ${data.metadata.totalEdges} edges from database`);
            
            // Clear unsaved changes when loading fresh data
            unsavedChanges.nodes.clear();
            unsavedChanges.edges.clear();
            updateSaveButtonVisibility();
        }
    } catch (error) {
        console.warn('Could not connect to graph database:', error.message);
    }
}

async function saveNodeToDb(node) {
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: node.id,
                x: node.x,
                y: node.y,
                label: node.label,
                color: node.color,
                radius: node.radius,
                full_content: node.fullContent || node.label
            })
        });
        if (!response.ok) throw new Error('Failed to save node');
    } catch (error) {
        console.error('Error saving node to database:', error);
    }
}

async function updateNodeInDb(node) {
    try {
        const response = await fetch(`${API_BASE}/nodes/${node.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x: node.x,
                y: node.y,
                label: node.label,
                color: node.color,
                radius: node.radius,
                full_content: node.fullContent || node.label
            })
        });
        if (!response.ok) throw new Error('Failed to update node');
    } catch (error) {
        console.error('Error updating node in database:', error);
    }
}

async function deleteNodeFromDb(nodeId) {
    try {
        const response = await fetch(`${API_BASE}/nodes/${nodeId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete node');
    } catch (error) {
        console.error('Error deleting node from database:', error);
    }
}

async function saveEdgeToDb(edge) {
    try {
        const response = await fetch(`${API_BASE}/edges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: edge.id,
                from_node_id: edge.from,
                to_node_id: edge.to,
                weight: edge.weight
            })
        });
        if (!response.ok) throw new Error('Failed to save edge');
    } catch (error) {
        console.error('Error saving edge to database:', error);
    }
}

async function updateEdgeInDb(edge) {
    try {
        const response = await fetch(`${API_BASE}/edges/${edge.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight: edge.weight
            })
        });
        if (!response.ok) throw new Error('Failed to update edge');
    } catch (error) {
        console.error('Error updating edge in database:', error);
    }
}

async function deleteEdgeFromDb(edgeId) {
    try {
        const response = await fetch(`${API_BASE}/edges/${edgeId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete edge');
    } catch (error) {
        console.error('Error deleting edge from database:', error);
    }
}

async function clearGraphInDb() {
    try {
        const response = await fetch(`${API_BASE}/clear`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to clear graph');
    } catch (error) {
        console.error('Error clearing graph in database:', error);
    }
}

// ========== Change Tracking Functions ==========

function trackNodeCreate(node) {
    // Track new node creation
    unsavedChanges.nodes.set(node.id, {
        type: 'create',
        data: {...node}
    });
    updateSaveButtonVisibility();
}

function trackNodeUpdate(node) {
    const original = originalState.nodes.get(node.id);
    if (original) {
        // Track update to existing node
        unsavedChanges.nodes.set(node.id, {
            type: 'update',
            data: {...node},
            originalData: {...original}
        });
    } else {
        // Node doesn't exist in original state, treat as create
        unsavedChanges.nodes.set(node.id, {
            type: 'create',
            data: {...node}
        });
    }
    updateSaveButtonVisibility();
}

function trackNodeDelete(nodeId) {
    const original = originalState.nodes.get(nodeId);
    if (original) {
        // Track deletion of existing node
        unsavedChanges.nodes.set(nodeId, {
            type: 'delete',
            data: null,
            originalData: {...original}
        });
    } else {
        // Node was created but not saved, just remove from unsaved creates
        unsavedChanges.nodes.delete(nodeId);
    }
    // Also remove any edges connected to this node
    graph.edges.filter(e => e.from === nodeId || e.to === nodeId).forEach(edge => {
        trackEdgeDelete(edge.id);
    });
    updateSaveButtonVisibility();
}

function trackEdgeCreate(edge) {
    // Track new edge creation
    unsavedChanges.edges.set(edge.id, {
        type: 'create',
        data: {...edge}
    });
    updateSaveButtonVisibility();
}

function trackEdgeUpdate(edge) {
    const original = originalState.edges.get(edge.id);
    if (original) {
        // Track update to existing edge
        unsavedChanges.edges.set(edge.id, {
            type: 'update',
            data: {...edge},
            originalData: {...original}
        });
    } else {
        // Edge doesn't exist in original state, treat as create
        unsavedChanges.edges.set(edge.id, {
            type: 'create',
            data: {...edge}
        });
    }
    updateSaveButtonVisibility();
}

function trackEdgeDelete(edgeId) {
    const original = originalState.edges.get(edgeId);
    if (original) {
        // Track deletion of existing edge
        unsavedChanges.edges.set(edgeId, {
            type: 'delete',
            data: null,
            originalData: {...original}
        });
    } else {
        // Edge was created but not saved, just remove from unsaved creates
        unsavedChanges.edges.delete(edgeId);
    }
    updateSaveButtonVisibility();
}

// ========== Save/Discard Functions ==========

function updateSaveButtonVisibility() {
    const saveButton = document.getElementById('save-changes');
    const discardButton = document.getElementById('discard-changes');
    
    const hasChanges = unsavedChanges.nodes.size > 0 || unsavedChanges.edges.size > 0;
    const totalChanges = unsavedChanges.nodes.size + unsavedChanges.edges.size;
    
    if (saveButton) {
        if (hasChanges) {
            saveButton.textContent = `Save Changes (${totalChanges})`;
            saveButton.style.display = 'block';
            saveButton.classList.add('has-unsaved');
        } else {
            saveButton.textContent = 'Save Changes';
            saveButton.style.display = 'none';
            saveButton.classList.remove('has-unsaved');
        }
    }
    
    if (discardButton) {
        if (hasChanges) {
            discardButton.textContent = `Discard Changes (${totalChanges})`;
            discardButton.style.display = 'block';
            discardButton.classList.add('has-unsaved');
        } else {
            discardButton.textContent = 'Discard Changes';
            discardButton.style.display = 'none';
            discardButton.classList.remove('has-unsaved');
        }
    }
}

async function saveAllChanges() {
    const totalChanges = unsavedChanges.nodes.size + unsavedChanges.edges.size;
    if (totalChanges === 0) {
        const saveButton = document.getElementById('save-changes');
        if (saveButton) {
            const originalText = saveButton.textContent;
            saveButton.textContent = 'No changes to save';
            setTimeout(() => {
                saveButton.textContent = originalText;
            }, 1500);
        }
        return;
    }

    const saveButton = document.getElementById('save-changes');
    const originalText = saveButton ? saveButton.textContent : 'Save Changes';
    
    if (saveButton) {
        saveButton.textContent = 'Saving...';
        saveButton.disabled = true;
    }

    try {
        // Process node changes
        for (const [nodeId, change] of unsavedChanges.nodes.entries()) {
            if (change.type === 'create') {
                await saveNodeToDb(change.data);
                // Add to original state
                originalState.nodes.set(nodeId, {...change.data});
            } else if (change.type === 'update') {
                await updateNodeInDb(change.data);
                // Update original state
                originalState.nodes.set(nodeId, {...change.data});
            } else if (change.type === 'delete') {
                await deleteNodeFromDb(nodeId);
                // Remove from original state
                originalState.nodes.delete(nodeId);
            }
        }

        // Process edge changes
        for (const [edgeId, change] of unsavedChanges.edges.entries()) {
            if (change.type === 'create') {
                await saveEdgeToDb(change.data);
                // Add to original state
                originalState.edges.set(edgeId, {...change.data});
            } else if (change.type === 'update') {
                await updateEdgeInDb(change.data);
                // Update original state
                originalState.edges.set(edgeId, {...change.data});
            } else if (change.type === 'delete') {
                await deleteEdgeFromDb(edgeId);
                // Remove from original state
                originalState.edges.delete(edgeId);
            }
        }

        // Clear unsaved changes
        const savedCount = unsavedChanges.nodes.size + unsavedChanges.edges.size;
        unsavedChanges.nodes.clear();
        unsavedChanges.edges.clear();
        updateSaveButtonVisibility();

        if (saveButton) {
            saveButton.textContent = `Saved ${savedCount} change${savedCount !== 1 ? 's' : ''}!`;
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
                updateSaveButtonVisibility();
            }, 2000);
        }

        console.log(`Saved ${savedCount} changes`);
    } catch (error) {
        console.error('Error saving changes:', error);
        if (saveButton) {
            saveButton.textContent = 'Error!';
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }, 2000);
        }
    }
}

function discardAllChanges() {
    const totalChanges = unsavedChanges.nodes.size + unsavedChanges.edges.size;
    if (totalChanges === 0) {
        const discardButton = document.getElementById('discard-changes');
        if (discardButton) {
            const originalText = discardButton.textContent;
            discardButton.textContent = 'No changes to discard';
            setTimeout(() => {
                discardButton.textContent = originalText;
            }, 1500);
        }
        return;
    }

    const discardButton = document.getElementById('discard-changes');
    const originalText = discardButton ? discardButton.textContent : 'Discard Changes';
    
    if (discardButton) {
        discardButton.textContent = 'Discarding...';
        discardButton.disabled = true;
    }

    try {
        // Restore nodes first (edges depend on nodes)
        for (const [nodeId, change] of unsavedChanges.nodes.entries()) {
            if (change.type === 'create') {
                // Remove newly created node
                graph.nodes = graph.nodes.filter(n => n.id !== nodeId);
            } else if (change.type === 'update' && change.originalData) {
                // Restore original node data
                const node = graph.nodes.find(n => n.id === nodeId);
                if (node) {
                    Object.assign(node, change.originalData);
                }
            } else if (change.type === 'delete' && change.originalData) {
                // Restore deleted node
                graph.nodes.push({...change.originalData});
            }
        }

        // Restore edges (after nodes are restored)
        for (const [edgeId, change] of unsavedChanges.edges.entries()) {
            if (change.type === 'create') {
                // Remove newly created edge
                graph.edges = graph.edges.filter(e => e.id !== edgeId);
            } else if (change.type === 'update' && change.originalData) {
                // Restore original edge data
                const edge = graph.edges.find(e => e.id === edgeId);
                if (edge) {
                    // Restore edge properties, maintaining node references
                    edge.weight = change.originalData.weight;
                    // Note: from and to should remain the same (node references)
                }
            } else if (change.type === 'delete' && change.originalData) {
                // Restore deleted edge - check if both nodes exist
                const fromNodeExists = graph.nodes.some(n => n.id === change.originalData.from);
                const toNodeExists = graph.nodes.some(n => n.id === change.originalData.to);
                if (fromNodeExists && toNodeExists) {
                    graph.edges.push({...change.originalData});
                }
            }
        }

        // Clear unsaved changes
        const discardedCount = unsavedChanges.nodes.size + unsavedChanges.edges.size;
        unsavedChanges.nodes.clear();
        unsavedChanges.edges.clear();
        
        // Re-render graph
        graph.render();
        updateSaveButtonVisibility();

        if (discardButton) {
            discardButton.textContent = `Discarded ${discardedCount} change${discardedCount !== 1 ? 's' : ''}!`;
            setTimeout(() => {
                discardButton.textContent = originalText;
                discardButton.disabled = false;
            }, 2000);
        }

        console.log(`Discarded ${discardedCount} changes`);
    } catch (error) {
        console.error('Error discarding changes:', error);
        if (discardButton) {
            discardButton.textContent = 'Error!';
            setTimeout(() => {
                discardButton.textContent = originalText;
                discardButton.disabled = false;
            }, 2000);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);