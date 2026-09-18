import React, { useState } from 'react';
import { Game, PlayerSymbol } from '../types';
import { Copy, Check, Share2, Bot, RotateCcw, Swords, Users, Info } from 'lucide-react';
import { sounds } from '../utils/audio';
import { copyTextToClipboard, getShareableGameUrl, isAiStudioDevEnvironment } from '../utils/share';

interface MatchHeaderProps {
  game: Game;
  mySymbol: PlayerSymbol;
  isMyTurn: boolean;
  onRestartMatch: () => void;
  isRestarting: boolean;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  game,
  mySymbol,
  isMyTurn,
  onRestartMatch,
  isRestarting,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = getShareableGameUrl(game.code);
  const isDevEnv = isAiStudioDevEnvironment();

  const handleCopyCode = async () => {
    sounds.playClick();
    const success = await copyTextToClipboard(game.code);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    sounds.playClick();
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const hostIsX = game.hostSymbol === 'X';
  const opponentSymbol: PlayerSymbol = hostIsX ? 'O' : 'X';

  const isHostTurn = game.currentTurn === game.hostSymbol;
  const isOpponentTurn = game.currentTurn === opponentSymbol;

  return (
    <div className="w-full mb-6">
      {/* Top Banner: Multiplayer Invite Bar if in waiting or multiplayer */}
      {game.gameMode === 'multiplayer' && (
        <div className="mb-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-amber-950">
                  {game.status === 'waiting'
                    ? 'Waiting for Player 2 to join...'
                    : 'Multiplayer Match in Progress'}
                </div>
                <div className="text-[11px] text-amber-800/90">
                  Share this invite link or room code with your friend.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Game Code Chip */}
              <button
                id="copy-game-code-chip"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-800 hover:bg-amber-50 transition-colors shadow-2xs"
                title="Click to copy game code"
              >
                <span className="text-[11px] text-slate-400 font-sans font-semibold">Code:</span>
                <span className="tracking-wider text-indigo-700">{game.code}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Share Link Button */}
              <button
                id="copy-share-link-btn"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                title="Copy invite URL"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visible link box and guidance */}
          {game.status === 'waiting' && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold text-amber-900 shrink-0">
                  Invite Link:
                </span>
                <div className="flex-1 flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-amber-300/80 font-mono text-[11px] text-slate-600 truncate selection:bg-amber-100">
                  <span className="truncate select-all">{shareUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              {isDevEnv && (
                <div className="flex items-start gap-2 text-xs text-amber-950 bg-amber-100/70 p-3 rounded-xl border border-amber-300/80">
                  <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-bold text-amber-950 text-xs">
                      Why does another user see &ldquo;No access to this page&rdquo;?
                    </p>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      This active development server is in a private sandbox container owned by your Google account. Google Cloud blocks external users until you publish the shared preview.
                    </p>
                    <div className="text-[11px] text-amber-900 space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-amber-950">
                        <span>1. To play with anyone on the internet:</span>
                      </div>
                      <p className="pl-3 text-amber-800">
                        Click the <span className="font-bold text-amber-950 bg-amber-200/70 px-1.5 py-0.5 rounded">Share</span> button in the AI Studio top bar to generate the public preview.
                      </p>

                      <div className="flex items-center gap-1 font-semibold text-amber-950 pt-1">
                        <span>2. To play immediately across devices:</span>
                      </div>
                      <p className="pl-3 text-amber-800">
                        Have your friend open their copy of the app and enter room code <strong className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-amber-300">{game.code}</strong> into the Lobby.
                      </p>

                      <div className="flex items-center gap-1 font-semibold text-amber-950 pt-1">
                        <span>3. To test right now:</span>
                      </div>
                      <p className="pl-3 text-amber-800">
                        Open the invite link in a <strong>new browser tab in this same browser</strong> to play both sides in real time!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Players Matchup Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        <div className="grid grid-cols-3 items-center gap-2">
          {/* Host Card */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center gap-2 sm:gap-3 ${
              isHostTurn && game.status === 'in_progress'
                ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/60'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                game.hostSymbol === 'X'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {game.hostSymbol}
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {game.hostName}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>Host</span>
                {isHostTurn && game.status === 'in_progress' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                )}
              </div>
            </div>
          </div>

          {/* Center Status / Versus */}
          <div className="text-center px-1">
            {game.status === 'completed' ? (
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Result
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {game.winner === 'draw' ? 'Draw Game' : `${game.winner} Won!`}
                </span>
                <button
                  id="rematch-btn"
                  onClick={onRestartMatch}
                  disabled={isRestarting}
                  className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isRestarting ? 'Resetting...' : 'Play Again'}</span>
                </button>
              </div>
            ) : game.status === 'waiting' ? (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-amber-600 animate-pulse">
                  Waiting...
                </span>
                <span className="text-[10px] text-slate-400">Need 1 player</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Current Turn
                </span>
                <span
                  className={`text-sm sm:text-base font-black ${
                    game.currentTurn === 'X' ? 'text-indigo-600' : 'text-amber-500'
                  }`}
                >
                  Player {game.currentTurn}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isMyTurn ? 'Your move!' : 'Opponent thinking...'}
                </span>
              </div>
            )}
          </div>

          {/* Opponent Card */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-end gap-2 sm:gap-3 text-right ${
              isOpponentTurn && game.status === 'in_progress'
                ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/60'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {game.opponentName || 'Waiting...'}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                {isOpponentTurn && game.status === 'in_progress' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                )}
                <span>
                  {game.gameMode === 'ai' ? `AI (${game.aiDifficulty})` : 'Opponent'}
                </span>
              </div>
            </div>
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                opponentSymbol === 'X'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {game.gameMode === 'ai' ? (
                <Bot className="w-5 h-5" />
              ) : (
                opponentSymbol
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
