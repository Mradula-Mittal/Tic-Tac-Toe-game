import React, { useEffect, useMemo, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, testConnection } from './firebase';
import { AIDifficulty, BoardState, Game, GameEvent, PlayerSymbol } from './types';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { MatchHeader } from './components/MatchHeader';
import { GameBoard } from './components/GameBoard';
import { TurnInspector } from './components/TurnInspector';
import {
  createGame,
  joinGameByCode,
  recordMoveEvent,
  rollbackGameToTurn,
  restartGame,
  subscribeToGame,
  subscribeToGameEvents,
  subscribeToUserRecentGames,
} from './services/gameService';
import { replayGameEvents } from './utils/gameLogic';
import { getAIMove } from './utils/minimax';
import { sounds } from './utils/audio';
import { AlertCircle, RotateCcw, ArrowLeft, Bot } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Guest Identity for playing without Google Sign-In
  const [guestId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('ttt_guest_id');
      if (existing) return existing;
      const newId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ttt_guest_id', newId);
      return newId;
    } catch {
      return 'guest_' + Math.random().toString(36).substring(2, 10);
    }
  });

  const [guestName, setGuestName] = useState<string>(() => {
    try {
      return localStorage.getItem('ttt_guest_name') || 'Guest Player';
    } catch {
      return 'Guest Player';
    }
  });

  const handleUpdateGuestName = (newName: string) => {
    setGuestName(newName);
    try {
      localStorage.setItem('ttt_guest_name', newName);
    } catch {
      // LocalStorage access restricted
    }
  };

  // Effective user ID and name (uses Google user profile if signed in, else guest)
  const currentUserId = user?.uid || guestId;
  const currentUserName = user?.displayName || guestName;
  const currentUserPhoto = user?.photoURL || '';

  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const lastAITurnHandledRef = useRef<number | null>(null);

  // 1. Initialize Auth and test Firestore connection on boot
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Check for game code in URL query params on load
  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('game');
    if (codeFromUrl && !currentGame) {
      handleJoinGame(codeFromUrl.toUpperCase());
    }
  }, [authLoading]);

  // 3. Listen to user's or guest's recent matches
  useEffect(() => {
    const unsubscribeRecent = subscribeToUserRecentGames(currentUserId, games => {
      setRecentGames(games);
    });
    return () => unsubscribeRecent();
  }, [currentUserId]);

  // 4. Real-time game subscription & Event Sourcing stream
  useEffect(() => {
    if (!currentGame?.id) {
      setGameEvents([]);
      setSelectedTurnIndex(null);
      return;
    }

    const gameId = currentGame.id;

    const unsubscribeGame = subscribeToGame(
      gameId,
      updatedGame => {
        if (updatedGame) {
          setCurrentGame(updatedGame);
        }
      },
      err => {
        console.error('Error in game subscription:', err);
      }
    );

    const unsubscribeEvents = subscribeToGameEvents(
      gameId,
      events => {
        setGameEvents(events);
      },
      err => {
        console.error('Error in events subscription:', err);
      }
    );

    return () => {
      unsubscribeGame();
      unsubscribeEvents();
    };
  }, [currentGame?.id]);

  // 5. Reconstruct game state from immutable events stream (Event Sourcing)
  const reconstructed = useMemo(() => {
    return replayGameEvents(gameEvents);
  }, [gameEvents]);

  // Active snapshot for time travel inspection
  const activeSnapshot = useMemo(() => {
    if (selectedTurnIndex === null) return null;
    return reconstructed.snapshots.find(s => s.turnIndex === selectedTurnIndex) || null;
  }, [selectedTurnIndex, reconstructed.snapshots]);

  const displayedBoard = activeSnapshot ? activeSnapshot.board : reconstructed.board;
  const displayedWinningLine = activeSnapshot ? activeSnapshot.winningLine : reconstructed.winningLine;

  // Determine player's symbol in this game
  const mySymbol: PlayerSymbol = useMemo(() => {
    if (!currentGame) return 'X';
    if (currentUserId === currentGame.hostId) return currentGame.hostSymbol;
    if (currentUserId === currentGame.opponentId) return currentGame.hostSymbol === 'X' ? 'O' : 'X';
    return currentGame.hostSymbol;
  }, [currentGame, currentUserId]);

  const isMyTurn = useMemo(() => {
    if (!currentGame) return false;
    if (currentGame.status !== 'in_progress') return false;
    if (selectedTurnIndex !== null) return false; // In preview mode

    // In AI mode, if current turn matches player's symbol, it's their turn
    if (currentGame.gameMode === 'ai') {
      return currentGame.currentTurn === mySymbol;
    }

    // In multiplayer mode, check if current user matches active turn's player
    const hostSymbol = currentGame.hostSymbol;
    if (currentGame.currentTurn === hostSymbol) {
      return currentUserId === currentGame.hostId;
    } else {
      return currentUserId === currentGame.opponentId;
    }
  }, [currentGame, selectedTurnIndex, mySymbol, currentUserId]);

  // Execute AI turn calculation and write move event to Firestore
  const executeAIMove = async (boardToUse: BoardState, currentTurnCount: number) => {
    if (!currentGame || currentGame.gameMode !== 'ai' || currentGame.status !== 'in_progress') return;
    if (selectedTurnIndex !== null) return;

    // Guard against duplicate execution for the same turn count
    if (lastAITurnHandledRef.current === currentTurnCount) return;
    lastAITurnHandledRef.current = currentTurnCount;

    const aiSymbol: PlayerSymbol = currentGame.hostSymbol === 'X' ? 'O' : 'X';
    setIsAiThinking(true);

    try {
      // Calculate move using our instantaneous optimized Minimax (< 1ms)
      const aiMoveIndex = getAIMove(boardToUse, aiSymbol, currentGame.aiDifficulty || 'unbeatable');

      if (aiMoveIndex !== -1 && boardToUse[aiMoveIndex] === null) {
        sounds.playMove(aiSymbol);
        const nextTurnIndex = currentTurnCount + 1;
        const res = await recordMoveEvent({
          gameId: currentGame.id,
          turnIndex: nextTurnIndex,
          player: aiSymbol,
          playerId: 'ai',
          playerName: 'Minimax AI',
          cellIndex: aiMoveIndex,
          currentBoard: boardToUse,
        });

        if (res.winner === 'draw') {
          sounds.playDraw();
        } else if (res.winner) {
          sounds.playWin();
        }
      }
    } catch (err) {
      console.error('Failed to execute AI move:', err);
      // Reset ref so it can retry on network glitch
      lastAITurnHandledRef.current = null;
    } finally {
      setIsAiThinking(false);
    }
  };

  // 6. AI Turn Execution: Minimax algorithm (No LLM calls)
  // Handles game starts (when AI goes first) or reconnects
  useEffect(() => {
    if (!currentGame || currentGame.gameMode !== 'ai') return;
    if (currentGame.status !== 'in_progress') return;
    if (selectedTurnIndex !== null) return;

    const aiSymbol: PlayerSymbol = currentGame.hostSymbol === 'X' ? 'O' : 'X';
    const isAITurn = currentGame.currentTurn === aiSymbol;
    const currentTurnCount = currentGame.turnCount ?? reconstructed.turnCount;

    if (isAITurn && lastAITurnHandledRef.current !== currentTurnCount) {
      const activeBoard = currentGame.board || reconstructed.board;
      const timer = setTimeout(() => {
        executeAIMove(activeBoard, currentTurnCount);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [
    currentGame?.currentTurn,
    currentGame?.status,
    currentGame?.gameMode,
    currentGame?.turnCount,
    currentGame?.board,
    selectedTurnIndex,
  ]);

  // Handle player click on a grid cell
  const handleCellClick = async (cellIndex: number) => {
    if (!currentGame || !isMyTurn || selectedTurnIndex !== null || isAiThinking) return;

    // Use freshest board
    const currentBoard = currentGame.board || reconstructed.board;
    if (currentBoard[cellIndex] !== null) return;

    sounds.playMove(mySymbol);

    try {
      const currentTurnCount = currentGame.turnCount ?? reconstructed.turnCount;
      const nextTurnIndex = currentTurnCount + 1;

      const res = await recordMoveEvent({
        gameId: currentGame.id,
        turnIndex: nextTurnIndex,
        player: mySymbol,
        playerId: currentUserId,
        playerName: currentUserName,
        cellIndex,
        currentBoard,
      });

      if (res.winner === 'draw') {
        sounds.playDraw();
      } else if (res.winner) {
        sounds.playWin();
      } else if (currentGame.gameMode === 'ai') {
        // Fast, organic follow-up for the AI turn without waiting for snapshot propagation
        setTimeout(() => {
          executeAIMove(res.resultingBoard, nextTurnIndex);
        }, 150);
      }
    } catch (err) {
      setErrorMessage('Failed to submit move. Please try again.');
    }
  };

  // Rollback state to a prior turn
  const handleRollbackToTurn = async (targetTurnIndex: number) => {
    if (!currentGame) return;
    setIsRollingBack(true);
    sounds.playRollback();

    try {
      await rollbackGameToTurn({
        gameId: currentGame.id,
        targetTurnIndex,
        allEvents: gameEvents,
        hostSymbol: currentGame.hostSymbol,
      });
      lastAITurnHandledRef.current = null;
      setSelectedTurnIndex(null);
    } catch (err) {
      setErrorMessage('Failed to restore turn state. Please try again.');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Restart existing match
  const handleRestartMatch = async () => {
    if (!currentGame) return;
    setIsRestarting(true);
    sounds.playClick();

    try {
      await restartGame(currentGame.id, gameEvents);
      lastAITurnHandledRef.current = null;
      setSelectedTurnIndex(null);
    } catch (err) {
      setErrorMessage('Failed to restart match.');
    } finally {
      setIsRestarting(false);
    }
  };

  // Sign In with Google
  const handleSignIn = async () => {
    sounds.playClick();
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign in error:', err);
      setErrorMessage('Google Sign-In was cancelled or encountered an error.');
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    sounds.playClick();
    try {
      await signOut(auth);
      setCurrentGame(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Create AI Game (Allowed for guests and signed-in users)
  const handleCreateAIGame = async (difficulty: AIDifficulty, symbol: PlayerSymbol) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const newGame = await createGame({
        hostId: currentUserId,
        hostName: currentUserName,
        hostPhoto: currentUserPhoto,
        hostSymbol: symbol,
        gameMode: 'ai',
        aiDifficulty: difficulty,
      });
      lastAITurnHandledRef.current = null;
      setCurrentGame(newGame);
    } catch (err) {
      setErrorMessage('Failed to start AI game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Multiplayer Game (Allowed for guests and signed-in users)
  const handleCreateMultiplayerGame = async (symbol: PlayerSymbol) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const newGame = await createGame({
        hostId: currentUserId,
        hostName: currentUserName,
        hostPhoto: currentUserPhoto,
        hostSymbol: symbol,
        gameMode: 'multiplayer',
      });
      setCurrentGame(newGame);
    } catch (err) {
      setErrorMessage('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Game by Code (Allowed for guests and signed-in users)
  const handleJoinGame = async (code: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const joinedGame = await joinGameByCode(code, {
        uid: currentUserId,
        displayName: currentUserName,
        photoURL: currentUserPhoto,
      });
      setCurrentGame(joinedGame);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not join game.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLobby = () => {
    sounds.playClick();
    lastAITurnHandledRef.current = null;
    setCurrentGame(null);
    setSelectedTurnIndex(null);
    if (window.history.pushState) {
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* App Header Bar */}
      <Header
        user={user}
        guestName={guestName}
        onUpdateGuestName={handleUpdateGuestName}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onReturnToLobby={handleReturnToLobby}
        isInGame={!!currentGame}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = sounds.toggleSound();
          setSoundEnabled(next);
        }}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4 w-full">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 ml-3"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full">
        {!currentGame ? (
          /* Lobby & Matchmaking */
          <Lobby
            user={user}
            guestName={guestName}
            onUpdateGuestName={handleUpdateGuestName}
            onSignIn={handleSignIn}
            onCreateAIGame={handleCreateAIGame}
            onCreateMultiplayerGame={handleCreateMultiplayerGame}
            onJoinGame={handleJoinGame}
            onSelectRecentGame={gameId => {
              const selected = recentGames.find(g => g.id === gameId);
              if (selected) setCurrentGame(selected);
            }}
            recentGames={recentGames}
            isLoading={isLoading}
          />
        ) : (
          /* Active Match Layout */
          <div className="w-full max-w-4xl mx-auto flex flex-col">
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                id="back-to-lobby-btn"
                onClick={handleReturnToLobby}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Leave Match</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                  Code: {currentGame.code}
                </span>
                {currentGame.gameMode === 'ai' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    AI ({currentGame.aiDifficulty})
                  </span>
                )}
              </div>
            </div>

            {/* Score & Turn Status Header */}
            <MatchHeader
              game={currentGame}
              mySymbol={mySymbol}
              isMyTurn={isMyTurn}
              onRestartMatch={handleRestartMatch}
              isRestarting={isRestarting}
            />

            {/* Historical Turn Inspection Banner */}
            {selectedTurnIndex !== null && activeSnapshot && (
              <div
                id="turn-preview-banner"
                className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span>Time Travel: Previewing Turn #{selectedTurnIndex}</span>
                  </div>
                  <div className="text-[11px] text-amber-800">
                    {activeSnapshot.description}. Board is frozen for inspection.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="banner-rollback-btn"
                    onClick={() => handleRollbackToTurn(selectedTurnIndex)}
                    disabled={isRollingBack}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRollingBack ? 'Restoring...' : 'Restore to this Turn'}</span>
                  </button>

                  <button
                    id="banner-exit-preview-btn"
                    onClick={() => setSelectedTurnIndex(null)}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-medium hover:bg-amber-50 transition-colors"
                  >
                    Exit Preview
                  </button>
                </div>
              </div>
            )}

            {/* Main Game Arena: Board + Turn Event Sourcing Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Board Center (Col 7) */}
              <div className="md:col-span-7 flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <GameBoard
                  board={displayedBoard}
                  winningLine={displayedWinningLine}
                  currentTurn={currentGame.currentTurn}
                  isMyTurn={isMyTurn}
                  isGameOver={currentGame.status === 'completed'}
                  isPreviewMode={selectedTurnIndex !== null}
                  onCellClick={handleCellClick}
                  mySymbol={mySymbol}
                  statusMessage={
                    selectedTurnIndex !== null
                      ? `Inspecting state at Turn #${selectedTurnIndex}`
                      : currentGame.status === 'completed'
                      ? currentGame.winner === 'draw'
                        ? "It's a draw!"
                        : `Player ${currentGame.winner} wins!`
                      : currentGame.status === 'waiting'
                      ? 'Share game code with a friend to begin!'
                      : isMyTurn
                      ? `Your move! Place ${mySymbol}`
                      : currentGame.gameMode === 'ai'
                      ? 'AI opponent is moving...'
                      : `Waiting for ${currentGame.currentTurn}...`
                  }
                  opponentIsAI={currentGame.gameMode === 'ai'}
                />
              </div>

              {/* Event Sourcing Timeline / Turn Inspector (Col 5) */}
              <div className="md:col-span-5 h-full">
                <TurnInspector
                  events={gameEvents}
                  snapshots={reconstructed.snapshots}
                  selectedTurnIndex={selectedTurnIndex}
                  onSelectTurn={turnIndex => setSelectedTurnIndex(turnIndex)}
                  onRollbackToTurn={handleRollbackToTurn}
                  isRollingBack={isRollingBack}
                  canRollback={gameEvents.length > 0}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-4 text-center border-t border-slate-200/60 bg-white/50 text-xs text-slate-400">
        Tic-Tac-Toe • Real-time Firestore Event Sourcing & Minimax Algorithmic AI
      </footer>
    </div>
  );
}
