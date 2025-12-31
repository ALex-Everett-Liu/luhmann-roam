class Graph {
    constructor(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        
        // Callbacks for database persistence
        this.callbacks = callbacks;

        this.setupCanvas();
        this.bindEvents();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.render();
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        // Add tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'graph-tooltip';
        this.tooltip.style.cssText = 'position: absolute; display: none; background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; pointer-events: none; z-index: 1000; max-width: 300px; word-wrap: break-word;';
        document.body.appendChild(this.tooltip);
    }

    addNode(x, y, label = 'Node', color = '#3b82f6') {
        const node = {
            id: crypto.randomUUID(),
            x: x,
            y: y,
            label: label,
            color: color,
            radius: 20,
            fullContent: label
        };
        this.nodes.push(node);
        this.render();
        
        // Trigger callback for database persistence
        if (this.callbacks.onNodeCreate) {
            this.callbacks.onNodeCreate(node);
        }
        
        return node;
    }

    addEdge(fromNode, toNode, weight = 1) {
        const edge = {
            id: crypto.randomUUID(),
            from: fromNode.id,
            to: toNode.id,
            weight: weight
        };
        this.edges.push(edge);
        this.render();
        
        // Trigger callback for database persistence
        if (this.callbacks.onEdgeCreate) {
            this.callbacks.onEdgeCreate(edge);
        }
        
        return edge;
    }

    getNodeAt(x, y) {
        return this.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
    }

    getEdgeAt(x, y) {
        for (let edge of this.edges) {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            if (this.isPointOnLine(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y, 5)) {
                return edge;
            }
        }
        return null;
    }

    isPointOnLine(px, py, x1, y1, x2, y2, threshold) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return Math.sqrt(A * A + B * B) <= threshold;

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));

        const xx = x1 + param * C;
        const yy = y1 + param * D;
        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy) <= threshold;
    }

    deleteNode(node) {
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.edges = this.edges.filter(e => e.from !== node.id && e.to !== node.id);
        this.render();
        
        // Trigger callback for database persistence
        if (this.callbacks.onNodeDelete) {
            this.callbacks.onNodeDelete(node.id);
        }
    }

    deleteEdge(edge) {
        this.edges = this.edges.filter(e => e.id !== edge.id);
        this.render();
        
        // Trigger callback for database persistence
        if (this.callbacks.onEdgeDelete) {
            this.callbacks.onEdgeDelete(edge.id);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges
        this.edges.forEach(edge => {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                this.drawEdge(fromNode, toNode, edge);
            }
        });

        // Draw nodes
        this.nodes.forEach(node => {
            this.drawNode(node);
        });
    }

    drawNode(node) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.color;
        this.ctx.fill();
        this.ctx.strokeStyle = this.selectedNode === node ? '#000' : '#fff';
        this.ctx.lineWidth = this.selectedNode === node ? 3 : 2;
        this.ctx.stroke();

        // Draw label
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(node.label, node.x, node.y + node.radius + 15);
    }

    drawEdge(fromNode, toNode, edge) {
        this.ctx.beginPath();
        this.ctx.moveTo(fromNode.x, fromNode.y);
        this.ctx.lineTo(toNode.x, toNode.y);

        // Line width based on weight (inverted - higher weight = thinner line)
        const lineWidth = Math.max(0.5, 8 - (edge.weight * 0.7));
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = this.selectedEdge === edge ? '#ff0000' : '#666';
        this.ctx.stroke();

        // Draw weight label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        this.ctx.fillStyle = '#000';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(edge.weight.toFixed(1), midX, midY - 5);
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const node = this.getNodeAt(x, y);

        if (window.appMode === 'select') {
            if (node) {
                this.selectedNode = node;
                this.selectedEdge = null;
                this.isDragging = true;
                this.dragOffset.x = x - node.x;
                this.dragOffset.y = y - node.y;
            } else {
                const edge = this.getEdgeAt(x, y);
                if (edge) {
                    this.selectedEdge = edge;
                    this.selectedNode = null;
                } else {
                    this.selectedNode = null;
                    this.selectedEdge = null;
                }
            }
        } else if (window.appMode === 'node') {
            this.addNode(x, y);
        } else if (window.appMode === 'edge') {
            if (node) {
                if (!this.tempEdgeStart) {
                    this.tempEdgeStart = node;
                } else {
                    this.addEdge(this.tempEdgeStart, node);
                    this.tempEdgeStart = null;
                }
            }
        }

        this.render();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isDragging && this.selectedNode) {
            this.selectedNode.x = x - this.dragOffset.x;
            this.selectedNode.y = y - this.dragOffset.y;
            this.render();
        } else {
            // Show tooltip for node under cursor
            const node = this.getNodeAt(x, y);
            if (node && node.fullContent) {
                this.tooltip.textContent = node.fullContent;
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = e.clientX + 10 + 'px';
                this.tooltip.style.top = e.clientY + 10 + 'px';
            } else {
                this.tooltip.style.display = 'none';
            }
        }
    }

    handleMouseUp(e) {
        if (this.isDragging && this.selectedNode) {
            // Trigger callback for database persistence when dragging ends
            if (this.callbacks.onNodeUpdate) {
                this.callbacks.onNodeUpdate(this.selectedNode);
            }
        }
        this.isDragging = false;
    }

    handleRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const node = this.getNodeAt(x, y);
        const edge = this.getEdgeAt(x, y);

        if (node || edge) {
            this.selectedNode = node;
            this.selectedEdge = edge;
            this.render();
            window.showContextMenu(e.clientX, e.clientY);
        }
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.render();
    }

    exportData() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }

    importData(data, skipCallbacks = false) {
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.render();
        
        // skipCallbacks is used when loading from database to avoid circular saves
        // It's not used when importing from file, which should trigger database import
    }
}