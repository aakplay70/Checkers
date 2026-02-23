/**
 * Checkers AI Using Minimax with Alpha-Beta Pruning
 */
class AI {
    constructor(difficulty) {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    async getBestMove(game) {
        return new Promise(resolve => {
            // Use setTimeout to avoid freezing the UI on hard difficulty
            setTimeout(() => {
                let moves = game.getAllValidMoves('computer');
                if (moves.length === 0) {
                    resolve(null);
                    return;
                }

                if (this.difficulty === 'easy') {
                    // Random move, prioritize captures if available
                    let captures = moves.filter(m => m.captured);
                    let pool = captures.length > 0 ? captures : moves;
                    resolve(pool[Math.floor(Math.random() * pool.length)]);
                    return;
                }

                let depth = this.difficulty === 'medium' ? 3 : 5;
                let bestMove = this.minimaxRoot(game, depth, true);

                resolve(bestMove);
            }, 50);
        });
    }

    minimaxRoot(game, depth, isMaximizing) {
        let newMoves = game.getAllValidMoves('computer');
        let bestMove = null;
        let bestValue = -Infinity;

        // Shuffle moves to add slight variance when scores are equal
        this.shuffle(newMoves);

        for (let i = 0; i < newMoves.length; i++) {
            let move = newMoves[i];
            let boardCopy = game.clone();
            boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);

            // If the move results in a multi-jump, the computer is still playing
            let nextIsMaximizing = boardCopy.turn === 'computer';

            let value = this.minimax(boardCopy, depth - 1, -Infinity, Infinity, nextIsMaximizing);

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove || newMoves[0];
    }

    minimax(game, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.isGameOver()) {
            return this.evaluateBoard(game);
        }

        let moves = game.getAllValidMoves(game.turn);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                let boardCopy = game.clone();
                boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                let evalScore = this.minimax(boardCopy, depth - 1, alpha, beta, boardCopy.turn === 'computer');
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                let boardCopy = game.clone();
                boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                let evalScore = this.minimax(boardCopy, depth - 1, alpha, beta, boardCopy.turn === 'computer');
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return minEval;
        }
    }

    evaluateBoard(game) {
        if (game.getWinner() === 'computer') return Infinity;
        if (game.getWinner() === 'player') return -Infinity;
        if (game.getWinner() === 'draw') return 0;

        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = game.board[r][c];
                if (piece) {
                    // Base piece values
                    let val = piece.isKing ? 30 : 10;

                    // Positional bonuses (prefer edges/backrow for defense, advancing for offense)
                    if (piece.player === 'computer') {
                        if (!piece.isKing) val += (r * 1.5); // Reward moving forward
                        if (r === 0) val += 5; // Reward keeping back row intact
                        score += val;
                    } else {
                        if (!piece.isKing) val += ((7 - r) * 1.5);
                        if (r === 7) val += 5;
                        score -= val;
                    }
                }
            }
        }

        return score;
    }

    // Evaluates every move option for the passed player and returns an array mapping {move, evaluationScore}
    async getGuidedMoves(game, maxDepth = 4) {
        return new Promise(resolve => {
            setTimeout(() => {
                let currentMoves = game.getAllValidMoves('player');
                let evaluatedMoves = [];

                for (let i = 0; i < currentMoves.length; i++) {
                    let move = currentMoves[i];
                    let boardCopy = game.clone();
                    boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);

                    // The player is maximizing, so the next turn (computer) is minimizing
                    let nextIsMaximizing = boardCopy.turn === 'player';
                    // The evaluation should be positive if good for the player.
                    // The original evaluateBoard returns positive for the computer. So we use the negative of it.
                    let evalScore = this.minimaxGuided(boardCopy, maxDepth - 1, -Infinity, Infinity, nextIsMaximizing);

                    evaluatedMoves.push({ move: move, score: evalScore });
                }

                resolve(evaluatedMoves);
            }, 50);
        });
    }

    // A mirror of minimax specifically geared to evaluate from the player's perspective
    minimaxGuided(game, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.isGameOver()) {
            return -this.evaluateBoard(game); // Invert since evaluateBoard() is computer-centric
        }

        let moves = game.getAllValidMoves(game.turn);

        // Player is maximizing their own score
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                let boardCopy = game.clone();
                boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                let evalScore = this.minimaxGuided(boardCopy, depth - 1, alpha, beta, boardCopy.turn === 'player');
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval === -Infinity ? -1000 : maxEval; // Penalty if no moves
        } else {
            // Computer is minimizing player's score
            let minEval = Infinity;
            for (let move of moves) {
                let boardCopy = game.clone();
                boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                let evalScore = this.minimaxGuided(boardCopy, depth - 1, alpha, beta, boardCopy.turn === 'player');
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval === Infinity ? 1000 : minEval; // Reward if computer has no moves
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
