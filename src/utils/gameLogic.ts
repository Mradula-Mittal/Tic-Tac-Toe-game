import { BoardState, GameEvent, PlayerSymbol, ReconstructedState, WinnerType, BoardSnapshot } from '../types';

export const WINNING_LINES: [number, number, number][] = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Col 1
  [1, 4, 7], // Col 2
  [2, 5, 8], // Col 3
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6], // Diagonal top-right to bottom-left
];

export function getPositionName(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  const positions = [
    'Top-Left', 'Top-Center', 'Top-Right',
    'Middle-Left', 'Center', 'Middle-Right',
    'Bottom-Left', 'Bottom-Center', 'Bottom-Right'
  ];
  return positions[index] || `R${row}C${col}`;
}

export function checkWinner(board: BoardState): { winner: WinnerType; winningLine: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }

  const isFull = board.every(cell => cell !== null);
  if (isFull) {
    return { winner: 'draw', winningLine: null };
  }

  return { winner: null, winningLine: null };
}

export function getInitialBoard(): BoardState {
  return Array(9).fill(null);
}

/**
 * Replays all events chronologically to reconstruct the exact game state.
 * Event sourcing guarantees that the board and turn state can be rebuilt
 * deterministically from the immutable event log.
 */
export function replayGameEvents(events: GameEvent[]): ReconstructedState {
  // Sort events chronologically by turnIndex
  const sortedEvents = [...events].sort((a, b) => a.turnIndex - b.turnIndex);

  let currentBoard: BoardState = getInitialBoard();
  let currentTurn: PlayerSymbol = 'X';
  let turnCount = 0;
  let winner: WinnerType = null;
  let winningLine: number[] | null = null;
  const snapshots: BoardSnapshot[] = [];

  for (const event of sortedEvents) {
    if (event.type === 'MOVE') {
      const cell = event.cellIndex;
      if (cell >= 0 && cell < 9 && currentBoard[cell] === null && !winner) {
        currentBoard = [...currentBoard];
        currentBoard[cell] = event.player;
        turnCount = event.turnIndex;

        const outcome = checkWinner(currentBoard);
        winner = outcome.winner;
        winningLine = outcome.winningLine;

        // Next turn
        currentTurn = event.player === 'X' ? 'O' : 'X';

        snapshots.push({
          turnIndex: event.turnIndex,
          event,
          board: [...currentBoard],
          currentTurn,
          winner,
          winningLine,
          description: `${event.playerName} placed ${event.player} at ${getPositionName(cell)}`,
        });
      }
    } else if (event.type === 'ROLLBACK') {
      // Rollback to target turn state
      const targetIndex = event.targetTurnIndex ?? 0;
      if (targetIndex === 0) {
        currentBoard = getInitialBoard();
        currentTurn = 'X';
        turnCount = 0;
        winner = null;
        winningLine = null;
      } else {
        const targetSnapshot = snapshots.find(s => s.turnIndex === targetIndex);
        if (targetSnapshot) {
          currentBoard = [...targetSnapshot.board];
          currentTurn = targetSnapshot.currentTurn;
          turnCount = targetSnapshot.turnIndex;
          winner = targetSnapshot.winner;
          winningLine = targetSnapshot.winningLine;
        }
      }

      snapshots.push({
        turnIndex: event.turnIndex,
        event,
        board: [...currentBoard],
        currentTurn,
        winner,
        winningLine,
        description: `Game rolled back to Turn #${targetIndex}`,
      });
    } else if (event.type === 'RESET') {
      currentBoard = getInitialBoard();
      currentTurn = 'X';
      turnCount = 0;
      winner = null;
      winningLine = null;

      snapshots.push({
        turnIndex: event.turnIndex,
        event,
        board: [...currentBoard],
        currentTurn,
        winner,
        winningLine,
        description: `Game restarted`,
      });
    }
  }

  const status = winner
    ? 'completed'
    : turnCount > 0
    ? 'in_progress'
    : 'waiting';

  return {
    board: currentBoard,
    currentTurn,
    turnCount,
    winner,
    winningLine,
    status,
    snapshots,
  };
}
