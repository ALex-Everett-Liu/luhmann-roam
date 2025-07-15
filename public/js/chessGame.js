/**
 * ChessGame - A module for playing chess games
 * 
 * This module creates a chess game interface that allows users to:
 * - Play chess games with both sides controllable
 * - Save games to local storage and text files
 * - Load and replay games
 * - View game history
 * 
 * Implementation follows the same pattern as other modules in the project.
 */

const ChessGame = (function() {
    // Private variables
    let container;
    let gameBoard;
    let currentGame = null;
    let selectedSquare = null;
    let isGameActive = false;
    let _isVisible = false;
    
    // Chess piece symbols
    const PIECE_SYMBOLS = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    
    // Initialize the chess game
    function initialize() {
        console.log('Initializing Chess Game');
        createContainer();
        hide();
    }
    
    // Create the container and board
    function createContainer() {
        // Create main container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.className = 'chess-game-container';
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
        
        // Create chess game interface
        const gameInterface = document.createElement('div');
        gameInterface.className = 'chess-game-interface';
        gameInterface.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            gap: 20px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
        `;
        
        // Create left panel (board)
        const leftPanel = document.createElement('div');
        leftPanel.className = 'chess-left-panel';
        leftPanel.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        // Create game title
        const gameTitle = document.createElement('h2');
        gameTitle.id = 'chess-game-title';
        gameTitle.textContent = 'Chess Game';
        gameTitle.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
        `;
        
        // Create chess board
        gameBoard = document.createElement('div');
        gameBoard.className = 'chess-board';
        gameBoard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(8, 60px);
            grid-template-rows: repeat(8, 60px);
            border: 2px solid #333;
            background: #f0d9b5;
        `;
        
        // Create board squares
        for (let row = 8; row >= 1; row--) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const file = String.fromCharCode(97 + col); // a-h
                const rank = row.toString();
                const squareId = file + rank;
                
                square.id = squareId;
                square.className = 'chess-square';
                square.dataset.square = squareId;
                
                // Alternate colors
                const isLight = (row + col) % 2 === 0;
                square.style.cssText = `
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 36px;
                    cursor: pointer;
                    background: ${isLight ? '#f0d9b5' : '#b58863'};
                    border: 2px solid transparent;
                    transition: all 0.2s;
                `;
                
                // Add click handler
                square.addEventListener('click', handleSquareClick);
                
                gameBoard.appendChild(square);
            }
        }
        
        leftPanel.appendChild(gameTitle);
        leftPanel.appendChild(gameBoard);
        
        // Create right panel (controls and history)
        const rightPanel = document.createElement('div');
        rightPanel.className = 'chess-right-panel';
        rightPanel.style.cssText = `
            width: 300px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'chess-controls';
        controls.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button id="new-game-btn" class="chess-btn">New Game</button>
                    <button id="save-game-btn" class="chess-btn">Save Game</button>
                    <button id="load-game-btn" class="chess-btn">Load Game</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="games-list-btn" class="chess-btn">Games List</button>
                    <button id="export-pgn-btn" class="chess-btn">Export PGN</button>
                    <button id="close-chess-btn" class="chess-btn">Close</button>
                </div>
            </div>
        `;
        
        // Create game status
        const gameStatus = document.createElement('div');
        gameStatus.id = 'chess-game-status';
        gameStatus.style.cssText = `
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
        `;
        gameStatus.textContent = 'Click "New Game" to start';
        
        // Create move history
        const moveHistory = document.createElement('div');
        moveHistory.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Move History</h3>
            <div id="moves-list" style="
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #ddd;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 5px;
            "></div>
        `;
        
        rightPanel.appendChild(controls);
        rightPanel.appendChild(gameStatus);
        rightPanel.appendChild(moveHistory);
        
        gameInterface.appendChild(leftPanel);
        gameInterface.appendChild(rightPanel);
        container.appendChild(gameInterface);
        
        // Set up event listeners
        setupEventListeners();
        
        // Add CSS styles
        addChessStyles();
    }
    
    // Add CSS styles
    function addChessStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chess-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: #2196F3;
                color: white;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .chess-btn:hover {
                background: #1976D2;
            }
            
            .chess-square.selected {
                border: 2px solid #4CAF50 !important;
                background: rgba(76, 175, 80, 0.3) !important;
            }
            
            .chess-square.possible-move {
                background: rgba(255, 193, 7, 0.5) !important;
            }
            
            .chess-square.last-move {
                background: rgba(33, 150, 243, 0.3) !important;
            }
            
            .move-item {
                display: flex;
                justify-content: space-between;
                padding: 5px;
                border-bottom: 1px solid #eee;
            }
            
            .move-item:last-child {
                border-bottom: none;
            }
            
            .move-number {
                font-weight: bold;
                color: #666;
            }
            
            .move-notation {
                font-family: monospace;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('save-game-btn').addEventListener('click', saveCurrentGame);
        document.getElementById('load-game-btn').addEventListener('click', showLoadGameDialog);
        document.getElementById('games-list-btn').addEventListener('click', showGamesListDialog);
        document.getElementById('export-pgn-btn').addEventListener('click', exportGameAsPGN);
        document.getElementById('close-chess-btn').addEventListener('click', hide);
        
        // Close on background click
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                hide();
            }
        });
    }
    
    // Handle square click
    function handleSquareClick(event) {
        if (!isGameActive) return;
        
        const clickedSquare = event.target.dataset.square;
        const piece = currentGame.board_state[clickedSquare];
        
        if (selectedSquare) {
            // Try to make a move
            if (selectedSquare !== clickedSquare) {
                makeMove(selectedSquare, clickedSquare);
            }
            clearSelection();
        } else if (piece && isCurrentPlayerPiece(piece)) {
            // Select piece
            selectedSquare = clickedSquare;
            highlightSelectedSquare(clickedSquare);
            showPossibleMoves(clickedSquare, piece);
        }
    }
    
    // Check if piece belongs to current player
    function isCurrentPlayerPiece(piece) {
        if (!piece) return false;
        const isWhitePiece = piece === piece.toUpperCase();
        return (currentGame.current_player === 'white' && isWhitePiece) ||
               (currentGame.current_player === 'black' && !isWhitePiece);
    }
    
    // Highlight selected square
    function highlightSelectedSquare(squareId) {
        clearHighlights();
        const square = document.getElementById(squareId);
        if (square) {
            square.classList.add('selected');
        }
    }
    
    // Show possible moves (basic implementation)
    function showPossibleMoves(squareId, piece) {
        const possibleMoves = calculatePossibleMoves(squareId, piece);
        possibleMoves.forEach(moveSquare => {
            const square = document.getElementById(moveSquare);
            if (square) {
                square.classList.add('possible-move');
            }
        });
    }
    
    // Calculate possible moves (basic implementation)
    function calculatePossibleMoves(squareId, piece) {
        const moves = [];
        const file = squareId.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank = parseInt(squareId[1]) - 1;   // 1=0, 2=1, etc.
        
        // Basic move validation for pawns
        if (piece.toLowerCase() === 'p') {
            const direction = piece === 'P' ? 1 : -1;
            const startRank = piece === 'P' ? 1 : 6;
            
            // Move forward
            const newRank = rank + direction;
            if (newRank >= 0 && newRank < 8) {
                const newSquare = String.fromCharCode(97 + file) + (newRank + 1);
                if (!currentGame.board_state[newSquare]) {
                    moves.push(newSquare);
                    
                    // Double move from starting position
                    if (rank === startRank) {
                        const doubleMove = String.fromCharCode(97 + file) + (newRank + 2);
                        if (!currentGame.board_state[doubleMove]) {
                            moves.push(doubleMove);
                        }
                    }
                }
            }
            
            // Capture diagonally
            [-1, 1].forEach(fileOffset => {
                const newFile = file + fileOffset;
                const newRank = rank + direction;
                if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                    const newSquare = String.fromCharCode(97 + newFile) + (newRank + 1);
                    const targetPiece = currentGame.board_state[newSquare];
                    if (targetPiece && isCurrentPlayerPiece(targetPiece) === false) {
                        moves.push(newSquare);
                    }
                }
            });
        }
        
        // For other pieces, return all squares (simplified)
        // In a real implementation, you'd add proper move validation for each piece type
        
        return moves;
    }
    
    // Clear selection and highlights
    function clearSelection() {
        selectedSquare = null;
        clearHighlights();
    }
    
    // Clear all highlights
    function clearHighlights() {
        document.querySelectorAll('.chess-square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'last-move');
        });
    }
    
    // Make a move
    async function makeMove(from, to) {
        if (!currentGame || !isGameActive) return;
        
        const piece = currentGame.board_state[from];
        const capturedPiece = currentGame.board_state[to];
        
        if (!piece || !isCurrentPlayerPiece(piece)) return;
        
        // Basic move validation
        if (!isValidMove(from, to, piece)) {
            return;
        }
        
        const moveNotation = `${piece}${from}-${to}${capturedPiece ? 'x' + capturedPiece : ''}`;
        
        try {
            const response = await fetch(`/api/chess/${currentGame.id}/move`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from,
                    to,
                    piece,
                    capturedPiece,
                    moveNotation
                })
            });
            
            if (response.ok) {
                const updatedGame = await response.json();
                currentGame = updatedGame;
                updateBoardDisplay();
                updateGameStatus();
                updateMoveHistory();
                
                // Highlight last move
                setTimeout(() => {
                    const fromSquare = document.getElementById(from);
                    const toSquare = document.getElementById(to);
                    if (fromSquare) fromSquare.classList.add('last-move');
                    if (toSquare) toSquare.classList.add('last-move');
                }, 100);
            }
        } catch (error) {
            console.error('Error making move:', error);
        }
    }
    
    // Basic move validation
    function isValidMove(from, to, piece) {
        // Basic validation - just check if target square is not occupied by own piece
        const targetPiece = currentGame.board_state[to];
        if (targetPiece && isCurrentPlayerPiece(targetPiece)) {
            return false;
        }
        return true;
    }
    
    // Start a new game
    async function startNewGame() {
        const title = prompt('Enter game title:', 'New Chess Game');
        if (!title) return;
        
        try {
            const response = await fetch('/api/chess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                isGameActive = true;
                updateBoardDisplay();
                updateGameStatus();
                updateMoveHistory();
                document.getElementById('chess-game-title').textContent = title;
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }
    
    // Update board display
    function updateBoardDisplay() {
        if (!currentGame) return;
        
        clearHighlights();
        
        // Update all squares
        for (let row = 8; row >= 1; row--) {
            for (let col = 0; col < 8; col++) {
                const file = String.fromCharCode(97 + col);
                const rank = row.toString();
                const squareId = file + rank;
                const square = document.getElementById(squareId);
                const piece = currentGame.board_state[squareId];
                
                if (square) {
                    square.textContent = piece ? PIECE_SYMBOLS[piece] : '';
                }
            }
        }
    }
    
    // Update game status
    function updateGameStatus() {
        const statusElement = document.getElementById('chess-game-status');
        if (!statusElement || !currentGame) return;
        
        let statusText = '';
        if (currentGame.game_status === 'active') {
            statusText = `${currentGame.current_player.charAt(0).toUpperCase() + currentGame.current_player.slice(1)} to move`;
        } else if (currentGame.game_status === 'completed') {
            statusText = `Game Over - ${currentGame.winner ? currentGame.winner + ' wins' : 'Draw'}`;
        }
        
        statusElement.textContent = statusText;
    }
    
    // Update move history
    function updateMoveHistory() {
        const movesList = document.getElementById('moves-list');
        if (!movesList || !currentGame) return;
        
        movesList.innerHTML = '';
        
        currentGame.moves_history.forEach((move, index) => {
            const moveItem = document.createElement('div');
            moveItem.className = 'move-item';
            moveItem.innerHTML = `
                <span class="move-number">${move.moveNumber}.</span>
                <span class="move-notation">${move.moveNotation}</span>
                <span style="color: ${move.player === 'white' ? '#000' : '#666'}">
                    ${move.player === 'white' ? '⚪' : '⚫'}
                </span>
            `;
            movesList.appendChild(moveItem);
        });
        
        // Scroll to bottom
        movesList.scrollTop = movesList.scrollHeight;
    }
    
    // Save current game
    async function saveCurrentGame() {
        if (!currentGame) {
            alert('No active game to save');
            return;
        }
        
        const filename = prompt('Enter filename (without extension):', `chess_game_${currentGame.id.slice(0, 8)}`);
        if (!filename) return;
        
        try {
            const response = await fetch(`/api/chess/${currentGame.id}/save`, {
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
    
    // Show load game dialog
    function showLoadGameDialog() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pgn,.txt';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const content = await file.text();
                loadGameFromContent(content, file.name);
            }
        };
        fileInput.click();
    }
    
    // Load game from content
    async function loadGameFromContent(content, filename) {
        try {
            const response = await fetch('/api/chess/load', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename, content })
            });
            
            if (response.ok) {
                currentGame = await response.json();
                isGameActive = false; // Loaded games are typically completed
                updateBoardDisplay();
                updateGameStatus();
                updateMoveHistory();
                document.getElementById('chess-game-title').textContent = currentGame.title;
            }
        } catch (error) {
            console.error('Error loading game:', error);
            alert('Error loading game');
        }
    }
    
    // Show games list dialog
    async function showGamesListDialog() {
        try {
            const response = await fetch('/api/chess');
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
        const modal = document.createElement('div');
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
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 600px;
            max-height: 80%;
            overflow-y: auto;
        `;
        
        modalContent.innerHTML = `
            <h3>Saved Games</h3>
            <div id="games-list-container"></div>
            <button id="close-games-modal" class="chess-btn" style="margin-top: 15px;">Close</button>
        `;
        
        const gamesContainer = modalContent.querySelector('#games-list-container');
        
        games.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #eee;
            `;
            
            gameItem.innerHTML = `
                <div>
                    <strong>${game.title}</strong><br>
                    <small>Status: ${game.game_status}, Moves: ${game.move_count}</small>
                </div>
                <button class="chess-btn load-game-btn" data-game-id="${game.id}">Load</button>
            `;
            
            gamesContainer.appendChild(gameItem);
        });
        
        modalContent.querySelector('#close-games-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modalContent.addEventListener('click', async (e) => {
            if (e.target.classList.contains('load-game-btn')) {
                const gameId = e.target.dataset.gameId;
                await loadGameById(gameId);
                modal.remove();
            }
        });
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Load game by ID
    async function loadGameById(gameId) {
        try {
            const response = await fetch(`/api/chess/${gameId}`);
            if (response.ok) {
                currentGame = await response.json();
                isGameActive = currentGame.game_status === 'active';
                updateBoardDisplay();
                updateGameStatus();
                updateMoveHistory();
                document.getElementById('chess-game-title').textContent = currentGame.title;
            }
        } catch (error) {
            console.error('Error loading game:', error);
        }
    }
    
    // Export game as PGN
    async function exportGameAsPGN() {
        if (!currentGame) {
            alert('No game to export');
            return;
        }
        
        const filename = prompt('Enter filename (without extension):', `chess_game_${currentGame.id.slice(0, 8)}`);
        if (!filename) return;
        
        await saveCurrentGame();
    }
    
    // Show the chess game
    function show() {
        container.style.display = 'flex';
        _isVisible = true;
        
        // Load games list or start with empty state
        if (!currentGame) {
            document.getElementById('chess-game-status').textContent = 'Click "New Game" to start or "Games List" to load a game';
        }
    }
    
    // Hide the chess game
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
        isVisible
    };
})();

// Initialize the module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ChessGame.initialize();
    console.log('ChessGame initialized');
});

// Make the module globally accessible
window.ChessGame = ChessGame;