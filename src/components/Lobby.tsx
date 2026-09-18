import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { AIDifficulty, Game, PlayerSymbol } from '../types';
import { Bot, Users, Play, Sparkles, ArrowRight, ShieldCheck, History, Clock, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface LobbyProps {
  user: User | null;
  guestName: string;
  onUpdateGuestName: (name: string) => void;
  onSignIn: () => void;
  onCreateAIGame: (difficulty: AIDifficulty, symbol: PlayerSymbol) => void;
  onCreateMultiplayerGame: (symbol: PlayerSymbol) => void;
  onJoinGame: (code: string) => void;
  onSelectRecentGame: (gameId: string) => void;
  recentGames: Game[];
  isLoading: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  user,
  guestName,
  onUpdateGuestName,
  onSignIn,
  onCreateAIGame,
  onCreateMultiplayerGame,
  onJoinGame,
  onSelectRecentGame,
  recentGames,
  isLoading,
}) => {
  const [modeTab, setModeTab] = useState<'ai' | 'multiplayer'>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('unbeatable');
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol>('X');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isEditingGuestName, setIsEditingGuestName] = useState(false);
  const [tempName, setTempName] = useState(guestName);

  const extractCode = (input: string): string => {
    let clean = input.trim();
    if (clean.includes('game=')) {
      const match = clean.match(/game=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        clean = match[1];
      }
    }
    return clean.toUpperCase();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = extractCode(joinCodeInput);
    if (!code) {
      setJoinError('Please enter a 6-character game code or invite link.');
      return;
    }
    sounds.playClick();
    onJoinGame(code);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempName.trim();
    if (trimmed) {
      onUpdateGuestName(trimmed);
    } else {
      setTempName(guestName);
    }
    setIsEditingGuestName(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Intro Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Firebase Firestore Backend</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">
          Turn-Based Tic-Tac-Toe
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
          Play against our Minimax AI or challenge a friend online with turn history event sourcing and instant rollback.
        </p>

        {/* Guest Status Banner */}
        {!user && (
          <div className="mt-5 p-3.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl max-w-md mx-auto flex flex-wrap items-center justify-between gap-3 text-left shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">
                    {guestName}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Guest
                  </span>
                  {!isEditingGuestName && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(guestName);
                        setIsEditingGuestName(true);
                      }}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Edit guest name"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isEditingGuestName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      maxLength={20}
                      className="w-32 px-2 py-0.5 text-xs border border-indigo-300 rounded bg-white"
                      placeholder="Your nickname"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGuestName(false)}
                      className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-slate-500 truncate">
                    Play instantly without logging in!
                  </p>
                )}
              </div>
            </div>

            <button
              id="lobby-signin-prompt-btn"
              onClick={onSignIn}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
            >
              Sign In with Google
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
          <button
            id="tab-mode-ai"
            onClick={() => {
              sounds.playClick();
              setModeTab('ai');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
              modeTab === 'ai'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Play Against AI</span>
          </button>

          <button
            id="tab-mode-multiplayer"
            onClick={() => {
              sounds.playClick();
              setModeTab('multiplayer');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
              modeTab === 'multiplayer'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-amber-600" />
            <span>Play With Friend</span>
          </button>
        </div>

        {/* Tab Content: AI Match */}
        {modeTab === 'ai' && (
          <div className="p-6 sm:p-8">
            <div className="max-w-lg mx-auto space-y-6">
              {/* Choose Difficulty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(
                    [
                      { id: 'easy', label: 'Easy', desc: 'Casual' },
                      { id: 'medium', label: 'Medium', desc: 'Smart' },
                      { id: 'unbeatable', label: 'Unbeatable', desc: 'Pure Minimax' },
                    ] as const
                  ).map(level => (
                    <button
                      key={level.id}
                      id={`ai-diff-${level.id}`}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setAiDifficulty(level.id);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        aiDifficulty === level.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-2 ring-indigo-600/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold">{level.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Choose Starting Mark */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Your Mark
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="symbol-select-x"
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setPlayerSymbol('X');
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${
                      playerSymbol === 'X'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg">
                      X
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">Play as X</div>
                      <div className="text-[10px] text-slate-500">You go first</div>
                    </div>
                  </button>

                  <button
                    id="symbol-select-o"
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setPlayerSymbol('O');
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${
                      playerSymbol === 'O'
                        ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-lg">
                      O
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">Play as O</div>
                      <div className="text-[10px] text-slate-500">AI goes first</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Launch Button */}
              <button
                id="start-ai-match-btn"
                type="button"
                disabled={isLoading}
                onClick={() => {
                  sounds.playClick();
                  onCreateAIGame(aiDifficulty, playerSymbol);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isLoading ? 'Starting Match...' : 'Start Match vs Minimax AI'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Multiplayer Match */}
        {modeTab === 'multiplayer' && (
          <div className="p-6 sm:p-8">
            <div className="max-w-lg mx-auto space-y-6">
              {/* Host a New Match */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  Host a New Game
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Creates a private Firestore room with a short 6-character code and instant share link.
                </p>

                {/* Symbol selection for host */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-slate-700">Your Symbol:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlayerSymbol('X')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                        playerSymbol === 'X'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      X (First)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerSymbol('O')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                        playerSymbol === 'O'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      O (Second)
                    </button>
                  </div>
                </div>

                <button
                  id="create-multiplayer-match-btn"
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    sounds.playClick();
                    onCreateMultiplayerGame(playerSymbol);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Room...' : 'Create Match & Get Code'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
              </div>

              {/* Join Existing Match */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-indigo-600" />
                  Join With Game Code
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Enter the 6-character room code or paste the invite link from your opponent.
                </p>

                <form onSubmit={handleJoinSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      id="game-code-input"
                      type="text"
                      placeholder="e.g. 7X9K2B or paste link"
                      value={joinCodeInput}
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw.includes('game=')) {
                          const match = raw.match(/game=([a-zA-Z0-9_-]+)/i);
                          if (match && match[1]) {
                            setJoinCodeInput(match[1].toUpperCase());
                            setJoinError(null);
                            return;
                          }
                        }
                        setJoinCodeInput(raw.toUpperCase());
                        setJoinError(null);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                    />
                    <button
                      id="join-match-btn"
                      type="submit"
                      disabled={isLoading || !joinCodeInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 shrink-0"
                    >
                      {isLoading ? 'Joining...' : 'Join Match'}
                    </button>
                  </div>
                  {joinError && (
                    <p className="text-xs text-rose-600 font-medium">{joinError}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Matches Section (if any exist for user or guest) */}
      {recentGames.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Your Recent Matches</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentGames.map(g => (
              <div
                key={g.id}
                onClick={() => onSelectRecentGame(g.id)}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      #{g.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {g.gameMode === 'ai' ? `AI (${g.aiDifficulty})` : 'Multiplayer'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {g.status === 'completed'
                        ? g.winner === 'draw'
                          ? 'Draw'
                          : `${g.winner} Won`
                        : 'In Progress'}
                    </span>
                    <span>•</span>
                    <span>{g.turnCount} turns</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  View →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
