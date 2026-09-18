export type PlayerSymbol = 'X' | 'O';
export type BoardState = (PlayerSymbol | null)[];

export type GameMode = 'ai' | 'multiplayer';
export type AIDifficulty = 'easy' | 'medium' | 'unbeatable';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type WinnerType = PlayerSymbol | 'draw' | null;

export interface Game {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  hostPhoto?: string;
  hostSymbol: PlayerSymbol;
  opponentId?: string | null;
  opponentName?: string | null;
  opponentPhoto?: string | null;
  gameMode: GameMode;
  aiDifficulty?: AIDifficulty;
  status: GameStatus;
  winner: WinnerType;
  winningLine?: number[] | null;
  currentTurn: PlayerSymbol;
  turnCount: number;
  board: BoardState;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'MOVE' | 'ROLLBACK' | 'RESET';

export interface GameEvent {
  id: string;
  gameId: string;
  turnIndex: number;
  type: EventType;
  player: PlayerSymbol;
  playerId: string;
  playerName: string;
  cellIndex: number; // 0-8 for MOVE, -1 for non-move
  targetTurnIndex?: number; // for ROLLBACK
  resultingBoard: BoardState;
  timestamp: string;
  note?: string;
}

export interface BoardSnapshot {
  turnIndex: number;
  event: GameEvent;
  board: BoardState;
  currentTurn: PlayerSymbol;
  winner: WinnerType;
  winningLine: number[] | null;
  description: string;
}

export interface ReconstructedState {
  board: BoardState;
  currentTurn: PlayerSymbol;
  turnCount: number;
  winner: WinnerType;
  winningLine: number[] | null;
  status: GameStatus;
  snapshots: BoardSnapshot[];
}

export interface UserStats {
  userId: string;
  displayName: string;
  photoURL?: string;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: string;
}
