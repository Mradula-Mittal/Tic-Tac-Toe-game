import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AIDifficulty, BoardState, Game, GameEvent, GameMode, PlayerSymbol } from '../types';
import { checkWinner, getInitialBoard } from '../utils/gameLogic';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (0, O, 1, I)

export function generateShortGameCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export async function createGame(params: {
  hostId: string;
  hostName: string;
  hostPhoto?: string;
  hostSymbol: PlayerSymbol;
  gameMode: GameMode;
  aiDifficulty?: AIDifficulty;
}): Promise<Game> {
  const gameId = doc(collection(db, 'games')).id;
  const code = generateShortGameCode();
  const initialBoard = getInitialBoard();

  const gameData: Game = {
    id: gameId,
    code,
    hostId: params.hostId,
    hostName: params.hostName || 'Player 1',
    hostPhoto: params.hostPhoto || '',
    hostSymbol: params.hostSymbol,
    opponentId: params.gameMode === 'ai' ? 'ai' : null,
    opponentName: params.gameMode === 'ai' ? 'Minimax AI' : null,
    opponentPhoto: '',
    gameMode: params.gameMode,
    aiDifficulty: params.aiDifficulty || 'unbeatable',
    status: params.gameMode === 'ai' ? 'in_progress' : 'waiting',
    winner: null,
    winningLine: null,
    currentTurn: 'X',
    turnCount: 0,
    board: initialBoard,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'games', gameId), {
      ...gameData,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });
    return gameData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

export async function joinGameByCode(
  code: string,
  user: { uid: string; displayName?: string | null; photoURL?: string | null }
): Promise<Game> {
  const cleanCode = code.trim().toUpperCase();
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('code', '==', cleanCode));

  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'games');
  }

  if (snapshot.empty) {
    throw new Error(`Game with code "${cleanCode}" was not found. Please verify the code and try again.`);
  }

  const gameDoc = snapshot.docs[0];
  const game = gameDoc.data() as Game;

  // Already the host or opponent
  if (game.hostId === user.uid || game.opponentId === user.uid) {
    return game;
  }

  // Check if slot is open
  if (game.opponentId && game.opponentId !== 'ai') {
    throw new Error('This match is already full with 2 players.');
  }

  if (game.gameMode === 'ai') {
    throw new Error('This match is a single-player AI match.');
  }

  // Join as opponent
  const updatedData: Partial<Game> = {
    opponentId: user.uid,
    opponentName: user.displayName || 'Player 2',
    opponentPhoto: user.photoURL || '',
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'games', game.id), {
      ...updatedData,
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `games/${game.id}`);
  }

  return { ...game, ...updatedData } as Game;
}

