/**
 * CombatGame - A module for D&D-style tactical combat games
 * 
 * This module creates a tactical combat game interface that allows users to:
 * - Play turn-based combat games with customizable units
 * - Create and use custom unit templates
 * - Save/load games and unit configurations
 * - View detailed combat statistics and history
 * 
 * Implementation follows the same pattern as other modules in the project.
 */

const CombatGame = (function() {
    // Private variables
    let container;
    let gameBoard;
    let currentGame = null;
    let selectedUnit = null;
    let selectedSquare = null;
    let availableTemplates = [];
    let isGameActive = false;
    let _isVisible = false;
    let gameMode = 'play'; // 'play', 'setup', 'template'
    
    // Initialize the combat game
    function initialize() {
        console.log('Initializing Combat Game');
        createContainer();
        loadUnitTemplates();
        hide();
    }
    
    // Create a custom modal dialog
    function createModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'combat-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'combat-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = title;
        modalTitle.style.cssText = `
            margin: 0 0 15px 0;
            color: #333;
        `;
        
        const modalBody = document.createElement('div');
        modalBody.className = 'combat-modal-body';
        modalBody.appendChild(content);
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'combat-modal-footer';
        modalFooter.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        `;
        
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.textContent = button.text;
            btn.className = 'combat-btn';
            btn.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: ${button.primary ? '#2196F3' : '#f0f0f0'};
                color: ${button.primary ? 'white' : '#333'};
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            `;
            btn.addEventListener('click', () => {
                // Call the onClick handler first while the modal is still in the DOM
                if (button.onClick) {
                    const result = button.onClick();
                    // If onClick returns a promise, wait for it before removing modal
                    if (result && typeof result.then === 'function') {
                        result.finally(() => modal.remove());
                    } else {
                        modal.remove();
                    }
                } else {
                    modal.remove();
                }
            });
            modalFooter.appendChild(btn);
        });
        
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    // Create the container and board
    function createContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'combat-game-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                display: none;
                justify-content: center;
                align-items: center;
            `;
            document.body.appendChild(container);
        }
        
        // Create combat game interface
        const gameInterface = document.createElement('div');
        gameInterface.className = 'combat-game-interface';
        gameInterface.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            gap: 20px;
            max-width: 95%;
            max-height: 95%;
            overflow: auto;
        `;
        
        // Create left panel (board)
        const leftPanel = document.createElement('div');
        leftPanel.className = 'combat-left-panel';
        leftPanel.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        // Create game title
        const gameTitle = document.createElement('h2');
        gameTitle.id = 'combat-game-title';
        gameTitle.textContent = 'D&D Combat Game';
        gameTitle.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
        `;
        
        // Create combat board
        gameBoard = document.createElement('div');
        gameBoard.className = 'combat-board';
        gameBoard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(8, 50px);
            grid-template-rows: repeat(8, 50px);
            border: 2px solid #333;
            background: #f5f5f5;
            margin-bottom: 20px;
        `;
        
        // Create board squares
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const square = document.createElement('div');
                square.id = `square-${x}-${y}`;
                square.className = 'combat-square';
                square.dataset.x = x;
                square.dataset.y = y;
                
                // Alternate colors
                const isLight = (x + y) % 2 === 0;
                square.style.cssText = `
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    background: ${isLight ? '#e8e8e8' : '#d0d0d0'};
                    border: 2px solid transparent;
                    transition: all 0.2s;
                    position: relative;
                `;
                
                // Add click handler
                square.addEventListener('click', handleSquareClick);
                
                gameBoard.appendChild(square);
            }
        }
        
        leftPanel.appendChild(gameTitle);
        leftPanel.appendChild(gameBoard);
        
        // Create right panel (controls and info)
        const rightPanel = document.createElement('div');
        rightPanel.className = 'combat-right-panel';
        rightPanel.style.cssText = `
            width: 350px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'combat-controls';
        controls.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button id="new-combat-game-btn" class="combat-btn">New Game</button>
                    <button id="load-combat-game-btn" class="combat-btn">Load Game</button>
                    <button id="save-combat-game-btn" class="combat-btn">Save Game</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="unit-templates-btn" class="combat-btn">Unit Templates</button>
                    <button id="games-list-btn" class="combat-btn">Games List</button>
                    <button id="close-combat-btn" class="combat-btn">Close</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="end-turn-btn" class="combat-btn" disabled>End Turn</button>
                    <button id="start-game-btn" class="combat-btn" disabled>Start Game</button>
                </div>
            </div>
        `;
        
        // Create game status
        const gameStatus = document.createElement('div');
        gameStatus.id = 'combat-game-status';
        gameStatus.style.cssText = `
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
        `;
        gameStatus.textContent = 'Click "New Game" to start';
        
        // Create current turn info
        const turnInfo = document.createElement('div');
        turnInfo.id = 'combat-turn-info';
        turnInfo.style.cssText = `
            padding: 10px;
            background: #e3f2fd;
            border-radius: 5px;
            text-align: center;
        `;
        turnInfo.textContent = 'No active game';
        
        // Create unit info panel
        const unitInfo = document.createElement('div');
        unitInfo.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Selected Unit</h3>
            <div id="unit-info-content" style="
                padding: 10px;
                background: #f9f9f9;
                border-radius: 5px;
                min-height: 100px;
            ">
                <p>No unit selected</p>
            </div>
        `;
        
        // Create actions panel
        const actionsPanel = document.createElement('div');
        actionsPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Actions</h3>
            <div id="unit-actions" style="
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-height: 80px;
            "></div>
        `;
        
        // Create turn history
        const turnHistory = document.createElement('div');
        turnHistory.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Turn History</h3>
            <div id="turn-history-list" style="
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid #ddd;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 5px;
            "></div>
        `;
        
        rightPanel.appendChild(controls);
        rightPanel.appendChild(gameStatus);
        rightPanel.appendChild(turnInfo);
        rightPanel.appendChild(unitInfo);
        rightPanel.appendChild(actionsPanel);
        rightPanel.appendChild(turnHistory);
        
        gameInterface.appendChild(leftPanel);
        gameInterface.appendChild(rightPanel);
        container.appendChild(gameInterface);
        
        // Set up event listeners
        setupEventListeners();
        
        // Add CSS styles
        addCombatStyles();
    }
    
    // Add CSS styles
    function addCombatStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .combat-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: #4CAF50;
                color: white;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .combat-btn:hover:not(:disabled) {
                background: #45a049;
            }
            
            .combat-btn:disabled {
                background: #cccccc;
                cursor: not-allowed;
            }
            
            .combat-square.selected {
                border: 2px solid #2196F3 !important;
                background: rgba(33, 150, 243, 0.3) !important;
            }
            
            .combat-square.move-target {
                border: 2px solid #4CAF50 !important;
                background: rgba(76, 175, 80, 0.3) !important;
            }
            
            .combat-square.attack-target {
                border: 2px solid #F44336 !important;
                background: rgba(244, 67, 54, 0.3) !important;
            }
            
            .combat-unit {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                border: 2px solid #333;
                position: relative;
            }
            
            .combat-unit.player1 {
                background: #2196F3;
                color: white;
            }
            
            .combat-unit.player2 {
                background: #F44336;
                color: white;
            }
            
            .combat-unit.defeated {
                opacity: 0.5;
                filter: grayscale(100%);
            }
            
            .hp-bar {
                position: absolute;
                bottom: -5px;
                left: 0;
                width: 100%;
                height: 3px;
                background: #333;
                border-radius: 2px;
            }
            
            .hp-fill {
                height: 100%;
                background: #4CAF50;
                border-radius: 2px;
                transition: width 0.3s;
            }
            
            .unit-actions-disabled {
                opacity: 0.5;
                pointer-events: none;
            }
            
            .turn-history-item {
                padding: 5px;
                margin: 2px 0;
                background: #fff;
                border-radius: 3px;
                border-left: 3px solid #2196F3;
                font-size: 12px;
            }
            
            .turn-history-item.player2 {
                border-left-color: #F44336;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        document.getElementById('new-combat-game-btn').addEventListener('click', showNewGameDialog);
        document.getElementById('load-combat-game-btn').addEventListener('click', showLoadGameDialog);
        document.getElementById('save-combat-game-btn').addEventListener('click', saveCurrentGame);
        document.getElementById('unit-templates-btn').addEventListener('click', showUnitTemplatesDialog);
        document.getElementById('games-list-btn').addEventListener('click', showGamesListDialog);
        document.getElementById('close-combat-btn').addEventListener('click', hide);
        document.getElementById('end-turn-btn').addEventListener('click', endTurn);
        document.getElementById('start-game-btn').addEventListener('click', startGame);
        
        // Close on background click
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                hide();
            }
        });
    }
    
    // Handle square click
    function handleSquareClick(event) {
        const square = event.target.closest('.combat-square');
        if (!square) return;
        
        const x = parseInt(square.dataset.x);
        const y = parseInt(square.dataset.y);
        
        if (gameMode === 'setup') {
            handleSetupClick(x, y);
        } else if (gameMode === 'play') {
            handlePlayClick(x, y);
        }
    }
    
    // Handle setup mode clicks
    function handleSetupClick(x, y) {
        if (!currentGame) return;
        
        // Show unit placement dialog
        showUnitPlacementDialog(x, y);
    }
    
    // Handle play mode clicks
    function handlePlayClick(x, y) {
        if (!currentGame || !isGameActive) return;
        
        const clickedUnit = findUnitAtPosition(x, y);
        
        if (selectedUnit) {
            if (clickedUnit && clickedUnit.id === selectedUnit.id) {
                // Deselect unit
                clearSelection();
                return;
            }
            
            if (clickedUnit && clickedUnit.player !== currentGame.current_player) {
                // Attack enemy unit
                showAttackDialog(selectedUnit, clickedUnit);
                return;
            }
            
            if (!clickedUnit) {
                // Move to empty square
                moveUnit(selectedUnit.id, x, y);
                return;
            }
        }
        
        if (clickedUnit && clickedUnit.player === currentGame.current_player) {
            // Select friendly unit
            selectUnit(clickedUnit);
        }
    }
    
    // Find unit at position
    function findUnitAtPosition(x, y) {
        if (!currentGame || !currentGame.units) return null;
        return currentGame.units.find(unit => 
            unit.position_x === x && unit.position_y === y && unit.status === 'active'
        );
    }
    
    // Select unit
    function selectUnit(unit) {
        selectedUnit = unit;
        clearHighlights();
        
        // Highlight selected unit
        const square = document.getElementById(`square-${unit.position_x}-${unit.position_y}`);
        if (square) {
            square.classList.add('selected');
        }
        
        // Show possible moves and attacks
        if (unit.player === currentGame.current_player && !unit.has_moved) {
            showPossibleMoves(unit);
        }
        
        if (unit.player === currentGame.current_player && !unit.has_attacked) {
            showPossibleAttacks(unit);
        }
        
        // Update unit info panel
        updateUnitInfoPanel(unit);
        updateActionsPanel(unit);
    }
    
    // Clear selection
    function clearSelection() {
        selectedUnit = null;
        clearHighlights();
        updateUnitInfoPanel(null);
        updateActionsPanel(null);
    }
    
    // Clear highlights
    function clearHighlights() {
        document.querySelectorAll('.combat-square').forEach(square => {
            square.classList.remove('selected', 'move-target', 'attack-target');
        });
    }
    
    // Show possible moves
    function showPossibleMoves(unit) {
        if (unit.has_moved) return;
        
        const range = unit.movement_range;
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= range && (dx !== 0 || dy !== 0)) {
                    const targetX = unit.position_x + dx;
                    const targetY = unit.position_y + dy;
                    
                    if (targetX >= 0 && targetX < 8 && targetY >= 0 && targetY < 8) {
                        const targetUnit = findUnitAtPosition(targetX, targetY);
                        if (!targetUnit) {
                            const square = document.getElementById(`square-${targetX}-${targetY}`);
                            if (square) {
                                square.classList.add('move-target');
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Show possible attacks
    function showPossibleAttacks(unit) {
        if (unit.has_attacked) return;
        
        const range = unit.attack_range;
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= range && (dx !== 0 || dy !== 0)) {
                    const targetX = unit.position_x + dx;
                    const targetY = unit.position_y + dy;
                    
                    if (targetX >= 0 && targetX < 8 && targetY >= 0 && targetY < 8) {
                        const targetUnit = findUnitAtPosition(targetX, targetY);
                        if (targetUnit && targetUnit.player !== unit.player) {
                            const square = document.getElementById(`square-${targetX}-${targetY}`);
                            if (square) {
                                square.classList.add('attack-target');
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Update unit info panel
    function updateUnitInfoPanel(unit) {
        const infoContent = document.getElementById('unit-info-content');
        if (!unit) {
            infoContent.innerHTML = '<p>No unit selected</p>';
            return;
        }
        
        const hpPercentage = (unit.current_hp / unit.max_hp) * 100;
        
        infoContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div class="combat-unit ${unit.player}" style="position: relative;">
                    ${unit.sprite_url}
                    <div class="hp-bar">
                        <div class="hp-fill" style="width: ${hpPercentage}%"></div>
                    </div>
                </div>
                <div>
                    <strong>${unit.template_name}</strong><br>
                    <small>Player ${unit.player === 'player1' ? '1' : '2'}</small>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div>HP: ${unit.current_hp}/${unit.max_hp}</div>
                <div>Attack: ${unit.attack_power}</div>
                <div>Defense: ${unit.defense}</div>
                <div>Move: ${unit.movement_range}</div>
                <div>Range: ${unit.attack_range}</div>
                <div>Status: ${unit.status}</div>
            </div>
            <div style="margin-top: 10px;">
                <strong>Skills:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                    ${unit.skills.map(skill => `
                        <span style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                            ${skill.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Update actions panel
    function updateActionsPanel(unit) {
        const actionsPanel = document.getElementById('unit-actions');
        if (!unit || unit.player !== currentGame.current_player || !isGameActive) {
            actionsPanel.innerHTML = '<p>No actions available</p>';
            return;
        }
        
        const actions = [];
        
        if (!unit.has_moved) {
            actions.push(`
                <button class="combat-btn" onclick="CombatGame.selectUnitForMove('${unit.id}')">
                    Move Unit
                </button>
            `);
        }
        
        if (!unit.has_attacked && unit.skills.length > 0) {
            unit.skills.forEach(skill => {
                actions.push(`
                    <button class="combat-btn" onclick="CombatGame.selectSkill('${unit.id}', '${skill.name}')">
                        ${skill.name} ${skill.damage ? `(${skill.damage} dmg)` : ''}
                    </button>
                `);
            });
        }
        
        if (actions.length === 0) {
            actionsPanel.innerHTML = '<p>Unit has used all actions</p>';
        } else {
            actionsPanel.innerHTML = actions.join('');
        }
    }
    
    // Load unit templates
    async function loadUnitTemplates() {
        try {
            const response = await fetch('/api/combat/templates');
            if (response.ok) {
                availableTemplates = await response.json();
            } else {
                console.error('Failed to load unit templates:', response.status);
                availableTemplates = [];
            }
        } catch (error) {
            console.error('Error loading unit templates:', error);
            availableTemplates = [];
        }
    }
    
    // Show new game dialog
    function showNewGameDialog() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <label>Game Title:</label>
                <input type="text" id="game-title" placeholder="My Combat Game" style="width: 100%; padding: 8px; margin-top: 5px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>Board Size:</label>
                <select id="board-size" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="6">6x6</option>
                    <option value="8" selected>8x8</option>
                    <option value="10">10x10</option>
                    <option value="12">12x12</option>
                </select>
            </div>
        `;
        
        createModal('New Combat Game', content, [
            { text: 'Cancel', primary: false },
            { 
                text: 'Create Game', 
                primary: true, 
                onClick: () => createNewGame()
            }
        ]);
    }
    
    // Create new game
    async function createNewGame() {
        const title = document.getElementById('game-title').value || 'New Combat Game';
        const boardSize = parseInt(document.getElementById('board-size').value);
        
        try {
            const response = await fetch('/api/combat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, boardSize })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                gameMode = 'setup';
                isGameActive = false;
                updateBoardDisplay();
                updateGameStatus();
                updateTurnInfo();
                document.getElementById('combat-game-title').textContent = title;
                document.getElementById('start-game-btn').disabled = false;
                document.getElementById('end-turn-btn').disabled = true;
            }
        } catch (error) {
            console.error('Error creating new game:', error);
        }
    }
    
    // Show unit placement dialog
    function showUnitPlacementDialog(x, y) {
        // Ensure templates are loaded and is an array
        if (!Array.isArray(availableTemplates) || availableTemplates.length === 0) {
            alert('Unit templates not loaded. Please try again.');
            return;
        }
        
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <label>Player:</label>
                <select id="unit-player" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="player1">Player 1</option>
                    <option value="player2">Player 2</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>Unit Type:</label>
                <select id="unit-template" style="width: 100%; padding: 8px; margin-top: 5px;">
                    ${availableTemplates.map(template => `
                        <option value="${template.id}">${template.sprite_url} ${template.name}</option>
                    `).join('')}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <small>Position: (${x}, ${y})</small>
            </div>
        `;
        
        createModal('Place Unit', content, [
            { text: 'Cancel', primary: false },
            { 
                text: 'Place Unit', 
                primary: true, 
                onClick: () => placeUnit(x, y)
            }
        ]);
    }
    
    // Place unit
    async function placeUnit(x, y) {
        const player = document.getElementById('unit-player').value;
        const templateId = document.getElementById('unit-template').value;
        
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/place-unit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ templateId, player, x, y })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                updateBoardDisplay();
            }
        } catch (error) {
            console.error('Error placing unit:', error);
        }
    }
    
    // Start game
    async function startGame() {
        if (!currentGame) return;
        
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/start`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                currentGame = await response.json();
                gameMode = 'play';
                isGameActive = true;
                updateGameStatus();
                updateTurnInfo();
                document.getElementById('start-game-btn').disabled = true;
                document.getElementById('end-turn-btn').disabled = false;
            }
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }
    
    // End turn
    async function endTurn() {
        if (!currentGame) return;
        
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/end-turn`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                currentGame = await response.json();
                clearSelection();
                updateBoardDisplay();
                updateTurnInfo();
                updateTurnHistory();
            }
        } catch (error) {
            console.error('Error ending turn:', error);
        }
    }
    
    // Move unit
    async function moveUnit(unitId, newX, newY) {
        if (!currentGame) return;
        
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/move`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ unitId, newX, newY })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                clearSelection();
                updateBoardDisplay();
                updateTurnHistory();
            }
        } catch (error) {
            console.error('Error moving unit:', error);
        }
    }
    
    // Show attack dialog
    function showAttackDialog(attacker, target) {
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <p>Attack ${target.template_name} with ${attacker.template_name}?</p>
            </div>
            <div style="margin-bottom: 15px;">
                <label>Choose Skill:</label>
                <select id="attack-skill" style="width: 100%; padding: 8px; margin-top: 5px;">
                    ${attacker.skills.map(skill => `
                        <option value="${skill.name}">
                            ${skill.name} - ${skill.damage || attacker.attack_power} damage
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
        
        createModal('Attack Unit', content, [
            { text: 'Cancel', primary: false },
            { 
                text: 'Attack', 
                primary: true, 
                onClick: () => {
                    const skillName = document.getElementById('attack-skill').value;
                    attackUnit(attacker.id, target.id, skillName);
                }
            }
        ]);
    }
    
    // Attack unit
    async function attackUnit(attackerId, targetId, skillName) {
        // const skillName = document.getElementById('attack-skill').value;
        
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/attack`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ attackerId, targetId, skillName })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                clearSelection();
                updateBoardDisplay();
                updateTurnHistory();
                
                // Check for game over
                checkGameOver();
            }
        } catch (error) {
            console.error('Error attacking unit:', error);
        }
    }
    
    // Check game over
    function checkGameOver() {
        if (!currentGame || !currentGame.units) return;
        
        const player1Units = currentGame.units.filter(unit => unit.player === 'player1' && unit.status === 'active');
        const player2Units = currentGame.units.filter(unit => unit.player === 'player2' && unit.status === 'active');
        
        if (player1Units.length === 0) {
            endGame('player2');
        } else if (player2Units.length === 0) {
            endGame('player1');
        }
    }
    
    // End game
    async function endGame(winner) {
        try {
            const response = await fetch(`/api/combat/${currentGame.id}/end`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ winner })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                isGameActive = false;
                updateGameStatus();
                
                const content = document.createElement('div');
                content.innerHTML = `
                    <h2>Game Over!</h2>
                    <p>Winner: ${winner === 'player1' ? 'Player 1' : 'Player 2'}</p>
                `;
                
                createModal('Game Over', content, [
                    { text: 'OK', primary: true }
                ]);
            }
        } catch (error) {
            console.error('Error ending game:', error);
        }
    }
    
    // Update board display
    function updateBoardDisplay() {
        if (!currentGame) return;
        
        // Clear all squares
        document.querySelectorAll('.combat-square').forEach(square => {
            square.innerHTML = '';
            square.classList.remove('selected', 'move-target', 'attack-target');
        });
        
        // Place units
        if (currentGame.units) {
            currentGame.units.forEach(unit => {
                if (unit.status === 'active') {
                    const square = document.getElementById(`square-${unit.position_x}-${unit.position_y}`);
                    if (square) {
                        const unitElement = document.createElement('div');
                        unitElement.className = `combat-unit ${unit.player}`;
                        if (unit.status === 'defeated') {
                            unitElement.classList.add('defeated');
                        }
                        
                        unitElement.innerHTML = `
                            ${unit.sprite_url}
                            <div class="hp-bar">
                                <div class="hp-fill" style="width: ${(unit.current_hp / unit.max_hp) * 100}%"></div>
                            </div>
                        `;
                        
                        square.appendChild(unitElement);
                    }
                }
            });
        }
    }
    
    // Update game status
    function updateGameStatus() {
        const statusElement = document.getElementById('combat-game-status');
        if (!statusElement || !currentGame) return;
        
        let statusText = '';
        if (currentGame.game_status === 'setup') {
            statusText = 'Setup Phase - Place your units';
        } else if (currentGame.game_status === 'active') {
            statusText = 'Battle in Progress';
        } else if (currentGame.game_status === 'completed') {
            statusText = `Game Over - ${currentGame.winner ? (currentGame.winner === 'player1' ? 'Player 1' : 'Player 2') + ' wins!' : 'Draw'}`;
        }
        
        statusElement.textContent = statusText;
    }
    
    // Update turn info
    function updateTurnInfo() {
        const turnElement = document.getElementById('combat-turn-info');
        if (!turnElement || !currentGame) return;
        
        if (currentGame.game_status === 'active') {
            turnElement.textContent = `Turn ${currentGame.current_turn} - ${currentGame.current_player === 'player1' ? 'Player 1' : 'Player 2'}'s Turn`;
        } else {
            turnElement.textContent = 'No active game';
        }
    }
    
    // Update turn history
    function updateTurnHistory() {
        const historyElement = document.getElementById('turn-history-list');
        if (!historyElement || !currentGame) return;
        
        historyElement.innerHTML = '';
        
        if (currentGame.turn_history) {
            currentGame.turn_history.slice(-10).forEach(turn => {
                const historyItem = document.createElement('div');
                historyItem.className = `turn-history-item ${turn.player}`;
                
                let actionText = '';
                if (turn.action === 'move') {
                    actionText = `moved from (${turn.from.x}, ${turn.from.y}) to (${turn.to.x}, ${turn.to.y})`;
                } else if (turn.action === 'attack') {
                    actionText = `attacked with ${turn.skill} for ${turn.damage} damage`;
                }
                
                historyItem.innerHTML = `
                    <strong>Turn ${turn.turn}</strong> - ${turn.player === 'player1' ? 'Player 1' : 'Player 2'} ${actionText}
                `;
                
                historyElement.appendChild(historyItem);
            });
        }
        
        // Scroll to bottom
        historyElement.scrollTop = historyElement.scrollHeight;
    }
    
    // Show unit templates dialog
    function showUnitTemplatesDialog() {
        // Ensure templates are loaded and is an array
        if (!Array.isArray(availableTemplates)) {
            availableTemplates = [];
        }
        
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <button id="create-template-btn" class="combat-btn">Create New Template</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${availableTemplates.length > 0 ? availableTemplates.map(template => `
                    <div style="display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 5px;">
                        <div style="font-size: 24px; margin-right: 15px;">${template.sprite_url}</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0;">${template.name}</h4>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${template.description}</p>
                            <div style="font-size: 11px; color: #888;">
                                HP: ${template.max_hp} | ATK: ${template.attack_power} | DEF: ${template.defense} | 
                                Move: ${template.movement_range} | Range: ${template.attack_range}
                            </div>
                        </div>
                        ${template.is_custom ? `<button onclick="CombatGame.deleteTemplate('${template.id}')" class="combat-btn" style="background: #f44336;">Delete</button>` : ''}
                    </div>
                `).join('') : '<p>No templates available. Try refreshing or creating a new template.</p>'}
            </div>
        `;
        
        const modal = createModal('Unit Templates', content, [
            { text: 'Close', primary: true }
        ]);
        
        // Add event listener for create template button
        const createBtn = document.getElementById('create-template-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                modal.remove();
                showCreateTemplateDialog();
            });
        }
    }
    
    // Show create template dialog
    function showCreateTemplateDialog() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label>Name:</label>
                    <input type="text" id="template-name" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Unit Type:</label>
                    <select id="template-type" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="infantry">Infantry</option>
                        <option value="ranged">Ranged</option>
                        <option value="cavalry">Cavalry</option>
                        <option value="magical">Magical</option>
                        <option value="stealth">Stealth</option>
                    </select>
                </div>
                <div>
                    <label>Max HP:</label>
                    <input type="number" id="template-hp" value="100" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Attack Power:</label>
                    <input type="number" id="template-attack" value="10" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Defense:</label>
                    <input type="number" id="template-defense" value="5" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Movement Range:</label>
                    <input type="number" id="template-movement" value="2" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Attack Range:</label>
                    <input type="number" id="template-range" value="1" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label>Sprite (emoji):</label>
                    <input type="text" id="template-sprite" value="🛡️" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
            </div>
            <div style="margin-top: 15px;">
                <label>Description:</label>
                <textarea id="template-description" style="width: 100%; padding: 8px; margin-top: 5px; height: 60px;"></textarea>
            </div>
        `;
        
        createModal('Create Unit Template', content, [
            { text: 'Cancel', primary: false },
            { 
                text: 'Create Template', 
                primary: true, 
                onClick: () => createUnitTemplate()
            }
        ]);
    }
    
    // Create unit template
    async function createUnitTemplate() {
        const templateData = {
            name: document.getElementById('template-name').value,
            description: document.getElementById('template-description').value,
            unitType: document.getElementById('template-type').value,
            maxHp: parseInt(document.getElementById('template-hp').value),
            attackPower: parseInt(document.getElementById('template-attack').value),
            defense: parseInt(document.getElementById('template-defense').value),
            movementRange: parseInt(document.getElementById('template-movement').value),
            attackRange: parseInt(document.getElementById('template-range').value),
            spriteUrl: document.getElementById('template-sprite').value,
            skills: [
                { name: 'Basic Attack', damage: parseInt(document.getElementById('template-attack').value), range: parseInt(document.getElementById('template-range').value), cooldown: 0 }
            ]
        };
        
        try {
            const response = await fetch('/api/combat/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(templateData)
            });
            
            if (response.ok) {
                await loadUnitTemplates();
                alert('Template created successfully!');
            }
        } catch (error) {
            console.error('Error creating template:', error);
        }
    }
    
    // Save current game
    async function saveCurrentGame() {
        if (!currentGame) {
            alert('No active game to save');
            return;
        }
        
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <label>Enter filename (without extension):</label>
                <input type="text" id="save-filename" value="combat_game_${currentGame.id.slice(0, 8)}" style="width: 100%; padding: 8px; margin-top: 5px;">
            </div>
        `;
        
        createModal('Save Game', content, [
            { text: 'Cancel', primary: false },
            { 
                text: 'Save', 
                primary: true, 
                onClick: async () => {
                    const filename = document.getElementById('save-filename').value;
                    if (!filename) return;
                    
                    try {
                        const response = await fetch(`/api/combat/${currentGame.id}/save`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filename })
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            alert(`Game saved as ${result.filename}`);
                        }
                    } catch (error) {
                        console.error('Error saving game:', error);
                        alert('Error saving game');
                    }
                }
            }
        ]);
    }
    
    // Show load game dialog
    function showLoadGameDialog() {
        // Implementation for loading games
        alert('Load game functionality would be implemented here');
    }
    
    // Show games list dialog
    async function showGamesListDialog() {
        try {
            const response = await fetch('/api/combat');
            if (response.ok) {
                const games = await response.json();
                showGamesModal(games);
            }
        } catch (error) {
            console.error('Error loading games:', error);
        }
    }
    
    // Show games modal
    function showGamesModal(games) {
        const content = document.createElement('div');
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';
        
        if (games.length === 0) {
            content.innerHTML = '<p>No saved games found.</p>';
        } else {
            content.innerHTML = games.map(game => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div>
                        <strong>${game.title}</strong><br>
                        <small>Status: ${game.game_status}, Turn: ${game.current_turn}</small>
                    </div>
                    <button class="combat-btn load-game-btn" data-game-id="${game.id}">Load</button>
                </div>
            `).join('');
        }
        
        const modal = createModal('Saved Games', content, [
            { text: 'Close', primary: true }
        ]);
        
        // Add event listeners for load buttons
        content.addEventListener('click', async (e) => {
            if (e.target.classList.contains('load-game-btn')) {
                const gameId = e.target.dataset.gameId;
                await loadGameById(gameId);
                modal.remove();
            }
        });
    }
    
    // Load game by ID
    async function loadGameById(gameId) {
        try {
            const response = await fetch(`/api/combat/${gameId}`);
            if (response.ok) {
                currentGame = await response.json();
                gameMode = currentGame.game_status === 'setup' ? 'setup' : 'play';
                isGameActive = currentGame.game_status === 'active';
                
                // Update board size
                updateBoardSize(currentGame.board_size);
                updateBoardDisplay();
                updateGameStatus();
                updateTurnInfo();
                updateTurnHistory();
                
                document.getElementById('combat-game-title').textContent = currentGame.title;
                document.getElementById('start-game-btn').disabled = currentGame.game_status !== 'setup';
                document.getElementById('end-turn-btn').disabled = currentGame.game_status !== 'active';
            }
        } catch (error) {
            console.error('Error loading game:', error);
        }
    }
    
    // Update board size
    function updateBoardSize(size) {
        gameBoard.style.gridTemplateColumns = `repeat(${size}, 50px)`;
        gameBoard.style.gridTemplateRows = `repeat(${size}, 50px)`;
        
        // Clear existing squares
        gameBoard.innerHTML = '';
        
        // Create new squares
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const square = document.createElement('div');
                square.id = `square-${x}-${y}`;
                square.className = 'combat-square';
                square.dataset.x = x;
                square.dataset.y = y;
                
                const isLight = (x + y) % 2 === 0;
                square.style.cssText = `
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    background: ${isLight ? '#e8e8e8' : '#d0d0d0'};
                    border: 2px solid transparent;
                    transition: all 0.2s;
                    position: relative;
                `;
                
                square.addEventListener('click', handleSquareClick);
                gameBoard.appendChild(square);
            }
        }
    }
    
    // Show the combat game
    function show() {
        container.style.display = 'flex';
        _isVisible = true;
        
        // Load templates if not already loaded
        if (availableTemplates.length === 0) {
            loadUnitTemplates();
        }
        
        if (!currentGame) {
            document.getElementById('combat-game-status').textContent = 'Click "New Game" to start or "Games List" to load a game';
        }
    }
    
    // Hide the combat game
    function hide() {
        container.style.display = 'none';
        _isVisible = false;
    }
    
    // Check if visible
    function isVisible() {
        return _isVisible;
    }
    
    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible,
        selectUnitForMove: function(unitId) {
            const unit = currentGame.units.find(u => u.id === unitId);
            if (unit) {
                selectUnit(unit);
            }
        },
        selectSkill: function(unitId, skillName) {
            const unit = currentGame.units.find(u => u.id === unitId);
            if (unit) {
                selectUnit(unit);
                // Show skill targeting
                clearHighlights();
                showPossibleAttacks(unit);
            }
        },
        deleteTemplate: async function(templateId) {
            if (confirm('Are you sure you want to delete this template?')) {
                try {
                    const response = await fetch(`/api/combat/templates/${templateId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        await loadUnitTemplates();
                        alert('Template deleted successfully');
                    }
                } catch (error) {
                    console.error('Error deleting template:', error);
                }
            }
        }
    };
})();

// Initialize the module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CombatGame.initialize();
    console.log('CombatGame initialized');
});

// Make the module globally accessible
window.CombatGame = CombatGame;