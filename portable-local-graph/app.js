let graph;
let appMode = 'select';
let contextMenu = null;
const API_BASE = 'http://localhost:3001/api/graph';

function init() {
    const canvas = document.getElementById('canvas');
    graph = new Graph(canvas, {
        onNodeCreate: saveNodeToDb,
        onNodeUpdate: updateNodeInDb,
        onNodeDelete: deleteNodeFromDb,
        onEdgeCreate: saveEdgeToDb,
        onEdgeUpdate: updateEdgeInDb,
        onEdgeDelete: deleteEdgeFromDb
    });

    setupEventListeners();
    setupContextMenu();
    setupDialogs();

    // Set initial mode
    setMode('select');
    
    // Load existing graph data from database
    loadGraphFromDb();
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
        }
    });

    document.getElementById('load-from-app-btn').addEventListener('click', loadFromApp);
    document.getElementById('save-btn').addEventListener('click', saveGraph);
    document.getElementById('load-btn').addEventListener('click', loadGraph);

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
    
    // Update in database
    updateNodeInDb(graph.selectedNode);
}

function saveEdgeEdit() {
    if (!graph.selectedEdge) return;

    const weight = parseFloat(document.getElementById('edge-weight').value);

    graph.selectedEdge.weight = weight;

    document.getElementById('edge-dialog').style.display = 'none';
    graph.render();
    
    // Update in database
    updateEdgeInDb(graph.selectedEdge);
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
            graph.importData(data, true); // true = skip callbacks to avoid re-saving
            console.log(`Loaded ${data.metadata.totalNodes} nodes and ${data.metadata.totalEdges} edges from database`);
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

async function importGraphToDb(data) {
    try {
        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to import graph');
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error importing graph to database:', error);
        throw error;
    }
}

// ========== File Operations ==========

function saveGraph() {
    const data = graph.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();

    URL.revokeObjectURL(url);
}

async function loadGraph() {
    const input = document.getElementById('file-input');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Import to database
                await importGraphToDb(data);
                
                // Reload from database
                await loadGraphFromDb();
                
                alert('Graph loaded successfully!');
            } catch (error) {
                alert('Error loading file: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function loadFromApp() {
    alert('This is now an independent graph plugin with its own database.\n\nUse "Load" to import a JSON file, or create your graph manually.');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);