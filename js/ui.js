/**
 * UI Controller: Connects DOM to Game Logic
 */
class UI {
    constructor() {
        this.boardElement = document.getElementById('board');
        this.playerScoreEl = document.getElementById('player-score');
        this.computerScoreEl = document.getElementById('computer-score');
        this.playerCardEl = document.getElementById('player-score-card');
        this.computerCardEl = document.getElementById('computer-score-card');
        this.messageOverlay = document.getElementById('message-overlay');
        this.messageText = document.getElementById('message-text');

        this.onCellClickCallback = null;
    }

    bindCellClick(callback) {
        this.onCellClickCallback = callback;
    }

    renderBoard(boardState, selectedCell = null, validMoves = [], guidedEvaluations = [], movablePieces = [], capturedNode = null, movedNode = null, aiSelectedNode = null) {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                let classes = ['cell', (row + col) % 2 === 1 ? 'dark' : 'light'];

                // Highlight selected
                if (selectedCell && selectedCell.r === row && selectedCell.c === col) {
                    classes.push('selected');
                }

                // Highlight valid moves
                const isMoveTarget = validMoves.some(m => m.to.r === row && m.to.c === col);
                if (isMoveTarget) {
                    classes.push('valid-move');
                }

                cell.className = classes.join(' ');
                cell.dataset.row = row;
                cell.dataset.col = col;

                const piece = boardState[row][col];
                if (piece) {
                    const pieceEl = document.createElement('div');
                    let pclasses = ['piece', piece.player];
                    if (piece.isKing) pclasses.push('king');

                    // highlight if it is a piece we can move right now
                    if (movablePieces.some(p => p.r === row && p.c === col)) {
                        pclasses.push('movable');
                    }

                    if (aiSelectedNode && aiSelectedNode.r === row && aiSelectedNode.c === col) {
                        pclasses.push('computer-selected');
                    }

                    if (movedNode && movedNode.r === row && movedNode.c === col) {
                        pclasses.push('piece-move');
                    }

                    pieceEl.className = pclasses.join(' ');
                    cell.appendChild(pieceEl);
                } else if (capturedNode && capturedNode.coord.r === row && capturedNode.coord.c === col) {
                    const pieceEl = document.createElement('div');
                    let pclasses = ['piece', capturedNode.piece.player, 'piece-capture'];
                    if (capturedNode.piece.isKing) pclasses.push('king');
                    pieceEl.className = pclasses.join(' ');
                    cell.appendChild(pieceEl);
                }

                // Guided Mode Evaluation overlay
                if (isMoveTarget && guidedEvaluations.length > 0) {
                    const ev = guidedEvaluations.find(e =>
                        e.move.from.r === selectedCell.r && e.move.from.c === selectedCell.c &&
                        e.move.to.r === row && e.move.to.c === col
                    );

                    if (ev) {
                        const evalEl = document.createElement('span');
                        evalEl.className = `eval-score ${ev.displayScore >= 50 ? 'eval-good' : 'eval-bad'}`;
                        evalEl.textContent = `${ev.displayScore}%`;
                        cell.appendChild(evalEl);
                    }
                }

                // Guided Mode Evaluation overlay
                if (isMoveTarget && guidedEvaluations.length > 0 && selectedCell) {
                    const ev = guidedEvaluations.find(e =>
                        e.move.from.r === selectedCell.r && e.move.from.c === selectedCell.c &&
                        e.move.to.r === row && e.move.to.c === col
                    );

                    if (ev) {
                        const evalEl = document.createElement('span');
                        evalEl.className = `eval-score ${ev.displayScore >= 50 ? 'eval-good' : 'eval-bad'}`;
                        evalEl.textContent = `${ev.displayScore}%`;
                        cell.appendChild(evalEl);
                    }
                }

                // Interaction
                if ((row + col) % 2 === 1) { // Only dark squares are playable
                    cell.addEventListener('click', () => {
                        if (this.onCellClickCallback) {
                            this.onCellClickCallback(row, col);
                        }
                    });
                }

                this.boardElement.appendChild(cell);
            }
        }
    }

    updateScores(playerLeft, computerLeft) {
        this.playerScoreEl.textContent = 12 - computerLeft; // Captured pieces
        this.computerScoreEl.textContent = 12 - playerLeft;
    }

    setTurnIndicator(turn) {
        if (turn === 'player') {
            this.playerCardEl.classList.add('active-turn');
            this.computerCardEl.classList.remove('active-turn');
        } else {
            this.computerCardEl.classList.add('active-turn');
            this.playerCardEl.classList.remove('active-turn');
        }
    }

    showMessage(text, duration = 2000) {
        this.messageText.textContent = text;
        this.messageOverlay.classList.add('show');

        if (duration > 0) {
            setTimeout(() => {
                this.messageOverlay.classList.remove('show');
            }, duration);
        }
    }

    hideMessage() {
        this.messageOverlay.classList.remove('show');
    }

    showGameOver(winner, stats) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const msg = document.getElementById('game-over-message');

        if (winner === 'player') {
            title.textContent = 'You Win!';
            title.style.color = 'var(--accent-green)';
            msg.textContent = 'Congratulations, you defeated the computer!';
        } else if (winner === 'computer') {
            title.textContent = 'Game Over';
            title.style.color = 'var(--piece-player)';
            msg.textContent = 'The computer outsmarted you this time.';
        } else {
            title.textContent = 'Draw';
            title.style.color = 'var(--text-primary)';
            msg.textContent = 'The game ended in a stalemate.';
        }

        document.getElementById('stat-moves').textContent = stats.moves;

        let min = Math.floor(stats.time / 60);
        let sec = stats.time % 60;
        document.getElementById('stat-time').textContent = `${min}:${sec.toString().padStart(2, '0')}`;

        modal.classList.add('show');
    }
}
