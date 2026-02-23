/**
 * Checkers Game Logic
 */
class Game {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'player'; // 'player' or 'computer'
        this.winner = null;
        this.playerPiecesCount = 12;
        this.computerPiecesCount = 12;
        this.movesWithoutCaptureOrPawnMove = 0; // For draw detection
        this.mustJumpPiece = null; // {r, c} if mid-sequence loop

        this.initializeBoard();
    }

    initializeBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) { // Dark squares
                    if (row < 3) {
                        this.board[row][col] = { player: 'computer', isKing: false };
                    } else if (row > 4) {
                        this.board[row][col] = { player: 'player', isKing: false };
                    }
                }
            }
        }
    }

    getWinner() {
        return this.winner;
    }

    isGameOver() {
        return this.winner !== null;
    }

    // Direction normal pieces move
    getDirections(player, isKing) {
        if (isKing) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        if (player === 'player') return [[-1, -1], [-1, 1]]; // Player moves up
        return [[1, -1], [1, 1]]; // Computer moves down
    }

    isValidPos(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    getAllValidMoves(player) {
        let allMoves = [];
        let allJumps = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = this.board[r][c];
                if (piece && piece.player === player) {
                    // If we must jump with a specific piece, skip others
                    if (this.mustJumpPiece && (this.mustJumpPiece.r !== r || this.mustJumpPiece.c !== c)) {
                        continue;
                    }

                    let pieceMoves = this.getValidMovesForPiece(r, c);
                    pieceMoves.forEach(m => {
                        if (m.captured) allJumps.push(m);
                        else allMoves.push(m);
                    });
                }
            }
        }

        // Forced captures
        return allJumps.length > 0 ? allJumps : allMoves;
    }

    getValidMovesForPiece(r, c) {
        let piece = this.board[r][c];
        if (!piece) return [];

        let moves = [];
        let jumps = [];
        let dirs = this.getDirections(piece.player, piece.isKing);

        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            let jr = r + 2 * dr, jc = c + 2 * dc;

            if (this.isValidPos(nr, nc)) {
                // Normal move
                if (!this.board[nr][nc] && !this.mustJumpPiece) {
                    moves.push({ from: { r, c }, to: { r: nr, c: nc } });
                }
                // Jump move
                else if (this.board[nr][nc] && this.board[nr][nc].player !== piece.player && this.isValidPos(jr, jc) && !this.board[jr][jc]) {
                    jumps.push({ from: { r, c }, to: { r: jr, c: jc }, captured: { r: nr, c: nc } });
                }
            }
        }

        return jumps.length > 0 ? jumps : moves;
    }

    makeMove(fromR, fromC, toR, toC) {
        let validMoves = this.getAllValidMoves(this.turn);
        let move = validMoves.find(m => m.from.r === fromR && m.from.c === fromC && m.to.r === toR && m.to.c === toC);

        if (!move) return false;

        let piece = this.board[fromR][fromC];
        this.board[toR][toC] = piece;
        this.board[fromR][fromC] = null;

        let moveEndsTurn = true;

        if (move.captured) {
            this.board[move.captured.r][move.captured.c] = null;
            if (piece.player === 'player') this.computerPiecesCount--;
            else this.playerPiecesCount--;

            this.movesWithoutCaptureOrPawnMove = 0;

            // Check for multi-jumps
            let subsequentMoves = this.getValidMovesForPiece(toR, toC);
            if (subsequentMoves.some(m => m.captured)) {
                this.mustJumpPiece = { r: toR, c: toC };
                moveEndsTurn = false;
            } else {
                this.mustJumpPiece = null;
            }
        } else {
            this.movesWithoutCaptureOrPawnMove++;
            if (!piece.isKing) this.movesWithoutCaptureOrPawnMove = 0;
        }

        // Promote to King
        if (!piece.isKing) {
            if ((piece.player === 'player' && toR === 0) || (piece.player === 'computer' && toR === 7)) {
                piece.isKing = true;
                // Becoming a king immediately ends the turn according to standard rules
                moveEndsTurn = true;
                this.mustJumpPiece = null;
            }
        }

        if (moveEndsTurn) {
            this.switchTurn();
        }

        this.checkGameOver();
        return true;
    }

    switchTurn() {
        this.turn = this.turn === 'player' ? 'computer' : 'player';
        this.mustJumpPiece = null;
    }

    checkGameOver() {
        if (this.playerPiecesCount === 0) {
            this.winner = 'computer';
            return;
        }
        if (this.computerPiecesCount === 0) {
            this.winner = 'player';
            return;
        }

        let currentValidMoves = this.getAllValidMoves(this.turn);
        if (currentValidMoves.length === 0) {
            this.winner = this.turn === 'player' ? 'computer' : 'player';
            return;
        }

        if (this.movesWithoutCaptureOrPawnMove >= 40) {
            this.winner = 'draw';
        }
    }

    // Create a copy of the game state for AI simulations
    clone() {
        let clone = new Game();
        clone.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        clone.turn = this.turn;
        clone.winner = this.winner;
        clone.playerPiecesCount = this.playerPiecesCount;
        clone.computerPiecesCount = this.computerPiecesCount;
        clone.movesWithoutCaptureOrPawnMove = this.movesWithoutCaptureOrPawnMove;
        clone.mustJumpPiece = this.mustJumpPiece ? { ...this.mustJumpPiece } : null;
        return clone;
    }
}