export async function recordMoveEvent(params: {
  gameId: string;
  turnIndex: number;
  player: PlayerSymbol;
  playerId: string;
  playerName: string;
  cellIndex: number;
  currentBoard: BoardState;
}): Promise<{ resultingBoard: BoardState; winner: 'X' | 'O' | 'draw' | null }> {
  const { gameId, turnIndex, player, playerId, playerName, cellIndex, currentBoard } = params;

  const newBoard = [...currentBoard];
  newBoard[cellIndex] = player;

  const outcome = checkWinner(newBoard);
  const nextTurn: PlayerSymbol = player === 'X' ? 'O' : 'X';
  const newStatus = outcome.winner ? 'completed' : 'in_progress';

  const eventId = `turn_${turnIndex}_${Date.now()}`;
  const eventRef = doc(db, 'games', gameId, 'events', eventId);
  const gameRef = doc(db, 'games', gameId);

  const eventData: GameEvent = {
    id: eventId,
    gameId,
    turnIndex,
    type: 'MOVE',
    player,
    playerId,
    playerName,
    cellIndex,
    resultingBoard: newBoard,
    timestamp: new Date().toISOString(),
    note: `${playerName} marked cell ${cellIndex + 1}`,
  };

  try {
    const batch = writeBatch(db);
    batch.set(eventRef, {
      ...eventData,
      createdAtServer: serverTimestamp(),
    });
    batch.update(gameRef, {
      board: newBoard,
      currentTurn: nextTurn,
      turnCount: turnIndex,
      winner: outcome.winner,
      winningLine: outcome.winningLine,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });

    await batch.commit();
    return { resultingBoard: newBoard, winner: outcome.winner };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}/events/${eventId}`);
  }
}

/**
 * Rolls back the game to a prior turn's state.
 * Deletes subsequent events so gameplay can continue seamlessly from that historical turn,
 * and updates the parent game document's projected board state.
 */
export async function rollbackGameToTurn(params: {
  gameId: string;
  targetTurnIndex: number;
  allEvents: GameEvent[];
  hostSymbol: PlayerSymbol;
}): Promise<void> {
  const { gameId, targetTurnIndex, allEvents, hostSymbol } = params;

  try {
    // Find events that need to be pruned (turns > targetTurnIndex)
    const eventsToDelete = allEvents.filter(e => e.turnIndex > targetTurnIndex);

    // Calculate reconstructed board up to targetTurnIndex
    let targetBoard: BoardState = getInitialBoard();
    let targetTurn: PlayerSymbol = 'X';
    let targetTurnCount = 0;
    let targetWinner: 'X' | 'O' | 'draw' | null = null;
    let targetWinningLine: number[] | null = null;

    const remainingEvents = allEvents
      .filter(e => e.turnIndex <= targetTurnIndex && e.type === 'MOVE')
      .sort((a, b) => a.turnIndex - b.turnIndex);

    for (const ev of remainingEvents) {
      if (ev.cellIndex >= 0 && ev.cellIndex < 9) {
        targetBoard[ev.cellIndex] = ev.player;
        targetTurn = ev.player === 'X' ? 'O' : 'X';
        targetTurnCount = ev.turnIndex;
      }
    }

    const outcome = checkWinner(targetBoard);
    targetWinner = outcome.winner;
    targetWinningLine = outcome.winningLine;

    const gameRef = doc(db, 'games', gameId);
    const batch = writeBatch(db);

    // Remove pruned events from subcollection
    for (const ev of eventsToDelete) {
      const evRef = doc(db, 'games', gameId, 'events', ev.id);
      batch.delete(evRef);
    }

    // Update parent game state to the rolled-back snapshot
    batch.update(gameRef, {
      board: targetBoard,
      currentTurn: targetTurn,
      turnCount: targetTurnCount,
      winner: targetWinner,
      winningLine: targetWinningLine,
      status: targetWinner ? 'completed' : targetTurnCount > 0 ? 'in_progress' : 'waiting',
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}/rollback`);
  }
}

/**
 * Restarts an existing match (clears all events and resets the board to initial state)
 */
export async function restartGame(gameId: string, allEvents: GameEvent[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    const gameRef = doc(db, 'games', gameId);

    // Delete all events
    for (const ev of allEvents) {
      const evRef = doc(db, 'games', gameId, 'events', ev.id);
      batch.delete(evRef);
    }

    batch.update(gameRef, {
      board: getInitialBoard(),
      currentTurn: 'X',
      turnCount: 0,
      winner: null,
      winningLine: null,
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}/restart`);
  }
}

export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game | null) => void,
  onError?: (error: unknown) => void
): () => void {
  const docRef = doc(db, 'games', gameId);
  return onSnapshot(
    docRef,
    snapshot => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Game);
      } else {
        onUpdate(null);
      }
    },
    error => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
    }
  );
}

export function subscribeToGameEvents(
  gameId: string,
  onUpdate: (events: GameEvent[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const eventsRef = collection(db, 'games', gameId, 'events');
  return onSnapshot(
    eventsRef,
    snapshot => {
      const events = snapshot.docs.map(doc => doc.data() as GameEvent);
      // Sort chronologically by turnIndex
      events.sort((a, b) => a.turnIndex - b.turnIndex);
      onUpdate(events);
    },
    error => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `games/${gameId}/events`);
    }
  );
}

export function subscribeToUserRecentGames(
  userId: string,
  onUpdate: (games: Game[]) => void
): () => void {
  const gamesRef = collection(db, 'games');
  // Query games where user is host
  const qHost = query(gamesRef, where('hostId', '==', userId));

  return onSnapshot(
    qHost,
    snapshot => {
      const games = snapshot.docs.map(d => d.data() as Game);
      // Sort by updatedAt desc
      games.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(games.slice(0, 10));
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'games');
    }
  );
}
