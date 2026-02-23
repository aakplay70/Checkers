/**
 * Main Controller
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const btnRestart = document.getElementById('btn-restart');
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const settingsModal = document.getElementById('settings-modal');
    const gameOverModal = document.getElementById('game-over-modal');
    const difficultyBtns = document.querySelectorAll('.btn-diff');
    const currentDifficultyEl = document.getElementById('current-difficulty');
    const btnRules = document.getElementById('btn-rules');
    const btnCloseRules = document.getElementById('btn-close-rules');
    const rulesModal = document.getElementById('rules-modal');
    const guidedModeToggle = document.getElementById('guided-mode-toggle');

    let currentDifficulty = 'medium';

    // Core objects
    let game;
    let ui;
    let ai;

    // State
    let selectedCell = null;
    let validMovesForPiece = [];
    let moveCount = 0;
    let startTime = 0;
    let timerInterval = null;
    let isGuidedMode = false;
    let guidedEvaluations = []; // stores { move: {...}, score: number }
    let isProcessingTurn = false;

    function initGame() {
        game = new Game();
        ui = new UI();
        ai = new AI(currentDifficulty);

        selectedCell = null;
        validMovesForPiece = [];
        guidedEvaluations = [];
        moveCount = 0;
        startTime = Math.floor(Date.now() / 1000);
        isProcessingTurn = false;

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => { }, 1000); // just to keep track of running state

        updateUI();

        // Bind core user interaction
        ui.bindCellClick(handleCellClick);

        gameOverModal.classList.remove('show');
    }

    function updateUI(capturedNode = null, movedNode = null, aiSelectedNode = null, suppressHighlights = false) {
        let movablePieces = [];
        if (!suppressHighlights && game.turn === 'player' && !game.isGameOver()) {
            const allValidMoves = game.getAllValidMoves('player');
            // extract unique starting positions
            allValidMoves.forEach(m => {
                if (!movablePieces.some(p => p.r === m.from.r && p.c === m.from.c)) {
                    movablePieces.push(m.from);
                }
            });
        }

        ui.renderBoard(game.board, selectedCell, validMovesForPiece, isGuidedMode ? guidedEvaluations : [], movablePieces, capturedNode, movedNode, aiSelectedNode);
        ui.updateScores(game.playerPiecesCount, game.computerPiecesCount);
        ui.setTurnIndicator(game.turn);
    }

    function handleCellClick(row, col) {
        if (game.turn !== 'player' || game.isGameOver() || isProcessingTurn) return;

        // Reset message if valid click
        ui.hideMessage();

        const allValidMoves = game.getAllValidMoves('player');

        // Check if clicking a valid destination to execute a move
        const move = validMovesForPiece.find(m => m.to.r === row && m.to.c === col);

        if (move) {
            executeMove(move.from.r, move.from.c, move.to.r, move.to.c);
            return;
        }

        // Try selecting a piece
        const piece = game.board[row][col];
        if (piece && piece.player === 'player') {
            const pieceMoves = allValidMoves.filter(m => m.from.r === row && m.from.c === col);
            if (pieceMoves.length > 0) {
                selectedCell = { r: row, c: col };
                validMovesForPiece = pieceMoves;
                updateUI();

                // Fetch guided evaluations if mode is active
                if (isGuidedMode) {
                    fetchGuidedEvaluations();
                }
            } else if (allValidMoves.length > 0) {
                // Determine if a jump is forced
                if (allValidMoves[0].captured) {
                    ui.showMessage('You must take the jump!', 2000);
                }
            }
        } else {
            // Clicked empty space or computer piece without valid move
            selectedCell = null;
            validMovesForPiece = [];
            guidedEvaluations = [];
            updateUI();
        }
    }

    async function fetchGuidedEvaluations() {
        // Show loading or wait a tiny bit
        guidedEvaluations = await ai.getGuidedMoves(game);

        // Let's normalize scores to a basic percentage chance for UX (heuristic)
        // Score range is roughly -100 to +100 in material differences.
        guidedEvaluations.forEach(ev => {
            let winChance = 50 + (ev.score * 2); // heuristic mapping
            if (winChance > 99) winChance = 99;
            if (winChance < 1) winChance = 1;
            ev.displayScore = Math.floor(winChance);
        });

        // Re-render only if the piece is still selected
        if (selectedCell) {
            updateUI();
        }
    }

    function executeMove(fromR, fromC, toR, toC) {
        const allValidMoves = game.getAllValidMoves(game.turn);
        const move = allValidMoves.find(m => m.from.r === fromR && m.from.c === fromC && m.to.r === toR && m.to.c === toC);

        let capturedPieceCoord = move && move.captured ? { r: move.captured.r, c: move.captured.c } : null;
        let capturedPieceObj = null;
        if (capturedPieceCoord) {
            capturedPieceObj = game.board[capturedPieceCoord.r][capturedPieceCoord.c];
        }

        moveCount++;
        game.makeMove(fromR, fromC, toR, toC);

        selectedCell = null;
        validMovesForPiece = [];

        let capturedNode = capturedPieceCoord ? { coord: capturedPieceCoord, piece: capturedPieceObj } : null;
        let movedNode = { r: toR, c: toC };
        updateUI(capturedNode, movedNode);

        if (game.isGameOver()) {
            endGame();
        } else if (game.turn === 'computer') {
            triggerComputerTurn();
        } else if (game.mustJumpPiece) {
            // Player multi-jump scenario
            selectedCell = game.mustJumpPiece;
            validMovesForPiece = game.getValidMovesForPiece(selectedCell.r, selectedCell.c);
            updateUI(capturedNode, movedNode); // Keep showing the animations while selecting next jump
            ui.showMessage('Keep jumping!', 1500);
        }
    }

    async function triggerComputerTurn() {
        isProcessingTurn = true;
        // Pause to let player process what just happened
        await new Promise(r => setTimeout(r, 1000));

        while (game.turn === 'computer' && !game.isGameOver()) {
            const move = await ai.getBestMove(game);
            if (!move) break;

            // Highlight the piece the computer is about to move
            updateUI(null, null, { r: move.from.r, c: move.from.c });

            // Give time to show the intention
            await new Promise(r => setTimeout(r, 1000));

            let capturedPieceCoord = move.captured ? { r: move.captured.r, c: move.captured.c } : null;
            let capturedPieceObj = capturedPieceCoord ? game.board[capturedPieceCoord.r][capturedPieceCoord.c] : null;

            game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);

            let capturedNode = capturedPieceCoord ? { coord: capturedPieceCoord, piece: capturedPieceObj } : null;
            let movedNode = { r: move.to.r, c: move.to.c };

            let suppressHighlights = game.turn === 'player';
            updateUI(capturedNode, movedNode, null, suppressHighlights);

            if (game.turn === 'computer') {
                // Must be a multi-jump, add delay before continuous jumps
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        if (game.isGameOver()) {
            endGame();
            isProcessingTurn = false;
        } else if (game.turn === 'player') {
            await new Promise(r => setTimeout(r, 1000));
            isProcessingTurn = false;
            updateUI();
        } else {
            isProcessingTurn = false;
        }
    }

    function endGame() {
        clearInterval(timerInterval);
        const endTime = Math.floor(Date.now() / 1000);
        const duration = endTime - startTime;

        ui.showGameOver(game.getWinner(), {
            moves: Math.floor(moveCount / 2), // rough turn count
            time: duration
        });
    }

    // Event Listeners
    btnRestart.addEventListener('click', () => {
        if (confirm("Are you sure you want to restart?")) initGame();
    });
    btnPlayAgain.addEventListener('click', initGame);

    btnSettings.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });

    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
        if (ai) ai.setDifficulty(currentDifficulty);
    });

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.level;
            currentDifficultyEl.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
        });
    });

    guidedModeToggle.addEventListener('change', (e) => {
        isGuidedMode = e.target.checked;
        if (isGuidedMode && selectedCell) {
            fetchGuidedEvaluations();
        } else {
            guidedEvaluations = [];
            updateUI();
        }
    });

    // Rules Modal
    btnRules.addEventListener('click', () => {
        rulesModal.classList.add('show');
    });

    btnCloseRules.addEventListener('click', () => {
        rulesModal.classList.remove('show');
    });

    // Start
    initGame();
});
