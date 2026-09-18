import { AIDifficulty, BoardState, PlayerSymbol } from '../types';
import { checkWinner } from './gameLogic';

interface MoveScore {
  index: number;
  score: number;
}

// Move priority ordering to maximize alpha-beta pruning cutoffs:
// Center -> Corners -> Edges
const MOVE_PRIORITY = [4, 0, 2, 6, 8, 1, 3, 5, 7];

/**
 * Minimax recursive algorithm with depth-discounted scoring,
 * prioritized move evaluation, and memoization for lightning-fast execution (<1ms).
 */
function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: PlayerSymbol,
  humanSymbol: PlayerSymbol,
  alpha = -Infinity,
  beta = Infinity,
  memo: Map<string, number> = new Map()
): MoveScore {
  const result = checkWinner(board);

  if (result.winner === aiSymbol) {
    return { index: -1, score: 10 - depth };
  }
  if (result.winner === humanSymbol) {
    return { index: -1, score: depth - 10 };
  }
  if (result.winner === 'draw') {
    return { index: -1, score: 0 };
  }

  // Get available moves sorted by strategic priority (Center -> Corners -> Edges)
  const availableMoves: number[] = [];
  for (const idx of MOVE_PRIORITY) {
    if (board[idx] === null) {
      availableMoves.push(idx);
    }
  }

  if (availableMoves.length === 0) {
    return { index: -1, score: 0 };
  }

  // Memoization lookup key
  const stateKey = board.map(c => c ?? '-').join('') + (isMaximizing ? 'M' : 'm');
  if (memo.has(stateKey)) {
    return { index: availableMoves[0], score: memo.get(stateKey)! };
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      board[move] = aiSymbol;
      const { score } = minimax(board, depth + 1, false, aiSymbol, humanSymbol, alpha, beta, memo);
      board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break; // Beta cutoff
    }

    memo.set(stateKey, bestScore);
    return { index: bestMove, score: bestScore };
  } else {
    let bestScore = Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      board[move] = humanSymbol;
      const { score } = minimax(board, depth + 1, true, aiSymbol, humanSymbol, alpha, beta, memo);
      board[move] = null;

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break; // Alpha cutoff
    }

    memo.set(stateKey, bestScore);
    return { index: bestMove, score: bestScore };
  }
}

/**
 * Calculates the next best move for the AI opponent.
 * Executes instantly (0-2ms) via opening heuristics, immediate win/block detection,
 * and prioritized alpha-beta minimax.
 */
export function getAIMove(
  board: BoardState,
  aiSymbol: PlayerSymbol,
  difficulty: AIDifficulty = 'unbeatable'
): number {
  const availableMoves: number[] = [];
  board.forEach((val, idx) => {
    if (val === null) availableMoves.push(idx);
  });

  if (availableMoves.length === 0) return -1;

  const humanSymbol: PlayerSymbol = aiSymbol === 'X' ? 'O' : 'X';

  // --- FAST HEURISTIC 1: Check for immediate winning move for AI ---
  for (const move of availableMoves) {
    board[move] = aiSymbol;
    if (checkWinner(board).winner === aiSymbol) {
      board[move] = null;
      return move;
    }
    board[move] = null;
  }

  // --- FAST HEURISTIC 2: Check for immediate threat to block human ---
  for (const move of availableMoves) {
    board[move] = humanSymbol;
    if (checkWinner(board).winner === humanSymbol) {
      board[move] = null;
      // In easy difficulty, AI occasionally misses the block (30% chance)
      if (difficulty === 'easy' && Math.random() < 0.3) {
        continue;
      }
      return move;
    }
    board[move] = null;
  }

  // --- EASY DIFFICULTY: 70% random, 30% strategic ---
  if (difficulty === 'easy') {
    if (Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return availableMoves[randomIndex];
    }
  }

  // --- MEDIUM DIFFICULTY: 30% random, 70% strategic ---
  if (difficulty === 'medium') {
    if (Math.random() < 0.3) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return availableMoves[randomIndex];
    }
  }

  // --- FAST HEURISTIC 3: Opening book (0ms execution on early turns) ---
  // If entire board is empty (AI goes first as X):
  if (availableMoves.length === 9) {
    // Center is best; corners are also optimal. Center is index 4.
    const openingMoves = [4, 0, 2, 6, 8];
    return openingMoves[Math.floor(Math.random() * openingMoves.length)];
  }

  // If 1 move has been played (human went first):
  if (availableMoves.length === 8) {
    // If human didn't take center, always take center
    if (board[4] === null) return 4;
    // If human took center, take any corner
    const corners = [0, 2, 6, 8].filter(c => board[c] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
  }

  // --- UNBEATABLE MINIMAX with Alpha-Beta & Memoization ---
  const boardCopy = [...board];
  const { index } = minimax(boardCopy, 0, true, aiSymbol, humanSymbol, -Infinity, Infinity, new Map());
  return index !== -1 ? index : availableMoves[0];
}
